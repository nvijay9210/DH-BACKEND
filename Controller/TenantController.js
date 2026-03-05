const tenantService = require("../Service/TenantService");

exports.createTenant = async (req, res) => {
  const result = await tenantService.createTenant(req.body);
  
  res.status(201).json({
    success: true,
    message: "Tenant created successfully",
    data: { tenantId: result.insertId },
  });
};

exports.updateTenant = async (req, res) => {
  const tenant_id = req.params.tenant_id;
  const details = req.body;
  
  await tenantService.updateTenant(details, tenant_id);
  
  res.status(200).json({
    success: true,
    message: "Tenant updated successfully",
  });
};

exports.getTenants = async (req, res) => {
  const data = await tenantService.getTenants();
  
  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

exports.getTenantById = async (req, res) => {
  const tenant_id = req.params.tenant_id;
  
  const data = await tenantService.getTenantById(tenant_id);
  
  res.status(200).json({ success: true, data });
};

exports.deleteTenant = async (req, res) => {
  const tenant_id = req.params.tenant_id;
  
  await tenantService.deleteTenant(tenant_id);
  
  res.status(200).json({
    success: true,
    message: "Tenant deleted successfully",
  });
};
