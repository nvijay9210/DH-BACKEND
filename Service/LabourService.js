const { pool } = require("../config/db");
const { AppError } = require("../Logics/AppError");

/* ===============================
   Labour Details - Insert Multiple
=================================*/
exports.labourDetails = async (Order, tenant_id, branch_id) => {
  let conn;
  try {
    if (!Order || Order.length === 0) {
      throw new AppError("No labour details provided", 400);
    }
    conn = await pool.getConnection();
    const insertQuery = `
      INSERT INTO labour_worked_details
      (tenant_id, branch_id, Project_id, Project_name, Date, Contractor,
      Labour_types, No_Of_Persons, Salary, Ratio, Total, Site_supervisor,
      Payment_Date, Paid, Balance, Status, CREATED_BY, CREATED_DATETIME)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const promises = Order.map(async (details) => {
      const {
        Project_id,
        Project_name,
        Date,
        Contractor,
        Labour_types,
        No_Of_Persons,
        Salary,
        Ratio,
        Total,
        Site_supervisor,
        Paid,
        Balance,
        Status,
        Payment_Date,
        username,
        currentDate,
      } = details;
      await conn.query(insertQuery, [
        tenant_id,
        branch_id,
        Project_id,
        Project_name,
        Date,
        Contractor,
        Labour_types,
        No_Of_Persons,
        Salary,
        Ratio,
        Total,
        Site_supervisor,
        Payment_Date,
        Paid,
        Balance,
        Status,
        username,
        currentDate,
      ]);
    });
    await Promise.all(promises);
    console.log("✅ Details saved to the database");
    return { success: true, message: "Details saved successfully" };
  } catch (error) {
    console.error("❌ labourDetails Error:", error);
    throw new AppError("Failed to save labour details", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Update Labour - Multiple Records
=================================*/
exports.updateLabour = async (username,details, tenant_id, branch_id) => {
  let conn;
  try {
    // const { currentDate, LabourUpdate } = details[0];
    // if (!LabourUpdate || LabourUpdate.length === 0) {
    //   throw new AppError("No labour updates provided", 400);
    // }
    conn = await pool.getConnection();
    const updateQuery = `
      UPDATE labour_worked_details
      SET Project_id = ?, Project_name = ?, DATE = ?, Contractor = ?,
      Labour_types = ?, No_Of_Persons = ?, Salary = ?, Ratio = ?,
      Total = ?, Site_supervisor = ?, Payment_Date = ?, Paid = ?,
      Balance = ?, Status = ?, LAST_UPDATED_BY = ?, LAST_UPDATED_DATETIME = ?
      WHERE Labour_id = ? AND tenant_id = ? AND branch_id = ?
    `;
    const convert = (str) => {
      if (!str) return null;
      const date = new Date(str);
      const mnth = ("0" + (date.getMonth() + 1)).slice(-2);
      const day = ("0" + date.getDate()).slice(-2);
      return [date.getFullYear(), mnth, day].join("-");
    };
    const promises = details.map(async (order) => {
      const date = convert(order.DATE);
      const {
        Project_id,
        Project_name,
        Contractor,
        Labour_types,
        No_Of_Persons,
        Salary,
        Ratio,
        Total,
        Site_supervisor,
        Payment_Date,
        datetime,
        Paid,
        Balance,
        Status,
        Labour_id,
      } = order;
      await conn.query(updateQuery, [
        Project_id,
        Project_name,
        date,
        Contractor,
        Labour_types,
        No_Of_Persons,
        Salary,
        Ratio,
        Total,
        Site_supervisor,
        Payment_Date,
        Paid,
        Balance,
        Status,
        username,
        datetime,
        Labour_id,
        tenant_id,
        branch_id,
      ]);
    });
    await Promise.all(promises);
    console.log("✅ Labour records updated successfully");
    return { success: true, message: "Labour records updated successfully" };
  } catch (error) {
    console.error("❌ updateLabour Error:", error);
    throw new AppError("Failed to update labour records", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Delete Labour Record by ID
=================================*/
exports.fetchLabourUpdate = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const labour = await conn.query(
      "SELECT * FROM labour_worked_details WHERE Project_id = ? AND Date = ? AND tenant_id=? AND branch_id=?;",
      [Details.Id, Details.date, tenant_id, branch_id]
    );
    // Convert BigInt values to strings or numbers
    const labourWithConvertedBigInt = labour.map((row) => {
      return {
        ...row,
        Salary: row.Salary.toString(), // Convert Salary to string
        Total: row.Total.toString(), // Convert Total to string
      };
    });
    // console.log(labourWithConvertedBigInt);
    return labourWithConvertedBigInt;
  } catch (error) {
    console.error(error);
    throw new AppError("Failed to update labour records", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Fetch Labour by Project & Date
=================================*/
exports.labourDelete = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT * FROM labour_worked_details
      WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?`,
      [Details.Id, tenant_id, branch_id]
    );
    const rows = result;
    const convertedRows = rows.map((row) => ({
      ...row,
      Salary: row.Salary?.toString(),
      Total: row.Total?.toString(),
      Paid: row.Paid?.toString(),
      Balance: row.Balance?.toString(),
    }));
    return convertedRows;
  } catch (error) {
    console.error("❌ labourDelete Error:", error);
    throw new AppError("Failed to fetch labour records", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Labour Reports (Date Range)
=================================*/
exports.labourReports = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT * FROM labour_worked_details
      WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
      AND Date BETWEEN ? AND ?
      ORDER BY Labour_id, Date`,
      [tenant_id, branch_id, Details.Id, Details.Start, Details.End]
    );
    const rows = result[0];
    const convertedRows = rows.map((row) => ({
      ...row,
      Salary: row.Salary?.toString(),
      Total: row.Total?.toString(),
      Paid: row.Paid?.toString(),
      Balance: row.Balance?.toString(),
    }));
    return convertedRows;
  } catch (error) {
    console.error("❌ labourReports Error:", error);
    throw new AppError("Failed to fetch labour reports", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Labour Payment (Unpaid Records)
=================================*/
exports.labourPayment = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    let query, params;
    if (!Details.contractor || Details.contractor === "null") {
      query = `
        SELECT * FROM labour_worked_details
        WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
        AND Status != 'Paid' AND Date BETWEEN ? AND ?
        ORDER BY Date ASC
      `;
      params = [tenant_id, branch_id, Details.Id, Details.Start, Details.End];
    } else {
      query = `
        SELECT * FROM labour_worked_details
        WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
        AND Contractor = ? AND Status != 'Paid' AND Date BETWEEN ? AND ?
        ORDER BY Date ASC
      `;
      params = [
        tenant_id,
        branch_id,
        Details.Id,
        Details.contractor,
        Details.Start,
        Details.End,
      ];
    }
    const result = await conn.query(query, params);
    const rows = result[0];
    const convertedRows = rows.map((row) => ({
      ...row,
      Salary: row.Salary?.toString(),
      Total: row.Total?.toString(),
      Paid: row.Paid?.toString(),
      Balance: row.Balance?.toString(),
    }));
    return convertedRows;
  } catch (error) {
    console.error("❌ labourPayment Error:", error);
    throw new AppError("Failed to fetch unpaid labour records", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Labour Payment Update (Mark as Paid)
=================================*/
exports.labourPaymentUpdate = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    let query, params;
    if (!Details.contractor || Details.contractor === "null") {
      query = `
        UPDATE labour_worked_details
        SET Paid = Total, Status = 'Paid', Balance = 0, Payment_Date = ?
        WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
        AND Status != 'Paid' AND Date BETWEEN ? AND ?
      `;
      params = [
        Details.Payment_Date,
        tenant_id,
        branch_id,
        Details.Id,
        Details.Start,
        Details.End,
      ];
    } else {
      query = `
        UPDATE labour_worked_details
        SET Paid = Total, Status = 'Paid', Balance = 0, Payment_Date = ?
        WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
        AND Contractor = ? AND Status != 'Paid' AND Date BETWEEN ? AND ?
      `;
      params = [
        Details.Payment_Date,
        tenant_id,
        branch_id,
        Details.Id,
        Details.contractor,
        Details.Start,
        Details.End,
      ];
    }
    const result = await conn.query(query, params);
    return {
      success: true,
      message: `${result[0].affectedRows} records updated successfully`,
      affectedRows: result[0].affectedRows,
    };
  } catch (error) {
    console.error("❌ labourPaymentUpdate Error:", error);
    throw new AppError("Failed to update payment status", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   All Labour Payment Update (Global)
=================================*/
exports.allLabourPaymentUpdate = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    let query, params;
    if (!Details.contractor || Details.contractor === "null") {
      query = `
        UPDATE labour_worked_details
        SET Paid = Total, Status = 'Paid', Balance = 0, Payment_Date = ?
        WHERE tenant_id = ? AND branch_id = ? AND Status != 'Paid'
        AND Date BETWEEN ? AND ?
      `;
      params = [
        Details.Payment_Date,
        tenant_id,
        branch_id,
        Details.Start,
        Details.End,
      ];
    } else {
      query = `
        UPDATE labour_worked_details
        SET Paid = Total, Status = 'Paid', Balance = 0, Payment_Date = ?
        WHERE tenant_id = ? AND branch_id = ? AND Contractor = ?
        AND Status != 'Paid' AND Date BETWEEN ? AND ?
      `;
      params = [
        Details.Payment_Date,
        tenant_id,
        branch_id,
        Details.contractor,
        Details.Start,
        Details.End,
      ];
    }
    const result = await conn.query(query, params);
    return {
      success: true,
      message: `${result[0].affectedRows} records updated successfully`,
      affectedRows: result[0].affectedRows,
    };
  } catch (error) {
    console.error("❌ allLabourPaymentUpdate Error:", error);
    throw new AppError("Failed to update payment status", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   All Labour Payment (Global Unpaid)
=================================*/
exports.allLabourPayment = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    let query, params;
    if (!Details.contractor || Details.contractor === "null") {
      query = `
        SELECT * FROM labour_worked_details
        WHERE tenant_id = ? AND branch_id = ? AND Status != 'Paid'
        AND Date BETWEEN ? AND ?
        ORDER BY Date
      `;
      params = [tenant_id, branch_id, Details.Start, Details.End];
    } else {
      query = `
        SELECT * FROM labour_worked_details
        WHERE tenant_id = ? AND branch_id = ? AND Contractor = ?
        AND Status != 'Paid' AND Date BETWEEN ? AND ?
        ORDER BY Date
      `;
      params = [
        tenant_id,
        branch_id,
        Details.contractor,
        Details.Start,
        Details.End,
      ];
    }
    const result = await conn.query(query, params);
    const rows = result[0];
    const convertedRows = rows.map((row) => ({
      ...row,
      Salary: row.Salary?.toString(),
      Total: row.Total?.toString(),
      Paid: row.Paid?.toString(),
      Balance: row.Balance?.toString(),
    }));
    return convertedRows;
  } catch (error) {
    console.error("❌ allLabourPayment Error:", error);
    throw new AppError("Failed to fetch unpaid records", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Fetch Contractor Pay Summary
=================================*/
exports.fetchContractorPay = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT Contractor, SUM(Balance) as TotalBalance
      FROM labour_worked_details
      WHERE tenant_id = ? AND branch_id = ? AND Status != 'Paid'
      GROUP BY Contractor`,
      [tenant_id, branch_id]
    );
    return result;
  } catch (error) {
    console.error("❌ fetchContractorPay Error:", error);
    throw new AppError("Failed to fetch contractor summary", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Contractor Report (Date Range)
=================================*/
exports.contractorReport = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    let query, params;
    if (!Details.contractor || Details.contractor === "null") {
      query = `
        SELECT * FROM labour_worked_details
        WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
        AND Date BETWEEN ? AND ?
        ORDER BY Date
      `;
      params = [tenant_id, branch_id, Details.Id, Details.Start, Details.End];
    } else {
      query = `
        SELECT * FROM labour_worked_details
        WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
        AND Contractor = ? AND Date BETWEEN ? AND ?
        ORDER BY Date
      `;
      params = [
        tenant_id,
        branch_id,
        Details.Id,
        Details.contractor,
        Details.Start,
        Details.End,
      ];
    }
    const result = await conn.query(query, params);
    const rows = result[0];
    const convertedRows = rows.map((row) => ({
      ...row,
      Salary: row.Salary?.toString(),
      Total: row.Total?.toString(),
      Paid: row.Paid?.toString(),
      Balance: row.Balance?.toString(),
    }));
    return convertedRows;
  } catch (error) {
    console.error("❌ contractorReport Error:", error);
    throw new AppError("Failed to fetch contractor report", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Delete Contractor (Master Table)
=================================*/
exports.contractorDelete = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `DELETE FROM mas_labour_details
      WHERE id = ? AND tenant_id = ? AND branch_id = ?`,
      [Number(Details.id), tenant_id, branch_id]
    );
    if (result.affectedRows === 0) {
      throw new AppError("Contractor not found", 404);
    }
    return { success: true, message: "Contractor deleted successfully" };
  } catch (error) {
    console.error("❌ contractorDelete Error:", error);
    throw new AppError("Failed to delete contractor", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Delete Supplier (Master Table)
=================================*/
exports.supplierDelete = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `DELETE FROM mas_material_list
      WHERE id = ? AND tenant_id = ? AND branch_id = ?`,
      [Number(Details.id), tenant_id, branch_id]
    );
    if (result.affectedRows === 0) {
      throw new AppError("Supplier not found", 404);
    }
    return { success: true, message: "Supplier deleted successfully" };
  } catch (error) {
    console.error("❌ supplierDelete Error:", error);
    throw new AppError("Failed to delete supplier", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

module.exports = exports;
