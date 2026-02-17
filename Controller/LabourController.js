const labourService = require("../Service/LabourService");

exports.labourDetails = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await labourService.labourDetails(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.updateLabour = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await labourService.updateLabour(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.labourDelete = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await labourService.labourDelete(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.fetchLabourUpdate = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await labourService.fetchLabourUpdate(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.labourReports = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await labourService.labourReports(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.labourPayment = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await labourService.labourPayment(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.labourPaymentUpdate = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await labourService.labourPaymentUpdate(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.allLabourPaymentUpdate = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await labourService.allLabourPaymentUpdate(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.allLabourPayment = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await labourService.allLabourPayment(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.fetchContractorPay = async (req, res, next) => {
  try {
    const data = await labourService.fetchContractorPay();

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.contractorReport = async (req, res, next) => {
  try {
    const details=req.body
    const data = await labourService.contractorReport(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.contractorDelete = async (req, res, next) => {
  try {
    const details=req.body
    const data = await labourService.contractorDelete(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.supplierDelete = async (req, res, next) => {
  try {
    const details=req.body
    const data = await labourService.supplierDelete(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};