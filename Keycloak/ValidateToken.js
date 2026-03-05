const jwt = require("jsonwebtoken");
const axios = require("axios");
const qs = require("qs");

const { AppError } = require("../Logics/AppError");
const { getUserByKeycloakId } = require("../Service/UserService");
const { getBranchByTenantIdAndUserId } = require("../Service/BranchService");
const pool = require("../config/db");
const redis = require("./Redis");

// Store refresh token temporarily
let globalRefreshToken = null;

/* =============================================================
   1) TOKEN VALIDATION + AUTO REFRESH
   ============================================================= */
/**
 * Validate token or refresh using refresh_token cookie
 */
// const jwt = require("jsonwebtoken");
// const axios = require("axios");
// const qs = require("qs");
// const pool = require("../DB/db"); // adjust path
// const AppError = require("../Utils/AppError");

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
${process.env.KEYCLOAK_REALM_PUBLIC_KEY}
-----END PUBLIC KEY-----`;

/* -----------------------------------------------------
   🔁 REFRESH TOKEN HANDLER
----------------------------------------------------- */
// const attemptRefresh = async (req, res, next) => {
//   try {
//     const refreshToken = req.cookies?.refresh_token;
//     const clientId = req.cookies?.clientId;
//     const realm = req.cookies?.realm;

//     if (!refreshToken || !clientId || !realm) {
//       return next(new AppError("No refresh token found", 401));
//     }

//     const tokenUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/token`;

//     const data = qs.stringify({
//       grant_type: "refresh_token",
//       refresh_token: refreshToken,
//       client_id: clientId,
//     });

//     const response = await axios.post(tokenUrl, data, {
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//     });

//     const newAccessToken = response.data.access_token;
//     const newRefreshToken = response.data.refresh_token;

//     const cookieOptions = {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
//     };

//     res.cookie("access_token", newAccessToken, {
//       ...cookieOptions,
//       maxAge: Number(process.env.ACCESS_COOKIE_EXPIRE_TIME) * 1000,
//     });

//     res.cookie("refresh_token", newRefreshToken, {
//       ...cookieOptions,
//       maxAge: Number(process.env.REFRESH_COOKIE_EXPIRE_TIME) * 1000,
//     });

//     const decoded = jwt.verify(newAccessToken, PUBLIC_KEY, {
//       algorithms: ["RS256"],
//     });

//     req.access_token = newAccessToken;
//     req.tokenData = decoded;
//     console.log('Token Has Refreshed')
//     return next();
//   } catch (err) {
//     console.error("REFRESH FAILED:", err.response?.data || err.message);
//     return next(new AppError("Token expired and refresh failed", 401));
//   }
// };

/* -----------------------------------------------------
   🔐 MAIN TOKEN VALIDATOR
----------------------------------------------------- */
// const redis = require("../Redis/redis");




/* -----------------------------------------------------
   🔐 MAIN TOKEN VALIDATOR
----------------------------------------------------- */
// const redis = require("../Redis/redis");

const attemptRefresh = async (req, res, next) => {
  try {
    const session_id =
      req.cookies?.session_id || req.headers["session-id"];

    if (!session_id) {
      return next(new AppError("Session expired", 401));
    }

    // 🔍 Get session from Redis
    const sessionData = await redis.get(`session:${session_id}`);
    if (!sessionData) {
      return next(new AppError("Session expired", 401));
    }

    const session = JSON.parse(sessionData);

    const { refresh_token, clientId, realm } = session;

    if (!refresh_token || !clientId || !realm) {
      return next(new AppError("No refresh token found", 401));
    }

    const tokenUrl = `${process.env.KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/token`;

    const data = qs.stringify({
      grant_type: "refresh_token",
      refresh_token,
      client_id: clientId,
    });

    const response = await axios.post(tokenUrl, data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };

    // 🍪 Update cookies
    res.cookie("access_token", newAccessToken, {
      ...cookieOptions,
      maxAge: Number(process.env.ACCESS_COOKIE_EXPIRE_TIME) * 1000,
    });

    res.cookie("refresh_token", newRefreshToken, {
      ...cookieOptions,
      maxAge: Number(process.env.REFRESH_COOKIE_EXPIRE_TIME) * 1000,
    });

    // 🔥 Update Redis session
    session.access_token = newAccessToken;
    session.refresh_token = newRefreshToken;

    await redis.set(
      `session:${session_id}`,
      JSON.stringify(session),
      "EX",
      Number(process.env.REFRESH_COOKIE_EXPIRE_TIME)
    );

    // Attach to request
    req.access_token = newAccessToken;
    req.tokenData = jwt.verify(newAccessToken, PUBLIC_KEY, {
      algorithms: ["RS256"],
    });

    console.log("🔁 Token refreshed & Redis updated");
    return next();
  } catch (err) {
    console.error("REFRESH FAILED:", err.response?.data || err.message);
    return next(new AppError("Session expired. Please login again.", 401));
  }
};


