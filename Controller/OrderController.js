const orderService = require("../Service/OrderService");

exports.order = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await orderService.order(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.updateOrder = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await orderService.updateOrder(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.orderDelete = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await orderService.orderDelete(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.fetchOrderUpdate = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await orderService.fetchOrderUpdate(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.orderReports = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await orderService.orderReports(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};
exports.materialPaymentSelected = async (req, res, next) => {
  try {
    const details=req.body
    console.log(details)
    const data = await orderService.materialPaymentSelected(details);

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};