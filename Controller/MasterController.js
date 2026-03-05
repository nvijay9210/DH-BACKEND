const masterService = require("../Service/MasterService");

exports.labourList = async (req, res) => {
  const details = req.body;
  const data = await masterService.labourList(details);
  res.status(200).json({ success: true, data });
};

exports.materialList = async (req, res) => {
  const details = req.body;
  const data = await masterService.materialList(details);
  res.status(200).json({ success: true, data });
};

exports.contractorList = async (req, res) => {
  const details = req.body;
  const data = await masterService.contractorList(details);
  res.status(200).json({ success: true, data });
};

exports.supplierList = async (req, res) => {
  const details = req.body;
  const data = await masterService.supplierList(details);
  res.status(200).json({ success: true, data });
};

exports.fetchMaterial = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await masterService.fetchMaterial(tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.fetchLabour = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await masterService.fetchLabour(tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.fetchContractor = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await masterService.fetchContractor(tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.fetchSupplier = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await masterService.fetchSupplier(tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};

exports.labourTypeDelete = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;
  const data = await masterService.labourTypeDelete(details, tenant_id, branch_id);
  res.status(200).json({ success: true, data });
};
