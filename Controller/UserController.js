const userService = require("../Service/UserService");

exports.login = async (req, res, next) => {
  try {
    const details = req.body;

    const data = await userService.login(details);
    res.cookie("token", data?.token);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.logout = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const details = req.body;

    const data = await userService.logout(details);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.userDetails = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const role = req.user.role;
    // //console.log(details)
    const data = await userService.userDetails(tenant_id, branch_id, role);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.deleteUser = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const {role} = req.user;
    const userId=req.params.id
    // //console.log(details)
    const data = await userService.deleteUser(userId,tenant_id, branch_id, role);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.userList = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const role = req.user.role;
    // console.log(role)
    const data = await userService.userList(tenant_id, branch_id, role);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.fullUserList = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    // const details=req.body
    // //console.log(details)
    const data = await userService.fullUserList(tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.userAccess = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const Details = req.body;
    // //console.log(details)
    const data = await userService.userAccess(Details, tenant_id, branch_id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.adminPassChange = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const Details = req.body;
    // //console.log(details)
    const data = await userService.adminPassChange(
      Details,
      tenant_id,
      branch_id
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.switchBranch = async (req, res, next) => {
  try {
    const { tenant_id } = req;
    const branch_id=req.body.branch_id;
    const user = req.user;
    // //console.log(details)
    const data = await userService.switchBranch(
      tenant_id,
      branch_id,
      user
    );

    res.status(200).json({
      success: true,
      msg:'Branch Switched Successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.newUser = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const Details = req.body;
    const username = req.user.username;
    //console.log(details)
    const data = await userService.newUser(
      Details,
      tenant_id,
      branch_id,
      username
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
