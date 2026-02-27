const branchAccessMiddleware = (req, res, next) => {
  const requestedBranch = req.body.branch_id || req.params.branch_id;

  // Super Admin → allow everything
  if (req.role === "Super User") {
    return next();
  }

  // Tenant Admin → allow any branch inside tenant
  if (req.role === "Admin") {
    return next();
  }

  // Normal users → must match their own branch
  if (requestedBranch && Number(requestedBranch) !== Number(req.branch_id)) {
    return res.status(403).json({
      message: "Access denied: Cannot access another branch",
    });
  }

  next();
};

module.exports = branchAccessMiddleware;
