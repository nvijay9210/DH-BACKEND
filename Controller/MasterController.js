const masterService = require("../Service/MasterService");
const RedisService = require("../Service/RedisService");
const REDIS_DATA_TTL=process.env.REDIS_DATA_TTL

exports.labourList = async (req, res) => {
  const details = req.body;
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:${tenant_id}:${branch_id}:labour:list`;

  // let data = await RedisService.read(cacheKey);
  // if (data) {
  //   return res.status(200).json({ success: true, data });
  // }

  data = await masterService.labourList(details,tenant_id, branch_id);
  await RedisService.deleteByPattern(`master:labour:*`);
  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.materialList = async (req, res) => {
  const details = req.body;
  console.log('details:',details)
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:${tenant_id}:${branch_id}:material:list`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await masterService.materialList(details,tenant_id, branch_id);
  await RedisService.deleteByPattern(`master:material:*`);
  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.contractorList = async (req, res) => {
  const details = req.body;
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:${tenant_id}:${branch_id}:contractor:list`;

  // let data = await RedisService.read(cacheKey);
  // if (data) {
  //   return res.status(200).json({ success: true, data });
  // }

  data = await masterService.contractorList(details,tenant_id, branch_id);
  await RedisService.deleteByPattern(`master:contractor:*`);
  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.supplierList = async (req, res) => {
  const details = req.body;
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:${tenant_id}:${branch_id}:supplier:list`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await masterService.supplierList(details,tenant_id, branch_id);
  await RedisService.deleteByPattern(`master:supplier:*`);
  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.fetchMaterial = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:${tenant_id}:${branch_id}:material:fetch`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await masterService.fetchMaterial(tenant_id, branch_id);
  await RedisService.deleteByPattern(`master:material:*`);
  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.fetchLabour = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:${tenant_id}:${branch_id}:labour:fetch`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await masterService.fetchLabour(tenant_id, branch_id);
  await RedisService.deleteByPattern(`master:labour:*`);
  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.fetchContractor = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:contractor:${tenant_id}:${branch_id}:fetch`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await masterService.fetchContractor(tenant_id, branch_id);
  await RedisService.deleteByPattern(`master:contractor:*`);
  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.fetchSupplier = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `master:supplier:${tenant_id}:${branch_id}:fetch`;

  // let data = await RedisService.read(cacheKey);
  // if (data) {
  //   return res.status(200).json({ success: true, data });
  // }

  data = await masterService.fetchSupplier(tenant_id, branch_id);
  await RedisService.deleteByPattern(`master:supplier:*`);
  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
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
