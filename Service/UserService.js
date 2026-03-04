const { pool } = require("../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { createUserBranch } = require("./UserBranchService");
const { AppError } = require("../Logics/AppError");

/* ===============================
   Helper: Get User Branch Mapping
=================================*/
const getUserBranchById = async (tenant_id, branch_id, user_id) => {
  const rows = await pool.query(
    `SELECT * FROM userbranch 
     WHERE tenant_id = ? AND user_id = ?`,
    [tenant_id, user_id]
  );
  return rows;
};

/* ===============================
   User Login
=================================*/
exports.login = async (Details) => {
  let conn;
  try {
    const jwt_key = process.env.JWT_KEY;
    if (!jwt_key) throw new AppError("Server configuration error", 500);

    conn = await pool.getConnection();

    const users = await conn.query(
      `SELECT u.*, 
          t.is_active AS tenant_active,
          b.is_active AS branch_active
       FROM users u
       JOIN tenant t ON u.tenant_id = t.tenant_id
       LEFT JOIN branch b ON u.branch_id = b.branch_id
       WHERE u.User_name = ?`,
      [Details.username]
    );

    if (users.length === 0) throw new AppError("Invalid credentials", 401);

    const user = users[0];

    // ✅ Password check (handle case if password is null/empty)
    // if (user.Password) {
    //   const isMatch = await bcrypt.compare(Details.password, user.Password);
    //   if (!isMatch) throw new AppError("Invalid credentials", 401);
    // }

    if (user.Status !== "Active")
      throw new AppError("User account is deactivated", 403);
    if (user.tenant_active !== 1) throw new AppError("Tenant is inactive", 403);
    if (user.branch_id && user.branch_active !== 1)
      throw new AppError("Branch is inactive", 403);

    // ✅ Fix: Use 'user' object, not undefined 'decoded'
    const branchUser = await getUserBranchById(
      user.tenant_id,
      user.branch_id,
      user.User_id
    );

    let assignedBranch = null;
    if (branchUser && branchUser.length > 0) {
      // ✅ Fix: Correct length check & array access
      assignedBranch = branchUser[branchUser.length - 1];
    }

    const token = jwt.sign(
      {
        user_id: user.User_id,
        username: user.User_name,
        tenant_id: user.tenant_id,
        branch_id: assignedBranch?.branch_id || user.branch_id || null,
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
        branch_id: assignedBranch?.branch_id || user.branch_id,
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
   User Logout
=================================*/
exports.logout = async () => {
  return { Status: "Success", msg: "Logout successful" };
};

/* ===============================
   User Details (Admin Only)
=================================*/
exports.userDetails = async (tenant_id, branch_id, currentUserRights) => {
  let conn;
  try {
    conn = await pool.getConnection();

    if (!["Admin", "Super User"].includes(currentUserRights)) {
      throw new AppError("Access denied: Admin privileges required", 403);
    }

    const rows = await conn.query(
      `SELECT User_id, User_name, Rights, Status, Created_by, Created_date, tenant_id, branch_id 
       FROM users 
       WHERE tenant_id = ? AND branch_id = ?
       ORDER BY User_name`,
      [tenant_id, branch_id]
    );
    return rows;
  } catch (err) {
    console.error("❌ userDetails Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   User List (Admin Only)
=================================*/
exports.userList = async (tenant_id, branch_id, currentUserRights) => {
  let conn;
  try {
    conn = await pool.getConnection();

    if (!["Admin", "Super User"].includes(currentUserRights)) {
      throw new AppError("Access denied: Admin privileges required", 403);
    }

    const rows = await conn.query(
      `SELECT User_id, User_name, Rights, Status, Created_date 
       FROM users 
       WHERE tenant_id = ? AND branch_id = ? 
       ORDER BY User_name`,
      [tenant_id, branch_id]
    );
    return rows;
  } catch (err) {
    console.error("❌ userList Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Full User List (Dropdown)
=================================*/
exports.fullUserList = async (tenant_id, branch_id) => {
  try {
    const rows = await pool.query(
      `SELECT User_name 
       FROM users 
       WHERE tenant_id = ? AND branch_id = ? AND Status = 'Active'
       ORDER BY User_name`,
      [tenant_id, branch_id]
    );
    return rows;
  } catch (err) {
    console.error("❌ fullUserList Error:", err);
    throw new AppError("Failed to fetch user list", 500);
  }
};

/* ===============================
   Update User Access
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

    if (!["Admin", "Super User"].includes(currentUserRights)) {
      throw new AppError("Access denied: Admin privileges required", 403);
    }

    const result = await conn.query(
      `UPDATE users 
       SET Rights = ?, Status = ?, Updated_date = NOW()
       WHERE User_name = ? AND tenant_id = ?`,
      [Details.rights, Details.status, Details.username, tenant_id]
    );

    if (result.affectedRows === 0) throw new AppError("User not found", 404);

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

    if (!["Admin", "Super User"].includes(currentUserRights)) {
      throw new AppError("Access denied: Admin privileges required", 403);
    }

    const hashedPassword = await bcrypt.hash(Details.password, 10);

    const result = await conn.query(
      `UPDATE users 
       SET Password = ?, Updated_date = NOW()
       WHERE User_name = ? AND tenant_id = ?`,
      [hashedPassword, Details.username, tenant_id]
    );

    if (result.affectedRows === 0) throw new AppError("User not found", 404);

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

    // Check for existing username (case-insensitive)
    const existing = await conn.query(
      `SELECT User_id FROM users WHERE LOWER(User_name) = LOWER(?) AND tenant_id = ?`,
      [Details.username, tenant_id]
    );

    if (existing.length > 0) throw new AppError("Username already exists", 409);

    const hashedPassword = await bcrypt.hash(Details.password, 10);

    const result = await conn.query(
      `INSERT INTO users 
       (User_name, Password, Rights, Status, Created_by, Created_date, tenant_id, branch_id) 
       VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        Details.username.toUpperCase(),
        hashedPassword,
        Details.rights,
        Details.status,
        createdBy,
        tenant_id,
        branch_id,
      ]
    );

    const userId = result.insertId;

    // Create user-branch mapping if needed
    if (typeof createUserBranch === "function") {
      await createUserBranch(Details, tenant_id, createdBy, userId);
    }

    return { success: true, message: "User created successfully", userId };
  } catch (err) {
    console.error("❌ newUser Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Delete User (Soft Delete)
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

    if (!["Admin", "Super User"].includes(currentUserRights)) {
      throw new AppError("Access denied: Admin privileges required", 403);
    }

    // Verify user exists in tenant
    const existing = await conn.query(
      `SELECT User_id FROM users WHERE User_id = ? AND tenant_id = ?`,
      [targetUserId, tenant_id]
    );

    if (existing.length === 0) throw new AppError("User not found", 404);

    const result = await conn.query(
      `UPDATE users SET Status = 'Inactive', Updated_date = NOW() 
       WHERE User_id = ? AND tenant_id = ?`,
      [targetUserId, tenant_id]
    );

    if (result.affectedRows === 0)
      throw new AppError("Failed to deactivate user", 500);

    return { success: true, message: "User deactivated successfully" };
  } catch (err) {
    console.error("❌ deleteUser Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Switch Branch (Token Refresh)
=================================*/
exports.switchBranch = async (tenant_id, branch_id, currentUser) => {
  let conn;
  try {
    // Optional: Verify branch belongs to tenant & is active
    conn = await pool.getConnection();
    const branches = await conn.query(
      `SELECT branch_id FROM branch 
       WHERE branch_id = ? AND tenant_id = ? AND is_active = 1`,
      [branch_id, tenant_id]
    );

    if (branch_id && branches.length === 0) {
      throw new AppError("Invalid or inactive branch", 400);
    }

    if (currentUser.rights !== "Super User") {
      throw new AppError("Access denied: Super User privileges required", 403);
    }

    const newToken = jwt.sign(
      {
        user_id: currentUser.user_id,
        username: currentUser.username,
        tenant_id,
        branch_id: branch_id || null,
        role: currentUser.rights,
      },
      process.env.JWT_KEY,
      { expiresIn: "4h" }
    );

    return newToken;
  } catch (err) {
    console.error("❌ switchBranch Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};
