const express = require("express");
const router = express.Router();
const userController = require("../Controller/UserController");
const { asyncHandler } = require("../utils/Async"); // ✅ Use imported asyncHandler only
const authMiddleware = require("../Middleware/AuthMiddleware");
const { validateIds } = require("../Middleware/ContextMiddleware");
const ssoAuth = require("../Keycloak/SSOAuth");
const { validateRequest } = require("../Middleware/ValidationMiddleware");

// Authentication
router.post("/Login", validateRequest('login'), asyncHandler(userController.login));
router.get("/logout",  ssoAuth.validateToken,asyncHandler(userController.logout));

// User Management
router.get("/UserDetails",  ssoAuth.validateToken,asyncHandler(userController.userDetails));
router.get("/UserList",  ssoAuth.validateToken,asyncHandler(userController.userList));
router.get("/FullUserList",  ssoAuth.validateToken,asyncHandler(userController.fullUserList));

router.put("/UserAccess",  ssoAuth.validateToken, validateRequest('userAccess'), asyncHandler(userController.userAccess));
router.put("/AdminPassChange",  ssoAuth.validateToken,asyncHandler(userController.adminPassChange));

router.post("/NewUser",  ssoAuth.validateToken, validateRequest('createUser'), asyncHandler(userController.newUser));
router.post("/addUser",  ssoAuth.validateToken, validateRequest('createUser'), asyncHandler(userController.addUser));
router.post("/SwitchBranch",  ssoAuth.validateToken,asyncHandler(userController.switchBranch)); // ✅ Added missing route

router.delete("/:user_id",  ssoAuth.validateToken,validateIds, asyncHandler(userController.deleteUser));

module.exports = router;
