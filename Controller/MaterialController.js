const materialService = require("../Service/MaterialService");
const RedisService = require("../Service/RedisService");

exports.materialList = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:list:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.materialList(details, tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 3600);
  res.status(200).json({ success: true, data });
};

exports.materialUsed = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:used:${details.Project_id}:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.materialUsed(details, tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 1800);
  res.status(200).json({ success: true, data });
};

exports.editMaterialUsed = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.EditMaterialUsed(details, tenant_id, branch_id);
  
  if (details.Id) {
    await RedisService.delete(`material:used:${details.Id}:${tenant_id}:${branch_id}`);
    await RedisService.deleteByPattern(`material:list:*`);
  }
  
  res.status(200).json({ success: true, data });
};

exports.measurementDetails = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const username=req.user.username
  const details = req.body;
  const file = req.file;
  const data = await materialService.measurementDetails(details,username, tenant_id, branch_id, file);
  
  if (details.Id) {
    await RedisService.deleteByPattern(`material:list:*`);
  }
  
  res.status(200).json({ success: true, data });
};

exports.updateMaterial = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.updateMaterial(details, tenant_id, branch_id);
  
  if (details.Id) {
    await RedisService.delete(`material:${details.Id}:${tenant_id}:${branch_id}`);
    await RedisService.deleteByPattern(`material:list:*`);
  }
  
  res.status(200).json({ success: true, data });
};

exports.fetchMaterialUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:update:${details.Id}:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.fetchMaterialUpdate(details, tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 1800);
  res.status(200).json({ success: true, data });
};

exports.fetchMaterialUsed = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:used:fetch:${details.Id}:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  // console.log('data:',data)
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.fetchMaterialUsed(details, tenant_id, branch_id);
  console.log('data:',data)
  await RedisService.create(cacheKey, data, 1800);
  res.status(200).json({ success: true, data });
};

exports.fetchMaterial = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `material:fetch:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.fetchMaterial(tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 3600);
  res.status(200).json({ success: true, data });
};

exports.materialDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.materialDelete(details, tenant_id, branch_id);
  
  if (details.Id) {
    await RedisService.delete(`material:${details.Id}:${tenant_id}:${branch_id}`);
    await RedisService.deleteByPattern(`material:*`);
  }
  
  res.status(200).json({ success: true, data });
};

exports.materialPaymentReports = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:payment:reports:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.materialPaymentReports(details, tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 1800);
  res.status(200).json({ success: true, data });
};

exports.stockList = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:stock:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.stockList(details, tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 1800);
  res.status(200).json({ success: true, data });
};

exports.measurementDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.measurementDelete(details, tenant_id, branch_id);
  
  if (details.Id) {
    await RedisService.deleteByPattern(`material:*`);
  }
  
  res.status(200).json({ success: true, data });
};

exports.measurementReports = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:measurement:reports:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.measurementReports(details, tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 1800);
  res.status(200).json({ success: true, data });
};

exports.overAllReports = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:overall:reports:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.overAllReports(details, tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 1800);
  res.status(200).json({ success: true, data });
};

exports.reports = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.reports(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.deleteMaterial = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.params;
  const data = await materialService.deleteMaterial(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

