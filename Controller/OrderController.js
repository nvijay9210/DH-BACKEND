const orderService = require("../Service/OrderService");

exports.order = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await orderService.order(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.updateOrder = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await orderService.updateOrder(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.orderDelete = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await orderService.orderDelete(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.fetchOrderUpdate = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await orderService.fetchOrderUpdate(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.orderReports = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await orderService.orderReports(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.materialPaymentSelected = async (req, res, next) => {
  try {
const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await orderService.materialPaymentSelected(details,tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
