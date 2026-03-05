const express = require("express");
const router = express.Router();
const materialController = require("../Controller/MaterialController");
const { asyncHandler } = require("../utils/Async");
const authMiddleware = require("../Middleware/AuthMiddleware");

// Material Used
// router.post("/Material_List", authMiddleware,asyncHandler(materialController.matList));
router.put(
  "/MatUsed",
  authMiddleware,
  asyncHandler(materialController.matUsed)
);
router.put(
  "/EditMaterialUsed",
  authMiddleware,
  asyncHandler(materialController.editMaterialUsed)
);

// Measurement Details
router.post(
  "/Measurement_Details",
  authMiddleware,
  asyncHandler(materialController.measurementDetails)
);

// Material Update
router.put(
  "/UpdateMaterial",
  authMiddleware,
  asyncHandler(materialController.updateMaterial)
);

// Fetch Material Update
router.post(
  "/FetchMaterialUpdate",
  authMiddleware,
  asyncHandler(materialController.fetchMaterialUpdate)
);

// Fetch Material Used
router.post(
  "/FetchMaterialUsed",
  authMiddleware,
  asyncHandler(materialController.fetchMaterialUsed)
);

// Fetch Material (GET)
router.get(
  "/fetchMaterial",
  authMiddleware,
  asyncHandler(materialController.fetchMaterial)
);

// Delete Material
router.post(
  "/MaterialDelete",
  authMiddleware,
  asyncHandler(materialController.materialDelete)
);
router.post(
  "/MaterialPaymentReports",
  authMiddleware,
  asyncHandler(materialController.materialPaymentReports)
);
router.post(
  "/Stock_List",
  authMiddleware,
  asyncHandler(materialController.stockList)
);
router.post(
  "/MeasurementDelete",
  authMiddleware,
  asyncHandler(materialController.measurementDelete)
);
router.post(
  "/MeasurementReports",
  authMiddleware,
  asyncHandler(materialController.measurementReports)
);
router.post(
  "/OverAllReports",
  authMiddleware,
  asyncHandler(materialController.overAllReports)
);
router.post(
  "/Reports",
  authMiddleware,
  asyncHandler(materialController.reports)
);

module.exports = router;
