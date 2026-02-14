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
router.get('/fetchMaterial', asyncHandler(masterController.fetchMaterials));
router.get('/fetchLabour', asyncHandler(masterController.fetchLabourTypes));
router.get('/fetchContractor', asyncHandler(masterController.fetchContractors));
router.get('/fetchSupplier', asyncHandler(masterController.fetchSuppliers));
module.exports = router;
