const { pool } = require("../config/db");
const { AppError } = require("../Logics/AppError");

/* ===============================
   Create User-Branch Mapping
=================================*/
exports.createUserBranch = async (
  Details,
  tenant_id,
  createdBy,
  userId = 0
) => {
  let conn;
  userId = userId ?? Details.user_id;
  try {
    conn = await pool.getConnection();
    const existing = await conn.query(
      `SELECT 1 FROM userbranch
      WHERE tenant_id = ? AND branch_id = ? AND user_id = ?`,
      [tenant_id, Details.branch_id, userId]
    );
    if (existing[0].length > 0) {
      throw new AppError("User is already mapped to this branch", 409);
    }
    const result = await conn.query(
      `INSERT INTO userbranch
      (tenant_id, branch_id, user_id, created_by)
      VALUES (?, ?, ?, ?)`,
      [tenant_id, Details.branch_id, userId, createdBy]
    );
    console.log("✅ User-Branch mapping created successfully");
    return {
      success: true,
      message: "User-Branch mapping created successfully",
      insertId: result[0].insertId,
    };
  } catch (err) {
    console.error("❌ createUserBranch Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to create user-branch mapping", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Get All User-Branch Mappings (Admin Only)
=================================*/
exports.getUserBranches = async (
  tenant_id,
  branch_id,
  currentUserRights,
  filters = {}
) => {
  let conn;
  try {
    conn = await pool.getConnection();
    if (currentUserRights !== "Admin" && currentUserRights !== "Super User") {
      throw new AppError("Access denied: Admin privileges required", 403);
    }
    let query = `SELECT ub.*, u.User_name, b.branch_name
    FROM userbranch ub
    LEFT JOIN user u ON ub.user_id = u.User_id
    LEFT JOIN branch b ON ub.branch_id = b.branch_id
    WHERE ub.tenant_id = ?`;
    let params = [tenant_id];
    if (filters.user_id) {
      query += ` AND ub.user_id = ?`;
      params.push(filters.user_id);
    }
    if (filters.branch_id) {
      query += ` AND ub.branch_id = ?`;
      params.push(filters.branch_id);
    }
    query += ` ORDER BY ub.created_at DESC`;
    const result = await conn.query(query, params);
    return result[0];
  } catch (err) {
    console.error("❌ getUserBranches Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch user-branch mappings", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Get Specific User-Branch Mapping
=================================*/
exports.getUserBranchById = async (tenant_id, branch_id, user_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT ub.*, u.User_name, b.branch_name
      FROM userbranch ub
      LEFT JOIN user u ON ub.user_id = u.User_id
      LEFT JOIN branch b ON ub.branch_id = b.branch_id
      WHERE ub.tenant_id = ? AND ub.branch_id = ? AND ub.user_id = ?`,
      [tenant_id, branch_id, user_id]
    );
    if (!result[0] || result[0].length === 0) {
      throw new AppError("User-Branch mapping not found", 404);
    }
    return result[0][0];
  } catch (err) {
    console.error("❌ getUserBranchById Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch mapping", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Update User-Branch Mapping
=================================*/
exports.updateUserBranch = async (
  Details,
  tenant_id,
  branch_id,
  user_id,
  currentUserRights,
  updatedBy
) => {
  let conn;
  try {
    conn = await pool.getConnection();
    if (currentUserRights !== "Admin" && currentUserRights !== "Super User") {
      throw new AppError("Access denied: Admin privileges required", 403);
    }
    const existing = await conn.query(
      `SELECT 1 FROM userbranch
      WHERE tenant_id = ? AND branch_id = ? AND user_id = ?`,
      [tenant_id, branch_id, user_id]
    );
    if (existing[0].length === 0) {
      throw new AppError("User-Branch mapping not found", 404);
    }
    const result = await conn.query(
      `UPDATE userbranch
      SET update_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ? AND branch_id = ? AND user_id = ?`,
      [updatedBy, tenant_id, branch_id, user_id]
    );
    if (result[0].affectedRows === 0) {
      throw new AppError("Failed to update user-branch mapping", 500);
    }
    console.log("✅ User-Branch mapping updated successfully");
    return {
      success: true,
      message: "User-Branch mapping updated successfully",
    };
  } catch (err) {
    console.error("❌ updateUserBranch Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to update mapping", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Delete User-Branch Mapping
=================================*/
exports.deleteUserBranch = async (
  tenant_id,
  branch_id,
  user_id,
  currentUserRights
) => {
  let conn;
  try {
    conn = await pool.getConnection();
    if (currentUserRights !== "Admin" && currentUserRights !== "Super User") {
      throw new AppError("Access denied: Admin privileges required", 403);
    }
    const result = await conn.query(
      `DELETE FROM userbranch
      WHERE tenant_id = ? AND branch_id = ? AND user_id = ?`,
      [tenant_id, branch_id, user_id]
    );
    if (result[0].affectedRows === 0) {
      throw new AppError("User-Branch mapping not found", 404);
    }
    console.log("✅ User-Branch mapping deleted successfully");
    return {
      success: true,
      message: "User-Branch mapping deleted successfully",
    };
  } catch (err) {
    console.error("❌ deleteUserBranch Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to delete mapping", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Get Branches Assigned to User
=================================*/
exports.getBranchesByUser = async (
  tenant_id,
  user_id,
  currentUserRights,
  requestUserId
) => {
  let conn;
  try {
    conn = await pool.getConnection();
    if (currentUserRights !== "Admin" && currentUserRights !== "Super User") {
      if (user_id !== requestUserId) {
        throw new AppError(
          "Access denied: You can only view your own branch assignments",
          403
        );
      }
    }
    const result = await conn.query(
      `SELECT ub.*, b.branch_name, b.branch_code, b.city, b.state
      FROM userbranch ub
      INNER JOIN branch b ON ub.branch_id = b.branch_id
      WHERE ub.tenant_id = ? AND ub.user_id = ?
      ORDER BY b.branch_name`,
      [tenant_id, user_id]
    );
    return result[0];
  } catch (err) {
    console.error("❌ getBranchesByUser Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch user branches", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Get Users Assigned to Branch
=================================*/
exports.getUsersByBranch = async (tenant_id, branch_id, currentUserRights) => {
  let conn;
  try {
    conn = await pool.getConnection();
    if (currentUserRights !== "Admin" && currentUserRights !== "Super User") {
      throw new AppError("Access denied: Admin privileges required", 403);
    }
    const result = await conn.query(
      `SELECT ub.*, u.User_name, u.Rights, u.Status, u.Created_date
      FROM userbranch ub
      INNER JOIN user u ON ub.user_id = u.User_id
      WHERE ub.tenant_id = ? AND ub.branch_id = ?
      ORDER BY u.User_name`,
      [tenant_id, branch_id]
    );
    return result[0];
  } catch (err) {
    console.error("❌ getUsersByBranch Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch branch users", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

module.exports = exports;
