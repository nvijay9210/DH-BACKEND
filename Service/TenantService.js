const { pool } = require("../config/db");
const { AppError } = require("../Logics/AppError");

/* ================= CREATE TENANT ================= */
exports.createTenant = async (details) => {
  const {
    tenant_name,
    tenant_domain,
    tenant_app_name,
    tenant_app_logo,
    tenant_app_font,
    tenant_app_themes,
  } = details;
  try {
    const result = await pool.query(
      `INSERT INTO tenant
      (tenant_name, tenant_domain, tenant_app_name, tenant_app_logo, tenant_app_font, tenant_app_themes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        tenant_name,
        tenant_domain.toLowerCase(),
        tenant_app_name,
        tenant_app_logo,
        tenant_app_font,
        JSON.stringify(tenant_app_themes),
        details.username,
      ]
    );
    return { message: "Tenant created", tenant_id: result[0].insertId };
  } catch (err) {
    console.error("❌ createTenant Error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      throw new AppError("Tenant domain already exists", 409, err);
    }
    throw err instanceof AppError ? err : new AppError("Failed to create tenant", 500, err);
  }
};

/* ================= GET ALL TENANTS ================= */
exports.getTenants = async () => {
  try {
    const result = await pool.query("SELECT * FROM tenant WHERE is_active = 1");
    return result[0];
  } catch (err) {
    console.error("❌ getTenants Error:", err);
    throw err instanceof AppError ? err : new AppError("Failed to fetch tenants", 500, err);
  }
};

/* ================= GET SINGLE TENANT ================= */
exports.getTenantById = async (tenant_id) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tenant WHERE tenant_id = ?",
      [tenant_id]
    );
  
    if (result.length === 0 || !result[0] ) {
      throw new AppError("Tenant not found", 404);
    }
    return result[0];
  } catch (err) {
    console.error("❌ getTenantById Error:", err);
    throw err instanceof AppError ? err : new AppError("Failed to fetch tenant", 500, err);
  }
};

/* ================= UPDATE TENANT ================= */
exports.updateTenant = async (details, tenant_id) => {
  try {
    const result = await pool.query(
      `UPDATE tenant
      SET tenant_name = ?,
      tenant_domain = ?,
      tenant_app_name = ?,
      tenant_app_logo = ?,
      tenant_app_font = ?,
      tenant_app_themes = ?,
      updated_by = ?
      WHERE tenant_id = ?`,
      [
        details.tenant_name,
        details.tenant_domain.toLowerCase(),
        details.tenant_app_name,
        details.tenant_app_logo,
        details.tenant_app_font,
        JSON.stringify(details.tenant_app_themes),
        details.username,
        tenant_id,
      ]
    );
    if (result[0].affectedRows === 0) {
      throw new AppError("Tenant not found", 404);
    }
    return { message: "Tenant updated successfully" };
  } catch (err) {
    console.error("❌ updateTenant Error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      throw new AppError("Tenant domain already exists", 409, err);
    }
    throw err instanceof AppError ? err : new AppError("Failed to update tenant", 500, err);
  }
};

/* ================= DELETE TENANT (SOFT DELETE) ================= */
exports.deleteTenant = async (tenant_id) => {
  try {
    const result = await pool.query(
      "UPDATE tenant SET is_active = 0 WHERE tenant_id = ?",
      [tenant_id]
    );
    if (result[0].affectedRows === 0) {
      throw new AppError("Tenant not found", 404);
    }
    return { message: "Tenant deactivated successfully" };
  } catch (err) {
    console.error("❌ deleteTenant Error:", err);
    throw err instanceof AppError ? err : new AppError("Failed to deactivate tenant", 500, err);
  }
};

module.exports = exports;
