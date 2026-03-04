const express = require("express");
const router = express.Router();
const userBranchController = require("../Controller/UserBranchController");
const { requireSuperuser, isSelfOrSuperuser } = require("../Middleware/RoleMiddleware");
const { asyncHandler } = require("../utils/Async");

/* =========================================
   User-Branch Mapping Routes
========================================= */

// 🔐 CREATE: Super User / Admin only
router.post("/", requireSuperuser, asyncHandler(userBranchController.createUserBranch));

// 👁️ GET ALL: Super User / Admin only (with optional filters)
router.get("/", requireSuperuser, asyncHandler(userBranchController.getUserBranches));

// 👁️ GET SPECIFIC: Self or Super User
router.get("/:branch_id/:user_id", isSelfOrSuperuser, asyncHandler(userBranchController.getUserBranchById));

// 🔐 UPDATE: Super User / Admin only
router.put("/:branch_id/:user_id", requireSuperuser, asyncHandler(userBranchController.updateUserBranch));

// 🔐 DELETE: Super User / Admin only
router.delete("/:branch_id/:user_id", requireSuperuser, asyncHandler(userBranchController.deleteUserBranch));

// 👁️ GET BRANCHES BY USER: Self or Super User
router.get("/user/:user_id/branches", isSelfOrSuperuser, asyncHandler(userBranchController.getBranchesByUser));

// 🔐 GET USERS BY BRANCH: Super User / Admin only
router.get("/branch/:branch_id/users", requireSuperuser, asyncHandler(userBranchController.getUsersByBranch));

module.exports = router;