const { pool } = require("../config/db");
const { AppError } = require("../Logics/AppError");

/* ================= CREATE BRANCH ================= */
exports.createBranch = async (details, tenant_id, username) => {
  let conn;
  try {
    conn = await pool.getConnection();

    // ✅ Optional: Explicit check for duplicate branch_code before insert
    const existing = await conn.query(
      `SELECT branch_id FROM branch WHERE branch_code = ? AND tenant_id = ?`,
      [details.branch_code, tenant_id]
    );

    if (existing[0].length > 0) {
      throw new AppError("Branch code already exists", 409);
    }

    const result = await conn.query(
      `INSERT INTO branch
       (tenant_id, branch_name, branch_code, address, city, state, pincode, email, phone, created_by, created_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        tenant_id,
        details.branch_name,
        details.branch_code,
        details.address,
        details.city,
        details.state,
        details.pincode,
        details.email,
        details.phone,
        username,
      ]
    );

    // ✅ Fix: Access index 0 for mysql2 results
    return {
      message: "Branch created",
      branch_id: result[0].insertId,
    };
  } catch (err) {
    console.error("❌ createBranch Error:", err);

    if (err.code === "ER_DUP_ENTRY") {
      throw new AppError("Branch code already exists", 409);
    }

    throw new AppError(`Failed to create branch: ${err.message}`, 500);
  } finally {
    if (conn) conn.release();
  }
};

/* ================= GET BRANCHES ================= */
exports.getBranches = async (tenant_id) => {
  try {
    const result = await pool.query(
      "SELECT branch_id, branch_name, branch_code, address, city, state, pincode, email, phone, is_active, created_date FROM branch WHERE tenant_id = ? AND is_active = 1 ORDER BY branch_name",
      [tenant_id]
    );

    // ✅ Fix: Return the rows array, not the whole result object
    return result[0];
  } catch (err) {
    console.error("❌ getBranches Error:", err);
    throw new AppError(`Failed to fetch branches: ${err.message}`, 500);
  }
};

/* ================= UPDATE BRANCH ================= */
exports.updateBranch = async (branch_id, tenant_id, details, username) => {
  let conn;
  try {
    conn = await pool.getConnection();

    // ✅ Optional: Check for duplicate code excluding current branch
    if (details.branch_code) {
      const existing = await conn.query(
        `SELECT branch_id FROM branch WHERE branch_code = ? AND tenant_id = ? AND branch_id != ?`,
        [details.branch_code, tenant_id, branch_id]
      );
      if (existing[0].length > 0) {
        throw new AppError("Branch code already exists", 409);
      }
    }

    const result = await conn.query(
      `UPDATE branch
       SET branch_name = ?, address = ?, city = ?, state = ?, pincode = ?, 
           email = ?, phone = ?, updated_by = ?, updated_date = NOW()
       WHERE branch_id = ? AND tenant_id = ?`,
      [
        details.branch_name,
        details.address,
        details.city,
        details.state,
        details.pincode,
        details.email,
        details.phone,
        username,
        branch_id,
        tenant_id,
      ]
    );

    // ✅ Fix: Access index 0 for affectedRows
    if (result[0].affectedRows === 0) {
      throw new AppError("Branch not found or access denied", 404);
    }

    return { message: "Branch updated" };
  } catch (err) {
    console.error("❌ updateBranch Error:", err);

    if (err.code === "ER_DUP_ENTRY") {
      throw new AppError("Branch code already exists", 409);
    }

    throw new AppError(`Failed to update branch: ${err.message}`, 500);
  } finally {
    if (conn) conn.release();
  }
};

/* ================= GET BRANCH BY ID ================= */
exports.getBranchById = async (branch_id, tenant_id) => {
  try {
    const result = await pool.query(
      "SELECT * FROM branch WHERE branch_id = ? AND tenant_id = ?",
      [branch_id, tenant_id]
    );

    const rows = result[0];

    // ✅ Fix: Check length of rows array
    if (!rows || rows.length === 0) {
      throw new AppError("Branch not found", 404);
    }

    return rows[0];
  } catch (err) {
    console.error("❌ getBranchById Error:", err);

    // If it's already an AppError (like 404), rethrow it directly
    if (err instanceof AppError) throw err;

    throw new AppError(`Failed to fetch branch: ${err.message}`, 500);
  }
};

/* ================= DELETE BRANCH (SOFT DELETE) ================= */
exports.deleteBranch = async (branch_id, tenant_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const result = await conn.query(
      "UPDATE branch SET is_active = 0, updated_date = NOW() WHERE branch_id = ? AND tenant_id = ?",
      [branch_id, tenant_id]
    );

    // ✅ Fix: Access index 0 for affectedRows
    if (result[0].affectedRows === 0) {
      throw new AppError("Branch not found or already deactivated", 404);
    }

    return { message: "Branch deactivated" };
  } catch (err) {
    console.error("❌ deleteBranch Error:", err);
    throw new AppError(`Failed to deactivate branch: ${err.message}`, 500);
  } finally {
    if (conn) conn.release();
  }
};
