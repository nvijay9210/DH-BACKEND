const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  let token = null;

  // 1️⃣ Check Authorization Header
  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2) {
      token = parts[1];
    }
  }

  // 2️⃣ Check Cookie
  // if (!token && req.cookies && req.cookies.token) {
  //   token = req.cookies.token;
  // }

  if (!token && req.cookies?.access_token) {
  token = req.cookies.access_token;
}

  // 3️⃣ If token missing
  if (!token) {
    console.log("Token not found in header or cookies");
    return res.status(401).json({ message: "Authentication token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.KEYCLOAK_REALM_PUBLIC_KEY);

    req.user = decoded;
    req.tenant_id = decoded.tenant_id;
    req.branch_id = decoded.branch_id;
    req.user_id = decoded.user_id;

    next();
  } catch (err) {
    console.log("JWT Error:", err.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;