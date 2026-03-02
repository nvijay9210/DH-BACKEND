const express = require("express");
const router = express.Router();
const userController = require("../Controller/UserController");
const { asyncHandler } = require("../utils/Async");
const authMiddleware = require("../Middleware/AuthMiddleware");

// userentication
router.post('/Login', asyncHandler(userController.login));
router.get('/logout', asyncHandler(userController.logout));

// User Management
router.get('/UserDetails', asyncHandler(userController.userDetails));
router.get('/UserList', asyncHandler(userController.userList));
router.get('/FullUserList',authMiddleware, asyncHandler(userController.fullUserList));

router.put('/UserAccess',authMiddleware, asyncHandler(userController.userAccess));
router.put('/AdminPassChange',authMiddleware, asyncHandler(userController.adminPassChange));
router.post('/NewUser',authMiddleware, asyncHandler(userController.newUser));

module.exports = router;
