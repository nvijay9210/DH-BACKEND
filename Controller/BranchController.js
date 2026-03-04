const branchService = require("../Service/BranchService");

/* =========================================
   Create Branch
========================================= */
exports.createBranch = async (req, res) => {
  const result = await branchService.createBranch(
    req.body,
    req.tenant_id,
    req.user.username
  );

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
  const username = req.user.username;

  const result = await branchService.updateBranch({
    branch_id,
    tenant_id,
    details,
    username,
  });

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
  
  const data = await branchService.getBranches(tenant_id);

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
  
  const data = await branchService.getBranchById(branch_id, tenant_id);

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
