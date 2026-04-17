/**
 * Check if user has required role
 */
exports.checkRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user?.role) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(", ")}`,
          your_role: user.role,
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Superuser-only access
 */
exports.requireSuperuser = (req, res, next) => {
  exports.checkRole(["SUPERUSER", "ADMIN"])(req, res, next);
};

/**
 * Allow self-access or superuser
 */
exports.isSelfOrSuperuser = (req, res, next) => {
  try {
    const user = req.user;
    const targetUserId = parseInt(req.params.user_id);

    if (user.role === "SUPERUSER" || user.role === "ADMIN") {
      return next();
    }
    if (user.user_id === targetUserId) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "You can only access your own data",
    });
  } catch (error) {
    next(error);
  }
};