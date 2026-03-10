const { pool } = require("../config/db");
const { AppError } = require("../Logics/AppError");

const allowedTables = ["tenant", "branch", "user"]; // security

exports.checkRecordExists = async (table, conditions) => {
  try {
    // Prevent SQL injection via table name
    if (!allowedTables.includes(table)) {
      throw new AppError("Invalid table name", 400);
    }

    // Remove undefined/null values
    const filteredConditions = Object.fromEntries(
      Object.entries(conditions).filter(
        ([, value]) => value !== undefined && value !== null
      )
    );

    const keys = Object.keys(filteredConditions);

    if (!keys.length) {
      throw new AppError("No conditions provided", 400);
    }

    const values = keys.map((key) => filteredConditions[key]);
    const whereClause = keys.map((key) => `${key} = ?`).join(" AND ");

    const rows = await pool.query(
      `SELECT 1 FROM ${table} WHERE ${whereClause} LIMIT 1`,
      values
    );

    if (!rows.length) {
      throw new AppError(`${table} not exists`, 404);
    }

    return true;
  } catch (err) {
    console.error("❌ checkRecordExists Error:", err);
    throw err;
  }
};