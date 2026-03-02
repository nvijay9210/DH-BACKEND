const express = require("express");
const router = express.Router();
const labourController = require("../Controller/LabourController");
const { asyncHandler } = require("../utils/Async");
const authMiddleware = require("../Middleware/AuthMiddleware");

router.post(
  "/Labour_details",
  authMiddleware,
  asyncHandler(labourController.labourDetails)
);
router.put(
  "/UpdateLabour",
  authMiddleware,
  asyncHandler(labourController.updateLabour)
);
router.post(
  "/LabourDelete",
  authMiddleware,
  asyncHandler(labourController.labourDelete)
);
router.post(
  "/FetchLabourUpdate",
  authMiddleware,
  asyncHandler(labourController.fetchLabourUpdate)
);
router.post(
  "/LabourReports",
  authMiddleware,
  asyncHandler(labourController.labourReports)
);

// Payment-related labour routes
router.post(
  "/LabourPayment",
  authMiddleware,
  asyncHandler(labourController.labourPayment)
);
router.post(
  "/LabourPaymentUpdate",
  authMiddleware,
  asyncHandler(labourController.labourPaymentUpdate)
);
router.post(
  "/AllLabourPayment",
  authMiddleware,
  asyncHandler(labourController.allLabourPayment)
);
router.post(
  "/AllLabourPaymentUpdate",
  authMiddleware,
  asyncHandler(labourController.allLabourPaymentUpdate)
);

// Fetch contractor balances (GET)
router.get(
  "/FetchContractorPay",
  authMiddleware,
  asyncHandler(labourController.fetchContractorPay)
);
router.post(
  "/ContractorReport",
  authMiddleware,
  asyncHandler(labourController.contractorReport)
);
module.exports = router;
router.post(
  "/ContractorDelete",
  authMiddleware,
  asyncHandler(labourController.contractorDelete)
);
module.exports = router;
router.post(
  "/SupplierDelete",
  authMiddleware,
  asyncHandler(labourController.supplierDelete)
);
module.exports = router;
