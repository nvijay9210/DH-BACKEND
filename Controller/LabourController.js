const labourService = require("../Service/LabourService");
const RedisService = require("../Service/RedisService");

exports.labourDetails = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `labour:details:${details.Id}:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await labourService.labourDetails(details, tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 1800);
  res.status(200).json({ success: true, data });
};

exports.updateLabour = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const username = req.user.given_name || "Unknown User";
  
  const data = await labourService.updateLabour(username,details, tenant_id, branch_id);
  
  if (details.Id) {
    await RedisService.delete(`labour:details:${details.Id}:${tenant_id}:${branch_id}`);
    await RedisService.deleteByPattern(`labour:*:${tenant_id}:${branch_id}`);
  }
  
  res.status(200).json({ success: true, data });
};

exports.labourDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  
  const data = await labourService.labourDelete(details, tenant_id, branch_id);
  
  if (details.Id) {
    await RedisService.deleteByPattern(`labour:*:${tenant_id}:${branch_id}`);
  }
  
  res.status(200).json({ success: true, data });
};

exports.fetchLabourUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `labour:update:${details.Id}:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await labourService.fetchLabourUpdate(details, tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 1800);
  res.status(200).json({ success: true, data });
};

exports.labourReports = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `labour:reports:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await labourService.labourReports(details, tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 1800);
  res.status(200).json({ success: true, data });
};

exports.labourPayment = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `labour:payment:${details.Id}:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await labourService.labourPayment(details, tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 1800);
  res.status(200).json({ success: true, data });
};

exports.labourPaymentUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  
  const data = await labourService.labourPaymentUpdate(details, tenant_id, branch_id);
  
  await RedisService.deleteByPattern(`labour:payment:*:${tenant_id}:${branch_id}`);
  
  res.status(200).json({ success: true, data });
};

exports.allLabourPaymentUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  
  const data = await labourService.allLabourPaymentUpdate(details, tenant_id, branch_id);
  
  await RedisService.deleteByPattern(`labour:*:${tenant_id}:${branch_id}`);
  
  res.status(200).json({ success: true, data });
};

exports.allLabourPayment = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `labour:payment:all:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await labourService.allLabourPayment(details, tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 1800);
  res.status(200).json({ success: true, data });
};

exports.fetchContractorPay = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `labour:contractor:pay:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await labourService.fetchContractorPay(tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 3600);
  res.status(200).json({ success: true, data });
};

exports.contractorReport = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `labour:contractor:report:${tenant_id}:${branch_id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await labourService.contractorReport(details, tenant_id, branch_id);
  
  await RedisService.create(cacheKey, data, 1800);
  res.status(200).json({ success: true, data });
};

exports.contractorDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  
  const data = await labourService.contractorDelete(details, tenant_id, branch_id);
  
  res.status(200).json({ success: true, data });
};

exports.supplierDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  
  const data = await labourService.supplierDelete(details, tenant_id, branch_id);
  
  res.status(200).json({ success: true, data });
};
