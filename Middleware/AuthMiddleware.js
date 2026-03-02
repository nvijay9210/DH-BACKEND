const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    console.log('token:',token,process.env.JWT_KEY)
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log('decoded:',decoded)

    req.user = decoded; // attach full user payload
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
