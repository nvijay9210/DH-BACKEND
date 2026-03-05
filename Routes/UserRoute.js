const express = require("express");
const router = express.Router();
const userController = require("../Controller/UserController");
const { asyncHandler } = require("../utils/Async"); // ✅ Use imported asyncHandler only
const authMiddleware = require("../Middleware/AuthMiddleware");
const { validateIds } = require("../Middleware/ContextMiddleware");

// Authentication
router.post("/Login", asyncHandler(userController.login));
router.get("/logout", authMiddleware, asyncHandler(userController.logout));

// User Management
router.get("/UserDetails", authMiddleware, asyncHandler(userController.userDetails));
router.get("/UserList", authMiddleware, asyncHandler(userController.userList));
router.get("/FullUserList", authMiddleware, asyncHandler(userController.fullUserList));

router.put("/UserAccess", authMiddleware, asyncHandler(userController.userAccess));
router.put("/AdminPassChange", authMiddleware, asyncHandler(userController.adminPassChange));

router.post("/NewUser", authMiddleware, asyncHandler(userController.newUser));
router.post("/SwitchBranch", authMiddleware, asyncHandler(userController.switchBranch)); // ✅ Added missing route

router.delete("/:user_id", authMiddleware, validateIds, asyncHandler(userController.deleteUser));

module.exports = router;
