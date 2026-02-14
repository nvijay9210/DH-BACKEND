const express = require("express");
const router = express.Router();
const orderController = require("../Controller/OrderController");
const { asyncHandler } = require("../utils/Async");

// Material Used
router.post("/order", asyncHandler(orderController.order));
router.put("/UpdateOrder", asyncHandler(orderController.updateOrder));
router.post("/orderDelete", asyncHandler(orderController.orderDelete));
router.post("/FetchOrderUpdate", asyncHandler(orderController.fetchOrderUpdate));
router.post("/OrderReports", asyncHandler(orderController.orderReports));
router.post("/MaterialPaymentSelected", asyncHandler(orderController.materialPaymentSelected));

module.exports = router;
