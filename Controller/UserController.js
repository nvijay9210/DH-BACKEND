const userService = require("../Service/UserService");

exports.login = async (req, res, next) => {
  try {
    const details = req.body;
    console.log(details);
    const data = await userService.login(details);
    res.cookie('token', data?.token);

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
    const details = req.body;
    console.log(details);
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
    // const details=req.body
    // console.log(details)
    const data = await userService.userDetails();

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
    // const details=req.body
    // console.log(details)
    const data = await userService.userList();

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
    // const details=req.body
    // console.log(details)
    const data = await userService.fullUserList();

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
    const Details = req.body;
    // console.log(details)
    const data = await userService.userAccess(Details);

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
    const Details = req.body;
    // console.log(details)
    const data = await userService.adminPassChange(Details);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.newUser = async (req, res, next) => {
  try {
    const Details = req.body;
    // console.log(details)
    const data = await userService.newUser(Details);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
