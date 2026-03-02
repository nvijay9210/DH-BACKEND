const labourService = require("../Service/LabourService");

exports.labourDetails = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const details = req.body;
    console.log(tenant_id,branch_id)
    const data = await labourService.labourDetails(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.updateLabour = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await labourService.updateLabour(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.labourDelete = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await labourService.labourDelete(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.fetchLabourUpdate = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await labourService.fetchLabourUpdate(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.labourReports = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await labourService.labourReports(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.labourPayment = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await labourService.labourPayment(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.labourPaymentUpdate = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await labourService.labourPaymentUpdate(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.allLabourPaymentUpdate = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await labourService.allLabourPaymentUpdate(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.allLabourPayment = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await labourService.allLabourPayment(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.fetchContractorPay = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const data = await labourService.fetchContractorPay(tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.contractorReport = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const details = req.body;
    const data = await labourService.contractorReport(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.contractorDelete = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const details = req.body;
    const data = await labourService.contractorDelete(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.supplierDelete = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const details = req.body;
    const data = await labourService.supplierDelete(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
