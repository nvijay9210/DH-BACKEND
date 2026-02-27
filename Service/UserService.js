const { pool } = require("../config/db");
const { deleteFile } = require("../utils/UploadFile");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

exports.login = async (Details) => {
  console.log("Client Details:", Details);

  const jwt_key = process.env.JWT_KEY;

  try {
    // Fetch user with tenant + branch info
    const Result = await pool.query(
      `SELECT u.*, 
          t.is_active AS tenant_active,
          b.is_active AS branch_active
   FROM users u
   JOIN tenant t ON u.tenant_id = t.tenant_id
   LEFT JOIN branch b ON u.branch_id = b.branch_id
   WHERE u.User_name = ?`,
      [Details.username]
    );

    if (Result.length === 0) {
      return { msg: "Username does not exist", success: false };
    }

    const user = Result[0];

    // Check password (bcrypt recommended)
    // const isMatch = await bcrypt.compare(Details.password, user.Password);

    // if (!isMatch) {
    //   return { msg: "Incorrect password", success: false };
    // }

    if (user.Status !== "Active") {
      return { msg: "User Deactivated", success: false };
    }

    if (user.tenant_active !== 1) {
      return { msg: "Tenant is inactive", success: false };
    }

    // Only validate branch if user has branch_id
    if (user.branch_id && user.branch_active !== 1) {
      return { msg: "Branch is inactive", success: false };
    }

    // ✅ Create proper JWT payload
    const token = jwt.sign(
      {
        user_id: user.User_id,
        username: user.User_name,
        tenant_id: user.tenant_id,
        branch_id: user.branch_id || null,
        role: user.Rights,
      },
      jwt_key,
      { expiresIn: "1d" }
    );

    return {
      msg: "Login successful",
      success: true,
      token,
      user: {
        user_id: user.User_id,
        username: user.User_name,
        tenant_id: user.tenant_id,
        branch_id: user.branch_id,
        rights: user.Rights,
      },
    };
  } catch (err) {
    console.error("Login error:", err);
    return { error: "Internal server error" };
  }
};

exports.logout = async (Details) => {
  res.clearCookie("token");
  return { Status: "Success" };
};
exports.userDetails = async () => {
  const details = await pool
    .query("select * from users ")
    .catch((err) => console.log(err));
  return details;
};
exports.userList = async () => {
  try {
    const details = await pool.query("SELECT * FROM users ");
    return details;
  } catch (err) {
    console.error("Error fetching user names:", err);
    return "Internal Server Error";
  }
};
exports.fullUserList = async () => {
  const details = await pool
    .query("select User_name from users")
    .catch((err) => console.log(err));
  return details;
};
exports.userAccess = async (Details) => {
  const material = await pool
    .query("update Users set Rights = ? , Status = ? where User_name =?;", [
      Details.rights,
      Details.status,
      Details.username,
    ])
    .catch((err) => console.log(err));
  console.log(material);
  return;
};
exports.adminPassChange = async (Details) => {
  const result = await pool
    .query("update Users set Password = ?  where User_name =?;", [
      Details.password,
      Details.username,
    ])
    .catch((err) => console.log(err));
  console.log(result);
  return;
};
exports.newUser = async (Details, tenant_id, branch_id, username) => {
  

  // Check if the username already exists in the database
  const existingUser = await pool.query(
    "select * from Users where User_name = ? and tenant_id=?",
    [Details.username, tenant_id]
  );

  if (existingUser.length > 0) {
    // If the username exists, send an error response
    return { error: " Username already exists" };
  }

  // If the username doesn't exist, proceed to insert the new user
  try {
    const Result = await pool.query(
      "INSERT INTO Users (User_name, Password, Rights, Status,Created_by,Created_date,tenant_id,branch_id) VALUES (?, ?, ?, ?, ? ,?,?,?)",
      [
        Details.username.toUpperCase(),
        Details.password,
        Details.rights,
        Details.status,
        username,
        Details.createdDate,
        tenant_id,
        branch_id,
      ]
    );
    console.log(Result);
    return;
  } catch (err) {
    console.error(err); 
    return { error: "Internal server error" };
  }
};
