const express = require("express");
const router = express.Router();
const labourController = require("../Controller/LabourController");
const { asyncHandler } = require("../utils/Async");


router.post('/Labour_details', asyncHandler(labourController.labourDetails));
router.put('/UpdateLabour', asyncHandler(labourController.updateLabour));
router.post('/LabourDelete', asyncHandler(labourController.labourDelete));
router.post('/FetchLabourUpdate', asyncHandler(labourController.fetchLabourUpdate));
router.post('/LabourReports', asyncHandler(labourController.labourReports));

// Payment-related labour routes
router.post('/LabourPayment', asyncHandler(labourController.labourPayment));
router.post('/LabourPaymentUpdate', asyncHandler(labourController.labourPaymentUpdate));
router.post('/AllLabourPayment', asyncHandler(labourController.allLabourPayment));
router.post('/AllLabourPaymentUpdate', asyncHandler(labourController.allLabourPaymentUpdate));

// Fetch contractor balances (GET)
router.get('/FetchContractorPay', asyncHandler(labourController.fetchContractorPay));
module.exports = router;
