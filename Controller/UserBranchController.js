const userBranchService = require("../Service/UserBranchService");

/* =========================================
   Create User-Branch Mapping
========================================= */
exports.createUserBranch = async (req, res, next) => {
  try {
    const { branch_id, user_id } = req.body;
    const tenant_id = req.tenant_id;
    const branch_id_req = req.branch_id;
    const createdBy = req.user.username;

    if (!branch_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: "branch_id and user_id are required",
      });
    }

    const result = await userBranchService.createUserBranch(
      { branch_id, user_id },
      tenant_id,
      branch_id_req,
      createdBy
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.status(201).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================
   Get All User-Branch Mappings
========================================= */
exports.getUserBranches = async (req, res, next) => {
  try {
    const tenant_id = req.tenant_id;
    const branch_id = req.branch_id;
    const currentUserRights = req.user.role;
    const { user_id, branch_id: filterBranchId } = req.query;

    const filters = {};
    if (user_id) filters.user_id = user_id;
    if (filterBranchId) filters.branch_id = filterBranchId;

    const data = await userBranchService.getUserBranches(
      tenant_id,
      branch_id,
      currentUserRights,
      filters
    );

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================
   Get Specific User-Branch Mapping
========================================= */
exports.getUserBranchById = async (req, res, next) => {
  try {
    const tenant_id = req.tenant_id;
    const { branch_id, user_id } = req.params;

    const result = await userBranchService.getUserBranchById(
      tenant_id,
      branch_id,
      user_id
    );

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================
   Update User-Branch Mapping
========================================= */
exports.updateUserBranch = async (req, res, next) => {
  try {
    const tenant_id = req.tenant_id;
    const { branch_id, user_id } = req.params;
    const currentUserRights = req.user.role;
    const updatedBy = req.user.username;

    const result = await userBranchService.updateUserBranch(
      req.body,
      tenant_id,
      branch_id,
      user_id,
      currentUserRights,
      updatedBy
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    if (err.message.includes("not found")) {
      return res.status(404).json({ success: false, message: err.message });
    }
    if (err.message.includes("Access denied")) {
      return res.status(403).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/* =========================================
   Delete User-Branch Mapping
========================================= */
exports.deleteUserBranch = async (req, res, next) => {
  try {
    const tenant_id = req.tenant_id;
    const { branch_id, user_id } = req.params;
    const currentUserRights = req.user.role;

    const result = await userBranchService.deleteUserBranch(
      tenant_id,
      branch_id,
      user_id,
      currentUserRights
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    if (err.message.includes("not found")) {
      return res.status(404).json({ success: false, message: err.message });
    }
    if (err.message.includes("Access denied")) {
      return res.status(403).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/* =========================================
   Get Branches by User
========================================= */
exports.getBranchesByUser = async (req, res, next) => {
  try {
    const tenant_id = req.tenant_id;
    const user_id = req.params.user_id;
    const currentUserRights = req.user.role;
    const requestUserId = req.user.user_id;

    const data = await userBranchService.getBranchesByUser(
      tenant_id,
      user_id,
      currentUserRights,
      requestUserId
    );

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    if (err.message.includes("Access denied")) {
      return res.status(403).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/* =========================================
   Get Users by Branch
========================================= */
exports.getUsersByBranch = async (req, res, next) => {
  try {
    const tenant_id = req.tenant_id;
    const branch_id = req.params.branch_id;
    const currentUserRights = req.user.role;

    const data = await userBranchService.getUsersByBranch(
      tenant_id,
      branch_id,
      currentUserRights
    );

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    if (err.message.includes("Access denied")) {
      return res.status(403).json({ success: false, message: err.message });
    }
    next(err);
  }
};