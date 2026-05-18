const labourService = require("../Service/LabourService");
const RedisService = require("../Service/RedisService");
const REDIS_DATA_TTL = process.env.REDIS_DATA_TTL;

exports.labourDetails = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `labour:${tenant_id}:${branch_id}:details:${details.Id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await labourService.labourDetails(details, tenant_id, branch_id);
  if(data.success){
    await RedisService.deleteByPattern(`labour:${tenant_id}:${branch_id}:*`);
  }
  res.status(200).json({ success: true, data });
};

exports.updateLabour = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const username = req.user.given_name || "Unknown User";

  const data = await labourService.updateLabour(
    username,
    details,
    tenant_id,
    branch_id,
  );

  if (data.success) {
    await RedisService.deleteByPattern(`labour:${tenant_id}:${branch_id}:*`);
  }

  res.status(200).json({ success: true, data });
};

exports.labourDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;

  const data = await labourService.labourDelete(details, tenant_id, branch_id);

  if (data.success) {
    await RedisService.deleteByPattern(`labour:${tenant_id}:${branch_id}:*`);
  }

  res.status(200).json({ success: true, data });
};

exports.fetchLabourUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `labour:${tenant_id}:${branch_id}:${details.Id}:update:${details.startDate}:${details.endDate}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await labourService.fetchLabourUpdate(details, tenant_id, branch_id);

  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.labourReports = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `labour:${tenant_id}:${branch_id}:reports:${details.Start}:${details.End}:${details.Id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await labourService.labourReports(details, tenant_id, branch_id);

  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.labourPayment = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `labour:${tenant_id}:${branch_id}:payment:${details.Id}:${details.start}:${details.end}:${details.contractor}`;
  console.log("Labour Payment Request Details:", details);

  // let data = await RedisService.read(cacheKey);
  // if (data) {
  //   return res.status(200).json({ success: true, data });
  // }

  let data = await labourService.labourPayment(details, tenant_id, branch_id);

  // await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.labourPaymentUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;

  const data = await labourService.labourPaymentUpdate(
    details,
    tenant_id,
    branch_id,
  );

  await RedisService.deleteByPattern(`labour:${tenant_id}:${branch_id}:*`);

  res.status(200).json({ success: true, data });
};

exports.allLabourPaymentUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;

  const data = await labourService.allLabourPaymentUpdate(
    details,
    tenant_id,
    branch_id,
  );

  await RedisService.deleteByPattern(`labour:${tenant_id}:${branch_id}:*`);

  res.status(200).json({ success: true, data });
};

exports.allLabourPayment = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `labour:${tenant_id}:${branch_id}:payment:all`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await labourService.allLabourPayment(details, tenant_id, branch_id);

  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.fetchContractorPay = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `labour:${tenant_id}:${branch_id}:contractor:pay`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await labourService.fetchContractorPay(tenant_id, branch_id);

  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.contractorReport = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `labour:${tenant_id}:${branch_id}:contractor:report:${details.contractor}:${details.Start}:${details.End}:${details.Id}`;

  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await labourService.contractorReport(details, tenant_id, branch_id);

  await RedisService.create(cacheKey, data, REDIS_DATA_TTL);
  res.status(200).json({ success: true, data });
};

exports.contractorDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;

  const data = await labourService.contractorDelete(
    details,
    tenant_id,
    branch_id,
  );

  res.status(200).json({ success: true, data });
};

exports.supplierDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;

  const data = await labourService.supplierDelete(
    details,
    tenant_id,
    branch_id,
  );

  res.status(200).json({ success: true, data });
};
