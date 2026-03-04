const userBranchService = require("../Service/UserBranchService");

exports.createUserBranch = async (req, res) => {
  const { branch_id, user_id } = req.body;
  const tenant_id = req.tenant_id;
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
    createdBy
  );
  
  res.status(201).json({
    success: true,
    message: result.message,
  });
};

exports.getUserBranches = async (req, res) => {
  const tenant_id = req.tenant_id;
  const currentUserRights = req.user.role;
  const { user_id, branch_id } = req.query;
  
  const filters = {};
  if (user_id) filters.user_id = user_id;
  if (branch_id) filters.branch_id = branch_id;
  
  const data = await userBranchService.getUserBranches(
    tenant_id,
    currentUserRights,
    filters
  );
  
  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

exports.getUserBranchById = async (req, res) => {
  const tenant_id = req.tenant_id;
  const { branch_id, user_id } = req.params;
  
  const data = await userBranchService.getUserBranchById(tenant_id, branch_id, user_id);
  
  res.status(200).json({ success: true, data });
};

exports.updateUserBranch = async (req, res) => {
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
};

exports.deleteUserBranch = async (req, res) => {
  const tenant_id = req.tenant_id;
  const { branch_id, user_id } = req.params;
  const currentUserRights = req.user.role;
  
  await userBranchService.deleteUserBranch(tenant_id, branch_id, user_id, currentUserRights);
  
  res.status(200).json({
    success: true,
    message: "User-Branch mapping deleted successfully",
  });
};

exports.getBranchesByUser = async (req, res) => {
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
};

exports.getUsersByBranch = async (req, res) => {
  const tenant_id = req.tenant_id;
  const branch_id = req.params.branch_id;
  const currentUserRights = req.user.role;
  
  const data = await userBranchService.getUsersByBranch(tenant_id, branch_id, currentUserRights);
  
  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

// module.exports = {
//   createUserBranch,
//   getUserBranches,
//   getUserBranchById,
//   updateUserBranch,
//   deleteUserBranch,
//   getBranchesByUser,
//   getUsersByBranch,
// };