const express = require("express");
const router = express.Router();
const materialController = require("../Controller/MaterialController");
const { asyncHandler } = require("../utils/Async");

// Material Used
router.post("/Material_List", asyncHandler(materialController.matList));
router.post("/MatUsed", asyncHandler(materialController.matUsed));
router.put("/EditMaterialUsed", asyncHandler(materialController.editMaterialUsed));

// Measurement Details
router.post("/Measurement_Details", asyncHandler(materialController.measurementDetails));

// Material Update
router.put("/UpdateMaterial", asyncHandler(materialController.updateMaterial));

// Fetch Material Update
router.post("/FetchMaterialUpdate", asyncHandler(materialController.fetchMaterialUpdate));

// Fetch Material Used
router.post("/FetchMaterialUsed", asyncHandler(materialController.fetchMaterialUsed));

// Fetch Material (GET)
router.get("/fetchMaterial", asyncHandler(materialController.fetchMaterial));

// Delete Material
router.post("/MaterialDelete", asyncHandler(materialController.materialDelete));

module.exports = router;
