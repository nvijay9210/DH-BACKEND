const tenantService = require("../Service/TenantService");

/* =========================================
   Create Tenant
========================================= */
exports.createTenant = async (req, res, next) => {
  try {
    const result = await tenantService.createTenant(req.body);

    res.status(201).json({
      success: true,
      message: "Tenant created successfully",
      data: {
        tenantId: result.insertId,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================
   Update Tenant
========================================= */
exports.updateTenant = async (req, res, next) => {
  try {
    const tenant_id = req.params.id;
    const details = req.body;

    const result = await tenantService.updateTenant({
      details,
      tenant_id,
    });

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tenant updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================
   Get Tenant List
========================================= */
exports.getTenants = async (req, res, next) => {
  try {
    const data = await tenantService.getTenants();

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
exports.getTenantById = async (req, res, next) => {
    const tenant_id = req.params.id;
  try {
    const data = await tenantService.getTenantById(tenant_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};


exports.deleteTenant = async (req, res, next) => {
  try {
    const tenant_id = req.params.id;

    const result = await tenantService.deleteTenant(tenant_id);

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tenant deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};