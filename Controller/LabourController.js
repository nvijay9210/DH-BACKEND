const labourService = require("../Service/LabourService");

exports.labourDetails = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  
  const data = await labourService.labourDetails(details, tenant_id, branch_id);
  
  res.status(200).json({ success: true, data });
};

exports.updateLabour = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  
  const data = await labourService.updateLabour(details, tenant_id, branch_id);
  
  res.status(200).json({ success: true, data });
};

exports.labourDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  
  const data = await labourService.labourDelete(details, tenant_id, branch_id);
  
  res.status(200).json({ success: true, data });
};

exports.fetchLabourUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  
  const data = await labourService.fetchLabourUpdate(details, tenant_id, branch_id);
  
  res.status(200).json({ success: true, data });
};

exports.labourReports = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  
  const data = await labourService.labourReports(details, tenant_id, branch_id);
  
  res.status(200).json({ success: true, data });
};

exports.labourPayment = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  
  const data = await labourService.labourPayment(details, tenant_id, branch_id);
  
  res.status(200).json({ success: true, data });
};

exports.labourPaymentUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  
  const data = await labourService.labourPaymentUpdate(details, tenant_id, branch_id);
  
  res.status(200).json({ success: true, data });
};

exports.allLabourPaymentUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  
  const data = await labourService.allLabourPaymentUpdate(details, tenant_id, branch_id);
  
  res.status(200).json({ success: true, data });
};

exports.allLabourPayment = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  
  const data = await labourService.allLabourPayment(details, tenant_id, branch_id);
  
  res.status(200).json({ success: true, data });
};

exports.fetchContractorPay = async (req, res) => {
  const { tenant_id, branch_id } = req;
  
  const data = await labourService.fetchContractorPay(tenant_id, branch_id);
  
  res.status(200).json({ success: true, data });
};

exports.contractorReport = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  
  const data = await labourService.contractorReport(details, tenant_id, branch_id);
  
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
