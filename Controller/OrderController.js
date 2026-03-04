const orderService = require("../Service/OrderService");

exports.order = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await orderService.order(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.updateOrder = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await orderService.updateOrder(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.orderDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await orderService.orderDelete(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.fetchOrderUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await orderService.fetchOrderUpdate(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.orderReports = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await orderService.orderReports(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.materialPaymentSelected = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await orderService.materialPaymentSelected(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};
