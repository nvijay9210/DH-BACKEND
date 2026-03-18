// Controller/UserController.js
const userService = require("../Service/UserService");
const RedisService = require("../Service/RedisService");
const RedisTime=process.env.RedisTime
const { validateData } = require("../Middleware/ValidationMiddleware");
const { AppError } = require("../Logics/AppError");

exports.login = async (req, res) => {
  const data = await userService.login(req.body);

  // res.cookie("token", data?.token, {
  //   httpOnly: true,
  //   sameSite: process.env.NODE_ENV === "production"?"none":"lax",
  //   secure: process.env.NODE_ENV !== "production",
  //   maxAge: 24 * 60 * 60 * 1000,
  // });

  res.cookie("token", data.token, {
  httpOnly: true,
  sameSite: "lax",
  secure: false,
  maxAge: 24 * 60 * 60 * 1000,
});

  res.status(200).json({ success: true, data });
};

exports.logout = async (req, res) => {
  res.clearCookie("token");
  await userService.logout(req.body);
  res.status(200).json({ success: true, msg: "Logout successful" });
};

exports.userDetails = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const role = req.role;
  const cacheKey = `user:details:${tenant_id}:${branch_id}:${role}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await userService.userDetails(tenant_id, branch_id, role);

  // Cache for 1 hour
  await RedisService.create(cacheKey, data, RedisTime);

  res.status(200).json({ success: true, data });
};

exports.userAccess = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const role = req.user?.role;
  const cacheKey = `user:access:${tenant_id}:${branch_id}:${role}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await userService.userAccess(req.body, tenant_id, branch_id, role);
  
  // Cache for 1 hour
  await RedisService.create(cacheKey, data, RedisTime);
  
  res.status(200).json({ success: true, data });
};

exports.newUser = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const createdBy = req.user?.username;

  // Example: Additional validation in controller (if needed)
  // The route-level validation already handles this, but you can add more logic here
  const validation = validateData('createUser', req.body);
  if (!validation.isValid) {
    // Custom error handling if needed
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors
    });
  }

  // Use the validated/cleaned data
  const cleanData = validation.value;

  const data = await userService.newUser(cleanData, tenant_id, branch_id, createdBy);

  // Cache new user and invalidate list
  if (data.id) {
    await RedisService.create(`user:${data.id}`, data, RedisTime);
    await RedisService.deleteByPattern(`user:list:*`);
    await RedisService.deleteByPattern(`user:details:*`);
  }
  
  res.status(200).json({ success: true, data });
};

exports.deleteUser = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const role = req.user?.role;
  const userId = req.params.user_id;
  
  const data = await userService.deleteUser(userId, tenant_id, branch_id, role);
  
  // Invalidate user cache
  await RedisService.delete(`user:${userId}`);
  await RedisService.deleteByPattern(`user:list:*`);
  await RedisService.deleteByPattern(`user:details:*`);
  
  res.status(200).json({ success: true, data });
};

exports.switchBranch = async (req, res) => {
  const { tenant_id } = req;
  const { branch_id } = req.body;
  const user = req.user;
  
  const newToken = await userService.switchBranch(tenant_id, branch_id, user);
  
  res.cookie("token", newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 4 * 60 * 60 * 1000,
  });
  
  res.status(200).json({ success: true, msg: "Branch Switched Successfully" });
};
