// ============================================================================
// ssoAuth.js - Dreamhouse Project Adaptation
// Keycloak Authentication with Dreamhouse DB Schema
// ============================================================================
const express = require("express");
const cookieParser = require("cookie-parser");
const qs = require("querystring");
const axios = require("axios");
const { AppError } = require("../Logics/AppError");
const { UAParser } = require("ua-parser-js");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const { getTenantById } = require("../Service/TenantService");
const { createDebugLogger } = require("../utils/Debugger");
const { updateUserPassword } = require("../Service/UserService");
const {
  sendOTP,
  canSendOTP,
  setOtpCooldown,
  verifyOTP,
} = require("../utils/Otp");
const passwordHash = require("../Logics/PasswordHash");

const router = express.Router();
router.use(cookieParser());

// ============================================================================
// 🐛 DEBUG CONFIGURATION
// ============================================================================
const debug = createDebugLogger("SsoAuth", "DEBUG_AUTH");

// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================
const isProduction = process.env.NODE_ENV === "production";

// ✅ Updated: Include all Dreamhouse roles
const ROLE_PRIORITY = ["SUPERUSER", "ADMIN", "MANAGER", "APPRAISER", "OPERATOR", "STAFF", "DEV"];

const CONFIG = {
  KEYCLOAK: {
    BASE_URL: process.env.KEYCLOAK_BASE_URL,
    PUBLIC_KEY: `-----BEGIN PUBLIC KEY-----
${process.env.KEYCLOAK_REALM_PUBLIC_KEY}
-----END PUBLIC KEY-----`,
    ADMIN_USER: process.env.VIEW_USER_USERNAME,
    ADMIN_PASS: process.env.VIEW_USER_PASS,
  },
  COOKIES: {
    OPTIONS: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      path: "/",
    },
    EXPIRY: {
      ACCESS: Number(process.env.ACCESS_COOKIE_EXPIRE_TIME || 900) * 1000,
      REFRESH: Number(process.env.REFRESH_COOKIE_EXPIRE_TIME || 86400) * 1000,
    },
  },
  HOST_REALM_CLIENT: JSON.parse(process.env.HOST_REALM_CLIENT || "{}"),
  CLIENT_CREDENTIALS: JSON.parse(process.env.CLIENT_CREDENTIALS || "{}"),
};

const MESSAGES = {
  UNAUTHORIZED: "Session expired. Please login again.",
  INVALID_HOST: "Invalid host",
  LOGIN_SUCCESS: "Login successful",
  USER_NOT_FOUND: "User not found",
  INVALID_CREDENTIALS: "Invalid credentials",
};

// ============================================================================
// 🗄️ REDIS SERVICE (Using centralized client)
// ============================================================================
const { redisClient: rawRedis } = require("../Config/redis");
const { pool } = require("../Config/db");

class RedisService {
  static async setEx(key, ttlSeconds, value) {
    try {
      const data = typeof value === "object" ? JSON.stringify(value) : value;
      const result = await rawRedis.set(key, data, "EX", ttlSeconds);
      debug.log("RedisService", "✅ SETEX", { key, ttl: ttlSeconds, result });
      return result === "OK";
    } catch (err) {
      debug.error("RedisService", "❌ SETEX failed", { key, error: err.message });
      throw err;
    }
  }

  static async get(key) {
    try {
      const result = await rawRedis.get(key);
      if (!result) return null;
      try {
        return JSON.parse(result);
      } catch (parseErr) {
        console.warn(`Redis JSON parse failed for ${key}:`, parseErr.message);
        return result;
      }
    } catch (err) {
      console.error(`Redis GET failed for ${key}:`, err.message);
      return null;
    }
  }

  static async del(...keys) {
    try {
      const count = await rawRedis.del(...keys);
      debug.log("RedisService", "✅ DEL", { keys, deleted: count });
      return count;
    } catch (err) {
      debug.error("RedisService", "❌ DEL failed", { keys, error: err.message });
      throw err;
    }
  }

  static async exists(key) {
    try {
      return (await rawRedis.exists(key)) === 1;
    } catch (err) {
      debug.error("RedisService", "❌ EXISTS failed", { key, error: err.message });
      throw err;
    }
  }

  static async ttl(key) {
    try {
      return await rawRedis.ttl(key);
    } catch (err) {
      debug.error("RedisService", "❌ TTL failed", { key, error: err.message });
      throw err;
    }
  }

  static async incrWithExpiry(key, ttlSeconds) {
    try {
      const pipeline = rawRedis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, ttlSeconds);
      const [[err1, count]] = await pipeline.exec();
      if (err1) throw err1;
      debug.log("RedisService", "✅ INCR with expiry", { key, count, ttl: ttlSeconds });
      return count;
    } catch (err) {
      debug.error("RedisService", "❌ INCR with expiry failed", { key, error: err.message });
      throw err;
    }
  }

  static async checkHealth() {
    try {
      await rawRedis.ping();
      return { status: "healthy", timestamp: new Date().toISOString() };
    } catch (err) {
      return { status: "unhealthy", error: err.message, timestamp: new Date().toISOString() };
    }
  }

  static async gracefulShutdown() {
    try {
      await rawRedis.quit();
      debug.log("RedisService", "✅ Redis connection closed");
    } catch (err) {
      debug.error("RedisService", "❌ Redis shutdown failed", err);
    }
  }

  static async scanKeys(pattern, count = 100) {
    try {
      const keys = [];
      let cursor = "0";
      do {
        const [nextCursor, found] = await rawRedis.scan(cursor, "MATCH", pattern, "COUNT", count);
        keys.push(...found);
        cursor = nextCursor;
      } while (cursor !== "0");
      return keys;
    } catch (err) {
      debug.error("RedisService", "❌ SCAN failed", { pattern, error: err.message });
      throw err;
    }
  }

  static async deleteByPattern(pattern, batchSize = 100) {
    let deletedCount = 0;
    let cursor = "0";
    do {
      const [nextCursor, keys] = await rawRedis.scan(cursor, "MATCH", pattern, "COUNT", batchSize);
      if (keys.length > 0) {
        const delCount = await rawRedis.del(...keys);
        deletedCount += delCount;
      }
      cursor = nextCursor;
    } while (cursor !== "0");
    return deletedCount;
  }
}

