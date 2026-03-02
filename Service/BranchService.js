const {pool} = require("../config/db");

/* ================= CREATE BRANCH ================= */
exports.createBranch = async (details, tenant_id,username) => {
  try {
    const result = await pool.query(
      `INSERT INTO branch
       (tenant_id, branch_name, branch_code, address, city, state, pincode, email, phone, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    return { message: "Branch created", branch_id: result.insertId };
  } catch (err) {
    return { error: err.message };
  }
};

/* ================= GET BRANCHES ================= */
exports.getBranches = async (tenant_id) => {
  try {
    const branches = await pool.query(
      "SELECT * FROM branch WHERE tenant_id = ? AND is_active = 1",
      [tenant_id]
    );

    return branches;
  } catch (err) {
    return { error: err.message };
  }
};

/* ================= UPDATE BRANCH ================= */
exports.updateBranch = async (branch_id, tenant_id, details, username) => {
  try {
    await pool.query(
      `UPDATE branch
       SET branch_name = ?, address = ?, city = ?, state = ?, pincode = ?, 
           email = ?, phone = ?, updated_by = ?
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

    return { message: "Branch updated" };
  } catch (err) {
    return { error: err.message };
  }
};

exports.getBranchById = async (branch_id, tenant_id) => {
  try {
    const branch = await pool.query(
      "SELECT * FROM branch WHERE branch_id=? and tenant_id = ?",
      [branch_id, tenant_id]
    );

    if (!branch.length) {
      return ({ message: "Tenant not found" });
    }

    return branch[0];
  } catch (err) {
    return { error: err.message };
  }
};

/* ================= DELETE BRANCH (SOFT DELETE) ================= */
exports.deleteBranch = async (branch_id, tenant_id) => {
  try {
    await pool.query(
      "UPDATE branch SET is_active = 0 WHERE branch_id = ? AND tenant_id = ?",
      [branch_id, tenant_id]
    );

    return { message: "Branch deactivated" };
  } catch (err) {
    return { error: err.message };
  }
};
