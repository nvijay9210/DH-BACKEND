const express = require("express");
const router = express.Router();
const userBranchController = require("../Controller/UserBranchController");
const { requireSuperuser, isSelfOrSuperuser } = require("../Middleware/RoleMiddleware");
const { asyncHandler } = require("../utils/Async");

/* =========================================
   User-Branch Mapping Routes
========================================= */

// 🔐 CREATE: SUPERUSER / ADMIN only
router.post("/", requireSuperuser, asyncHandler(userBranchController.createUserBranch));

// 👁️ GET ALL: SUPERUSER / ADMIN only (with optional filters)
router.get("/", requireSuperuser, asyncHandler(userBranchController.getUserBranches));

// 👁️ GET SPECIFIC: Self or SUPERUSER
router.get("/:branch_id/:user_id", isSelfOrSuperuser, asyncHandler(userBranchController.getUserBranchById));

// 🔐 UPDATE: SUPERUSER / ADMIN only
router.put("/:branch_id/:user_id", requireSuperuser, asyncHandler(userBranchController.updateUserBranch));

// 🔐 DELETE: SUPERUSER / ADMIN only
router.delete("/:branch_id/:user_id", requireSuperuser, asyncHandler(userBranchController.deleteUserBranch));

// 👁️ GET BRANCHES BY USER: Self or SUPERUSER
router.get("/user/:user_id/branches", isSelfOrSuperuser, asyncHandler(userBranchController.getBranchesByUser));

// 🔐 GET USERS BY BRANCH: SUPERUSER / ADMIN only
router.get("/branch/:branch_id/users", requireSuperuser, asyncHandler(userBranchController.getUsersByBranch));

module.exports = router;