const express = require("express");
const router = express.Router();
const masterController = require("../Controller/MasterController");
const { asyncHandler } = require("../utils/Async");

// Master Data – POST (Create)
router.post('/Material_List', asyncHandler(masterController.materialList));
router.post('/Labour_List', asyncHandler(masterController.labourList));
router.post('/ContractorList', asyncHandler(masterController.contractorList));
router.post('/SupplierList', asyncHandler(masterController.supplierList));

// Master Data – GET (Fetch All)
router.get('/fetchMaterial', asyncHandler(masterController.fetchMaterial));
router.get('/fetchLabour', asyncHandler(masterController.fetchLabour));
router.get('/fetchContractor', asyncHandler(masterController.fetchContractor));
router.get('/fetchSupplier', asyncHandler(masterController.fetchSupplier));
router.post('/LabourTypeDelete', asyncHandler(masterController.labourTypeDelete));
module.exports = router;