// ============================================================================
// 🗄️ SESSION SERVICE
// ============================================================================
class SessionService {
  static async createSession(userContext, tokens) {
    const sessionId = randomUUID();
    const sessionData = {
      user_id: userContext.user_id,
      tenant_id: userContext.tenant_id,
      branch_id: userContext.default_branch_id,
      role: userContext.role,
      clientId: userContext.clientId,
      realm: userContext.realm,
      refresh_token: tokens.refresh_token,
      login_time: new Date().toISOString(),
      last_activity: new Date().toISOString(),
    };
    await RedisService.setEx(`session:${sessionId}`, 86400, sessionData);
    debug.log("SessionService", "✅ Session created", { sessionId, userId: userContext.user_id });
    return { sessionId, sessionData };
  }

  static async getSession(sessionId) {
    if (!sessionId) return null;
    try {
      const session = await RedisService.get(`session:${sessionId}`);
      if (!session) {
        console.debug(`Session not found: ${sessionId}`);
        return null;
      }
      session.last_activity = new Date().toISOString();
      await RedisService.setEx(`session:${sessionId}`, 86400, session);
      return session;
    } catch (error) {
      console.error(`SessionService.getSession error:`, { sessionId, name: error?.name, message: error?.message });
      return null;
    }
  }

  static async destroySession(sessionId) {
    if (!sessionId) return;
    await RedisService.del(`session:${sessionId}`, `api_count:${sessionId}`);
    debug.log("SessionService", "✅ Session destroyed", { sessionId });
  }

  static async updateRefreshToken(sessionId, newRefreshToken) {
    const session = await RedisService.get(`session:${sessionId}`);
    if (!session) throw new Error("Session expired");
    session.refresh_token = newRefreshToken;
    session.last_activity = new Date().toISOString();
    await RedisService.setEx(`session:${sessionId}`, 86400, session);
    debug.log("SessionService", "✅ Refresh token updated", { sessionId });
    return session;
  }
}

// ============================================================================
// 🗄️ DREAMHOUSE-SPECIFIC SERVICE FUNCTIONS
// ============================================================================

// ✅ Updated: Match dreamhouse.user schema (first_name, last_name, ENUM status)
async function getUserByKeycloakId(keycloakId) {
  const conn = await pool.getConnection();
  debug.log("UserService", "Fetching user by Keycloak ID", { keycloakId });
  try {
    const rows = await conn.query(
      `
      SELECT
        u.user_id,
        u.keycloak_id,
        u.username,
        u.first_name,
        u.last_name,
        u.role,
        u.status,
        u.failed_attempt_count,
        u.account_locked,
        u.tenant_id,
        u.email,
        u.phone_number
      FROM user u
      WHERE u.keycloak_id = ?
      LIMIT 1
      `,
      [keycloakId],
    );
    debug.log("UserService", "Query result", { found: rows?.[0] ? true : false, userId: rows?.[0]?.user_id });
    return rows;
  } catch (error) {
    debug.error("UserService", "Failed to fetch user", error);
    throw new Error(`Failed to fetch user: ${error.message}`);
  } finally {
    if (conn) conn.release();
  }
}

// ✅ Updated: Check status = 'A' (Dreamhouse ENUM)
async function getUserByKeycloakIdWithTenant(keycloakId, tenantId) {
  debug.log("UserService", "Fetching user by Keycloak ID with tenant", { keycloakId, tenantId });
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `
      SELECT
        u.user_id,
        u.keycloak_id,
        u.username,
        u.first_name,
        u.last_name,
        u.role,
        u.status,
        u.failed_attempt_count,
        u.account_locked,
        u.tenant_id,
        u.email,
        u.phone_number
      FROM user u
      WHERE u.keycloak_id = ?
      AND u.tenant_id = ?
      AND u.status = 'A'
      LIMIT 1
      `,
      [keycloakId, tenantId],
    );
    debug.log("UserService", "User fetch with tenant result", { found: rows?.[0] ? true : false, userId: rows?.[0]?.user_id });
    return rows?.[0] || null;
  } catch (error) {
    debug.error("UserService", "Failed to fetch user with tenant", error);
    throw new Error(`Failed to fetch user: ${error.message}`);
  } finally {
    if (conn) conn.release();
  }
}

// ✅ Updated: JOIN with `userbranch` (no underscore)
async function getBranchByTenantIdAndUserId(tenantId, userId, conn) {
  debug.log("BranchService", "Fetching user branches", { tenantId, userId });
  try {
    const rows = await conn.query(
      `
      SELECT
        b.branch_id,
        b.branch_name,
        b.branch_code,
        b.tenant_id,
        b.address,
        b.city,
        b.state,
        b.pincode,
        b.email,
        b.phone,
        b.is_active,
        b.created_at
      FROM branch b
      INNER JOIN userbranch ub ON ub.branch_id = b.branch_id
      WHERE b.tenant_id = ?
      AND ub.user_id = ?
      AND b.is_active = 1
      ORDER BY b.branch_id ASC
      `,
      [tenantId, userId],
    );
    debug.log("BranchService", "Branches found", { count: rows?.length || 0 });
    return rows;
  } catch (error) {
    debug.error("BranchService", "Failed to fetch branches", error);
    throw new Error(`Failed to fetch branches: ${error.message}`);
  }
}

