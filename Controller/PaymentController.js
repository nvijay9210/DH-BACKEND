const paymentService = require("../Service/PaymentService");

exports.newPayment = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await paymentService.newPayment(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.fetchPaymentUpdate = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await paymentService.fetchPaymentUpdate(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.updatePaymentDetails = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await paymentService.updatePaymentDetails(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.projectPaymentDelete = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await paymentService.projectPaymentDelete(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.clientPaymentReport = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await paymentService.clientPaymentReport(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.materialPaymentsUpdate = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await paymentService.materialPaymentsUpdate(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.allMaterialPaymentUpdate = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await paymentService.allMaterialPaymentUpdate(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.deleteMaterialPayments = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await paymentService.deleteMaterialPayments(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.materialsPaymentView = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await paymentService.materialsPaymentView(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.allMaterialPayment = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await paymentService.allMaterialPayment(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.fetchMaterialBalance = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await paymentService.fetchMaterialBalance(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.fetchMaterialPay = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    // const details = req.body;
    //console.log(details)
    const data = await paymentService.fetchMaterialPay(tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
