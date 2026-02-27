const { pool } = require("../config/db");

class BaseCrudService {
  constructor(tableName, options = {}) {
    this.table = tableName;
    this.hasTenant = options.hasTenant || false;
    this.hasBranch = options.hasBranch || false;
  }

  /* ================= CREATE ================= */
  async create(data, req) {
    try {
      if (this.hasTenant) data.tenant_id = req.tenant_id;
      if (this.hasBranch && req.role !== "SUPER_USER")
        data.branch_id = req.branch_id;

      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => "?").join(",");

      const sql = `
        INSERT INTO ${this.table}
        (${keys.join(",")})
        VALUES (${placeholders})
      `;

      const result = await pool.query(sql, values);
      return { message: "Created successfully", id: result.insertId };

    } catch (err) {
      console.error(err);
      return { error: "Create failed" };
    }
  }

  /* ================= GET ALL ================= */
  async getAll(req) {
    try {
      let sql = `SELECT * FROM ${this.table}`;
      let params = [];
      let conditions = [];

      if (this.hasTenant) {
        conditions.push("tenant_id = ?");
        params.push(req.tenant_id);
      }

      if (this.hasBranch && req.role !== "SUPER_USER") {
        conditions.push("branch_id = ?");
        params.push(req.branch_id);
      }

      if (conditions.length) {
        sql += " WHERE " + conditions.join(" AND ");
      }

      const rows = await pool.query(sql, params);
      return rows;

    } catch (err) {
      console.error(err);
      return { error: "Fetch failed" };
    }
  }

  /* ================= GET BY ID ================= */
  async getById(id, req) {
    try {
      let sql = `SELECT * FROM ${this.table} WHERE id = ?`;
      let params = [id];

      if (this.hasTenant) {
        sql += " AND tenant_id = ?";
        params.push(req.tenant_id);
      }

      if (this.hasBranch && req.role !== "SUPER_USER") {
        sql += " AND branch_id = ?";
        params.push(req.branch_id);
      }

      const rows = await pool.query(sql, params);

      if (!rows.length) return { error: "Not found" };
      return rows[0];

    } catch (err) {
      console.error(err);
      return { error: "Fetch failed" };
    }
  }

  /* ================= UPDATE ================= */
  async update(id, data, req) {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);

      let sql = `
        UPDATE ${this.table}
        SET ${keys.map(k => `${k}=?`).join(",")}
        WHERE id = ?
      `;

      let params = [...values, id];

      if (this.hasTenant) {
        sql += " AND tenant_id = ?";
        params.push(req.tenant_id);
      }

      if (this.hasBranch && req.role !== "SUPER_USER") {
        sql += " AND branch_id = ?";
        params.push(req.branch_id);
      }

      await pool.query(sql, params);
      return { message: "Updated successfully" };

    } catch (err) {
      console.error(err);
      return { error: "Update failed" };
    }
  }

  /* ================= DELETE ================= */
  async delete(id, req) {
    try {
      let sql = `DELETE FROM ${this.table} WHERE id = ?`;
      let params = [id];

      if (this.hasTenant) {
        sql += " AND tenant_id = ?";
        params.push(req.tenant_id);
      }

      if (this.hasBranch && req.role !== "SUPER_USER") {
        sql += " AND branch_id = ?";
        params.push(req.branch_id);
      }

      await pool.query(sql, params);
      return { message: "Deleted successfully" };

    } catch (err) {
      console.error(err);
      return { error: "Delete failed" };
    }
  }
}

module.exports = BaseCrudService;
