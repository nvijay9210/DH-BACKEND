// src/routes/payment.routes.js
const express = require("express");
const router = express.Router();
const paymentController = require("../Controller/PaymentController");
const { asyncHandler } = require("../utils/Async");

// Client-side (Project) Payments
router.post("/NewPayment", asyncHandler(paymentController.newPayment));
router.post(
  "/FetchPaymentUpdate",
   asyncHandler(paymentController.fetchPaymentUpdate)
);
router.post(
  "/UpdatePaymentDetails",
  asyncHandler(paymentController.updatePaymentDetails)
);
router.post(
  "/ProjectPaymentDelete",
  asyncHandler(paymentController.projectPaymentDelete)
);
router.post(
  "/ClientPaymentReport",
  asyncHandler(paymentController.clientPaymentReport)
);

// Supplier-side (Material) Payments
router.post(
  "/MaterialPaymentsUpdate",
  asyncHandler(paymentController.materialPaymentsUpdate)
);
router.post(
  "/AllMaterialPaymentUpdate",
  asyncHandler(paymentController.allMaterialPaymentUpdate)
);
router.post(
  "/DeleteMaterialPayments",
  asyncHandler(paymentController.deleteMaterialPayments)
);
router.post(
  "/MaterialsPaymentView",
  asyncHandler(paymentController.materialsPaymentView)
);
router.post(
  "/AllMaterialPayment",
  asyncHandler(paymentController.allMaterialPayment)
);
router.post(
  "/fetchMaterialBalance",
  asyncHandler(paymentController.fetchMaterialBalance)
);

// Fetch supplier balances (GET)
router.get(
  "/FetchMaterialPay",
  asyncHandler(paymentController.fetchMaterialPay)
);

module.exports = router;

