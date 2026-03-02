const contextMiddleware = (req, res, next) => {
  const { tenant_id, branch_id, role } = req.user;

  req.tenant_id = tenant_id;
  req.branch_id = branch_id || null;
  req.role = role;

  next();
};


module.exports = contextMiddleware;
