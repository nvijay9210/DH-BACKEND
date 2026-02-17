const express = require("express");
const router = express.Router();
const masterController = require("../Controller/MasterController");
const { asyncHandler } = require("../utils/Async");

// Master Data – POST (Create)
router.post('/Material_List', asyncHandler(masterController.createMaterial));
router.post('/Labour_List', asyncHandler(masterController.createLabourType));
router.post('/ContractorList', asyncHandler(masterController.createContractor));
router.post('/SupplierList', asyncHandler(masterController.createSupplier));

// Master Data – GET (Fetch All)
router.get('/fetchMaterial', asyncHandler(masterController.fetchMaterial));
router.get('/fetchLabour', asyncHandler(masterController.fetchLabour));
router.get('/fetchContractor', asyncHandler(masterController.fetchContractor));
router.get('/fetchSupplier', asyncHandler(masterController.fetchSupplier));
router.post('/LabourTypeDelete', asyncHandler(masterController.labourTypeDelete));
module.exports = router;
