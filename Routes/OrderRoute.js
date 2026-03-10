const express = require("express");
const router = express.Router();
const orderController = require("../Controller/OrderController");
const { asyncHandler } = require("../utils/Async");
const authMiddleware = require("../Middleware/AuthMiddleware");
const { validateRequest } = require("../Middleware/ValidationMiddleware");

// Material Used
router.post("/order", validateRequest('createOrder'), asyncHandler(orderController.order));
router.put("/UpdateOrder", validateRequest('updateOrder'), asyncHandler(orderController.updateOrder));
router.post("/orderDelete", asyncHandler(orderController.orderDelete));
router.post("/FetchOrderUpdate", asyncHandler(orderController.fetchOrderUpdate));
router.post("/OrderReports", asyncHandler(orderController.orderReports));
router.post("/MaterialPaymentSelected", asyncHandler(orderController.materialPaymentSelected));

module.exports = router;
