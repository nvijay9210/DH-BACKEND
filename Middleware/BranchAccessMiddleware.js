const { pool } = require("../config/db");

/**
 * Branch Access Middleware for CREATE & UPDATE operations
 * - Role-based access control
 * - Prevents duplicate user-branch mappings
 * @param {string} operation - 'create' or 'update'
 */
const branchAccessMiddleware = (operation = 'create') => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      let requestedBranch;
      let requestedUser;

      // Extract branch_id and user_id based on operation
      if (operation === 'create') {
        requestedBranch = req.body.branch_id;
        requestedUser = req.body.user_id;
      } else {
        // For UPDATE: can come from params or body
        requestedBranch = req.body.branch_id || req.params.branch_id || req.params.id;
        requestedUser = req.body.user_id || req.params.user_id;
      }

      // 🔐 Authentication check
      if (!user?.role) {
        return res.status(401).json({ 
          success: false, 
          message: "Authentication required" 
        });
      }

      // 🔑 Role-Based Access Control
      // ✅ Super User: Full access
      if (user.role === "Super User") {
        if (operation === 'create' && requestedBranch && requestedUser) {
          const exists = await checkDuplicateMapping(
            requestedBranch, 
            requestedUser, 
            user.tenant_id
          );
          if (exists) {
            return res.status(409).json({
              success: false,
              message: "User is already mapped to this branch",
              data: { branch_id: requestedBranch, user_id: requestedUser }
            });
          }
        }
        return next();
      }

      // ✅ Admin: Tenant-scoped access
      if (user.role === "Admin") {
        // Validate tenant match
        if (req.body.tenant_id && Number(req.body.tenant_id) !== Number(user.tenant_id)) {
          return res.status(403).json({ 
            success: false, 
            message: "Cannot access another tenant's data" 
          });
        }
        // Check duplicates on CREATE
        if (operation === 'create' && requestedBranch && requestedUser) {
          const exists = await checkDuplicateMapping(
            requestedBranch, 
            requestedUser, 
            user.tenant_id
          );
          if (exists) {
            return res.status(409).json({
              success: false,
              message: "User is already mapped to this branch",
              data: { branch_id: requestedBranch, user_id: requestedUser }
            });
          }
        }
        return next();
      }

      // 👤 Normal User: Restricted to own branch only
      if (requestedBranch && Number(requestedBranch) !== Number(user.branch_id)) {
        return res.status(403).json({
          success: false,
          message: `Access denied: ${operation === 'create' ? 'Create' : 'Update'} allowed only for your assigned branch`,
          your_branch: user.branch_id,
          requested_branch: requestedBranch,
        });
      }

      // Normal users can only map themselves
      if (operation === 'create' && requestedUser && Number(requestedUser) !== Number(user.user_id)) {
        return res.status(403).json({
          success: false,
          message: "You can only create mappings for your own account",
        });
      }

      // Check duplicate for normal user CREATE
      if (operation === 'create' && requestedBranch && requestedUser) {
        const exists = await checkDuplicateMapping(
          requestedBranch, 
          requestedUser, 
          user.tenant_id
        );
        if (exists) {
          return res.status(409).json({
            success: false,
            message: "This branch mapping already exists for your account",
            data: { branch_id: requestedBranch, user_id: requestedUser }
          });
        }
      }

      next();
    } catch (error) {
      console.error("branchAccessMiddleware error:", error);
      next(error);
    }
  };
};

/**
 * Helper: Check if user-branch mapping already exists in DB
 * @param {number} branch_id 
 * @param {number} user_id 
 * @param {number} tenant_id 
 * @returns {Promise<boolean>}
 */
async function checkDuplicateMapping(branch_id, user_id, tenant_id) {
  try {
    const rows = await pool.query(
      `SELECT 1 FROM userbranch 
       WHERE tenant_id = ? AND branch_id = ? AND user_id = ? 
       LIMIT 1`,
      [tenant_id, branch_id, user_id]
    );
    return rows.length > 0;
  } catch (err) {
    console.error("Duplicate check query error:", err);
    throw err; // Let controller handle DB errors
  }
}

module.exports = branchAccessMiddleware;