const { pool } = require("../config/db");
const { deleteFile } = require("../utils/UploadFile");
const path = require("path");
const { AppError } = require("../Logics/AppError");

/* ===============================
   Material List - Insert
=================================*/
exports.materialList = async (Material, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      "INSERT INTO mas_material_list (tenant_id, branch_id, Material_name, Created_by, created_datetime) VALUES (?, ?, ?, ?, ?)",
      [
        tenant_id,
        branch_id,
        Material.Material_name,
        Material.username,
        Material.createdDate,
      ]
    );
    console.log("✅ Form data saved to database");
    return {
      success: true,
      message: "Material saved successfully",
      insertId: result[0].insertId,
    };
  } catch (err) {
    console.error("❌ materialList Error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      throw new AppError("Material already exists", 409, err);
    }
    throw err instanceof AppError
      ? err
      : new AppError("Failed to save material", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Material Used - Insert & Update Stock
=================================*/
exports.materialUsed = async (Mat_Used, tenant_id, branch_id) => {
  let conn;
  try {
    if (!Mat_Used || Mat_Used.length === 0) {
      throw new AppError("No material usage details provided", 400);
    }
    conn = await pool.getConnection();
    const selectQuery = `
      SELECT Stock_List FROM material_stock_list
      WHERE Project_id = ? AND Material_List = ? AND tenant_id = ? AND branch_id = ?
    `;
    const updateQuery = `
      UPDATE material_stock_list
      SET Stock_List = ?
      WHERE Project_id = ? AND Material_List = ? AND tenant_id = ? AND branch_id = ?
    `;
    const insertQuery = `
      INSERT INTO materials_used
      (tenant_id, branch_id, Project_id, Project_name, Date, Material_List, Material_Used, Created_by, CREATED_DATETIME)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    for (const details of Mat_Used) {
      const {
        Project_id,
        Project_name,
        date,
        Material,
        Used,
        username,
        createdDate,
      } = details;
      const stockResult = await conn.query(selectQuery, [
        Project_id,
        Material,
        tenant_id,
        branch_id,
      ]);
      const rows = stockResult[0];
      if (!rows || rows.length === 0) {
        throw new AppError(
          `Stock not found for Project ${Project_id}, Material ${Material}`,
          404
        );
      }
      const Stock = rows.Stock_List;
      await conn.query(insertQuery, [
        tenant_id,
        branch_id,
        Project_id,
        Project_name,
        date,
        Material,
        Used,
        username,
        createdDate,
      ]);
      await conn.query(updateQuery, [
        Stock - Used,
        Project_id,
        Material,
        tenant_id,
        branch_id,
      ]);
      console.log(`✅ Material used recorded: ${Material} (${Used} units)`);
    }
    return { success: true, message: "Material usage saved successfully" };
  } catch (err) {
    console.error("❌ materialUsed Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to record material usage", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Edit Material Used - Update Usage & Stock
=================================*/
exports.EditMaterialUsed = async (Mat_Used, tenant_id, branch_id) => {
  let conn;

  try {
    console.log("📥 EditMaterialUsed called");
    console.log("Tenant:", tenant_id, "Branch:", branch_id);
    console.log("Incoming Data:", JSON.stringify(Mat_Used, null, 2));

    if (!Mat_Used || Mat_Used.length === 0) {
      throw new AppError("No material updates provided", 400);
    }

    conn = await pool.getConnection();
    console.log("✅ DB connection acquired");

    const convert = (str) => {
      if (!str) return null;
      const date = new Date(str);
      const mnth = ("0" + (date.getMonth() + 1)).slice(-2);
      const day = ("0" + date.getDate()).slice(-2);
      return [date.getFullYear(), mnth, day].join("-");
    };

    const selectUsedQuery = `
      SELECT Material_Used FROM materials_used
      WHERE Project_id = ? AND Material_List = ? AND DATE = ? AND tenant_id = ? AND branch_id = ?
    `;

    const selectStockQuery = `
      SELECT Stock_List FROM material_stock_list
      WHERE Project_id = ? AND Material_List = ? AND tenant_id = ? AND branch_id = ?
    `;

    const stockUpdateQuery = `
      UPDATE material_stock_list
      SET Stock_List = ?
      WHERE Project_id = ? AND Material_List = ? AND tenant_id = ? AND branch_id = ?
    `;

    const usedUpdateQuery = `
      UPDATE materials_used
      SET Material_Used = ?, LAST_UPDATED_BY = ?, LAST_UPDATED_DATETIME = ?
      WHERE Project_id = ? AND Material_List = ? AND DATE = ? AND tenant_id = ? AND branch_id = ?
    `;

    for (const details of Mat_Used) {
      console.log("--------------------------------------------------");
      console.log("🔄 Processing material:", details.Material_List);

      const {
        Project_id,
        Project_name,
        DATE,
        Material_List,
        Material_Used,
        username,
        date,
        Used
      } = details;

      const formattedDate = DATE;
      const formattedUpdateDate = date;

      console.log("📅 Formatted Date:", formattedDate);
      console.log("📅 Update Date:", formattedUpdateDate);

      console.log("🔎 Checking existing usage record...");

      console.log(Project_id,
        Material_List,
        formattedDate,
        tenant_id,
        branch_id);

      const usedResult = await conn.query(selectUsedQuery, [
        Project_id,
        Material_List,
        formattedDate,
        tenant_id,
        branch_id,
      ]);

      console.log("Used Query Result:", usedResult);

      const usedRows = usedResult[0];

      if (!usedRows) {
        throw new AppError("Usage record not found for update", 404);
      }

      const alreadyUsedStock = Number(usedRows.Material_Used);
      const newUsed = Number(Material_Used);

      console.log("📊 Already Used:", alreadyUsedStock);
      console.log("📊 New Used:", newUsed);

      console.log("🔎 Fetching stock record...");

      const stockResult = await conn.query(selectStockQuery, [
        Project_id,
        Material_List,
        tenant_id,
        branch_id,
      ]);

      console.log("Stock Query Result:", stockResult);

      const stockRows = stockResult[0];

      if (!stockRows || stockRows.length === 0) {
        throw new AppError("Stock record not found", 404);
      }

      const currentStock = Number(stockRows.Stock_List);

      console.log("📦 Current Stock:", currentStock);

      let newStock;

      if (alreadyUsedStock > newUsed) {
        newStock = currentStock + (alreadyUsedStock - newUsed);
      } else if (alreadyUsedStock < newUsed) {
        newStock = currentStock - (newUsed - alreadyUsedStock);
      } else {
        newStock = currentStock;
      }

      console.log("📦 Calculated New Stock:", newStock);

      console.log("✏️ Updating materials_used table...");

      console.log("Used Update Params:",  Used,
        username,
        formattedUpdateDate,
        Project_id,
        Material_List,
        formattedUpdateDate,
        tenant_id,
        branch_id,);

      await conn.query(usedUpdateQuery, [
        Used,
        username,
        formattedUpdateDate,
        Project_id,
        Material_List,
        formattedUpdateDate,
        tenant_id,
        branch_id,
      ]);

      console.log("✏️ Updating material_stock_list table...");

      await conn.query(stockUpdateQuery, [
        newStock,
        Project_id,
        Material_List,
        tenant_id,
        branch_id,
      ]);

      console.log(`✅ Material usage updated: ${Material_List}`);
    }

    console.log("🎉 All materials updated successfully");

    return { success: true, message: "Material usage updated successfully" };
  } catch (err) {
    console.error("❌ EditMaterialUsed Error:", err);

    throw err instanceof AppError
      ? err
      : new AppError("Failed to update material usage", 500, err);
  } finally {
    if (conn) {
      conn.release();
      console.log("🔌 DB connection released");
    }
  }
};

/* ===============================
   Measurement Details - Insert
=================================*/
exports.measurementDetails = async (
  material_report,
  username,
  tenant_id,
  branch_id,
  file = null
) => {
  let conn;
  console.log("Received measurement details:", material_report);
  try {
    if (!material_report || Object.keys(material_report).length === 0) {
      throw new AppError("No measurement details provided", 400);
    }
    conn = await pool.getConnection();

    const convert = (str) => {
      if (!str) return null;
      const date = new Date(str); // ✅ Now uses global Date constructor
      const mnth = ("0" + (date.getMonth() + 1)).slice(-2);
      const day = ("0" + date.getDate()).slice(-2);
      return [date.getFullYear(), mnth, day].join("-");
    };

    const {
      Project_id,
      Project_name,
      Date: reportDate, // ✅ Rename to avoid collision
      Measurement,
      Units,
      Nos,
      Length,
      Breadth,
      D_H,
      Quantity,
      Rate,
      Amount,
      Remarks,
      Paid,
      Balance,
      Status,
      username: reportUsername, // ✅ Also rename this to avoid collision
      currentDate,
    } = material_report;

    const photoPath = file ? path.join("images", file.filename) : null;

    const result = await conn.query(
      `INSERT INTO daily_process_details
      (tenant_id, branch_id, Project_id, Project_name, DATE, Measurement, Units, Nos,
      Length, Breadth, D_H, Quantity, Rate, Amount, Remarks, Photos, Paid, Balance,
      Status, CREATED_BY, CREATED_DATETIME)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenant_id,
        branch_id,
        Project_id,
        Project_name,
        reportDate, // ✅ Use renamed variable
        Measurement,
        Units,
        Nos,
        Length,
        Breadth,
        D_H,
        Quantity,
        Rate,
        Amount,
        Remarks,
        photoPath,
        Paid,
        Balance,
        Status,
        username, // ✅ Use function argument (not from material_report)
        currentDate,
      ]
    );

    console.log("✅ Measurement details inserted successfully");
    return {
      success: true,
      message: "Measurement details saved successfully",
      insertId: result.insertId,
    };
  } catch (error) {
    console.error("❌ measurementDetails Error:", error);
    throw new AppError("Failed to save measurement details", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Update Material - Daily Process Details
=================================*/
exports.updateMaterial = async (materialUpdates, tenant_id, branch_id) => {
  let conn;
  try {
    if (!Array.isArray(materialUpdates) || materialUpdates.length === 0) {
      throw new AppError("Material updates must be a non-empty array", 400);
    }
    conn = await pool.getConnection();
    const convert = (str) => {
      if (!str) return null;
      const date = new Date(str);
      const mnth = ("0" + (date.getMonth() + 1)).slice(-2);
      const day = ("0" + date.getDate()).slice(-2);
      return [date.getFullYear(), mnth, day].join("-");
    };
    const updateQuery = `
      UPDATE daily_process_details
      SET
      Project_id = ?, Project_name = ?, Date = ?, Measurement = ?, Units = ?,
      Nos = ?, Length = ?, Breadth = ?, D_H = ?, Quantity = ?, Rate = ?,
      Amount = ?, Remarks = ?, Paid = ?, Balance = ?, Status = ?,
      LAST_UPDATED_BY = ?, LAST_UPDATED_DATETIME = ?
      WHERE Dailyprocess_id = ? AND tenant_id = ? AND branch_id = ?
    `;
    for (const update of materialUpdates) {
      const { username, currentDate, ...materialUpdate } = update;
      const formattedDate = materialUpdate.DATE;
      const formattedUpdateDate = currentDate;
      const {
        Project_id,
        Project_name,
        Measurement,
        Units,
        Nos,
        Length,
        breadth,
        D_H,
        Quantity,
        Rate,
        Amount,
        Remarks,
        Paid,
        Balance,
        Status,
        Dailyprocess_id,
      } = materialUpdate;
      const result = await conn.query(updateQuery, [
        Project_id,
        Project_name,
        formattedDate,
        Measurement,
        Units,
        Nos,
        Length,
        breadth,
        D_H,
        Quantity,
        Rate,
        Amount,
        Remarks,
        Paid,
        Balance,
        Status,
        username,
        formattedUpdateDate,
        Dailyprocess_id,
        tenant_id,
        branch_id,
      ]);
      if (result.affectedRows === 0) {
        throw new AppError(`Record not found: ${Dailyprocess_id}`, 404);
      }
      console.log(`✅ Daily process updated: ID ${Dailyprocess_id}`);
    }
    return { success: true, message: "Material details updated successfully" };
  } catch (error) {
    console.error("❌ updateMaterial Error:", error);
    throw new AppError("Failed to update material details", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Fetch Material Update (Daily Process)
=================================*/
exports.fetchMaterialUpdate = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT * FROM daily_process_details
      WHERE Project_id = ? AND Date = ? AND tenant_id = ? AND branch_id = ?`,
      [Details.Id, Details.date, tenant_id, branch_id]
    );
    return result;
  } catch (err) {
    console.error("❌ fetchMaterialUpdate Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch measurement records", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Fetch Material Used Records
=================================*/
exports.fetchMaterialUsed = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT *,DATE_FORMAT(DATE, '%Y-%m-%d') AS Format_date FROM materials_used
      WHERE Project_id = ? AND Date = ? AND tenant_id = ? AND branch_id = ?`,
      [Details.Id, Details.date, tenant_id, branch_id]
    );
    return result;
  } catch (err) {
    console.error("❌ fetchMaterialUsed Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch material usage records", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Fetch All Materials (Master List)
=================================*/
exports.fetchMaterial = async (tenant_id, branch_id) => {
  try {
    const result = await pool.query(
      `SELECT * FROM mas_material_list WHERE tenant_id = ? AND branch_id = ?`,
      [tenant_id, branch_id]
    );
    return result;
  } catch (err) {
    console.error("❌ fetchMaterial Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch materials", 500, err);
  }
};

/* ===============================
   Delete Material (Master)
=================================*/
exports.materialDelete = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `DELETE FROM mas_material_list WHERE id = ? AND tenant_id = ? AND branch_id = ?`,
      [Number(Details.id), tenant_id, branch_id]
    );
    if (result.affectedRows === 0) {
      throw new AppError("Material not found", 404);
    }
    console.log("✅ Material deleted successfully");
    return { success: true, message: "Material deleted successfully" };
  } catch (err) {
    console.error("❌ materialDelete Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to delete material", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Material Payment Reports
=================================*/
exports.materialPaymentReports = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT Supplier_name, Payment_Date, Amount
      FROM material_payments
      WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
      AND Payment_Date BETWEEN ? AND ?
      ORDER BY Payment_Date`,
      [tenant_id, branch_id, Details.Id, Details.Start, Details.End]
    );
    return result[0];
  } catch (err) {
    console.error("❌ materialPaymentReports Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch payment reports", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Stock List by Project
=================================*/
exports.stockList = async (project, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT * FROM material_stock_list
      WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?`,
      [project.pro_id, tenant_id, branch_id]
    );
    return result;
  } catch (err) {
    console.error("❌ stockList Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch stock list", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Delete Measurement Record
=================================*/
exports.measurementDelete = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `DELETE FROM daily_process_details
      WHERE Project_id = ? AND Dailyprocess_id = ? AND tenant_id = ? AND branch_id = ?`,
      [Details.Project_id, Details.Dailyprocess_id, tenant_id, branch_id]
    );
    if (result[0].affectedRows === 0) {
      throw new AppError("Measurement record not found", 404);
    }
    console.log("✅ Measurement record deleted successfully");
    return { success: true, message: "Record deleted successfully" };
  } catch (err) {
    console.error("❌ measurementDelete Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to delete measurement record", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Measurement Reports (Date Range)
=================================*/
exports.measurementReports = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT * FROM daily_process_details
      WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
      AND Date BETWEEN ? AND ?
      ORDER BY Date`,
      [tenant_id, branch_id, Details.Id, Details.Start, Details.End]
    );
    return result;
  } catch (err) {
    console.error("❌ measurementReports Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch measurement reports", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Overall Reports (Labour + Orders Union)
=================================*/
exports.overAllReports = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT DATE, contractor, " " as site_location, total as total, paid as paid, balance as balance, STATUS
      FROM labour_worked_details
      WHERE tenant_id = ? AND branch_id = ? AND Project_id = ? AND DATE BETWEEN ? AND ?
      UNION ALL
      SELECT order_date, supplier_name, material_name, amount, paid, balance, status
      FROM order_details
      WHERE tenant_id = ? AND branch_id = ? AND project_id = ? AND order_date BETWEEN ? AND ?
      ORDER BY DATE`,
      [
        tenant_id,
        branch_id,
        Details.Id,
        Details.Start,
        Details.End,
        tenant_id,
        branch_id,
        Details.Id,
        Details.Start,
        Details.End,
      ]
    );
    return result[0];
  } catch (err) {
    console.error("❌ overAllReports Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch overall reports", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Combined Reports (Orders + Labour)
=================================*/
exports.reports = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const ordersResult = await conn.query(
      `SELECT * FROM order_details
      WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
      AND Order_date BETWEEN ? AND ?
      ORDER BY Order_date`,
      [tenant_id, branch_id, Details.Id, Details.Start, Details.End]
    );
    const labourResult = await conn.query(
      `SELECT * FROM labour_worked_details
      WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
      AND Date BETWEEN ? AND ?
      ORDER BY Date`,
      [tenant_id, branch_id, Details.Id, Details.Start, Details.End]
    );
    return {
      order: ordersResult[0],
      labour: labourResult[0],
    };
  } catch (error) {
    console.error("❌ reports Error:", error);
    throw new AppError("Failed to fetch combined reports", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Delete Material by Name (Legacy)
=================================*/
exports.deleteMaterial = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `DELETE FROM mas_material_list
      WHERE Material_name = ? AND tenant_id = ? AND branch_id = ?`,
      [Details.materialName, tenant_id, branch_id]
    );
    if (result[0].affectedRows === 0) {
      throw new AppError("Material not found", 404);
    }
    console.log("✅ Material deleted successfully");
    return { success: true, message: "Material deleted successfully" };
  } catch (err) {
    console.error("❌ deleteMaterial Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to delete material", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

module.exports = exports;
