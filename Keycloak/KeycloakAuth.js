// ssoAuth.js
const express = require("express");
const cookieParser = require("cookie-parser");
const qs = require("querystring");
const axios = require("axios");
const { AppError } = require("../Logics/AppError");
const {
  getKeycloakToken,
  decodeToken,
  extractUserInfo,
  keycloakLogin,
  getClientCredential,
  getUserByUsername,
  addUser,
  getUserIdByUsername,
} = require("./KeycloakAdmin");
const { getTenant } = require("../Service/TenantService");
// const { getClinicByTenantIdAndClinicId } = require("../services/ClinicService");
const { buildUserContext } = require("./BuildUserContext");
// const { verifyUserTokenInDB } = require("./AuthenticateTenantAndClient");
// const {
//   sendOTP,
//   verifyOTP,
// } = require("../Modules/MailSmsOtp/MailSmsOtpService");
// const { getUserByTenantClinicAndKeycloakId } = require("../utils/Reusability");
// const {
//   generateOTP,
//   sendWhatsAppOTP,
//   generateUsername,
//   generateAlphanumericPassword,
// } = require("../utils/Helpers");
const { decode } = require("jsonwebtoken");
const {
  verifyUserTokenInDB,
  validateToken,
} = require("./ValidateToken");
// const { generateAppBAccessToken } = require("../utils/CodeGenerator");

// const { v4: uuidv4 } = require("uuid");
const { UAParser } = require("ua-parser-js");
const loginHistoryService = require("../Service/LoginHistoryService");
const userActivityService = require("../Service/UserActivityService");

const pool = require("../");

const router = express.Router();
router.use(cookieParser());

// === DEBUG LOG HELPER ===
const log = (label, message, data = null) => {
  console.log(
    `[KeycloakAuth] ${label}:`,
    message,
    data ? `\nData: ${JSON.stringify(data, null, 2)}` : ""
  );
};

const sendOtpToRedis = async (phoneNumber, otp, ttlSeconds = 300) => {
  try {
    const key = `otp:${phoneNumber}`; // namespace your OTP key
    await setCache(key, { otp }, ttlSeconds); // store OTP object
    console.log(`OTP cached for ${phoneNumber}, expires in ${ttlSeconds}s`);
  } catch (err) {
    console.error("Failed to store OTP in cache:", err);
  }
};

