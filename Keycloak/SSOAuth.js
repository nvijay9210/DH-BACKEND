// ============================================================================
// ssoAuth.js - Consolidated Keycloak Authentication Module
// With Network Data & Location Details for user_activity tracking
// FIXED: Single Redis client from config/redis.js
// ============================================================================
const express = require("express");
const cookieParser = require("cookie-parser");
const qs = require("querystring");
const axios = require("axios");
const { AppError } = require("../Logics/AppError");
const { UAParser } = require("ua-parser-js");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const {pool} = require("../config/db");
const { getTenantById } = require("../Service/TenantService");
const { createDebugLogger } = require("../utils/Debugger");
const { updateUserPassword } = require("../Service/UserService");
const { sendOTP, canSendOTP, setOtpCooldown, verifyOTP } = require("../utils/Otp");
const passwordHash = require("../Logics/PasswordHash");
// ✅ Import centralized Redis client & helpers
const {
  redisClient,        // Raw ioredis instance
  setEx, get, del, exists, ttl, incrWithExpiry, // Helper functions
  checkRedisHealth,
  gracefulShutdown: redisGracefulShutdown
} = require("../config/loginredis");

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
const ROLE_PRIORITY = ["Super User", "Admin", "Manager"];
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
      ACCESS: Number(process.env.ACCESS_COOKIE_EXPIRE_TIME) * 1000,
      REFRESH: Number(process.env.REFRESH_COOKIE_EXPIRE_TIME) * 1000,
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
// 🗄️ INLINE SERVICE FUNCTIONS (Embedded for code reusability)
// ============================================================================
async function getUserByKeycloakId(keycloakId) {
  const conn = await pool.getConnection();
  debug.log("UserService", "Fetching user by Keycloak ID", { keycloakId });
  try {
    const rows = await conn.query(
      `
      SELECT
        u.user_id,
        u.keycloak_id,
        u.user_name,
        u.Rights,
        u.status,
        u.failed_attempt_count,
        u.account_locked,
        u.tenant_id
      FROM user u
      WHERE u.keycloak_id = ?
      LIMIT 1
      `,
      [keycloakId],
    );
    debug.log("UserService", "Query result", {
      found: rows?.[0] ? true : false,
      userId: rows?.[0]?.user_id,
    });
    return rows;
  } catch (error) {
    debug.error("UserService", "Failed to fetch user", error);
    throw new Error(`Failed to fetch user: ${error.message}`);
  } finally {
    if (conn) conn.release();
  }
}

async function getUserByKeycloakIdWithTenant(keycloakId, tenantId, branchId) {
  debug.log("UserService", "Fetching user by Keycloak ID with tenant/branch", {
    keycloakId,
    tenantId,
    branchId,
  });
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `
      SELECT
        u.user_id,
        u.keycloak_id,
        u.user_name,
        u.Rights,
        u.status,
        u.failed_attempt_count,
        u.account_locked,
        u.tenant_id
      FROM user u
      WHERE u.keycloak_id = ?
      AND u.tenant_id = ?
      AND u.status = 'Active'
      LIMIT 1
      `,
      [keycloakId, tenantId],
    );
    debug.log("UserService", "User fetch with tenant/branch result", {
      found: rows?.[0] ? true : false,
      userId: rows?.[0]?.user_id,
      role: rows?.[0]?.role,
    });
    return rows?.[0] || null;
  } catch (error) {
    debug.error(
      "UserService",
      "Failed to fetch user with tenant/branch",
      error,
    );
    throw new Error(`Failed to fetch user: ${error.message}`);
  } finally {
    if (conn) conn.release();
  }
}

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
        b.created_at
      FROM branch b
      INNER JOIN userbranch ub ON ub.branch_id = b.branch_id
      WHERE b.tenant_id = ?
      AND ub.user_id = ?
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
        created_at
      FROM branch
      WHERE tenant_id = ?
      ORDER BY branch_id ASC
      `,
      [tenantId],
    );
    debug.log("BranchService", "All branches found", {
      count: rows?.length || 0,
    });
    return rows;
  } catch (error) {
    debug.error("BranchService", "Failed to fetch all branches", error);
    throw new Error(`Failed to fetch tenant branches: ${error.message}`);
  }
}

// ============================================================================
// 🗄️ REDIS UTILS (Using centralized client)
// ============================================================================
const getIp = (req) => {
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;
  const normalized = ip === "::1" ? "127.0.0.1" : ip;
  debug.log("Utils", "Extracted IP", { raw: ip, normalized });
  return normalized;
};

const getUserAgentInfo = (req) => {
  const ua = new UAParser(req.headers["user-agent"] || "").getResult();
  const info = {
    browser:
      ua.browser.name && ua.browser.version
        ? `${ua.browser.name} ${ua.browser.version}`
        : "Unknown",
    device: ua.device.type
      ? ua.device.type.charAt(0).toUpperCase() + ua.device.type.slice(1)
      : "Desktop",
  };
  debug.log("Utils", "Parsed User-Agent", info);
  return info;
};

const getGeoInfo = async (ip) => {
  debug.log("GeoService", "Looking up geo info", { ip });
  const isLocal =
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.");
  if (isLocal) {
    debug.log("GeoService", "Local IP detected, returning mock geo");
    return {
      country: "Local",
      state: "Local",
      city: "Local",
      isp: "Local Network",
    };
  }
  try {
    const { data } = await axios.get(`https://ipapi.co/${ip}/json/`);
    const geo = {
      country: data.country_name,
      state: data.region,
      city: data.city,
      isp: data.org,
    };
    debug.log("GeoService", "Geo lookup success", geo);
    return geo;
  } catch (err) {
    debug.error("GeoService", "Geo lookup failed", err);
    return { country: null, state: null, city: null, isp: null };
  }
};

