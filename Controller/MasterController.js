const masterService = require("../Service/MasterService");
const RedisService = require("../Service/RedisService");

exports.labourList = async (req, res) => {
  const details = req.body;
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:labour:list:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await masterService.labourList(details,tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 3600);
  res.status(200).json({ success: true, data });
};

exports.materialList = async (req, res) => {
  const details = req.body;
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:material:list:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await masterService.materialList(details,tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 3600);
  res.status(200).json({ success: true, data });
};

exports.contractorList = async (req, res) => {
  const details = req.body;
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:contractor:list:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await masterService.contractorList(details,tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 3600);
  res.status(200).json({ success: true, data });
};

exports.supplierList = async (req, res) => {
  const details = req.body;
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:supplier:list:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await masterService.supplierList(details,tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 3600);
  res.status(200).json({ success: true, data });
};

exports.fetchMaterial = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:material:fetch:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await masterService.fetchMaterial(tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 3600);
  res.status(200).json({ success: true, data });
};

exports.fetchLabour = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:labour:fetch:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await masterService.fetchLabour(tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 3600);
  res.status(200).json({ success: true, data });
};

exports.fetchContractor = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:contractor:fetch:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await masterService.fetchContractor(tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 3600);
  res.status(200).json({ success: true, data });
};

exports.fetchSupplier = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:supplier:fetch:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await masterService.fetchSupplier(tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 3600);
  res.status(200).json({ success: true, data });
};

exports.labourTypeDelete = async (req, res) => {
  const details = req.body;
  const { tenant_id, branch_id } = req;
  const data = await masterService.labourTypeDelete(
    details,
    tenant_id,
    branch_id
  );
  
  await RedisService.deleteByPattern(`master:*:${tenant_id}:${branch_id}`);
  
  res.status(200).json({ success: true, data });
};
