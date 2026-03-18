const orderService = require("../Service/OrderService");
const RedisService = require("../Service/RedisService");
const RedisTime=process.env.RedisTime

exports.order = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await orderService.order(details, tenant_id, branch_id);
  
  // Cache order and invalidate lists
  if (data.id) {
    await RedisService.create(`order:${data.id}:${tenant_id}:${branch_id}`, data, RedisTime);
    await RedisService.deleteByPattern(`order:list:*`);
  }
  
  res.status(200).json({ success: true, data });
};

exports.updateOrder = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await orderService.updateOrder(details, tenant_id, branch_id);
  
  // Update cache
  if (details.Id) {
    await RedisService.update(`order:${details.Id}:${tenant_id}:${branch_id}`, data, 3600);
    await RedisService.deleteByPattern(`order:list:*`);
  }
  
  res.status(200).json({ success: true, data });
};

exports.orderDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await orderService.orderDelete(details, tenant_id, branch_id);
  
  // Invalidate cache
  if (details.Id) {
    await RedisService.delete(`order:${details.Id}:${tenant_id}:${branch_id}`);
    await RedisService.deleteByPattern(`order:list:*`);
  }
  
  res.status(200).json({ success: true, data });
};

exports.fetchOrderUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `order:update:${details.start_date}:${details.end_date}:${details.Id}:${tenant_id}:${branch_id}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await orderService.fetchOrderUpdate(details, tenant_id, branch_id);
  // Cache for 30 minutes
  await RedisService.create(cacheKey, data, RedisTime);
  
  res.status(200).json({ success: true, data });
};

exports.orderReports = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `order:reports:${tenant_id}:${branch_id}:${JSON.stringify(details).slice(0, 50)}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await orderService.orderReports(details, tenant_id, branch_id);
  
  // Cache for 30 minutes
  await RedisService.create(cacheKey, data, RedisTime);
  
  res.status(200).json({ success: true, data });
};

exports.materialPaymentSelected = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const cacheKey = `order:material:payment:${details.Id}:${tenant_id}:${branch_id}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await orderService.materialPaymentSelected(details, tenant_id, branch_id);
  
  // Cache for 30 minutes
  await RedisService.create(cacheKey, data, RedisTime);
  
  res.status(200).json({ success: true, data });
};
