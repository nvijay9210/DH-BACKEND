const materialService = require("../Service/MaterialService");

exports.materialList = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.materialList(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.materialUsed = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.materialUsed(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.editMaterialUsed = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.EditMaterialUsed(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.measurementDetails = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const file = req.file;
  const data = await materialService.measurementDetails(details, tenant_id, branch_id, file);
  res.status(200).json({ success: true, data });
};

exports.updateMaterial = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.updateMaterial(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.fetchMaterialUpdate = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.fetchMaterialUpdate(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.fetchMaterialUsed = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.fetchMaterialUsed(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.fetchMaterial = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await materialService.fetchMaterial(tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.materialDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.materialDelete(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.materialPaymentReports = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.materialPaymentReports(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.stockList = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.stockList(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.measurementDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.measurementDelete(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.measurementReports = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.measurementReports(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.overAllReports = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await materialService.overAllReports(details, tenant_id, branch_id);
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

