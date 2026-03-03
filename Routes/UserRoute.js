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
router.get('/FullUserList',authMiddleware,asyncHandler(userController.fullUserList));

router.put('/UserAccess',authMiddleware,asyncHandler(userController.userAccess));
router.put('/AdminPassChange',authMiddleware,asyncHandler(userController.adminPassChange));
router.post('/NewUser',authMiddleware,asyncHandler(userController.newUser));
router.delete('/:id',authMiddleware,asyncHandler(userController.deleteUser));

module.exports = router;
