const paymentService = require("../Service/PaymentService");

exports.newPayment = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await paymentService.newPayment(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.fetchPaymentUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await paymentService.fetchPaymentUpdate(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.updatePaymentDetails = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await paymentService.updatePaymentDetails(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.projectPaymentDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await paymentService.projectPaymentDelete(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.clientPaymentReport = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await paymentService.clientPaymentReport(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.materialPaymentsUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await paymentService.materialPaymentsUpdate(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.allMaterialPaymentUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await paymentService.allMaterialPaymentUpdate(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.deleteMaterialPayments = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await paymentService.deleteMaterialPayments(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.materialsPaymentView = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await paymentService.materialsPaymentView(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.allMaterialPayment = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await paymentService.allMaterialPayment(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.fetchMaterialBalance = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await paymentService.fetchMaterialBalance(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.fetchMaterialPay = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await paymentService.fetchMaterialPay(tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

