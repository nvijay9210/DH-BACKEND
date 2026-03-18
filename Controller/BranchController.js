const branchService = require("../Service/BranchService");
const RedisService = require("../Service/RedisService");
const RedisTime=process.env.RedisTime

/* =========================================
   Create Branch
========================================= */
exports.createBranch = async (req, res) => {
  const result = await branchService.createBranch(
    req.body,
    req.tenant_id,
    req.user.given_name
  );

  // Invalidate list cache
  await RedisService.deleteByPattern(`branch:list:*`);

  res.status(201).json({
    success: true,
    message: "Branch created successfully",
    data: {
      branchId: result.insertId,
    },
  });
};

/* =========================================
   Update Branch
========================================= */
exports.updateBranch = async (req, res) => {
  const branch_id = req.params.branch_id;
  const tenant_id = req.tenant_id;
  const details = req.body;
  const username = req.user.given_name;

  const result = await branchService.updateBranch({
    branch_id,
    tenant_id,
    details,
    username,
  });

  // Invalidate cache
  await RedisService.delete(`branch:${branch_id}:${tenant_id}`);
  await RedisService.deleteByPattern(`branch:list:*`);

  // ✅ Service should throw AppError if not found, but keeping fallback
  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      message: "Branch not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Branch updated successfully",
  });
};

/* =========================================
   Get Branch List
========================================= */
exports.getBranches = async (req, res) => {
  const tenant_id = req.tenant_id;
  const cacheKey = `branch:list:${tenant_id}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  }

  data = await branchService.getBranches(tenant_id);

  // Cache for 1 hour
  await RedisService.create(cacheKey, data, RedisTime);

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

/* =========================================
   Get Branch By ID
========================================= */
exports.getBranchById = async (req, res) => {
  const branch_id = req.params.branch_id;
  const tenant_id = req.tenant_id;
  const cacheKey = `branch:${branch_id}:${tenant_id}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({
      success: true,
      data,
    });
  }

  data = await branchService.getBranchById(branch_id, tenant_id);

  // Cache for 1 hour
  await RedisService.create(cacheKey, data, RedisTime);

  res.status(200).json({
    success: true,
    data,
  });
};

/* =========================================
   Delete Branch
========================================= */
exports.deleteBranch = async (req, res) => {
  const branch_id = req.params.branch_id;
  const tenant_id = req.tenant_id;

  const result = await branchService.deleteBranch(branch_id, tenant_id);

  // Invalidate cache
  await RedisService.delete(`branch:${branch_id}:${tenant_id}`);
  await RedisService.deleteByPattern(`branch:list:*`);

  // ✅ Service should throw AppError if not found, but keeping fallback
  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      message: "Branch not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Branch deleted successfully",
  });
};