// --- Cache helper using centralized Redis ---
const setCache = async (key, value, ttlSeconds) => {
  try {
    return await setEx(key, ttlSeconds, value);
  } catch (err) {
    debug.error("Redis", "Cache set failed", { key, error: err.message });
    throw err;
  }
};

const getCache = async (key) => {
  try {
    return await get(key);
  } catch (err) {
    debug.error("Redis", "Cache get failed", { key, error: err.message });
    throw err;
  }
};

// --- Keycloak Helpers ---
const getKeycloakUrl = (realm, path) =>
  `${CONFIG.KEYCLOAK.BASE_URL}/realms/${realm}${path}`;

const getClientCredential = (clientId) => {
  debug.log("Keycloak", "Looking up client credential", { clientId });
  const secret = CONFIG.CLIENT_CREDENTIALS[clientId];
  if (!secret) {
    debug.error("Keycloak", "Client credential not found", { clientId });
    throw new AppError(
      `No client credential found for clientId: ${clientId}`,
      400,
    );
  }
  debug.log("Keycloak", "Client credential found (masked)", {
    clientId,
    secret: "****",
  });
  return secret;
};

const keycloakLogin = async (username, password, realm, clientId) => {
  debug.log("Keycloak", "Attempting login", { username, realm, clientId });
  const url = getKeycloakUrl(realm, "/protocol/openid-connect/token");
  try {
    const response = await axios.post(
      url,
      new URLSearchParams({
        client_id: clientId,
        grant_type: "password",
        username,
        password,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    debug.log("Keycloak", "✅ Login successful", {
      hasAccessToken: !!response.data.access_token,
      hasRefreshToken: !!response.data.refresh_token,
      expiresIn: response.data.expires_in,
    });
    return response.data;
  } catch (error) {
    debug.error("Keycloak", "❌ Login failed", {
      status: error.response?.status,
      error: error.response?.data,
    });
    throw new AppError(
      error.response?.data?.error_description || "Login failed",
      error.response?.status || 500,
    );
  }
};

const keycloakRefresh = async (refreshToken, realm, clientId) => {
  debug.log("Keycloak", "Refreshing token", {
    realm,
    clientId,
    refreshToken: refreshToken?.substring(0, 20) + "...",
  });
  const url = getKeycloakUrl(realm, "/protocol/openid-connect/token");
  try {
    const response = await axios.post(
      url,
      qs.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    debug.log("Keycloak", "✅ Token refreshed", {
      newExpiresIn: response.data.expires_in,
      hasNewRefreshToken: !!response.data.refresh_token,
    });
    return response.data;
  } catch (error) {
    debug.error("Keycloak", "❌ Refresh failed", {
      status: error.response?.status,
      error: error.response?.data,
    });
    throw error;
  }
};

const decodeToken = (token) => {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT");
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf8"),
    );
    debug.log("Token", "Decoded JWT payload (partial)", {
      sub: payload?.sub?.substring(0, 10) + "...",
      preferred_username: payload?.preferred_username,
      exp: payload?.exp ? new Date(payload.exp * 1000).toISOString() : null,
    });
    return payload;
  } catch (err) {
    debug.error("Token", "Failed to decode JWT", err);
    return null;
  }
};

const extractUserInfo = (token) => {
  const globalRoles = token.realm_access?.roles || [];
  const role =
    ROLE_PRIORITY.find((r) =>
      globalRoles.some((gr) => gr.toLowerCase() === r.toLowerCase()),
    ) || "G";
  const info = {
    username: token?.preferred_username,
    userId: token.sub,
    displayName: token.name,
    role,
  };
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
      const decoded = jwt.verify(token, CONFIG.KEYCLOAK.PUBLIC_KEY, {
        algorithms: ["RS256"],
      });
      debug.log("UserService", "JWT verified", {
        sub: decoded.sub?.substring(0, 10) + "...",
      });
      const user = await getUserByKeycloakId(decoded.sub);
      if (!user || !user[0]) {
        debug.error("UserService", "User not found in DB", {
          keycloakId: decoded.sub,
        });
        throw new AppError(MESSAGES.USER_NOT_FOUND, 404);
      }
      debug.log("UserService", "✅ User verified", {
        userId: user[0].user_id,
        role: user[0].role,
      });
      return user[0];
    } catch (error) {
      debug.error("UserService", "Token verification failed", error);
      throw error;
    }
  },
  updateFailedAttempts: async (username, increment = true, conn) => {
    debug.log(
      "UserService",
      `Updating failed attempts (${increment ? "increment" : "reset"})`,
      { username },
    );
    try {
      if (increment) {
        const result = await conn.query(
          `UPDATE user SET failed_attempt_count = failed_attempt_count + 1 WHERE LOWER(username) = ?`,
          [username.toLowerCase()],
        );
        debug.log("UserService", "Failed attempt incremented", {
          affectedRows: result.affectedRows,
        });
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
      debug.log("UserService", "✅ Failed attempts reset", {
        affectedRows: result.affectedRows,
      });
    } catch (e) {
      debug.error("UserService", "Failed to reset attempts", e);
    }
  },
};

const SessionService = {
  create: async (res, userContext, tokens, clientId, realm, networkDetails) => {
    debug.log("SessionService", "Creating new session", {
      userId: userContext.user_id,
      tenantId: userContext.tenant_id,
      role: userContext.role,
      branchId: userContext.branch_id,
    });
    const session_id = randomUUID();
    const cookieOpts = {
      ...CONFIG.COOKIES.OPTIONS,
      maxAge: CONFIG.COOKIES.EXPIRY.REFRESH,
    };

    // Set Cookies
    const cookiesSet = [
      { name: "access_token", maxAge: CONFIG.COOKIES.EXPIRY.ACCESS },
      { name: "refresh_token", maxAge: CONFIG.COOKIES.EXPIRY.REFRESH },
      { name: "session_id", maxAge: CONFIG.COOKIES.EXPIRY.REFRESH },
      { name: "clientId", maxAge: CONFIG.COOKIES.EXPIRY.REFRESH },
      { name: "realm", maxAge: CONFIG.COOKIES.EXPIRY.REFRESH },
      { name: "user_id", maxAge: CONFIG.COOKIES.EXPIRY.REFRESH },
      { name: "tenant_id", maxAge: CONFIG.COOKIES.EXPIRY.REFRESH },
      { name: "branch_id", maxAge: CONFIG.COOKIES.EXPIRY.REFRESH },
    ];

    cookiesSet.forEach((cookie) => {
      res.cookie(
        cookie.name,
        cookie.name === "access_token"
          ? tokens.access_token
          : cookie.name === "refresh_token"
            ? tokens.refresh_token
            : cookie.name === "session_id"
              ? session_id
              : cookie.name === "clientId"
                ? clientId
                : cookie.name === "realm"
                  ? realm
                  : cookie.name === "user_id"
                    ? userContext.user_id
                    : cookie.name === "tenant_id"
                      ? userContext.tenant_id
                      : cookie.name === "branch_id"
                        ? userContext.default_branch_id
                        : null,
        cookie.name === "access_token"
          ? { ...CONFIG.COOKIES.OPTIONS, maxAge: CONFIG.COOKIES.EXPIRY.ACCESS }
          : cookieOpts,
      );
    });

    debug.log(
      "SessionService",
      "🍪 Cookies set",
      cookiesSet.map((c) => c.name),
    );

    // Store in Redis using centralized helper
    const sessionData = {
      user_id: userContext.user_id,
      tenant_id: userContext.tenant_id,
      branch_id: userContext.default_branch_id,
      role: userContext.role,
      clientId,
      realm,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      // Network & Location Data
      ip_address: networkDetails?.ip_address || null,
      country: networkDetails?.country || null,
      state: networkDetails?.state || null,
      city: networkDetails?.city || null,
      isp_provider: networkDetails?.isp || null,
      network_type: networkDetails?.network_type || "Unknown",
      // Additional data for session-info endpoint
      ip_decimal: networkDetails?.ip_decimal || null,
      hostname: networkDetails?.hostname || null,
      asn: networkDetails?.asn || null,
      org: networkDetails?.org || null,
      country_code: networkDetails?.country_code || null,
      latitude: networkDetails?.latitude || null,
      longitude: networkDetails?.longitude || null,
      timezone: networkDetails?.timezone || null,
      // Session Metadata
      login_time: new Date().toISOString(),
      last_activity: new Date().toISOString(),
    };

    // ✅ Use setEx helper (auto JSON.stringify + TTL in seconds)
    await setEx(
      `session:${session_id}`,
      Math.floor(CONFIG.COOKIES.EXPIRY.REFRESH / 1000),
      sessionData
    );

    console.log('SessionData:',sessionData)
    
    await setEx(
      `api_count:${session_id}`,
      Math.floor(CONFIG.COOKIES.EXPIRY.REFRESH / 1000),
      0
    );

    debug.log("SessionService", "✅ Session stored in Redis", {
      session_id,
      ttl: CONFIG.COOKIES.EXPIRY.REFRESH / 1000,
      hasNetwork: !!networkDetails,
    });
    return session_id;
  },

  destroy: async (req, res) => {
    const session_id = req.cookies?.session_id;
    debug.log("SessionService", "Destroying session", { session_id });
    if (!session_id) {
      debug.log("SessionService", "⚠️ No session_id found, skipping destroy");
      return;
    }
    
    // ✅ Use del helper for multiple keys
    await del(`session:${session_id}`, `api_count:${session_id}`);
    debug.log("SessionService", "🗑️ Redis keys deleted");

    const clearOpts = { ...CONFIG.COOKIES.OPTIONS, path: "/" };
    const cookiesCleared = [
      "access_token",
      "refresh_token",
      "session_id",
      "clientId",
      "realm",
      "user_id",
    ];
    cookiesCleared.forEach((c) => res.clearCookie(c, clearOpts));
    debug.log("SessionService", "🍪 Cookies cleared", cookiesCleared);
  },

  get: async (session_id) => {
    debug.log("SessionService", "Fetching session from Redis", { session_id });
    // ✅ Use get helper (auto JSON.parse)
    const data = await get(`session:${session_id}`);
    if (data) {
      debug.log("SessionService", "✅ Session found", {
        userId: data.user_id,
        role: data.role,
        tokenPreview: data.access_token?.substring(0, 10) + "...",
      });
      return data;
    }
    debug.log("SessionService", "⚠️ Session not found in Redis");
    return null;
  },
};

// ✅ AuditService.logLogin - Using centralized Redis & fixed ua references
const AuditService = {
  logLogin: async (userContext, req, geo, ua, dbUser, networkDetails) => {
    debug.log("AuditService", "Logging login activity", {
      userId: userContext.user_id,
      sessionId: userContext.session_id,
      ip: networkDetails?.ip_address,
      country: networkDetails?.country,
    });

    const ip = getIp(req);
    const session_id = userContext.session_id;
    const suspicious =
      dbUser.failed_attempt_count >= 5 ||
      (networkDetails?.country && networkDetails.country !== "India")
        ? "Yes"
        : "No";

    let conn;
    try {
      conn = await pool.getConnection();

      const historyParams = [
        Number(dbUser.tenant_id),
        Number(userContext.default_branch_id),
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

      debug.log("AuditService", "📝 Login history inserted", {
        insertId:
          typeof historyResult?.insertId === "bigint"
            ? Number(historyResult.insertId)
            : historyResult?.insertId,
      });

      const activityParams = [
        Number(userContext.user_id),
        session_id,
        "success",
        req.headers["x-session-source"] || "web",
        ip,
        geo.country,
        geo.state,
        geo.city,
        geo.isp,
        req.body.network_type || "Unknown",
        ua.browser,
        ua.device,
        Number(dbUser.failed_attempt_count) || 0,
        dbUser.is_2fa_enabled ? "Yes" : "No",
        0,
        suspicious,
        0,
      ].map((v) => (typeof v === "bigint" ? Number(v) : v));

      const activityResult = await conn.query(
        `INSERT INTO user_activity (user_id, session_id, login_status, session_source, ip_address, country, state, city, isp_provider, network_type, browser, device, failed_attempt_count, two_factor_used, password_changed_recently, suspicious_flag, api_calls_count, login_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        activityParams,
      );

      debug.log("AuditService", "📊 User activity logged", {
        insertId:
          typeof activityResult?.insertId === "bigint"
            ? Number(activityResult.insertId)
            : activityResult?.insertId,
        suspicious,
        location: `${networkDetails?.city}, ${networkDetails?.country}`,
      });
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
      // ✅ Use get helper for api_count
      const count = await get(`api_count:${session_id}`);
      await conn.query(
        `UPDATE login_history SET logout_time = NOW() WHERE session_id = ?`,
        [session_id],
      );
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

const ContextService = {
  build: async (accessToken, dbUser, conn) => {
    debug.log("ContextService", "Building user context", {
      userId: dbUser.user_id,
    });
    const decoded = decodeToken(accessToken);
    const info = extractUserInfo(decoded);
    const role = info.role;

    if (role === "DEV") {
      debug.log(
        "ContextService",
        "DEV role detected - skipping tenant/branch load",
      );
      return {
        user_id: Number(dbUser.user_id),
        username: dbUser.username,
        role: "DEV",
        tenant_id: null,
        tenant_name: null,
        branches: null,
        default_branch_id: null,
        keycloak_user_id: info.userId,
        displayName: info.displayName,
      };
    }

    debug.log("ContextService", "Loading tenant", {
      tenantId: dbUser.tenant_id,
    });
    const tenant = await getTenantById(dbUser.tenant_id);

    debug.log("ContextService", "Loading branches", {
      role,
      tenantId: dbUser.tenant_id,
      userId: dbUser.user_id,
    });

    const branches =
      role === "Super User"
        ? await getAllBranchByTenantId(dbUser.tenant_id, conn)
        : await getBranchByTenantIdAndUserId(
            dbUser.tenant_id,
            dbUser.user_id,
            conn,
          );

    if (role !== "Super User" && (!branches || branches.length === 0)) {
      debug.error("ContextService", "No branches assigned to non-admin user");
      throw new Error("No branches assigned");
    }

    console.log('branches',branches)

    const branchData = branches?.map((b) => ({
      branch_id: Number(b.branch_id),
      branch_name: b.branch_name,
      branch_code: b.branch_code,
    }));

    const context = {
      user_id: Number(dbUser.user_id),
      username: dbUser.user_name,
      role,
      tenant_id: Number(tenant.tenant_id),
      tenant_name: tenant.tenant_name,
      tenant_domain: tenant.tenant_domain,
      tenant_app_name: tenant.tenant_app_name,
      tenant_app_logo: tenant.tenant_app_logo,
      tenant_app_font: tenant.tenant_app_font,
      tenant_app_themes: tenant.tenant_app_themes,
      tenant_code: tenant.tenant_code,
      payment_type: tenant.payment_type,
      branches: branchData,
      default_branch_id: tenant.head_branch || null,
      keycloak_user_id: info.userId,
      displayName: info.displayName,
    };

    debug.log("ContextService", "✅ Context built", {
      role: context.role,
      tenantName: context.tenant_name,
      branchCount: context.branches?.length || 0,
    });
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
    if (!session_id) {
      debug.error("Middleware", "No session_id for refresh");
      return next(new AppError(MESSAGES.UNAUTHORIZED, 401));
    }
    const session = await SessionService.get(session_id);
    if (!session) {
      debug.error("Middleware", "Session not found in Redis");
      return next(new AppError(MESSAGES.UNAUTHORIZED, 401));
    }
    debug.log("Middleware", "Calling Keycloak refresh");
    const tokens = await keycloakRefresh(
      session.refresh_token,
      session.realm,
      session.clientId,
    );

    // Update Cookies & Redis
    res.cookie("access_token", tokens.access_token, {
      ...CONFIG.COOKIES.OPTIONS,
      maxAge: CONFIG.COOKIES.EXPIRY.ACCESS,
    });
    res.cookie("refresh_token", tokens.refresh_token, {
      ...CONFIG.COOKIES.OPTIONS,
      maxAge: CONFIG.COOKIES.EXPIRY.REFRESH,
    });

    session.access_token = tokens.access_token;
    session.refresh_token = tokens.refresh_token;
    
    // ✅ Use setEx helper to update session in Redis
    await setEx(
      `session:${session_id}`,
      Math.floor(CONFIG.COOKIES.EXPIRY.REFRESH / 1000),
      session
    );

    req.access_token = tokens.access_token;
    req.tokenData = jwt.verify(
      tokens.access_token,
      CONFIG.KEYCLOAK.PUBLIC_KEY,
      {
        algorithms: ["RS256"],
      },
    );
    req.session = session;
    req.user_id = session.user_id;
    debug.log("Middleware", "✅ Token refreshed successfully");
    next();
  } catch (err) {
    debug.error("Middleware", "Refresh failed", err);
    return next(new AppError("Session expired. Please login again.", 401));
  }
};

const validateToken = async (req, res, next) => {
  debug.log("Middleware", "🔐 Validating token", {
    hasSessionCookie: !!req.cookies?.session_id,
    hasSessionHeader: !!req.headers["session-id"],
    hasAuthHeader: !!req.headers.authorization,
  });
  try {
    const session_id = req.cookies?.session_id || req.headers["session-id"];
    if (!session_id) {
      debug.error("Middleware", "No session identifier found");
      return next(new AppError(MESSAGES.UNAUTHORIZED, 401));
    }
    const session = await SessionService.get(session_id);
    if (!session) {
      debug.error("Middleware", "Session not found in Redis");
      return next(new AppError(MESSAGES.UNAUTHORIZED, 401));
    }

    let token = session.access_token || req.cookies?.access_token;
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts[0] === "Bearer") token = parts[1];
    }
    if (!token) {
      debug.error("Middleware", "No access token found");
      return next(new AppError("Token missing", 401));
    }

    try {
      debug.log("Middleware", "Verifying JWT signature");
      req.tokenData = jwt.verify(token, CONFIG.KEYCLOAK.PUBLIC_KEY, {
        algorithms: ["RS256"],
      });
      req.session = session;
      req.user = req.tokenData;
      req.user_id = session.user_id;
      req.tenant_id = session.tenant_id;
      req.branch_id = session.branch_id || null;

      const keycloakId = req.tokenData.sub;
      debug.log("Middleware", "Fetching user from database", {
        keycloakId,
        tenantId: req.tenant_id,
        branchId: req.branch_id,
      });

      const userData = await getUserByKeycloakIdWithTenant(
        keycloakId,
        req.tenant_id,
        req.branch_id,
      );
      if (!userData) {
        debug.error("Middleware", "User not found in database", {
          keycloakId,
          tenantId: req.tenant_id,
        });
        return next(new AppError("User not found or inactive in system", 401));
      }

      req.role = userData.Rights;
      req.userStatus = userData.status;
      debug.log("Middleware", "✅ User fetched from DB, role assigned", {
        userId: userData.user_id,
        role: userData.Rights,
        status: userData.status,
      });
      debug.log(
        "Middleware",
        "✅ Token valid, proceeding to next middleware...",
      );
      next();
      debug.log("Middleware", "✅ validateToken function completed");
    } catch (err) {
      debug.log("Middleware", `JWT verify error: ${err.name}`);
      if (err.name === "TokenExpiredError") {
        debug.log("Middleware", "Token expired, attempting refresh");
        return attemptRefresh(req, res, next);
      }
      debug.error("Middleware", "Invalid token", err);
      return next(new AppError("Invalid token", 401));
    }
  } catch (err) {
    debug.error("Middleware", "Auth middleware crash", err);
    return next(new AppError("Authentication failed", 401));
  }
};

// ============================================================================
// 5. ROUTE HANDLERS
// ============================================================================

// --- GET /me ---
router.get("/me", validateToken, async (req, res) => {
  debug.log("Route", "📍 GET /me called", {
    sessionId: req.cookies?.session_id,
    userId: req.session?.user_id,
  });
  const user_id = req.session?.user_id || req.cookies.user_id;
  let conn;
  try {
    conn = await pool.getConnection();
    const [user] = await conn.query(
      `SELECT u.user_id, u.user_name, u.Rights, t.* FROM user u JOIN tenant t ON t.tenant_id = u.tenant_id WHERE u.user_id = ?`,
      [user_id],
    );
    if (!user) {
      debug.error("Route", "User not found in DB", { user_id });
      await conn.rollback();
      return res.status(404).json({ message: "User not found" });
    }
    console.log("userdata", user);
    debug.log("Route", "User found", {
      userId: user.user_id,
      role: user.role,
    });

    const branches =
      user.role === "Admin"
        ? await conn.query(
            `SELECT branch_id, branch_name, branch_code FROM branch WHERE tenant_id = ?`,
            [user.tenant_id],
          )
        : await conn.query(
            `SELECT b.branch_id, b.branch_name, b.branch_code FROM userbranch ub JOIN branch b ON b.branch_id = ub.branch_id WHERE ub.user_id = ?`,
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
      role: user.role,
      tenant_id: Number(user.tenant_id),
      tenant_code: user.tenant_code,
      tenant_name: user.tenant_name,
      tenant_app_name: user.tenant_app_name,
      tenant_app_logo: user.tenant_app_logo,
      tenant_app_font: user.tenant_app_font,
      tenant_app_themes: user.tenant_app_themes,
      payment_type: user.payment_type,
      branches: branches.map((b) => ({
        branch_id: Number(b.branch_id),
        branch_name: b.branch_name,
        branch_code: b.branch_code,
      })),
      default_branch_id: Number(user.head_branch),
      head_branch_id: Number(user.head_branch),
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
  debug.log("Route", "📍 POST /login called", {
    username: req.body.username,
    host: req.body.host,
    userAgent: req.headers["user-agent"]?.substring(0, 50),
  });
  const conn = await pool.getConnection();
  try {
    const { username, password, host } = req.body;
    console.log(username, password, host);

    if (!username || !password) {
      debug.error("Route", "Missing credentials");
      return res
        .status(400)
        .json({ message: "Username and password required" });
    }

    const tenantConfig = CONFIG.HOST_REALM_CLIENT[host];
    if (!tenantConfig) {
      return res.status(400).json({ error: MESSAGES.INVALID_HOST });
    }
    const { realm, clientId } = tenantConfig;

    // 🔐 1. Keycloak Login (External HTTP - Outside Transaction)
    const tokens = await keycloakLogin(
      username.toLowerCase(),
      password,
      realm,
      clientId,
    );
    debug.log("Route", "Keycloak login successful, verifying in DB");

    const dbUser = await UserService.verifyTokenInDB(tokens.access_token, conn);
    debug.log("Route", "DB User verified", dbUser, {
      userId: dbUser.user_id,
      status: dbUser.status,
      role: dbUser.role,
    });

    if (dbUser.status !== "Active") {
      debug.error("Route", "User account inactive", { userId: dbUser.user_id });
      return res.status(403).json({ message: "User account is inactive" });
    }

    await UserService.resetFailedAttempts(dbUser.user_id, conn);
    debug.log("Route", "Building user context");

    const userContext = await ContextService.build(
      tokens.access_token,
      dbUser,
      conn,
    );

    // Create networkDetails object
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
      ip_decimal: null,
      hostname: null,
      asn: null,
      org: null,
      country_code: null,
      latitude: null,
      longitude: null,
      timezone: null,
    };

    debug.log("Route", "Creating session");
    const session_id = await SessionService.create(
      res,
      userContext,
      tokens,
      clientId,
      realm,
      networkDetails,
    );
    userContext.session_id = session_id;

    debug.log("Route", "Logging audit trail");
    await AuditService.logLogin(
      userContext,
      req,
      geo,
      ua,
      dbUser,
      networkDetails,
    );

    debug.log("Route", "✅ Login successful", {
      userId: userContext.user_id,
      sessionId: userContext.session_id,
      role: userContext.role,
    });
    return res.status(200).json(userContext);
  } catch (err) {
    debug.error("Route", "Login failed", err);
    if (conn && req.body.username) {
      try {
        await UserService.updateFailedAttempts(req.body.username, true, conn);
        debug.log("Route", "Failed attempt recorded");
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
  debug.log("Route", "📍 POST /logout called", {
    sessionId: req.cookies?.session_id,
    reason: req.body?.reason,
  });
  let conn;
  try {
    await AuditService.logLogout(req.cookies?.session_id, req.body?.reason);
    await SessionService.destroy(req, res);
    debug.log("Route", "✅ Logout successful");
    return res
      .status(200)
      .json({ success: true, message: "Logout successful" });
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
  debug.log("Route", "📍 POST /refresh-token called", {
    hasRefreshCookie: !!req.cookies.refresh_token,
    realm: req.headers["x-realm"],
    clientId: req.headers["x-clientid"],
  });
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

    res.cookie("access_token", tokenData.access_token, {
      ...CONFIG.COOKIES.OPTIONS,
      maxAge: tokenData.expires_in * 1000,
    });
    res.cookie("refresh_token", tokenData.refresh_token, {
      ...CONFIG.COOKIES.OPTIONS,
      maxAge: CONFIG.COOKIES.EXPIRY.REFRESH,
    });
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
    next(
      new AppError(err.response?.data?.error_description || err.message, 401),
    );
  }
});

// --- Helper: Get user data by username ---
const getUserDataByUsername = async (username) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT 
         u.tenant_id,
         u.user_name,
         u.phone_number,
         u.email,
         u.status,
         t.otp,
         t.otp_type,
         t.is_active,
         t.timezone 
       FROM user u 
       LEFT JOIN tenant t ON t.tenant_id = u.tenant_id 
       WHERE u.user_name = ? AND u.status = ? AND t.is_active = ?`,
      [username, "Active", "1"],
    );
    return rows[0] || null;
  } catch (err) {
    console.error("getUserDataByUsername error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

// --- Helper: Send OTP to Redis using centralized client ---
const sendOtpToRedis = async (phoneNumber, otp, ttlSeconds = 300) => {
  try {
    const key = `otp:${phoneNumber}`;
    await setCache(key, { otp }, ttlSeconds);
    console.log(`OTP cached for ${phoneNumber}, expires in ${ttlSeconds}s`);
  } catch (err) {
    console.error("Failed to store OTP in cache:", err);
  }
};

// --- POST /forgettenpassword ---
router.post("/forgettenpassword", async (req, res, next) => {
  debug.log("Route", "📍 POST /forgettenpassword called", {
    username: req.body.username,
    host: req.body.host,
  });

  try {
    const { username, host } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const tenantConfig = CONFIG.HOST_REALM_CLIENT[host];
    if (!tenantConfig) {
      return res.status(400).json({ error: MESSAGES.INVALID_HOST });
    }
    const { realm, clientId, tenant_id: configTenantId } = tenantConfig;

    const userData = await getUserDataByUsername(username);
    const tenant_id = userData?.tenant_id || configTenantId;

    if (!userData) {
      return res.status(200).json({
        message: "If this user exists, you will receive further instructions",
        step: "complete",
      });
    }

    const isOtpEnabled = userData.otp === 1 || userData.otp === true;

    if (isOtpEnabled) {
      let contactValue;
      const via = userData?.otp_type;

      if (via === "sms") contactValue = userData?.phone_number;
      else if (via === "email") contactValue = userData?.email;
      else if (via === "whatsapp") contactValue = userData?.phone_number;

      if (!contactValue) {
        return res
          .status(400)
          .json({ message: "No contact value found for OTP" });
      }

      const canSend = await canSendOTP({
        username,
        tenant_id,
        contact: contactValue,
      });

      if (!canSend.allowed) {
        return res.status(429).json({
          message: canSend.message,
          retryAfter: canSend.retryAfter,
          step: "otp",
        });
      }

      const otpResponse = await sendOTP({
        to: contactValue,
        username,
        via,
        message: "Your password reset OTP",
        length: 6,
        expiryMinutes: 10,
        tenant_id,
        timezone: userData?.time_zone
      });

      await setOtpCooldown({ username, tenant_id });

      return res.status(200).json({
        message: "OTP sent successfully",
        step: "otp",
        username,
        otpEnabled: true,
        contactMasked: maskContact(contactValue, via),
        via,
      });
    } else {
      debug.log("Route", "✅ OTP disabled for user, allowing direct reset", {
        username,
      });

      const bypassKey = `bypass:${tenant_id}:${username}`;
      const bypassToken = generateSecureToken();
      const bypassData = {
        username,
        tenant_id,
        verified: true,
        otpDisabled: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 15 * 60 * 1000,
      };

      // ✅ Use setEx helper for bypass token
      await setEx(bypassKey, 900, bypassData);

      return res.status(200).json({
        message: "OTP disabled - proceed to reset password",
        step: "reset-password",
        username,
        otpEnabled: false,
        tenant_id,
        bypassToken,
      });
    }
  } catch (err) {
    debug.error("Route", "Forgot password failed", err);
    next(new AppError(err.message || "Failed to process request", 500));
  }
});

// 🔐 Helper: Generate secure bypass token
const generateSecureToken = () => {
  return require("crypto").randomBytes(32).toString("hex");
};

// 🔐 Helper: Mask contact for UI
const maskContact = (contact, via) => {
  if (!contact) return "";
  if (via === "email") {
    const [name, domain] = contact.split("@");
    return `${name[0]}${"*".repeat(name.length - 2)}${name.slice(-1)}@${domain}`;
  }
  return `${contact.slice(0, 3)}****${contact.slice(-4)}`;
};

// --- POST /verify-otp ---
router.post("/verify-otp", async (req, res, next) => {
  debug.log("Route", "📍 POST /verify-otp called", {
    username: req.body.username,
  });

  try {
    const { username, otp, host, contact } = req.body;

    if (!username || !otp) {
      return res.status(400).json({ message: "Username and OTP are required" });
    }

    const tenantConfig = CONFIG.HOST_REALM_CLIENT[host];
    if (!tenantConfig) {
      return res.status(400).json({ error: MESSAGES.INVALID_HOST });
    }
    const { tenant_id } = tenantConfig;

    const userData = await getUserDataByUsername(username);

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!userData.otp) {
      return res.status(400).json({
        message: "OTP not enabled for this user. Use direct reset.",
      });
    }

    let contactValue;
    const via = userData?.otp_type;

    if (via === "sms") contactValue = userData?.phone_number;
    else if (via === "email") contactValue = userData?.email;
    else if (via === "whatsapp") contactValue = userData?.phone_number;

    if (!contactValue) {
      return res.status(400).json({ message: "No contact value found" });
    }

    const verification = await verifyOTP({
      username,
      enteredOtp: otp,
      contact: contactValue,
      tenant_id,
    });

    if (!verification.success) {
      const statusCode = verification.locked ? 403 : 400;
      return res.status(statusCode).json({
        message: verification.message,
        step: "otp",
        attemptsRemaining: verification.attemptsRemaining,
        locked: verification.locked,
      });
    }

    const bypassKey = `bypass:${tenant_id}:${username}`;
    const bypassToken = generateSecureToken();
    const bypassData = {
      username,
      tenant_id,
      verified: true,
      otpVerified: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000,
    };

    // ✅ Use setEx helper
    await setEx(bypassKey, 900, JSON.stringify(bypassData));

    debug.log("Route", "✅ OTP verified successfully", { username });

    return res.status(200).json({
      message: "OTP verified successfully",
      step: "reset-password",
      bypassToken,
      username,
      tenant_id,
    });
  } catch (err) {
    debug.error("Route", "Verify OTP failed", err);
    next(new AppError(err.message || "OTP verification failed", 500));
  }
});

// --- POST /reset-password ---
router.post("/reset-password", async (req, res, next) => {
  debug.log("Route", "📍 POST /reset-password called", {
    username: req.body.username,
  });

  try {
    const { username, newPassword, host, tenant_id, bypassToken } = req.body;

    if (!username || !newPassword) {
      return res
        .status(400)
        .json({ message: "Username and newPassword required" });
    }

    const tenantConfig = CONFIG.HOST_REALM_CLIENT[host];
    if (!tenantConfig) {
      return res.status(400).json({ error: MESSAGES.INVALID_HOST });
    }
    const { realm, clientId } = tenantConfig;

    const bypassKey = `bypass:${tenant_id}:${username}`;
    // ✅ Use get helper to retrieve bypass data
    const bypassDataRaw = await get(bypassKey);

    if (!bypassDataRaw) {
      return res.status(401).json({
        message: "Session expired. Please start the reset process again.",
        step: "otp",
      });
    }

    const bypassData = typeof bypassDataRaw === 'string' 
      ? JSON.parse(bypassDataRaw) 
      : bypassDataRaw;

    if (
      bypassToken &&
      bypassData.bypassToken &&
      bypassToken !== bypassData.bypassToken
    ) {
      return res.status(403).json({ message: "Invalid verification token" });
    }

    if (Date.now() > bypassData.expiresAt) {
      // ✅ Use del helper
      await del(bypassKey);
      return res.status(401).json({
        message: "Verification expired. Please request a new reset link.",
        step: "otp",
      });
    }

    if (
      bypassData.tenant_id &&
      tenant_id &&
      bypassData.tenant_id !== tenant_id
    ) {
      return res.status(403).json({ message: "Tenant mismatch" });
    }

    // Rate limiting
    const resetAttemptsKey = `reset_attempts:${tenant_id}:${username}`;
    const attempts = await incrWithExpiry(resetAttemptsKey, 3600);
    
    // if (attempts > 3) {
    //   return res
    //     .status(429)
    //     .json({ message: "Too many reset attempts. Please wait." });
    // }

    // Proceed with password reset
    debug.log("Route", "Authenticating as Keycloak admin");
    const tokenRes = await keycloakLogin(
      CONFIG.KEYCLOAK.ADMIN_USER,
      CONFIG.KEYCLOAK.ADMIN_PASS,
      realm,
      clientId,
    );
    const adminToken = tokenRes.access_token;

    debug.log("Route", "Fetching user from Keycloak");
    const userRes = await axios.get(
      `${CONFIG.KEYCLOAK.BASE_URL}/admin/realms/${realm}/users?username=${username}`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );

    const user = userRes.data[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    debug.log("Route", "Resetting password in Keycloak");
    await axios.put(
      `${CONFIG.KEYCLOAK.BASE_URL}/admin/realms/${realm}/users/${user.id}/reset-password`,
      { type: "password", value: newPassword, temporary: false },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    // const userData=await getUserByKeycloakId(user.id)
    const newHashedPassword=passwordHash.encryptPassword(newPassword);

    const result = await updateUserPassword(newHashedPassword, username);

    if (!result) {
      return res
        .status(400)
        .json({ message: "Error updating password in database" });
    }

    // ✅ Cleanup using del helper
    await del(bypassKey, `reset_attempts:${tenant_id}:${username}`);

    debug.log("Route", "✅ Password reset successful", { username });
    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    debug.error("Route", "Password reset failed", err);
    next(new AppError(err.response?.data?.error || err.message, 500));
  }
});

// --- POST /register ---
router.post("/register", async (req, res, next) => {
  debug.log("Route", "📍 POST /register called", {
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    phone: req.body.phone,
    host: req.body.host,
  });
  try {
    const { email, firstname, lastname, phone, host } = req.body;
    if (!firstname || !lastname || !phone) {
      debug.error("Route", "Missing required registration fields");
      return res
        .status(400)
        .json({ message: "Firstname lastname phonenumber required" });
    }
    const tenantConfig = CONFIG.HOST_REALM_CLIENT[host];
    if (!tenantConfig) {
      debug.error("Route", "Invalid host", { host });
      return res.status(400).json({ error: MESSAGES.INVALID_HOST });
    }
    const { realm, clientId } = tenantConfig;

    debug.log("Route", "Authenticating as Keycloak admin");
    const tokenRes = await keycloakLogin(
      CONFIG.KEYCLOAK.ADMIN_USER,
      CONFIG.KEYCLOAK.ADMIN_PASS,
      realm,
      clientId,
    );
    const adminToken = tokenRes.access_token;

    const username = `GST${Date.now()}`;
    const password = "1234";
    debug.log("Route", "Generated registration credentials", { username });

    debug.log("Route", "Creating user in Keycloak");
    await axios.post(
      `${CONFIG.KEYCLOAK.BASE_URL}/admin/realms/${realm}/users`,
      {
        username,
        email: email || `${username}@example.com`,
        emailVerified: true,
        firstName: firstname,
        lastName: lastname,
        enabled: true,
        attributes: { phoneNumber: phone, tenant_id: "", clinic_id: "" },
        credentials: [{ type: "password", value: password, temporary: false }],
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
      },
    );
    debug.log("Route", "✅ User registration successful");
    return res.status(200).json({ message: "User Created successfully" });
  } catch (err) {
    debug.error("Route", "Registration failed", err);
    next(new AppError(err.response?.data?.error || err.message, 500));
  }
});

// --- POST /tokensave ---
router.post("/tokensave", (req, res) => {
  debug.log("Route", "📍 POST /tokensave called", {
    hasAccessToken: !!req.body.access_token,
    hasRefreshToken: !!req.body.refresh_token,
  });
  const { access_token, refresh_token, access_expires_in, refresh_expires_in } =
    req.body;
  if (!access_token || !refresh_token) {
    debug.error("Route", "Missing tokens in request");
    return res.status(400).json({ success: false, message: "Missing tokens" });
  }
  res.cookie("access_token", access_token, {
    ...CONFIG.COOKIES.OPTIONS,
    maxAge: (access_expires_in || 900) * 1000,
  });
  res.cookie("refresh_token", refresh_token, {
    ...CONFIG.COOKIES.OPTIONS,
    maxAge: (refresh_expires_in || 604800) * 1000,
  });
  debug.log("Route", "🍪 Tokens saved to cookies");
  return res
    .status(200)
    .json({ success: true, message: "Tokens saved in cookies successfully" });
});

// ============================================================================
// 🚀 SERVER STARTUP LOG & REDIS HEALTH CHECK
// ============================================================================
(async () => {
  try {
    const health = await checkRedisHealth();
    debug.info("SSO_AUTH", `🔐 Redis health: ${health.status}`);
  } catch (err) {
    debug.error("SSO_AUTH", "❌ Redis health check failed", err);
  }
})();

debug.info("SSO_AUTH", "🔐 Authentication module loaded");
debug.info(
  "SSO_AUTH",
  `Routes registered: /me, /login, /logout, /refresh-token, /forgettenpassword, /reset-password, /register, /tokensave`,
);

module.exports = { router, validateToken, redisGracefulShutdown };