router.get("/me", validateToken, async (req, res) => {
  const user_id =
    req.session?.user_id || req.body.user_id || req.cookies.user_id;
  let conn;

  try {
    conn = await pool.getConnection();

    const userRows = await conn.query(
      `
      SELECT 
        u.user_id,
        u.username,
        u.role,
        t.tenant_id,
        t.tenant_name,
        t.tenant_app_name,
        t.tenant_app_logo,
        t.tenant_app_font,
        t.tenant_app_themes,
        t.payment_type
      FROM user u
      JOIN tenant t ON t.tenant_id = u.tenant_id
      WHERE u.user_id = ?
      `,
      [user_id]
    );

    if (!userRows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const baseUser = userRows[0];

    /* ===============================
       2️⃣ Get branches based on role
       =============================== */
    let branchRows = [];

    if (baseUser.role === "ADMIN") {
      // ✅ ADMIN → ALL BRANCHES
      branchRows = await conn.query(
        `
        SELECT 
          branch_id,
          branch_name,
          branch_code
        FROM branch
        WHERE tenant_id = ?
        ORDER BY branch_id
        `,
        [baseUser.tenant_id]
      );
    } else {
      // ✅ OTHER USERS → MAPPED BRANCHES ONLY
      branchRows = await conn.query(
        `
        SELECT 
          b.branch_id,
          b.branch_name,
          b.branch_code
        FROM userbranch ub
        JOIN branch b ON b.branch_id = ub.branch_id
        WHERE ub.user_id = ?
        ORDER BY b.branch_id
        `,
        [user_id]
      );
    }

    if (!branchRows || branchRows.length === 0) {
      return res.status(403).json({ message: "No branches assigned" });
    }

    /* ===============================
       3️⃣ Normalize response
       =============================== */
    const userData = {
      user_id: Number(baseUser.user_id),
      username: baseUser.username,
      role: baseUser.role,

      tenant_id: Number(baseUser.tenant_id),
      tenant_name: baseUser.tenant_name,
      tenant_app_name: baseUser.tenant_app_name,
      tenant_app_logo: baseUser.tenant_app_logo,
      tenant_app_font: baseUser.tenant_app_font,
      tenant_app_themes: baseUser.tenant_app_themes,

      payment_type: baseUser.payment_type,

      branches: branchRows.map((b) => ({
        branch_id: Number(b.branch_id),
        branch_name: b.branch_name,
        branch_code: b.branch_code,
      })),

      // default = first allowed branch
      default_branch_id: Number(branchRows[0].branch_id),
    };

    res.status(200).json(userData);
  } catch (error) {
    console.error("ME API ERROR:", error);
    res.status(500).json({ message: "Failed to load user" });
  } finally {
    if (conn) conn.release();
  }
});

// const redis = require("../Redis/redis");
const { randomUUID } = require("crypto");
const redis = require("../Middleware/Redis");

const finalizeLogin = async (req, res) => {
  log("FINALIZE_LOGIN", "Starting finalize login");

  try {
    /* -------------------------------------------------
       🌍 RESOLVE REALM & CLIENT
    ------------------------------------------------- */
    const { host, network_type } = req.body;

    const HOST_REALM_CLIENT = JSON.parse(process.env.HOST_REALM_CLIENT || "{}");

    const tenantConfig = HOST_REALM_CLIENT[host];
    if (!tenantConfig) {
      return res.status(400).json({ error: "Invalid host" });
    }

    const { realm, clientId } = tenantConfig;

    /* -------------------------------------------------
       🔐 REQUIRED DATA
    ------------------------------------------------- */
    const { access_token, refresh_token } = req.tokens;
    const dbUser = req.dbUser;

    const userContext = await buildUserContext(access_token, dbUser);

    /* -------------------------------------------------
       🍪 COOKIE OPTIONS
    ------------------------------------------------- */
    const isProduction = process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
    };

    const accessCookieLife =
      Number(process.env.ACCESS_COOKIE_EXPIRE_TIME) * 1000;

    const refreshCookieLife =
      Number(process.env.REFRESH_COOKIE_EXPIRE_TIME) * 1000;

    /* -------------------------------------------------
       🖥 CLIENT INFO
    ------------------------------------------------- */
    let ip_address =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;

    if (ip_address === "::1") ip_address = "127.0.0.1";

    const userAgent = req.headers["user-agent"] || "";
    const parser = new UAParser(userAgent);
    const ua = parser.getResult();

    const browser_info =
      ua.browser.name && ua.browser.version
        ? `${ua.browser.name} ${ua.browser.version}`
        : "Unknown Browser";

    const device_info = ua.device.type
      ? ua.device.type.charAt(0).toUpperCase() + ua.device.type.slice(1)
      : "Desktop";

    const session_id = randomUUID();

    /* -------------------------------------------------
       🌍 GEO LOCATION LOOKUP
    ------------------------------------------------- */
    let country = null;
    let state = null;
    let city = null;
    let isp_provider = null;

    try {
      const isLocalIP =
        ip_address === "127.0.0.1" ||
        ip_address === "::1" ||
        ip_address.startsWith("192.168.") ||
        ip_address.startsWith("10.");

      if (!isLocalIP) {
        try {
          const geo = await axios.get(`https://ipapi.co/${ip_address}/json/`);
          country = geo.data.country_name || null;
          state = geo.data.region || null;
          city = geo.data.city || null;
          isp_provider = geo.data.org || null;
        } catch (err) {
          log("GEO_LOOKUP_FAILED", err.message);
        }
      } else {
        country = "Local";
        state = "Local";
        city = "Local";
        isp_provider = "Local Network";
      }
    } catch (err) {
      log("GEO_LOOKUP_FAILED", err.message);
    }

    /* -------------------------------------------------
       🔐 SECURITY FLAGS
    ------------------------------------------------- */
    const login_status = "success";
    const session_source = req.headers["x-session-source"] || "web";

    const failed_attempt_count = dbUser.failed_attempt_count || 0;

    const two_factor_used = dbUser.is_2fa_enabled ? "Yes" : "No";

    const password_changed_recently =
      dbUser.password_updated_at &&
      new Date() - new Date(dbUser.password_updated_at) <
        7 * 24 * 60 * 60 * 1000;

    let suspicious_flag = "No";

    if (failed_attempt_count >= 5) suspicious_flag = "Yes";
    if (country && country !== "India") suspicious_flag = "Yes";

    /* -------------------------------------------------
       🍪 SET COOKIES
    ------------------------------------------------- */
    res.cookie("access_token", access_token, {
      ...cookieOptions,
      maxAge: accessCookieLife,
    });

    res.cookie("refresh_token", refresh_token, {
      ...cookieOptions,
      maxAge: refreshCookieLife,
    });

    res.cookie("clientId", clientId, {
      ...cookieOptions,
      maxAge: refreshCookieLife,
    });

    res.cookie("realm", realm, {
      ...cookieOptions,
      maxAge: refreshCookieLife,
    });

    res.cookie("user_id", userContext.user_id, {
      ...cookieOptions,
      maxAge: refreshCookieLife,
    });

    res.cookie("session_id", session_id, {
      ...cookieOptions,
      maxAge: refreshCookieLife,
    });

    userContext.session_id = session_id;

    /* -------------------------------------------------
       🔴 STORE SESSION IN REDIS
    ------------------------------------------------- */
    await redis.set(
      `session:${session_id}`,
      JSON.stringify({
        user_id: userContext.user_id,
        tenant_id: dbUser.tenant_id,
        role: dbUser.role,
        clientId,
        realm,
        access_token,
        refresh_token,
      }),
      "EX",
      Math.floor(refreshCookieLife / 1000)
    );

    await redis.set(
      `api_count:${session_id}`,
      0,
      "EX",
      Math.floor(refreshCookieLife / 1000)
    );

    /* -------------------------------------------------
       🕒 UPDATE LAST LOGIN
    ------------------------------------------------- */
    try {
      await pool.query(`UPDATE user SET last_login = NOW() WHERE user_id = ?`, [
        userContext.user_id,
      ]);
    } catch (err) {
      log("LAST_LOGIN_UPDATE_FAILED", err.message);
    }

    /* -------------------------------------------------
       🧾 LOGIN HISTORY
    ------------------------------------------------- */
    try {
      await pool.query(
        `
        INSERT INTO login_history (
          tenant_id,
          branch_id,
          user_id,
          session_id,
          login_time,
          ip_address,
          device_info,
          browser_info
        ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)
        `,
        [
          dbUser.tenant_id,
          userContext.default_branch_id,
          userContext.user_id,
          session_id,
          ip_address,
          device_info,
          browser_info,
        ]
      );
    } catch (err) {
      log("LOGIN_HISTORY_FAILED", err.message);
    }

    /* -------------------------------------------------
       📊 USER ACTIVITY LOG
    ------------------------------------------------- */
    try {
      await pool.query(
        `
        INSERT INTO user_activity (
          user_id,
          session_id,
          login_status,
          session_source,
          ip_address,
          country,
          state,
          city,
          isp_provider,
          network_type,
          browser,
          device,
          failed_attempt_count,
          two_factor_used,
          password_changed_recently,
          suspicious_flag,
          api_calls_count,
          login_time,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [
          userContext.user_id ?? null,
          session_id ?? null,
          login_status ?? "success",
          session_source ?? "web",
          ip_address ?? null,
          country ?? null,
          state ?? null,
          city ?? null,
          isp_provider ?? null,
          network_type || "Unknown",
          browser_info ?? null,
          device_info ?? null,
          failed_attempt_count ?? 0,
          two_factor_used ?? "No",
          password_changed_recently ?? 0, // ✅ FIX
          suspicious_flag ?? "No",
          0,
        ]
      );
    } catch (err) {
      log("USER_ACTIVITY_FAILED", err.message);
    }

    log("FINALIZE_LOGIN", "Login successful");

    return res.status(200).json(userContext);
  } catch (err) {
    log("FINALIZE_LOGIN_FAILED", err.message);

    return res.status(401).json({
      error: err.message || "Login finalization failed",
    });
  }
};

router.post("/assets", async (req, res) => {
  const userToken = req.cookies.access_token;
  const { user } = req.body;

  const ssoToken = await generateAppBAccessToken({
    user,
    token: userToken,
    realm: req.cookies.realm,
    clientid: req.cookies.clientId,
  });

  // console.log(user,userToken,ssoToken)

  res.status(200).send({ data: ssoToken });
});

// router.get('/hi',(req,res)=>{
//  res.status(200).json('hello')

// })

router.post("/tokensave", (req, res) => {
  try {
    const {
      access_token,
      refresh_token,
      access_expires_in, // in seconds (optional)
      refresh_expires_in, // in seconds (optional)
    } = req.body;

    if (!access_token || !refresh_token) {
      return res
        .status(400)
        .json({ success: false, message: "Missing tokens in request body" });
    }

    const isProduction = process.env.NODE_ENV === "production";

    const baseOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      path: "/",
    };

    // Access token expiry time — default 15 minutes if not provided
    const accessExpiry = (access_expires_in || 15 * 60) * 1000; // convert sec → ms

    // Refresh token expiry time — default 7 days if not provided
    const refreshExpiry = (refresh_expires_in || 7 * 24 * 60 * 60) * 1000;

    // Set cookies
    res.cookie("access_token", access_token, {
      ...baseOptions,
      maxAge: accessExpiry,
    });

    res.cookie("refresh_token", refresh_token, {
      ...baseOptions,
      maxAge: refreshExpiry,
    });

    return res.status(200).json({
      success: true,
      message: "Tokens saved in cookies successfully",
      expires_in: {
        access: access_expires_in || 900,
        refresh: refresh_expires_in || 604800,
      },
    });
  } catch (error) {
    console.error("Error saving tokens:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =========================
// WhatsApp OTP Login Route
// =========================

const otpStore = {};

router.post("/login", async (req, res) => {
  try {
    let { username, password, host } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password required",
      });
    }

    username = username.toLowerCase();

    const HOST_REALM_CLIENT = JSON.parse(process.env.HOST_REALM_CLIENT);
    const tenantConfig = HOST_REALM_CLIENT[host];

    if (!tenantConfig) {
      return res.status(400).json({ error: "Invalid host" });
    }

    const { realm, clientId } = tenantConfig;

    /* ===============================
       🔐 Authenticate via Keycloak
    =============================== */
    const tokens = await keycloakLogin(username, password, realm, clientId);

    /* ===============================
       🔍 Verify in DB
    =============================== */
    const dbUser = await verifyUserTokenInDB(tokens.access_token, true, req);

    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }

    /* ===============================
       🚫 Check Account Status
    =============================== */
    if (dbUser.status !== "A") {
      return res.status(403).json({
        message: "User account is inactive",
      });
    }

    /* ===============================
       🔄 Reset Failed Attempts
    =============================== */
    await pool.query(
      `UPDATE user 
       SET failed_attempt_count = 0,
           last_login = NOW()
       WHERE user_id = ?`,
      [dbUser.user_id]
    );

    /* ===============================
       🚀 Proceed to finalizeLogin
    =============================== */
    req.tokens = tokens;
    req.dbUser = dbUser;

    return finalizeLogin(req, res);
  } catch (err) {
    /* ===============================
       ❌ FAILED LOGIN COUNTER
    =============================== */
    if (req.body.username) {
      try {
        await pool.query(
          `UPDATE user 
           SET failed_attempt_count = failed_attempt_count + 1
           WHERE LOWER(username) = ?`,
          [req.body.username.toLowerCase()]
        );
      } catch (e) {
        console.error("Failed attempt update error:", e.message);
      }
    }

    return res.status(401).json({
      message: "Invalid credentials",
    });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const session_id = req.cookies?.session_id;

    if (!session_id) {
      return res.status(200).json({
        success: true,
        message: "Already logged out",
      });
    }

    const logout_reason = req.body?.reason || "manual";

    /* ===============================
       🔢 Get API Count From Redis
    =============================== */
    let api_calls_count = 0;
    try {
      const count = await redis.get(`api_count:${session_id}`);
      api_calls_count = Number(count) || 0;
    } catch (err) {
      console.error("API count error:", err.message);
    }

    /* ===============================
       🔥 Delete Redis Session
    =============================== */
    await redis.del(`session:${session_id}`);
    await redis.del(`api_count:${session_id}`);

    /* ===============================
       🧾 Update login_history
    =============================== */
    await pool.query(
      `
      UPDATE login_history
      SET logout_time = NOW()
      WHERE session_id = ?
      `,
      [session_id]
    );

    /* ===============================
       📊 Update user_activity
    =============================== */
    await pool.query(
      `
      UPDATE user_activity
      SET logout_time = NOW(),
          logout_reason = ?,
          api_calls_count = ?,
          last_activity_time = NOW(),
          duration = TIMESTAMPDIFF(SECOND, login_time, NOW())
      WHERE session_id = ?
      `,
      [logout_reason, api_calls_count, session_id]
    );

    /* ===============================
       🍪 Clear Cookies
    =============================== */
    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      path: "/",
    };

    res.clearCookie("access_token", clearOptions);
    res.clearCookie("refresh_token", clearOptions);
    res.clearCookie("session_id", clearOptions);
    res.clearCookie("clientId", clearOptions);
    res.clearCookie("realm", clearOptions);
    res.clearCookie("user_id", clearOptions);

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (err) {
    console.error("Logout failed:", err);

    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
});

// POST /login
// router.post("/login", async (req, res) => {
//   try {
//     const { username, password, host } = req.body;

//     const tenantConfig = process.env.HOST_REALM_CLIENT[host];
//     if (!tenantConfig) return res.status(400).json({ error: "Invalid host" });

//     const { realm, clientId } = tenantConfig;

//     const data = new URLSearchParams();
//     data.append("client_id", clientId);
//     data.append("grant_type", "password");
//     data.append("username", username);
//     data.append("password", password);

//     const response = await axios.post(
//       `${KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/token`,
//       data,
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );

//     res.json(response.data); // access_token, refresh_token, etc.
//   } catch (err) {
//     res.status(err.response?.status || 500).json(err.response?.data || err.message);
//   }
// });

// Refresh Token
router.post("/refresh-token", async (req, res, next) => {
  log("REFRESH_TOKEN", "Refreshing access token");
  const refreshToken = req.cookies.refresh_token;
  const realm = req.headers["x-realm"];
  const clientid = req.headers["x-clientid"];

  if (!refreshToken) {
    log("REFRESH_TOKEN", "❌ No refresh token in cookies");
    return next(new AppError("No refresh token found", 401));
  }

  try {
    const tokenUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/token`;
    const data = {
      grant_type: "refresh_token",
      client_id: clientid,
      client_secret: getClientCredential(clientid),
      refresh_token: refreshToken,
    };

    const response = await axios.post(tokenUrl, qs.stringify(data), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const tokenData = response.data;
    const decodedToken = decodeToken(tokenData.access_token);
    const userInfo = extractUserInfo(decodedToken);

    const tenant = await getTenant(userInfo.tenantId);
    let clinic = null;
    if (
      userInfo.role !== "tenant" &&
      userInfo.role !== "guest" &&
      userInfo.clinicId
    ) {
      // clinic = await getClinicByTenantIdAndClinicId(
      //   userInfo.tenantId,
      //   userInfo.clinicId
      // );
    }

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("access_token", tokenData.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: tokenData.expires_in * 1000,
    });
    res.cookie("refresh_token", tokenData.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const responseData = {
      tenant_name: tenant?.tenant_name,
      tenant_domain: tenant?.tenant_domain,
      tenant_app_logo: tenant?.tenant_app_logo || [],
      tenant_app_themes: tenant?.tenant_app_themes || null,
      tenant_app_font: tenant?.tenant_app_font || null,
      username: userInfo.preferred_username,
      userId: userInfo.userId,
      displayName: userInfo.displayName,
      tenantId: userInfo.tenantId,
      clinicId: userInfo.clinicId,
      role: userInfo.role,
      preferred_username: userInfo.preferred_username,
    };

    log("REFRESH_TOKEN", "✅ Token refreshed successfully");
    res.status(200).json(responseData);
  } catch (err) {
    log("REFRESH_TOKEN", "💥 Refresh failed", {
      error: err.response?.data || err.message,
    });
    next(
      new AppError(err.response?.data?.error_description || err.message, 401)
    );
  }
});

// Logout
// router.post("/logout", async (req, res, next) => {
//   log("LOGOUT", "Initiating logout");
//   try {
//     const refreshToken = req.cookies?.refresh_token;
//     const realm = req.headers["x-realm"];
//     const clientid = req.headers["x-clientid"];

//     if (refreshToken && realm && clientid) {
//       try {
//         const tokenUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/logout`;
//         await axios.post(
//           tokenUrl,
//           qs.stringify({
//             client_id: clientid,
//             client_secret: getClientCredential(clientid),
//             refresh_token: refreshToken,
//           }),
//           { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//         );
//         log("LOGOUT", "✅ Keycloak session revoked");
//       } catch (err) {
//         log("LOGOUT", "⚠️ Keycloak logout warning", { error: err.message });
//       }
//     }

//     const isProduction = process.env.NODE_ENV === "production";
//     res.clearCookie("access_token", {
//       httpOnly: true,
//       secure: isProduction,
//       sameSite: isProduction ? "None" : "Lax",
//       path: "/",
//     });
//     res.clearCookie("refresh_token", {
//       httpOnly: true,
//       secure: isProduction,
//       sameSite: isProduction ? "None" : "Lax",
//       path: "/",
//     });
//     res.clearCookie("client_id", {
//       httpOnly: true,
//       secure: isProduction,
//       sameSite: isProduction ? "None" : "Lax",
//       path: "/",
//     });

//     log("LOGOUT", "✅ Cookies cleared — logout complete");
//     return res
//       .status(200)
//       .json({ success: true, message: "Logged out successfully" });
//   } catch (err) {
//     log("LOGOUT", "💥 Logout failed", { error: err });
//     next(new AppError("Logout failed", 500));
//   }
// });

// Forgot Password
router.post("/forgettenpassword", async (req, res, next) => {
  // log("FORGOT_PASSWORD", "Forgot password request", req.body);

  try {
    const { username, host } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    // Initialize session store for forgot password OTPs
    if (!req.session.forgotPasswordStore) req.session.forgotPasswordStore = {};

    const HOST_REALM_CLIENT = JSON.parse(process.env.HOST_REALM_CLIENT);
    const tenantConfig = HOST_REALM_CLIENT[host];
    if (!tenantConfig) return res.status(400).json({ error: "Invalid host" });

    const { realm, clientId } = tenantConfig;

    // Keycloak admin login to fetch user
    const tokenRes = await keycloakLogin(
      process.env.VIEW_USER_USERNAME,
      process.env.VIEW_USER_PASS,
      realm,
      clientId
    );
    const adminToken = tokenRes.access_token;

    const user = await getUserByUsername(adminToken, realm, username);
    if (!user) {
      log("FORGOT_PASSWORD", "❌ User not found");
      return res.status(404).json({ message: "User not found" });
    }

    // const clinic = await getClinicByTenantIdAndClinicId(
    //   user?.attributes?.tenant_id[0],
    //   user?.attributes?.clinic_id[0]
    // );
    if (!clinic) {
      log("FORGOT_PASSWORD", "❌ Clinic not found");
      return res.status(404).json({ message: "Clinic not found" });
    }

    if (!clinic.otp) {
      log("FORGOT_PASSWORD", "💥 OTP option is not enabled for this clinic");
      return res.status(400).json({ message: "OTP option not enabled" });
    }

    // Determine where to send OTP
    let sendValue;
    const via = clinic?.otp_type;
    if (via === "sms") sendValue = user.attributes?.phoneNumber?.[0];
    else if (via === "email") sendValue = user.attributes?.email?.[0];
    else if (via === "whatsapp")
      sendValue = user.attributes?.whatsappNumber?.[0];

    if (!sendValue) {
      log("FORGOT_PASSWORD", "❌ No contact value found for OTP");
      return res
        .status(400)
        .json({ message: "No contact value found for OTP" });
    }

    // Send OTP and store in session
    const otpResponse = await sendOTP({
      to: sendValue,
      username,
      via,
      message: "Your password reset OTP",
      length: 6,
      expiryMinutes: 10,
      session: req.session, // pass session to store OTP
    });

    // Store OTP details in session for verification
    req.session.forgotPasswordStore[username] = {
      otp: otpResponse.otp,
      expiry: otpResponse.expiry,
    };

    // log("FORGOT_PASSWORD", "✅ OTP sent for password reset", { to: sendValue });

    return res.status(200).json({
      message: "OTP sent successfully",
      to: sendValue,
      otp: process.env.NODE_ENV === "development" ? otpResponse.otp : undefined,
      step: "otp",
    });
  } catch (err) {
    log("FORGOT_PASSWORD", "💥 Error sending OTP", { error: err });
    next(new AppError(err.message || "Failed to send OTP", 500));
  }
});

// Reset Password
router.post("/reset-password", async (req, res, next) => {
  log("RESET_PASSWORD_ROUTE", "Password reset request", req.body);
  try {
    const { username, newPassword, host } = req.body;
    const HOST_REALM_CLIENT = JSON.parse(process.env.HOST_REALM_CLIENT);
    const tenantConfig = HOST_REALM_CLIENT[host];
    if (!tenantConfig) return res.status(400).json({ error: "Invalid host" });
    const { realm, clientId } = tenantConfig;

    if (!username || !newPassword) {
      return res
        .status(400)
        .json({ message: "Username and newPassword are required" });
    }

    const tokenResponse = await keycloakLogin(
      process.env.VIEW_USER_USERNAME,
      process.env.VIEW_USER_PASS,
      realm,
      clientId
    );
    const adminToken = tokenResponse.access_token;

    const userResponse = await axios.get(
      `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users?username=${username}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const user = userResponse.data[0];
    if (!user) {
      log("RESET_PASSWORD_ROUTE", "❌ User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const resetUrl = `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${user.id}/reset-password`;
    await axios.put(
      resetUrl,
      { type: "password", value: newPassword, temporary: false },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    log("RESET_PASSWORD_ROUTE", "✅ Password reset successful");
    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    log("RESET_PASSWORD_ROUTE", "💥 Error", {
      error: err.response?.data || err.message,
    });
    next(new AppError(err.response?.data?.error || err.message, 500));
  }
});

router.post("/register", async (req, res, next) => {
  // log("USER_REGISTER_IN_KEYCLOAK", "user register process", req.body);
  try {
    const { email, firstname, lastname, phone, host } = req.body;
    const HOST_REALM_CLIENT = JSON.parse(process.env.HOST_REALM_CLIENT);
    const tenantConfig = HOST_REALM_CLIENT[host];
    if (!tenantConfig) return res.status(400).json({ error: "Invalid host" });
    const { realm, clientId } = tenantConfig;

    if (!firstname || !lastname || !phone) {
      return res
        .status(400)
        .json({ message: "Firstname lasname phonenumber are required" });
    }

    const tokenResponse = await keycloakLogin(
      process.env.VIEW_USER_USERNAME,
      process.env.VIEW_USER_PASS,
      realm,
      clientId
    );
    const adminToken = tokenResponse.access_token;

    const username = await generateUsername("GST", realm, adminToken);

    const password = "1234" || generateAlphanumericPassword(12);

    const userEmail =
      email || `${username}${generateAlphanumericPassword(6)}@example.com`;

    const userData = {
      username,
      email: userEmail || "",
      emailVerified: true,
      firstName: firstname,
      lastName: lastname,
      attributes: {
        phoneNumber: phone || "",
        tenant_id: tokenResponse?.tenant_id || "",
        clinic_id: tokenResponse?.clinic_id || "",
      },
      password: password,
    };

    const isUserCreated = await addUser(adminToken, realm, userData);
    if (!isUserCreated)
      throw new AppError("Keycloak user creation failed", 400);

    log("USER_CREATED", "✅ User Created successfully");
    return res.status(200).json({ message: "User Created successfully" });
  } catch (err) {
    log("USER_CREATED", "💥 Error", {
      error: err.response?.data || err.message,
    });
    next(new AppError(err.response?.data?.error || err.message, 500));
  }
});

module.exports = router;
