// src/routes/payment.routes.js
const express = require("express");
const router = express.Router();
const paymentController = require("../Controller/PaymentController");
const { asyncHandler } = require("../utils/Async");
const authMiddleware = require("../Middleware/AuthMiddleware");

// Client-side (Project) Payments
router.post("/NewPayment", authMiddleware,asyncHandler(paymentController.newPayment));
router.post(
  "/FetchPaymentUpdate",
   authMiddleware,asyncHandler(paymentController.fetchPaymentUpdate)
);
router.post(
  "/UpdatePaymentDetails",
  authMiddleware,asyncHandler(paymentController.updatePaymentDetails)
);
router.post(
  "/ProjectPaymentDelete",
  authMiddleware,asyncHandler(paymentController.projectPaymentDelete)
);
router.post(
  "/ClientPaymentReport",
  authMiddleware,asyncHandler(paymentController.clientPaymentReport)
);

// Supplier-side (Material) Payments
router.post(
  "/MaterialPaymentsUpdate",
  authMiddleware,asyncHandler(paymentController.materialPaymentsUpdate)
);
router.post(
  "/AllMaterialPaymentUpdate",
  authMiddleware,asyncHandler(paymentController.allMaterialPaymentUpdate)
);
router.post(
  "/DeleteMaterialPayments",
  authMiddleware,asyncHandler(paymentController.deleteMaterialPayments)
);
router.post(
  "/MaterialsPaymentView",
  authMiddleware,asyncHandler(paymentController.materialsPaymentView)
);
router.post(
  "/AllMaterialPayment",
  authMiddleware,asyncHandler(paymentController.allMaterialPayment)
);
router.post(
  "/fetchMaterialBalance",
  authMiddleware,asyncHandler(paymentController.fetchMaterialBalance)
);

// Fetch supplier balances (GET)
router.get(
  "/FetchMaterialPay",
  authMiddleware,authMiddleware,asyncHandler(paymentController.fetchMaterialPay)
);

module.exports = router;

