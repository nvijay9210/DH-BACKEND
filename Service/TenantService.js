const { pool } = require("../config/db");

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
    return { message: "Tenant created", tenant_id: result.insertId };
  } catch (err) {
    return { error: err.message };
  }
};

/* ================= GET ALL TENANTS ================= */
exports.getTenants = async () => {
  try {
    const tenants = await pool.query(
      "SELECT * FROM tenant WHERE is_active = 1"
    );
    return tenants;
  } catch (err) {
    return { error: err.message };
  }
};

/* ================= GET SINGLE TENANT ================= */
exports.getTenantById = async (tenant_id) => {
  try {
    const tenant = await pool.query(
      "SELECT * FROM tenant WHERE tenant_id = ?",
      [tenant_id]
    );

    if (!tenant.length) {
      return ({ message: "Tenant not found" });
    }

    return tenant[0];
  } catch (err) {
    return { error: err.message };
  }
};

/* ================= UPDATE TENANT ================= */
exports.updateTenant = async (details, tenant_id) => {
  try {
    await pool.query(
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

    return { message: "Tenant updated" };
  } catch (err) {
    return { error: err.message };
  }
};

/* ================= DELETE TENANT (SOFT DELETE) ================= */
exports.deleteTenant = async (tenant_id) => {
  try {
    await pool.query("UPDATE tenant SET is_active = 0 WHERE tenant_id = ?", [
      tenant_id,
    ]);

    return { message: "Tenant deactivated" };
  } catch (err) {
    return { error: err.message };
  }
};
