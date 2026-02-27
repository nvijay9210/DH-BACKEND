const branchService = require("../Service/BranchService");

/* =========================================
   Create Branch
========================================= */
exports.createBranch = async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

/* =========================================
   Update Branch
========================================= */
exports.updateBranch = async (req, res, next) => {
  try {
    const branch_id = req.params.id;
    const tenant_id = req.tenant_id;
    const details = req.body;
    const username = req.user.username;

    const result = await branchService.updateBranch({
      branch_id,
      tenant_id,
      details,
      username,
    });

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Branch updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================
   Get Branch List
========================================= */
exports.getBranches = async (req, res, next) => {
  try {
    const data = await branchService.getBranches();

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
   Get Total Cost
========================================= */
exports.getBranchById = async (req, res, next) => {
  const branch_id = req.params.id;
  const tenant_id = req.tenant_id;
  try {
    const data = await branchService.getBranchById(branch_id, tenant_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteBranch = async (req, res, next) => {
  try {
    const branch_id = req.params.id;
    const tenant_id = req.tenant_id;

    const result = await branchService.deleteBranch(branch_id, tenant_id);

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Branch deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
