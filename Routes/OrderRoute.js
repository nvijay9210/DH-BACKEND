const express = require("express");
const router = express.Router();
const orderController = require("../Controller/OrderController");
const { asyncHandler } = require("../utils/Async");
const authMiddleware = require("../Middleware/AuthMiddleware");

// Material Used
router.post("/order", authMiddleware,asyncHandler(orderController.order));
router.put("/UpdateOrder", authMiddleware,asyncHandler(orderController.updateOrder));
router.post("/orderDelete", authMiddleware,asyncHandler(orderController.orderDelete));
router.post("/FetchOrderUpdate", authMiddleware,asyncHandler(orderController.fetchOrderUpdate));
router.post("/OrderReports", authMiddleware,asyncHandler(orderController.orderReports));
router.post("/MaterialPaymentSelected", authMiddleware,asyncHandler(orderController.materialPaymentSelected));

module.exports = router;
