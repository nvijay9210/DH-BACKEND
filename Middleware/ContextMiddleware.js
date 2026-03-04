const { checkRecordExists } = require("./OptionalIdValidator");

exports.validateIds = async (req, res, next) => {
  try {
    const tenant_id =
      req.tenant_id || req.body.tenant_id || req.params.tenant_id || req.query.tenant_id;

    const branch_id =
      req.branch_id || req.body.branch_id || req.params.branch_id || req.query.branch_id;

    const user_id =
      req.user_id || req.body.user_id || req.params.user_id || req.query.user_id;

    // Tenant validation
    if (tenant_id) {
        console.log(tenant_id)
      await checkRecordExists("tenant", { tenant_id });
    }

    // Branch validation
    if (branch_id) {
      await checkRecordExists("branch", {
        branch_id,
        ...(tenant_id && { tenant_id }),
      });
    }

    // User validation
    if (user_id) {
      await checkRecordExists("users", {
        User_id: user_id,
        ...(tenant_id && { tenant_id }),
        ...(branch_id && { branch_id }),
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};