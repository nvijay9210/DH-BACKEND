const tenantService = require("../Service/TenantService");
const RedisService = require("../Service/RedisService");

exports.createTenant = async (req, res) => {
  const result = await tenantService.createTenant(req.body);
  
  await RedisService.deleteByPattern(`tenant:*`);
  
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
  
  await RedisService.delete(`tenant:${tenant_id}`);
  await RedisService.deleteByPattern(`tenant:list:*`);
  
  res.status(200).json({
    success: true,
    message: "Tenant updated successfully",
  });
};

exports.getTenants = async (req, res) => {
  const cacheKey = `tenant:list`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  }

  data = await tenantService.getTenants();
  
  await RedisService.create(cacheKey, data, 3600);
  
  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

exports.getTenantById = async (req, res) => {
  const tenant_id = req.params.tenant_id;
  const cacheKey = `tenant:${tenant_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await tenantService.getTenantById(tenant_id);
  
  await RedisService.create(cacheKey, data, 3600);
  
  res.status(200).json({ success: true, data });
};

exports.deleteTenant = async (req, res) => {
  const tenant_id = req.params.tenant_id;
  
  await tenantService.deleteTenant(tenant_id);
  
  await RedisService.delete(`tenant:${tenant_id}`);
  await RedisService.deleteByPattern(`tenant:list:*`);
  
  res.status(200).json({
    success: true,
    message: "Tenant deleted successfully",
  });
};
