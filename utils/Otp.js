// utils/Otp.js
const twilio = require("twilio");
// ✅ Use helpers from centralized Redis config
const { get, setEx, del, incr, expire } = require("../config/loginredis");

// Twilio client setup
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

// ============================================================================
// 🔥 HELPERS
// ============================================================================

// Map timezone to country code (ISO 3166-1 alpha-2)
const getCountryFromTimezone = (timezone) => {
  if (!timezone) return "IN";
  
  const timezoneMap = {
    "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
    "America/New_York": "US", "America/Chicago": "US", "America/Los_Angeles": "US",
    "Europe/London": "GB", "Europe/Paris": "FR", "Europe/Berlin": "DE",
    "Asia/Singapore": "SG", "Asia/Dubai": "AE", "Asia/Tokyo": "JP",
    "Australia/Sydney": "AU", "Pacific/Auckland": "NZ",
    // Add more as needed...
  };
  
  return timezoneMap[timezone] || "IN";
};

// Format phone number to E.164 for Twilio
const formatPhoneNumber = (phone, countryCode = "IN") => {
  if (!phone) return null;
  
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+')) return cleaned;
  
  const countryCodes = {
    IN: '+91', US: '+1', GB: '+44', CA: '+1', AU: '+61',
    SG: '+65', AE: '+971', SA: '+966', NZ: '+64',
    // Add more as needed...
  };
  
  const prefix = countryCodes[countryCode] || '+91';
  
  // Remove leading 0 (common in Indian numbers)
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  
  return `${prefix}${cleaned}`;
};

// ✅ NORMALIZE: Ensure consistent key for Redis lookups
const normalizeContact = (contact, countryCode = "IN") => {
  if (!contact) return null;
  // Always format to E.164 for consistent Redis keys
  return formatPhoneNumber(contact, countryCode);
};

// Generate 6-digit OTP
const generateOTP = (length = 6) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};

// Build consistent Redis key
const getOtpRedisKey = ( username, contact, countryCode = "IN") => {
  const normalized = normalizeContact(contact, countryCode);
  return `otp:${username}:${normalized}`;
};

const getCooldownKey = (tenant_id, username) => `otp_cooldown:${tenant_id}:${username}`;
const getAttemptsKey = (tenant_id, username) => `otp_attempts:${tenant_id}:${username}`;

// ============================================================================
// 🔥 RATE LIMITING
// ============================================================================

