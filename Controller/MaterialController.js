const materialService = require("../Service/MaterialService");
const RedisService = require("../Service/RedisService");
const REDIS_DATA_TTL=process.env.REDIS_DATA_TTL

exports.materialList = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:list:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.materialList(details, tenant_id, branch_id);

  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.materialUsed = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:${tenant_id}:${branch_id}:*`;

  const data = await materialService.materialUsed(details, tenant_id, branch_id);

  if(data.success){
    await RedisService.deleteByPattern(cacheKey);
  }
  
  res.status(200).json({ success: true, data });
};

exports.editMaterialUsed = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
    const cacheKey = `material:${tenant_id}:${branch_id}:*`;
  const data = await materialService.EditMaterialUsed(
    details,
    tenant_id,
    branch_id
  );

  if (data.success) {
      await RedisService.deleteByPattern(cacheKey);
  }

  res.status(200).json({ success: true, data });
};
exports.DeleteMaterialUsed = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
    const cacheKey = `material:${tenant_id}:${branch_id}:*`;
  const data = await materialService.DeleteMaterialUsed(
    details,
    tenant_id,
    branch_id
  );

  if (data.success) {
      await RedisService.deleteByPattern(cacheKey);
  }

  res.status(200).json({ success: true, data });
};

exports.measurementDetails = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const username = req.user.given_name;
  const details = req.body;
  const cacheKey = `material:${tenant_id}:${branch_id}:*`;

  const file = req.file;
  const data = await materialService.measurementDetails(
    details,
    username,
    tenant_id,
    branch_id,
    file
  );

  if (data.success) {
    await RedisService.deleteByPattern(cacheKey);
  }

  res.status(200).json({ success: true, data });
};

exports.updateMaterial = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.updateMaterial(
    details,
    tenant_id,
    branch_id
  );

  if (data.success) {
    const cacheKey = `material:${tenant_id}:${branch_id}:*`;
    await RedisService.deleteByPattern(cacheKey);
  }

  res.status(200).json({ success: true, data });
};

exports.fetchMaterialUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:${tenant_id}:${branch_id}:update:${details.startDate}:${details.endDate}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.fetchMaterialUpdate(
    details,
    tenant_id,
    branch_id
  );

  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.fetchMaterialUsed = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:${tenant_id}:${branch_id}:used:fetch:${details.Id}:${details.startDate}:${details.endDate}`;

  let data = await RedisService.read(cacheKey);

  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.fetchMaterialUsed(details, tenant_id, branch_id);

  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
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

  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.materialDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.materialDelete(
    details,
    tenant_id,
    branch_id
  );

  if (data.success) {
    const cacheKey = `material:${tenant_id}:${branch_id}:*`;
    await RedisService.deleteByPattern(cacheKey);
  }

  res.status(200).json({ success: true, data });
};

exports.materialPaymentReports = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:${tenant_id}:${branch_id}:payment:reports`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.materialPaymentReports(
    details,
    tenant_id,
    branch_id
  );

  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.stockList = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:${tenant_id}:${branch_id}:stock:${details.pro_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.stockList(details, tenant_id, branch_id);

  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.measurementDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.measurementDelete(
    details,
    tenant_id,
    branch_id
  );

  if (data.success) {
    const cacheKey = `material:${tenant_id}:${branch_id}:*`;
    await RedisService.deleteByPattern(cacheKey);
  }

  res.status(200).json({ success: true, data });
};

exports.measurementReports = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:${tenant_id}:${branch_id}:measurement:reports:${details.Id}:${details.Start}:${details.End}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.measurementReports(
    details,
    tenant_id,
    branch_id
  );

  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.overAllReports = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `material:${tenant_id}:${branch_id}:overall:reports:${details.Start}:${details.End}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await materialService.overAllReports(details, tenant_id, branch_id);

  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
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
  const data = await materialService.deleteMaterial(
    details,
    tenant_id,
    branch_id
  );
  res.status(200).json({ success: true, data });
};
