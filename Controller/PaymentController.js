const paymentService = require("../Service/PaymentService");

exports.newPayment = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await paymentService.newPayment(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.fetchPaymentUpdate = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await paymentService.fetchPaymentUpdate(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.updatePaymentDetails = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await paymentService.updatePaymentDetails(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.projectPaymentDelete = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await paymentService.projectPaymentDelete(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.clientPaymentReport = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await paymentService.clientPaymentReport(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.materialPaymentsUpdate = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await paymentService.materialPaymentsUpdate(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.allMaterialPaymentUpdate = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await paymentService.allMaterialPaymentUpdate(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.deleteMaterialPayments = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await paymentService.deleteMaterialPayments(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.materialsPaymentView = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await paymentService.materialsPaymentView(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.allMaterialPayment = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await paymentService.allMaterialPayment(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.fetchMaterialBalance = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await paymentService.fetchMaterialBalance(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.fetchMaterialPay = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await paymentService.fetchMaterialPay(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};