const canSendOTP = async ({ username, tenant_id, contact, timezone }) => {
  try {
    const country = getCountryFromTimezone(timezone);
    const redisKey = getOtpRedisKey( username, contact, country);
    const cooldownKey = getCooldownKey(tenant_id, username);

    // Check if OTP already exists (not expired)
    const existingOtp = await get(redisKey);
    if (existingOtp) {
      const otpData = typeof existingOtp === 'string' ? JSON.parse(existingOtp) : existingOtp;
      const timeLeft = Math.ceil((otpData.expiresAt - Date.now()) / 1000);
      return {
        allowed: false,
        message: `Please wait ${timeLeft}s before requesting a new OTP`,
        retryAfter: timeLeft,
      };
    }

    // Check cooldown between requests (30 seconds)
    const cooldown = await get(cooldownKey);
    if (cooldown) {
      return {
        allowed: false,
        message: "Please wait 30 seconds before requesting another OTP",
        retryAfter: 30,
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error("❌ canSendOTP error:", err);
    return { allowed: true }; // Fail open
  }
};

const setOtpCooldown = async ({ username, tenant_id }, seconds = 30) => {
  try {
    const cooldownKey = getCooldownKey(tenant_id, username);
    // Use raw redisClient for setex since helper uses seconds
    const { redisClient } = require("../Config/redis");
    await redisClient.setex(cooldownKey, seconds, "1");
  } catch (err) {
    console.error("❌ setOtpCooldown error:", err);
  }
};

// ============================================================================
// 🔥 SEND OTP (Redis + Twilio)
// ============================================================================

const sendOTP = async ({
  to,
  username,
  via = "sms",
  message = "Your OTP is",
  length = 6,
  expiryMinutes = 10,
  tenant_id,
  timezone,
  countryCode,
}) => {
  try {
    const otp = generateOTP(length);
    console.log('otp:',otp)
    const expirySeconds = expiryMinutes * 60;
    const country = countryCode || getCountryFromTimezone(timezone);
    
    // ✅ Normalize contact for consistent Redis key
    const normalizedContact = normalizeContact(to, country);
    
    if (via === "sms" && !normalizedContact?.startsWith('+')) {
      throw new Error(`Invalid phone number format: ${to}. Expected E.164 (e.g., +919876543210)`);
    }

    // Send via Twilio
    if (via === "sms") {
      console.log(`📱 Twilio SMS: to=${normalizedContact}, from=${process.env.TWILIO_PHONE_NUMBER}`);
      
      // const messageResponse = await client.messages.create({
      //   body: `${message}: ${otp}`,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: normalizedContact,
      // });
      
      // console.log(`✅ Twilio SID: ${messageResponse.sid||0}`);
    } else {
      throw new Error("Only SMS supported");
    }

    // ✅ Store OTP with normalized key
    const redisKey = getOtpRedisKey( username, to, country);
    const otpData = {
      otp,
      via,
      username,
      tenant_id,
      timezone,
      country,
      normalizedContact, // Store for debugging
      createdAt: Date.now(),
      expiresAt: Date.now() + expirySeconds * 1000
    };

    // Use setEx helper (auto JSON.stringify + TTL)
    await setEx(redisKey, expirySeconds, otpData);
    
    console.log(`✅ OTP stored: ${redisKey}, expires in ${expirySeconds}s`);

    return { 
      otp, 
      expiry: otpData.expiresAt,
      redisKey,
      country,
      normalizedContact
    };

  } catch (err) {
    console.error("❌ OTP Send Error:", {
      message: err.message,
      code: err.code,
      to,
      username,
      tenant_id,
      timezone,
      country: countryCode || getCountryFromTimezone(timezone)
    });
    
    if (err.message?.includes('username is required')) {
      throw new Error("Twilio config error: Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN");
    }
    if (err.message?.includes('not a valid phone number')) {
      throw new Error("Invalid phone format. Use E.164: +919876543210");
    }
    
    throw new Error(`Failed to send OTP: ${err.message}`);
  }
};

// ============================================================================
// 🔥 VERIFY OTP
// ============================================================================

const verifyOTP = async ({ username, enteredOtp, contact, tenant_id, timezone }) => {
  try {
    const country = getCountryFromTimezone(timezone);
    // ✅ Use same normalization as sendOTP
    const redisKey = getOtpRedisKey( username, contact, country);

    console.log(`🔍 Verifying OTP: key=${redisKey}, entered=${enteredOtp}`);

    const redisDataRaw = await get(redisKey);

    if (!redisDataRaw) {
      console.warn(`⚠️ OTP not found in Redis: ${redisKey}`);
      return {
        success: false,
        message: "OTP not found or expired. Please request a new OTP.",
      };
    }

    const otpData = typeof redisDataRaw === 'string' ? JSON.parse(redisDataRaw) : redisDataRaw;

    // Extra expiry check (Redis TTL should handle this)
    if (Date.now() > otpData.expiresAt) {
      await del(redisKey);
      return {
        success: false,
        message: "OTP expired. Please request a new OTP.",
      };
    }

    // Compare OTP (string comparison)
    if (enteredOtp.toString() !== otpData.otp.toString()) {
      const attemptsKey = getAttemptsKey(tenant_id, username);
      const attempts = await incr(attemptsKey);
      if (attempts === 1) {
        await expire(attemptsKey, 3600);
      }

      if (attempts >= 5) {
        await del(redisKey);
        return {
          success: false,
          message: "Too many failed attempts. Please request a new OTP.",
          locked: true,
        };
      }

      return {
        success: false,
        message: "Invalid OTP",
        attemptsRemaining: 5 - attempts,
      };
    }

    // ✅ Success: Delete OTP
    await del(redisKey);
    await del(getAttemptsKey(tenant_id, username));

    return {
      success: true,
      message: "OTP verified successfully",
      verified: true,
    };
  } catch (err) {
    console.error("❌ OTP verification error:", err);
    return {
      success: false,
      message: "Verification failed. Please try again.",
    };
  }
};

// ============================================================================
// 🔥 EXPORTS
// ============================================================================

module.exports = {
  generateOTP,
  canSendOTP,
  setOtpCooldown,
  sendOTP,
  verifyOTP,
  // Export helpers for testing/debugging
  normalizeContact,
  getOtpRedisKey,
  getCountryFromTimezone,
  formatPhoneNumber,
};