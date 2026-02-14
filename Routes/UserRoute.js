const express = require("express");
const router = express.Router();
const userController = require("../Controller/UserController");
const { asyncHandler } = require("../utils/Async");

// userentication
router.post('/Login', asyncHandler(userController.login));
router.get('/logout', asyncHandler(userController.logout));

// User Management
router.get('/UserDetails', asyncHandler(userController.userDetails));
router.get('/UserList', asyncHandler(userController.userList));
router.get('/FullUserList', asyncHandler(userController.fullUserList));

router.put('/UserAccess', asyncHandler(userController.userAccess));
router.put('/AdminPassChange', asyncHandler(userController.adminPassChange));
router.post('/NewUser', asyncHandler(userController.newUser));

module.exports = router;
