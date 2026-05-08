const userBranchService = require("../Service/UserBranchService");
const RedisService = require("../Service/RedisService");
const REDIS_DATA_TTL=process.env.REDIS_DATA_TTL

exports.createUserBranch = async (req, res) => {
  const { branch_id, user_id } = req.body;
  const tenant_id = req.tenant_id;
  const createdBy = req.user.given_name;
  
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
  
  // Invalidate caches
  await RedisService.deleteByPattern(`userbranch:*:${tenant_id}`);
  
  res.status(201).json({
    success: true,
    message: result.message,
  });
};

exports.getUserBranches = async (req, res) => {
  const tenant_id = req.tenant_id;
  const currentUserrole = req.role;
  const { user_id, branch_id } = req.query;
  const cacheKey = `userbranch:list:${tenant_id}:${user_id || 'all'}:${branch_id || 'all'}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  }

  const filters = {};
  if (user_id) filters.user_id = user_id;
  if (branch_id) filters.branch_id = branch_id;
  
  data = await userBranchService.getUserBranches(
    tenant_id,
    currentUserrole,
    filters
  );

  // Cache for 1 hour
  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

exports.getUserBranchById = async (req, res) => {
  const tenant_id = req.tenant_id;
  const { branch_id, user_id } = req.params;
  const cacheKey = `userbranch:${branch_id}:${user_id}:${tenant_id}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await userBranchService.getUserBranchById(tenant_id, branch_id, user_id);

  // Cache for 1 hour
  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  
  res.status(200).json({ success: true, data });
};

exports.updateUserBranch = async (req, res) => {
  const tenant_id = req.tenant_id;
  const { branch_id, user_id } = req.params;
  const currentUserrole = req.role;
  const updatedBy = req.user.given_name;
  
  const result = await userBranchService.updateUserBranch(
    req.body,
    tenant_id,
    branch_id,
    user_id,
    currentUserrole,
    updatedBy
  );

  // Invalidate cache
  await RedisService.delete(`userbranch:${branch_id}:${user_id}:${tenant_id}`);
  await RedisService.deleteByPattern(`userbranch:*:${tenant_id}`);
  
  res.status(200).json({
    success: true,
    message: result.message,
  });
};

exports.deleteUserBranch = async (req, res) => {
  const tenant_id = req.tenant_id;
  const { branch_id, user_id } = req.params;
  const currentUserrole = req.role;
  
  await userBranchService.deleteUserBranch(tenant_id, branch_id, user_id, currentUserrole);

  // Invalidate cache
  await RedisService.delete(`userbranch:${branch_id}:${user_id}:${tenant_id}`);
  await RedisService.deleteByPattern(`userbranch:*:${tenant_id}`);
  
  res.status(200).json({
    success: true,
    message: "User-Branch mapping deleted successfully",
  });
};

exports.getBranchesByUser = async (req, res) => {
  const tenant_id = req.tenant_id;
  const user_id = req.params.user_id;
  const currentUserrole = req.role;
  const requestUserId = req.user.user_id;
  const cacheKey = `userbranch:branches:${user_id}:${tenant_id}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  }

  data = await userBranchService.getBranchesByUser(
    tenant_id,
    user_id,
    currentUserrole,
    requestUserId
  );

  // Cache for 1 hour
  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

exports.getUsersByBranch = async (req, res) => {
  const tenant_id = req.tenant_id;
  const branch_id = req.params.branch_id;
  const currentUserrole = req.role;
  const cacheKey = `userbranch:users:${branch_id}:${tenant_id}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  }

  data = await userBranchService.getUsersByBranch(tenant_id, branch_id, currentUserrole);

  // Cache for 1 hour
  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);

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