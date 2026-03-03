const express = require("express");
const router = express.Router();
const userBranchController = require("../Controller/UserBranchController");
const { requireSuperuser, isSelfOrSuperuser } = require("../Middleware/RoleMiddleware");

/* =========================================
   User-Branch Mapping Routes
========================================= */

// 🔐 CREATE: Super User / Admin only
router.post("/", requireSuperuser, userBranchController.createUserBranch);

// 👁️ GET ALL: Super User / Admin only (with optional filters)
router.get("/", requireSuperuser, userBranchController.getUserBranches);

// 👁️ GET SPECIFIC: Self or Super User
router.get("/:branch_id/:user_id", isSelfOrSuperuser, userBranchController.getUserBranchById);

// 🔐 UPDATE: Super User / Admin only
router.put("/:branch_id/:user_id", requireSuperuser, userBranchController.updateUserBranch);

// 🔐 DELETE: Super User / Admin only
router.delete("/:branch_id/:user_id", requireSuperuser, userBranchController.deleteUserBranch);

// 👁️ GET BRANCHES BY USER: Self or Super User
router.get("/user/:user_id/branches", isSelfOrSuperuser, userBranchController.getBranchesByUser);

// 🔐 GET USERS BY BRANCH: Super User / Admin only
router.get("/branch/:branch_id/users", requireSuperuser, userBranchController.getUsersByBranch);

module.exports = router;