const validateToken = async (req, res, next) => {
  // console.log('🔹 [MIDDLEWARE] validateToken hit'); // ← ADD THIS
  
  try {
    const session_id = req.cookies?.session_id || req.headers["session-id"];
    // console.log('🔹 Session ID:', session_id); // ← ADD THIS

    if (!session_id) {
      // console.log('❌ No session_id found'); // ← ADD THIS
      return next(new AppError("Session expired", 401));
    }

    const sessionData = await redis.get(`session:${session_id}`);
    // console.log('🔹 Redis session data:', !!sessionData); // ← ADD THIS
    
    if (!sessionData) {
      // console.log('❌ Session not found in Redis'); // ← ADD THIS
      return next(new AppError("Session expired", 401));
    }

    const session = JSON.parse(sessionData);
    let token = session.access_token || req.cookies?.access_token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts[0] === "Bearer") token = parts[1];
    }

    if (!token) {
      // console.log('❌ No token found'); // ← ADD THIS
      return next(new AppError("Token missing", 401));
    }

    try {
      const decoded = jwt.verify(token, PUBLIC_KEY, { algorithms: ["RS256"] });
      // console.log('✅ Token verified, attaching session'); // ← ADD THIS
      
      req.session = session;
      req.tokenData = decoded;
      req.user_id = session.user_id;

      return next(); // ← Request should proceed to controller AFTER this
    } catch (err) {
      console.log('❌ Token verify error:', err.name); // ← ADD THIS
      if (err.name === "TokenExpiredError") {
        return attemptRefresh(req, res, next);
      }
      return next(new AppError("Invalid token", 401));
    }
  } catch (err) {
    console.error("❌ Auth middleware crash:", err);
    return next(new AppError("Authentication failed", 401));
  }
};




/** Verify user in database */
async function verifyUserTokenInDB(token, login_operation = false, req) {
  try {
    const pubKey =
      `-----BEGIN PUBLIC KEY-----\n${process.env.KEYCLOAK_REALM_PUBLIC_KEY}\n-----END PUBLIC KEY-----`;

    const decoded = jwt.verify(token, pubKey, { algorithms: ["RS256"] });

    const userId = decoded.sub;
    const username = decoded.preferred_username;
    const roles = decoded?.realm_access?.roles || [];

    // Determine role
    // const ROLE_PRIORITY = ["admin", "manager", "operator"];
    // const userRole = ROLE_PRIORITY.find(r => roles.includes(r)) || "guest";

     // Fetch DB user
     let user = await getUserByKeycloakId(userId);
     user=user[0]   
     console.log('user:',user)
     if (!user) throw new AppError("User not found", 404);

    //  console.log('user:',user)

    // Admin or Guest bypass all checks
    if (user.role === "ADMIN" || user.role === "DEV" || user.role === "A" || user.role === "D") {
      return user ;
    }

    // Only operator/manager → validate branch access
    if (!login_operation) {
      const branches =
        await getBranchByTenantIdAndUserId(user?.tenant_id,user?.user_id);

      validateTenantBranch(req, branches);
    }

    return user ;
  } catch (err) {
    throw new AppError(err.message || "Token validation failed", 500);
  }
}

/** Tenant / Branch validation */
const validateTenantBranch = (req, branches) => {
  const reqTenantId =
    req.params.tenant_id || req.query.tenant_id || req.body.tenant_id;

  const reqBranchId =
    req.params.branch_id || req.query.branch_id || req.body.branch_id;

  if (!reqTenantId || !reqBranchId) return;

  const isValid = branches.some(b =>
    String(b.tenant_id) === String(reqTenantId) &&
    String(b.branch_id) === String(reqBranchId)
  );

  if (!isValid) {
    throw new AppError("Unauthorized branch/tenant. Access denied.", 403);
  }
};


module.exports = {
  validateToken,
  verifyUserTokenInDB,
};
