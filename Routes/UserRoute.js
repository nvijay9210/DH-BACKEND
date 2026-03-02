const express = require("express");
const router = express.Router();
const userController = require("../Controller/UserController");
const { asyncHandler } = require("../utils/Async");
const authMiddleware = require("../Middleware/AuthMiddleware");

// userentication
router.post('/Login',asyncHandler(userController.login));
router.get('/logout', authMiddleware,asyncHandler(userController.logout));

// User Management
router.get('/UserDetails', authMiddleware,asyncHandler(userController.userDetails));
router.get('/UserList', authMiddleware,asyncHandler(userController.userList));
router.get('/FullUserList',authMiddleware, authMiddleware,asyncHandler(userController.fullUserList));

router.put('/UserAccess',authMiddleware, authMiddleware,asyncHandler(userController.userAccess));
router.put('/AdminPassChange',authMiddleware, authMiddleware,asyncHandler(userController.adminPassChange));
router.post('/NewUser',authMiddleware, authMiddleware,asyncHandler(userController.newUser));

module.exports = router;
