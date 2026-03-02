const { pool } = require("../config/db");
const { deleteFile } = require("../utils/UploadFile");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

/* ===============================
   User Login
=================================*/
exports.login = async (Details) => {
  let conn;
  try {
    console.log("Client Details:", Details);
    const jwt_key = process.env.JWT_KEY;

    if (!jwt_key) {
      throw new Error("JWT_KEY not configured in environment variables");
    }

    conn = await pool.getConnection();

    // Fetch user with tenant + branch info (with proper tenant isolation)
    const result = await conn.query(
      `SELECT u.*, 
          t.is_active AS tenant_active,
          b.is_active AS branch_active
       FROM users u
       JOIN tenant t ON u.tenant_id = t.tenant_id
       LEFT JOIN branch b ON u.branch_id = b.branch_id
       WHERE u.User_name = ? AND u.tenant_id = ?`,
      [Details.username, Details.tenant_id] // ✅ Always filter by tenant_id
    );

    const users = result[0];

    if (users.length === 0) {
      return { msg: "Username does not exist", success: false };
    }

    const user = users[0];

    // ✅ Check password with bcrypt
    if (user.Password) {
      const isMatch = await bcrypt.compare(Details.password, user.Password);
      if (!isMatch) {
        return { msg: "Incorrect password", success: false };
      }
    }

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
    console.error("❌ login Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   User Logout (Service layer - just returns success)
=================================*/
exports.logout = async (Details) => {
  // ✅ Service layer doesn't handle cookies/responses
  // Controller should clear cookie: res.clearCookie("token")
  return { Status: "Success", msg: "Logout successful" };
};

/* ===============================
   User Details (All Users - Admin Only)
=================================*/
exports.userDetails = async (tenant_id, branch_id, currentUserRights) => {
  let conn;
  try {
    conn = await pool.getConnection();

    // ✅ Only allow admins to view all users, and filter by tenant
    if (currentUserRights !== "Admin" && currentUserRights !== "Super User") {
      throw new Error("Access denied: Admin privileges required");
    }

    const result = await conn.query(
      `SELECT User_id, User_name, Rights, Status, Created_by, Created_date, tenant_id, branch_id 
       FROM users 
       WHERE tenant_id = ? and branch_id=?
       ORDER BY User_name`,
      [tenant_id, branch_id]
    );

    return result;
  } catch (err) {
    console.error("❌ userDetails Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   User List (All Users - Admin Only)
=================================*/
exports.userList = async (tenant_id, branch_id, currentUserRights) => {
  let conn;
  try {
    conn = await pool.getConnection();

    if (currentUserRights !== "Admin" && currentUserRights !== "Super User") {
      throw new Error("Access denied: Admin privileges required");
    }

    const result = await conn.query(
      `SELECT User_id, User_name, Rights, Status, Created_date 
       FROM users 
       WHERE tenant_id = ? 
       AND branch_id = ? 
       ORDER BY User_name`,
      [tenant_id, branch_id]
    );

    return result;
  } catch (err) {
    console.error("❌ userList Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Full User List (Names Only - For Dropdowns)
=================================*/
exports.fullUserList = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const result = await conn.query(
      `SELECT User_name 
       FROM users 
       WHERE tenant_id = ? AND branch_id = ?  AND Status = 'Active'
       ORDER BY User_name`,
      [tenant_id, branch_id]
    );

    return result;
  } catch (err) {
    console.error("❌ fullUserList Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Update User Access (Rights & Status)
=================================*/
exports.userAccess = async (
  Details,
  tenant_id,
  branch_id,
  currentUserRights
) => {
  let conn;
  try {
    conn = await pool.getConnection();

    // ✅ Only admins can modify user access
    if (currentUserRights !== "Admin" && currentUserRights !== "Super User") {
      throw new Error("Access denied: Admin privileges required");
    }

    const result = await conn.query(
      `UPDATE users 
       SET Rights = ?, Status = ?, Updated_date = NOW()
       WHERE User_name = ? AND tenant_id = ?`,
      [Details.rights, Details.status, Details.username, tenant_id]
    );

    if (result[0].affectedRows === 0) {
      throw new Error("User not found or access denied");
    }

    console.log("✅ User access updated successfully");
    return { success: true, message: "User access updated successfully" };
  } catch (err) {
    console.error("❌ userAccess Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Admin Password Change
=================================*/
exports.adminPassChange = async (
  Details,
  tenant_id,
  branch_id,
  currentUserRights
) => {
  let conn;
  try {
    conn = await pool.getConnection();

    // ✅ Only admins can change passwords
    if (currentUserRights !== "Admin" && currentUserRights !== "Super User") {
      throw new Error("Access denied: Admin privileges required");
    }

    // ✅ Hash password before storing
    const hashedPassword = await bcrypt.hash(Details.password, 10);

    const result = await conn.query(
      `UPDATE users 
       SET Password = ?, Updated_date = NOW()
       WHERE User_name = ? AND tenant_id = ?`,
      [hashedPassword, Details.username, tenant_id]
    );

    if (result[0].affectedRows === 0) {
      throw new Error("User not found or access denied");
    }

    console.log("✅ Password changed successfully");
    return { success: true, message: "Password changed successfully" };
  } catch (err) {
    console.error("❌ adminPassChange Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Create New User
=================================*/
exports.newUser = async (Details, tenant_id, branch_id, createdBy) => {
  let conn;
  try {
    conn = await pool.getConnection();

    // ✅ Check if username already exists within this tenant
    const existingResult = await conn.query(
      `SELECT User_id FROM users WHERE User_name = ? AND tenant_id = ?`,
      [Details.username, tenant_id]
    );

    if (existingResult[0].length > 0) {
      return { error: "Username already exists", success: false };
    }

    // ✅ Hash password before storing
    const hashedPassword = await bcrypt.hash(Details.password, 10);

    const result = await conn.query(
      `INSERT INTO users 
       (User_name, Password, Rights, Status, Created_by, Created_date, tenant_id, branch_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Details.username.toUpperCase(),
        hashedPassword, // ✅ Store hashed password
        Details.rights,
        Details.status,
        createdBy,
        Details.createdDate,
        tenant_id,
        branch_id,
      ]
    );

    console.log("✅ New user created successfully");
    return {
      success: true,
      message: "User created successfully",
      userId: result[0].insertId,
    };
  } catch (err) {
    console.error("❌ newUser Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Get Current User Profile (By Token)
=================================*/
exports.getCurrentUser = async (userId, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const result = await conn.query(
      `SELECT User_id, User_name, Rights, Status, Created_date, tenant_id, branch_id 
       FROM users 
       WHERE User_id = ? AND tenant_id = ?`,
      [userId, tenant_id]
    );

    const users = result[0];
    if (users.length === 0) {
      throw new Error("User not found");
    }

    // ✅ Never return password hash
    const { Password, ...user } = users[0];
    return user;
  } catch (err) {
    console.error("❌ getCurrentUser Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Update User Profile (Self-Service)
=================================*/
exports.updateUserProfile = async (userId, updates, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    // ✅ Prevent updating sensitive fields via self-service
    const allowedUpdates = ["Status"]; // Only allow status update for now
    const updatesToApply = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        updatesToApply[key] = updates[key];
      }
    }

    if (Object.keys(updatesToApply).length === 0) {
      throw new Error("No valid fields to update");
    }

    // Build dynamic update query
    const setClause = Object.keys(updatesToApply)
      .map((key) => `${key} = ?`)
      .join(", ");

    const values = [...Object.values(updatesToApply), userId, tenant_id];

    const result = await conn.query(
      `UPDATE users SET ${setClause}, Updated_date = NOW() WHERE User_id = ? AND tenant_id = ?`,
      values
    );

    if (result[0].affectedRows === 0) {
      throw new Error("User not found or access denied");
    }

    return { success: true, message: "Profile updated successfully" };
  } catch (err) {
    console.error("❌ updateUserProfile Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Delete User (Soft Delete - Set Status to Inactive)
=================================*/
exports.deleteUser = async (
  targetUserId,
  tenant_id,
  branch_id,
  currentUserRights
) => {
  let conn;
  try {
    conn = await pool.getConnection();

    // ✅ Only admins can delete users
    if (currentUserRights !== "Admin" && currentUserRights !== "Super User") {
      throw new Error("Access denied: Admin privileges required");
    }

    // ✅ Prevent deleting yourself
    const adminResult = await conn.query(
      `SELECT User_id FROM users WHERE User_id = ? AND tenant_id = ?`,
      [targetUserId, tenant_id]
    );

    if (adminResult[0].length === 0) {
      throw new Error("User not found or access denied");
    }

    // ✅ Soft delete: update status instead of hard delete
    const result = await conn.query(
      `UPDATE users SET Status = 'Inactive', Updated_date = NOW() WHERE User_id = ? AND tenant_id = ?`,
      [targetUserId, tenant_id]
    );

    if (result[0].affectedRows === 0) {
      throw new Error("Failed to deactivate user");
    }

    console.log("✅ User deactivated successfully");
    return { success: true, message: "User deactivated successfully" };
  } catch (err) {
    console.error("❌ deleteUser Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};