// ✅ Updated: Dreamhouse branch fields
async function getAllBranchByTenantId(tenantId, conn) {
  debug.log("BranchService", "Fetching all tenant branches", { tenantId });
  try {
    const rows = await conn.query(
      `
      SELECT
        branch_id,
        branch_name,
        branch_code,
        tenant_id,
        address,
        city,
        state,
        pincode,
        email,
        phone,
        is_active,
        created_at
      FROM branch
      WHERE tenant_id = ?
      AND is_active = 1
      ORDER BY branch_id ASC
      `,
      [tenantId],
    );
    debug.log("BranchService", "All branches found", { count: rows?.length || 0 });
    return rows;
  } catch (error) {
    debug.error("BranchService", "Failed to fetch all branches", error);
    throw new Error(`Failed to fetch tenant branches: ${error.message}`);
  }
}

// ============================================================================
// 🗄️ UTILS (IP, Geo, User-Agent)
// ============================================================================
const getIp = (req) => {
  let ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || null;
  const normalized = ip === "::1" ? "127.0.0.1" : ip;
  debug.log("Utils", "Extracted IP", { raw: ip, normalized });
  return normalized;
};

const getUserAgentInfo = (req) => {
  const ua = new UAParser(req.headers["user-agent"] || "").getResult();
  const info = {
    browser: ua.browser.name && ua.browser.version ? `${ua.browser.name} ${ua.browser.version}` : "Unknown",
    device: ua.device.type ? ua.device.type.charAt(0).toUpperCase() + ua.device.type.slice(1) : "Desktop",
  };
  debug.log("Utils", "Parsed User-Agent", info);
  return info;
};

const getGeoInfo = async (ip) => {
  debug.log("GeoService", "Looking up geo info", { ip });
  const isLocal = ip === "127.0.0.1" || ip === "::1" || ip?.startsWith("192.168.") || ip?.startsWith("10.");
  if (isLocal) {
    return { country: "Local", state: "Local", city: "Local", isp: "Local Network", latitude: null, longitude: null, timezone: "Asia/Kolkata", source: "local" };
  }
  try {
    const { data } = await axios.get(`https://ipwho.is/${ip}`, { timeout: 5000 });
    if (data.success !== false) {
      return {
        country: data.country,
        state: data.region,
        city: data.city,
        isp: data.connection?.isp,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone?.id,
        country_code: data.country_code,
        asn: data.connection?.asn,
        org: data.connection?.org,
        source: "ipwho.is",
      };
    }
  } catch (err) {
    debug.warn("GeoService", "ipwho.is failed", err.message);
  }
  return { country: null, state: null, city: null, isp: null, latitude: null, longitude: null, timezone: null, source: "unknown" };
};

const setCache = async (key, value, ttlSeconds) => {
  try {
    return await RedisService.setEx(key, ttlSeconds, value);
  } catch (err) {
    debug.error("Redis", "Cache set failed", { key, error: err.message });
    throw err;
  }
};

const getCache = async (key) => {
  try {
    return await RedisService.get(key);
  } catch (err) {
    debug.error("Redis", "Cache get failed", { key, error: err.message });
    throw err;
  }
};

// --- Keycloak Helpers ---
const getKeycloakUrl = (realm, path) => `${CONFIG.KEYCLOAK.BASE_URL}/realms/${realm}${path}`;

const getClientCredential = (clientId) => {
  debug.log("Keycloak", "Looking up client credential", { clientId });
  const secret = CONFIG.CLIENT_CREDENTIALS[clientId];
  if (!secret) {
    debug.error("Keycloak", "Client credential not found", { clientId });
    throw new AppError(`No client credential found for clientId: ${clientId}`, 400);
  }
  debug.log("Keycloak", "Client credential found (masked)", { clientId, secret: "****" });
  return secret;
};

