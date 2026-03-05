const express = require("express");
const router = express.Router();
const userController = require("../Controller/UserController");
const { asyncHandler } = require("../utils/Async"); // ✅ Use imported asyncHandler only
const authMiddleware = require("../Middleware/AuthMiddleware");
const { validateIds } = require("../Middleware/ContextMiddleware");

// Authentication
router.post("/Login", asyncHandler(userController.login));
router.get("/logout",  asyncHandler(userController.logout));

// User Management
router.get("/UserDetails",  asyncHandler(userController.userDetails));
router.get("/UserList",  asyncHandler(userController.userList));
router.get("/FullUserList",  asyncHandler(userController.fullUserList));

router.put("/UserAccess",  asyncHandler(userController.userAccess));
router.put("/AdminPassChange",  asyncHandler(userController.adminPassChange));

router.post("/NewUser",  asyncHandler(userController.newUser));
router.post("/SwitchBranch",  asyncHandler(userController.switchBranch)); // ✅ Added missing route

router.delete("/:user_id",  validateIds, asyncHandler(userController.deleteUser));

module.exports = router;