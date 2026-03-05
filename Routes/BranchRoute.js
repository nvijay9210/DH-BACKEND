const express = require("express");
const router = express.Router();
const branchController = require("../Controller/BranchController");
const { optionalIdValidator } = require("../Middleware/OptionalIdValidator");
const { validateIds } = require("../Middleware/ContextMiddleware");
const { asyncHandler } = require("../utils/Async");

router.post("/", asyncHandler(branchController.createBranch));
router.get("/", asyncHandler(branchController.getBranches));
router.get("/:branch_id",validateIds, asyncHandler(branchController.getBranchById));
router.put("/:branch_id",validateIds, asyncHandler(branchController.updateBranch));
router.delete("/:branch_id",validateIds, asyncHandler(branchController.deleteBranch));

module.exports = router;