const keycloakLogin = async (username, password, realm, clientId) => {
  debug.log("Keycloak", "Attempting login", { username, realm, clientId });
  const url = getKeycloakUrl(realm, "/protocol/openid-connect/token");
  try {
    const response = await axios.post(
      url,
      new URLSearchParams({ client_id: clientId, grant_type: "password", username, password }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    debug.log("Keycloak", "✅ Login successful", { hasAccessToken: !!response.data.access_token, expiresIn: response.data.expires_in });
    return response.data;
  } catch (error) {
    debug.error("Keycloak", "❌ Login failed", { status: error.response?.status, error: error.response?.data });
    throw new AppError(error.response?.data?.error_description || "Login failed", error.response?.status || 500);
  }
};

const keycloakRefresh = async (refreshToken, realm, clientId) => {
  debug.log("Keycloak", "Refreshing token", { realm, clientId });
  const url = getKeycloakUrl(realm, "/protocol/openid-connect/token");
  try {
    const response = await axios.post(
      url,
      qs.stringify({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    debug.log("Keycloak", "✅ Token refreshed", { newExpiresIn: response.data.expires_in });
    return response.data;
  } catch (error) {
    debug.error("Keycloak", "❌ Refresh failed", { status: error.response?.status });
    throw error;
  }
};

const decodeToken = (token) => {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT");
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    debug.log("Token", "Decoded JWT payload (partial)", { sub: payload?.sub?.substring(0, 10) + "...", preferred_username: payload?.preferred_username });
    return payload;
  } catch (err) {
    debug.error("Token", "Failed to decode JWT", err);
    return null;
  }
};

const extractUserInfo = (token) => {
  const globalRoles = token.realm_access?.roles || [];
  const role = ROLE_PRIORITY.find((r) => globalRoles.some((gr) => gr.toLowerCase() === r.toLowerCase())) || "STAFF";
  const info = { username: token?.preferred_username, userId: token.sub, displayName: token.name, role };
  debug.log("Token", "Extracted user info", { role, username: info.username });
  return info;
};

// ============================================================================
// 3. SERVICES (Business Logic)
// ============================================================================
const UserService = {
  verifyTokenInDB: async (token, conn) => {
    debug.log("UserService", "Verifying token in DB");
    try {
      const decoded = jwt.verify(token, CONFIG.KEYCLOAK.PUBLIC_KEY, { algorithms: ["RS256"] });
      debug.log("UserService", "JWT verified", { sub: decoded.sub?.substring(0, 10) + "..." });
      const user = await getUserByKeycloakId(decoded.sub);
      if (!user || !user[0]) {
        debug.error("UserService", "User not found in DB", { keycloakId: decoded.sub });
        throw new AppError(MESSAGES.USER_NOT_FOUND, 404);
      }
      debug.log("UserService", "✅ User verified", { userId: user[0].user_id, role: user[0].role });
      return user[0];
    } catch (error) {
      debug.error("UserService", "Token verification failed", error);
      throw error;
    }
  },
  updateFailedAttempts: async (username, increment = true, conn) => {
    debug.log("UserService", `Updating failed attempts (${increment ? "increment" : "reset"})`, { username });
    try {
      if (increment) {
        const result = await conn.query(
          `UPDATE user SET failed_attempt_count = failed_attempt_count + 1 WHERE LOWER(username) = ?`,
          [username.toLowerCase()],
        );
        debug.log("UserService", "Failed attempt incremented", { affectedRows: result.affectedRows });
      }
    } catch (e) {
      debug.error("UserService", "Failed to update attempts", e);
    }
  },
  resetFailedAttempts: async (userId, conn) => {
    debug.log("UserService", "Resetting failed attempts", { userId });
    try {
      const result = await conn.query(
        `UPDATE user SET failed_attempt_count = 0, last_login = NOW() WHERE user_id = ?`,
        [userId],
      );
      debug.log("UserService", "✅ Failed attempts reset", { affectedRows: result.affectedRows });
    } catch (e) {
      debug.error("UserService", "Failed to reset attempts", e);
    }
  },
};

// ✅ Updated: Match dreamhouse.login_history & user_activity schemas
const AuditService = {
  logLogin: async (userContext, req, geo, ua, dbUser, networkDetails) => {
    debug.log("AuditService", "Logging login activity", { userId: userContext.user_id, sessionId: userContext.session_id });
    const ip = getIp(req);
    const session_id = userContext.session_id;
    const suspicious = (dbUser?.failed_attempt_count || 0) >= 5 || (networkDetails?.country && networkDetails.country !== "India") ? "Yes" : "No";
    let conn;
    try {
      conn = await pool.getConnection();

      // ✅ Dreamhouse login_history schema
      const historyParams = [
        Number(dbUser?.tenant_id) || null,
        Number(userContext.default_branch_id) || null,
        Number(userContext.user_id),
        session_id,
        networkDetails?.ip_address || null,
        ua?.device || "Unknown",
        ua?.browser || "Unknown",
      ].map((v) => (typeof v === "bigint" ? Number(v) : v));

      const historyResult = await conn.query(
        `INSERT INTO login_history (tenant_id, branch_id, user_id, session_id, login_time, ip_address, device_info, browser_info) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)`,
        historyParams,
      );
      debug.log("AuditService", "📝 Login history inserted", { insertId: historyResult?.insertId });

      // ✅ Dreamhouse user_activity schema
      const safe = (val) => (val === undefined ? null : val);
      const activityParams = [
        Number(userContext.user_id),
        session_id,
        "success",
        req.headers["x-session-source"] || "web",
        ip,
        safe(geo.country),
        safe(geo.state),
        safe(geo.city),
        safe(geo.isp),
        safe(req.body.network_type) || "Unknown",
        safe(ua.browser),
        safe(ua.device),
        Number(dbUser?.failed_attempt_count || 0),
        dbUser?.is_2fa_enabled ? "Yes" : "No",
        0,
        suspicious,
        0,
      ].map((v) => (typeof v === "bigint" ? Number(v) : v));

      const activityResult = await conn.query(
        `INSERT INTO user_activity (user_id, session_id, login_status, session_source, ip_address, country, state, city, isp_provider, network_type, browser, device, failed_attempt_count, two_factor_used, password_changed_recently, suspicious_flag, api_calls_count, login_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        activityParams,
      );
      debug.log("AuditService", "📊 User activity logged", { insertId: activityResult?.insertId, suspicious, location: `${networkDetails?.city}, ${networkDetails?.country}` });
    } catch (err) {
      debug.error("AuditService", "Failed to log audit", err);
    } finally {
      if (conn) conn.release();
    }
  },

  logLogout: async (session_id, reason) => {
    debug.log("AuditService", "Logging logout", { session_id, reason });
    let conn;
    try {
      conn = await pool.getConnection();
      const count = await RedisService.get(`api_count:${session_id}`);
      
      // ✅ Dreamhouse login_history: logout_time column
      await conn.query(`UPDATE login_history SET logout_time = NOW() WHERE session_id = ?`, [session_id]);
      
      // ✅ Dreamhouse user_activity: duration, last_activity_time columns
      await conn.query(
        `UPDATE user_activity SET logout_time = NOW(), logout_reason = ?, api_calls_count = ?, last_activity_time = NOW(), duration = TIMESTAMPDIFF(SECOND, login_time, NOW()) WHERE session_id = ?`,
        [reason || "manual", Number(count) || 0, session_id],
      );
      debug.log("AuditService", "✅ Logout audit updated");
    } catch (err) {
      debug.error("AuditService", "Failed to log logout", err);
      throw err;
    } finally {
      if (conn) conn.release();
    }
  },
};

// ✅ Updated: Dreamhouse tenant/branch structure + first_name/last_name
const ContextService = {
  build: async (accessToken, dbUser, conn) => {
    debug.log("ContextService", "Building user context", { userId: dbUser.user_id });
    const decoded = decodeToken(accessToken);
    const info = extractUserInfo(decoded);
    const role = info.role;

    // 🔐 DEV ROLE BYPASS
    const isDevBypassEnabled = process.env.ALLOW_DEV_BYPASS === "true";
    const isDevUser = role === "DEV";
    if (isDevUser && isDevBypassEnabled && !isProduction) {
      debug.log("ContextService", "⚠️ DEV role bypass active (non-production only)");
      return {
        user_id: Number(dbUser.user_id),
        username: dbUser.username,
        first_name: dbUser.first_name,
        last_name: dbUser.last_name,
        role: "DEV",
        tenant_id: null,
        tenant_name: null,
        branches: null,
        default_branch_id: null,
        keycloak_id: info.userId,
        displayName: info.displayName,
      };
    }

    debug.log("ContextService", "Loading tenant", { tenantId: dbUser.tenant_id });
    const tenant = await getTenantById(dbUser.tenant_id);

    debug.log("ContextService", "Loading branches", { role, tenantId: dbUser.tenant_id, userId: dbUser.user_id });
    const branches = role === "ADMIN"
      ? await getAllBranchByTenantId(dbUser.tenant_id, conn)
      : await getBranchByTenantIdAndUserId(dbUser.tenant_id, dbUser.user_id, conn);

    if (role !== "ADMIN" && (!branches || branches.length === 0)) {
      debug.error("ContextService", "No branches assigned to non-admin user");
      throw new Error("No branches assigned");
    }

    const branchData = branches?.map((b) => ({
      branch_id: Number(b.branch_id),
      branch_name: b.branch_name,
      branch_code: b.branch_code,
      address: b.address,
      city: b.city,
      state: b.state,
      pincode: b.pincode,
    }));

    // ✅ Dreamhouse: head_branch is VARCHAR, parse to int if numeric
    const headBranchId = tenant?.head_branch && !isNaN(tenant.head_branch) ? parseInt(tenant.head_branch) : null;

    const context = {
      user_id: Number(dbUser.user_id),
      username: dbUser.username,
      first_name: dbUser.first_name,
      last_name: dbUser.last_name,
      email: dbUser.email,
      phone_number: dbUser.phone_number,
      role,
      // Tenant
      tenant_id: Number(tenant.tenant_id),
      tenant_name: tenant.tenant_name,
      tenant_domain: tenant.tenant_domain,
      tenant_app_logo: tenant.tenant_app_logo,
      tenant_app_name: tenant.tenant_app_name,
      tenant_app_themes: tenant.tenant_app_themes, // JSON string
      tenant_app_font: tenant.tenant_app_font,
      // Branches
      branches: branchData,
      default_branch_id: headBranchId,
      head_branch_id: headBranchId,
      default_branch_name: branchData?.[0]?.branch_name,
      default_branch_code: branchData?.[0]?.branch_code,
      // Keycloak
      keycloak_id: info.userId,
      displayName: info.displayName,
    };

    debug.log("ContextService", "✅ Context built", { role: context.role, tenantName: context.tenant_name, branchCount: context.branches?.length || 0 });
    return context;
  },
};

// ============================================================================
// 4. MIDDLEWARE
// ============================================================================
const attemptRefresh = async (req, res, next) => {
  debug.log("Middleware", "🔄 Attempting token refresh");
  try {
    const session_id = req.cookies?.session_id || req.headers["session-id"];
    if (!session_id) return next(new AppError(MESSAGES.UNAUTHORIZED, 401));
    const session = await SessionService.getSession(session_id);
    if (!session) return next(new AppError(MESSAGES.UNAUTHORIZED, 401));
    debug.log("Middleware", "Calling Keycloak refresh");
    const tokens = await keycloakRefresh(session.refresh_token, session.realm, session.clientId);
    res.cookie("access_token", tokens.access_token, { ...CONFIG.COOKIES.OPTIONS, maxAge: CONFIG.COOKIES.EXPIRY.ACCESS });
    res.cookie("refresh_token", tokens.refresh_token, { ...CONFIG.COOKIES.OPTIONS, maxAge: CONFIG.COOKIES.EXPIRY.REFRESH });
    await SessionService.updateRefreshToken(session_id, tokens.refresh_token);
    req.access_token = tokens.access_token;
    req.tokenData = jwt.verify(tokens.access_token, CONFIG.KEYCLOAK.PUBLIC_KEY, { algorithms: ["RS256"] });
    req.session = session;
    req.user_id = session.user_id;
    debug.log("Middleware", "✅ Token refreshed successfully");
    return next();
  } catch (err) {
    debug.error("Middleware", "Refresh failed", err);
    return next(new AppError("Session expired. Please login again.", 401));
  }
};

// ✅ Updated: ALLOWED_ROLES includes Dreamhouse roles
const validateToken = async (req, res, next) => {
  debug.log("Middleware", "🔐 Validating token", { hasSessionCookie: !!req.cookies?.session_id });
  const ALLOWED_ROLES = ["DEV", "SUPERUSER", "ADMIN", "MANAGER", "APPRAISER", "OPERATOR", "STAFF"];
  try {
    const session_id = req.cookies?.session_id || req.headers["session-id"];
    if (!session_id) return res.status(401).json({ success: false, message: MESSAGES.UNAUTHORIZED });
    const session = await SessionService.getSession(session_id);
    if (!session) return res.status(401).json({ success: false, message: MESSAGES.UNAUTHORIZED });
    let token = req.cookies?.access_token;
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts[0] === "Bearer") token = parts[1];
    }
    if (!token) return res.status(401).json({ success: false, message: "Token missing" });
    try {
      debug.log("Middleware", "Verifying JWT signature");
      req.tokenData = jwt.verify(token, CONFIG.KEYCLOAK.PUBLIC_KEY, { algorithms: ["RS256"] });
      req.session = session;
      req.user = req.tokenData;
      req.user_id = session.user_id;
      req.tenant_id = session.tenant_id;
      req.branch_id = session.branch_id || null;
      const tokenRoles = req.tokenData.realm_access?.roles || [];
      debug.log("Middleware", "Roles found in token", { tokenRoles });
      const matchedRole = ALLOWED_ROLES.find((allowedRole) =>
        tokenRoles.some((tokenRole) => tokenRole.toUpperCase() === allowedRole.toUpperCase())
      );
      if (matchedRole) {
        debug.log("Middleware", `🛠 Role "${matchedRole}" detected - skipping DB validation`);
        req.role = matchedRole.toUpperCase();
        req.userStatus = "A";
        return next();
      }
      const keycloakId = req.tokenData.sub;
      debug.log("Middleware", "Fetching user from database", { keycloakId, tenantId: req.tenant_id });
      const userData = await getUserByKeycloakIdWithTenant(keycloakId, req.tenant_id);
      if (!userData) {
        debug.error("Middleware", "User not found in database", { keycloakId, tenantId: req.tenant_id });
        return res.status(401).json({ success: false, message: "User not found or inactive in system" });
      }
      req.role = userData.role;
      req.userStatus = userData.status; // 'A' or 'IA'
      debug.log("Middleware", "✅ User fetched from DB, role assigned", { userId: userData.user_id, role: userData.role, status: userData.status });
      return next();
    } catch (err) {
      debug.log("Middleware", `JWT verify error: ${err.name}`);
      if (err.name === "TokenExpiredError") {
        debug.log("Middleware", "Token expired, attempting refresh");
        return attemptRefresh(req, res, next);
      }
      debug.error("Middleware", "Invalid token", err);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  } catch (err) {
    debug.error("Middleware", "Auth middleware crash", err);
    return res.status(401).json({ success: false, message: "Authentication failed" });
  }
};

// ============================================================================
// 5. ROUTE HANDLERS (Dreamhouse Adapted)
// ============================================================================

// --- GET /me ---
router.get("/me", validateToken, async (req, res) => {
  debug.log("Route", "📍 GET /me called", { sessionId: req.cookies?.session_id, userId: req.session?.user_id });
  const user_id = req.session?.user_id || req.cookies.user_id;
  let conn;
  try {
    conn = await pool.getConnection();
    // ✅ Dreamhouse user schema: first_name, last_name
    const [user] = await conn.query(
      `SELECT u.user_id, u.username, u.first_name, u.last_name, u.role, u.email, u.phone_number, t.* 
       FROM user u 
       JOIN tenant t ON t.tenant_id = u.tenant_id 
       WHERE u.user_id = ?`,
      [user_id],
    );
    if (!user) {
      debug.error("Route", "User not found in DB", { user_id });
      await conn.rollback();
      return res.status(404).json({ message: "User not found" });
    }
    debug.log("Route", "User found", { userId: user.user_id, role: user.role });

    // ✅ Dreamhouse: userbranch table (no underscore)
    const branches = user.role === "ADMIN"
      ? await conn.query(`SELECT branch_id, branch_name, branch_code FROM branch WHERE tenant_id = ? AND is_active = 1`, [user.tenant_id])
      : await conn.query(
          `SELECT b.branch_id, b.branch_name, b.branch_code FROM userbranch ub JOIN branch b ON b.branch_id = ub.branch_id WHERE ub.user_id = ? AND b.is_active = 1`,
          [user_id],
        );

    if (!branches.length) {
      debug.error("Route", "No branches found for user");
      await conn.rollback();
      return res.status(403).json({ message: "No branches assigned" });
    }
    debug.log("Route", "Branches loaded", { count: branches.length });

    const responseData = {
      user_id: Number(user.user_id),
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone_number: user.phone_number,
      role: user.role,
      tenant_id: Number(user.tenant_id),
      tenant_code: user.tenant_code,
      tenant_name: user.tenant_name,
      tenant_app_name: user.tenant_app_name,
      tenant_app_logo: user.tenant_app_logo,
      tenant_app_font: user.tenant_app_font,
      tenant_app_themes: user.tenant_app_themes,
      branches: branches.map((b) => ({
        branch_id: Number(b.branch_id),
        branch_name: b.branch_name,
        branch_code: b.branch_code,
      })),
      // ✅ Dreamhouse: head_branch is VARCHAR, parse safely
      default_branch_id: user.head_branch && !isNaN(user.head_branch) ? Number(user.head_branch) : null,
      head_branch_id: user.head_branch && !isNaN(user.head_branch) ? Number(user.head_branch) : null,
    };
    debug.log("Route", "✅ Sending user data");
    res.json(responseData);
  } catch (error) {
    debug.error("Route", "ME API ERROR", error);
    if (conn) await conn.rollback();
    res.status(500).json({ message: "Failed to load user" });
  } finally {
    if (conn) await conn.release();
  }
});

// --- POST /login ---
router.post("/login", async (req, res) => {
  debug.log("Route", "📍 POST /login called", { username: req.body.username, host: req.body.host });
  const conn = await pool.getConnection();
  try {
    const { username, password, host } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password required" });
    const tenantConfig = CONFIG.HOST_REALM_CLIENT[host];
    if (!tenantConfig) return res.status(400).json({ error: MESSAGES.INVALID_HOST });
    const { realm, clientId } = tenantConfig;

    // 🔐 Keycloak Login
    const tokens = await keycloakLogin(username.toLowerCase(), password, realm, clientId);
    debug.log("Route", "Keycloak login successful");
    const decoded = jwt.decode(tokens.access_token);
    const roles = decoded?.realm_access?.roles || [];
    const isDevUser = roles.includes("DEV");

    let userContext;
    let dbUser = null;

    // ✅ DEV ROLE → Skip DB Verification
    if (isDevUser) {
      const isDevBypassEnabled = process.env.ALLOW_DEV_BYPASS === "true";
      if (!isDevBypassEnabled || isProduction) {
        debug.error("Route", "DEV bypass not allowed in production or without env flag");
        return res.status(403).json({ message: "DEV login not permitted" });
      }
      debug.log("Route", "DEV user detected - skipping DB check");
      userContext = {
        user_id: null,
        keycloak_id: decoded.sub,
        username: decoded.preferred_username,
        email: decoded.email,
        role: "DEV",
        realm,
        tenant_id: null,
        default_branch_id: null,
        clientId,
      };
    } else {
      // ✅ Existing DB Verification Flow
      dbUser = await UserService.verifyTokenInDB(tokens.access_token, conn);
      debug.log("Route", "DB User verified", dbUser);
      if (dbUser.status !== "A") {
        return res.status(403).json({ message: "User account is inactive" });
      }
      userContext = await ContextService.build(tokens.access_token, dbUser, conn);
      userContext.clientId = clientId;
      userContext.realm = realm;
    }

    // 🌐 Network Details
    const ip = getIp(req);
    const geo = await getGeoInfo(ip);
    const ua = getUserAgentInfo(req);
    const networkDetails = {
      ip_address: ip,
      country: geo.country,
      state: geo.state,
      city: geo.city,
      isp: geo.isp,
      network_type: req.body.network_type || "Unknown",
    };

    // 🟢 Session Create
    const { sessionId } = await SessionService.createSession(userContext, tokens);
    userContext.session_id = sessionId;


    // ✅ Set cookies
    res.cookie("session_id", sessionId, { ...CONFIG.COOKIES.OPTIONS, maxAge: CONFIG.COOKIES.EXPIRY.REFRESH });
    res.cookie("realm", realm, { ...CONFIG.COOKIES.OPTIONS, maxAge: CONFIG.COOKIES.EXPIRY.REFRESH });
    res.cookie("clientId", clientId, { ...CONFIG.COOKIES.OPTIONS, maxAge: CONFIG.COOKIES.EXPIRY.REFRESH });
    res.cookie("access_token", tokens.access_token, { ...CONFIG.COOKIES.OPTIONS, maxAge: CONFIG.COOKIES.EXPIRY.ACCESS });
    res.cookie("refresh_token", tokens.refresh_token, { ...CONFIG.COOKIES.OPTIONS, maxAge: CONFIG.COOKIES.EXPIRY.REFRESH });

    // ✅ Audit logging (skip for DEV)
    if (userContext.role !== "DEV") {
      await AuditService.logLogin(userContext, req, geo, ua, dbUser, networkDetails);
    }

    debug.log("Route", "✅ Login successful");

    // 🟢 Build Dreamhouse-specific response
    const loginResponse = {
      success: true,
      message: MESSAGES.LOGIN_SUCCESS,
      session_id: sessionId,
      // Tenant
      tenant_code: userContext.tenant_code,
      tenant_name: userContext.tenant_name,
      tenant_domain: userContext.tenant_domain,
      // Theme/App
      tenant_app_logo: userContext.tenant_app_logo || null,
      tenant_app_name: userContext.tenant_app_name || null,
      tenant_app_themes: userContext.tenant_app_themes || "blue",
      tenant_app_font: userContext.tenant_app_font || "Poppins",
      // ✅ Dreamhouse: first_name, last_name
      username: userContext.username,
      first_name: userContext.first_name,
      last_name: userContext.last_name,
      email: userContext.email,
      phone_number: userContext.phone_number,
      keycloak_user_id: userContext.keycloak_id,
      displayName: userContext.displayName,
      preferred_username: decoded?.preferred_username,
      tenant_id: userContext.tenant_id,
      user_id: userContext.user_id,
      role: userContext.role,
      // Branch
      branch_id: userContext.branch_id || userContext.default_branch_id,
      branch_name: userContext.branch_name,
      branch_code: userContext.branch_code,
      head_branch_id: userContext.head_branch_id,
      branches: Array.isArray(userContext.branches) ? userContext.branches : [],
      default_branch_id: userContext.default_branch_id,
      default_branch_name: userContext.default_branch_name,
      default_branch_code: userContext.default_branch_code,
    };

    debug.log("Route", "✅ Login response prepared", { userId: loginResponse.user_id, role: loginResponse.role });
    return res.status(200).json(loginResponse);
  } catch (err) {
    debug.error("Route", "Login failed", err);
    if (conn && req.body.username) {
      try {
        await UserService.updateFailedAttempts(req.body.username, true, conn);
      } catch (updateErr) {
        debug.error("Route", "Failed to record failed attempt", updateErr);
      }
    }
    return res.status(401).json({ message: MESSAGES.INVALID_CREDENTIALS });
  } finally {
    if (conn) await conn.release();
    debug.log("Route", "DB Connection Released");
  }
});

// --- POST /logout ---
router.post("/logout", async (req, res) => {
  const sessionId = req.cookies?.session_id;
  debug.log("Route", "📍 POST /logout called", { sessionId, reason: req.body?.reason });
  let conn;
  try {
    await AuditService.logLogout(sessionId, req.body?.reason);
    await SessionService.destroySession(sessionId);
    const cookieOptions = { httpOnly: true, secure: isProduction, sameSite: isProduction ? "None" : "Lax", path: "/" };
    ["session_id", "access_token", "refresh_token", "clientId", "realm", "user_id"].forEach((name) => {
      res.clearCookie(name, cookieOptions);
    });
    debug.log("Route", "🧹 Redis + cookies cleared", { sessionId });
    return res.status(200).json({ success: true, message: "Logout successful" });
  } catch (err) {
    debug.error("Route", "Logout failed", err);
    if (conn) await conn.rollback();
    return res.status(500).json({ success: false, message: "Logout failed" });
  } finally {
    if (conn) await conn.release();
  }
});

// --- POST /refresh-token ---
router.post("/refresh-token", async (req, res, next) => {
  debug.log("Route", "📍 POST /refresh-token called", { hasRefreshCookie: !!req.cookies.refresh_token });
  const refreshToken = req.cookies.refresh_token;
  const realm = req.headers["x-realm"];
  const clientid = req.headers["x-clientid"];
  if (!refreshToken) {
    debug.error("Route", "No refresh token in cookies");
    return next(new AppError("No refresh token found", 401));
  }
  try {
    debug.log("Route", "Refreshing token via Keycloak");
    const tokenData = await keycloakRefresh(refreshToken, realm, clientid);
    const decoded = decodeToken(tokenData.access_token);
    const userInfo = extractUserInfo(decoded);
    debug.log("Route", "Loading tenant for response");
    const tenant = await getTenantById(userInfo.tenantId);
    res.cookie("access_token", tokenData.access_token, { ...CONFIG.COOKIES.OPTIONS, maxAge: tokenData.expires_in * 1000 });
    res.cookie("refresh_token", tokenData.refresh_token, { ...CONFIG.COOKIES.OPTIONS, maxAge: CONFIG.COOKIES.EXPIRY.REFRESH });
    debug.log("Route", "🍪 New tokens set in cookies");
    const responseData = {
      tenant_name: tenant?.tenant_name,
      tenant_domain: tenant?.tenant_domain,
      tenant_app_logo: tenant?.tenant_app_logo || [],
      tenant_app_themes: tenant?.tenant_app_themes,
      tenant_app_font: tenant?.tenant_app_font,
      username: userInfo.preferred_username,
      userId: userInfo.userId,
      displayName: userInfo.displayName,
      tenantId: userInfo.tenantId,
      role: userInfo.role,
    };
    debug.log("Route", "✅ Token refresh response sent");
    res.status(200).json(responseData);
  } catch (err) {
    debug.error("Route", "Token refresh failed", err);
    next(new AppError(err.response?.data?.error_description || err.message, 401));
  }
});

// ============================================================================
// 🔐 RESET PASSWORD ROUTE - Dreamhouse Adapted
// ============================================================================
router.post("/reset-password", async (req, res, next) => {
  debug.log("RESET_PASSWORD_ROUTE", "Password reset request", req.body);
  
  try {
    const { username, newPassword, host } = req.body;
    const HOST_REALM_CLIENT = JSON.parse(process.env.HOST_REALM_CLIENT || "{}");
    const tenantConfig = HOST_REALM_CLIENT[host];
    
    if (!tenantConfig) {
      return res.status(400).json({ error: MESSAGES.INVALID_HOST });
    }
    
    const { realm, clientId } = tenantConfig;

    // === Validation ===
    if (!username || !newPassword) {
      return res.status(400).json({ 
        message: "Username and newPassword are required" 
      });
    }

    // === 1. Admin Login to Keycloak ===
    debug.log("RESET_PASSWORD", "Authenticating as Keycloak admin", { realm, clientId });
    
    const tokenResponse = await keycloakLogin(
      CONFIG.KEYCLOAK.ADMIN_USER,
      CONFIG.KEYCLOAK.ADMIN_PASS,
      realm,
      clientId
    );
    const adminToken = tokenResponse.access_token;

    // === 2. Find User in Keycloak ===
    // ✅ FIX: Use lowercase /admin (Keycloak API is case-sensitive)
    const userResponse = await axios.get(
      `${CONFIG.KEYCLOAK.BASE_URL}/admin/realms/${realm}/users?username=${username}&exact=true`,
      { 
        headers: { 
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        } 
      }
    );

    const user = userResponse.data[0];
    if (!user) {
      debug.log("RESET_PASSWORD", "❌ User not found in Keycloak", { username });
      return res.status(404).json({ message: "User not found" });
    }

    // === 3. Reset Password in Keycloak ===
    debug.log("RESET_PASSWORD", "Updating password in Keycloak", { userId: user.id });
    
    const resetUrl = `${CONFIG.KEYCLOAK.BASE_URL}/admin/realms/${realm}/users/${user.id}/reset-password`;
    
    await axios.put(
      resetUrl,
      { 
        type: "password", 
        value: newPassword, 
        temporary: false  // Set to true if you want user to change on first login
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // === 4. (Optional) Update password_hash in Dreamhouse DB ===
    // If you store a local password hash for fallback/auth backup
    try {
      const hashedPassword = passwordHash.encryptPassword(newPassword);
      await updateUserPassword(hashedPassword, username);
      debug.log("RESET_PASSWORD", "✅ Local password hash updated");
    } catch (dbErr) {
      // Non-critical: Keycloak password is the source of truth
      debug.warn("RESET_PASSWORD", "⚠️ Local DB password update skipped", dbErr.message);
    }

    debug.log("RESET_PASSWORD", "✅ Password reset successful", { username });
    
    return res.status(200).json({ 
      success: true,
      message: "Password updated successfully" 
    });
    
  } catch (err) {
    debug.error("RESET_PASSWORD_ROUTE", "💥 Password reset failed", {
      error: err.response?.data || err.message,
      status: err.response?.status,
    });
    
    // Handle specific Keycloak errors
    if (err.response?.status === 401) {
      return next(new AppError("Admin authentication failed", 401));
    }
    if (err.response?.status === 403) {
      return next(new AppError("Insufficient permissions to reset password", 403));
    }
    if (err.response?.status === 404) {
      return next(new AppError("User not found in Keycloak", 404));
    }
    
    next(new AppError(err.response?.data?.error || err.message, 500));
  }
});

// ============================================================================
// 🚀 SERVER STARTUP LOG & REDIS HEALTH CHECK
// ============================================================================
(async () => {
  try {
    const health = await RedisService.checkHealth();
    debug.info("SSO_AUTH", `🔐 Redis health: ${health.status}`);
  } catch (err) {
    debug.error("SSO_AUTH", "❌ Redis health check failed", err);
  }
})();

debug.info("SSO_AUTH", "🔐 Authentication module loaded for Dreamhouse");
debug.info("SSO_AUTH", `Routes: /me, /login, /logout, /refresh-token`);

module.exports = {
  SessionService,
  RedisService,
  router,
  validateToken,
  redisGracefulShutdown: RedisService.gracefulShutdown,
};