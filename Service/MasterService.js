const { pool } = require("../config/db");
const { AppError } = require("../Logics/AppError");

/* ===============================
   Labour Type - Create
=================================*/
exports.labourList = async (Labour_Details) => {
  try {
    await pool.query(
      "INSERT INTO mas_labour_Details (Labour_Details, Created_by, created_datetime, Salary, Ratio) VALUES (?, ?, ?, ?, ?)",
      [
        Labour_Details.Labour_Details,
        Labour_Details.username,
        Labour_Details.createdDate,
        Number(Labour_Details.Salary),
        Number(Labour_Details.Ratio),
      ]
    );
    console.log("✅ Labour type saved to database");
    return { success: true, message: "Labour type saved successfully" };
  } catch (err) {
    console.error("❌ labourList Error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      throw new AppError("Labour type already exists", 409, err);
    }
    throw err instanceof AppError
      ? err
      : new AppError("Failed to save labour type", 500, err);
  }
};

/* ===============================
   Material - Create
=================================*/
exports.materialList = async (Material) => {
  try {
    await pool.query(
      "INSERT INTO mas_material_list (Material_name, Created_by, created_datetime) VALUES (?, ?, ?)",
      [Material.Material_name, Material.username, Material.createdDate]
    );
    console.log("✅ Material saved to database");
    return { success: true, message: "Material saved successfully" };
  } catch (err) {
    console.error("❌ materialList Error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      throw new AppError("Material already exists", 409, err);
    }
    throw err instanceof AppError
      ? err
      : new AppError("Failed to save material", 500, err);
  }
};

/* ===============================
   Contractor - Create
=================================*/
exports.contractorList = async (Data) => {
  try {
    await pool.query(
      "INSERT INTO mas_labour_Details (Contractor, Created_By, created_datetime) VALUES (?, ?, ?)",
      [Data.Contractor, Data.username, Data.createdDate]
    );
    console.log("✅ Contractor saved to database");
    return { success: true, message: "Contractor saved successfully" };
  } catch (err) {
    console.error("❌ contractorList Error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      throw new AppError("Contractor already exists", 409, err);
    }
    throw err instanceof AppError
      ? err
      : new AppError("Failed to save contractor", 500, err);
  }
};

/* ===============================
   Supplier - Create
=================================*/
exports.supplierList = async (Data) => {
  try {
    await pool.query(
      "INSERT INTO mas_material_list (Supplier_Name, Supplier_Contact, Created_By, created_datetime) VALUES (?, ?, ?, ?)",
      [Data.SupplierName, Data.SupplierContact, Data.username, Data.createdDate]
    );
    console.log("✅ Supplier saved to database");
    return { success: true, message: "Supplier saved successfully" };
  } catch (err) {
    console.error("❌ supplierList Error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      throw new AppError("Supplier already exists", 409, err);
    }
    throw err instanceof AppError
      ? err
      : new AppError("Failed to save supplier", 500, err);
  }
};

/* ===============================
   Fetch Materials
=================================*/
exports.fetchMaterial = async (tenant_id, branch_id) => {
  try {
    const result = await pool.query(
      "SELECT * FROM mas_material_list WHERE tenant_id = ? AND branch_id = ?",
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
   Fetch Labour Types
=================================*/
exports.fetchLabour = async (tenant_id, branch_id) => {
  try {
    const result = await pool.query(
      "SELECT * FROM mas_labour_Details WHERE tenant_id = ? AND branch_id = ?",
      [tenant_id, branch_id]
    );
    return result;
  } catch (err) {
    console.error("❌ fetchLabour Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch labour types", 500, err);
  }
};

/* ===============================
   Fetch Contractors
=================================*/
exports.fetchContractor = async (tenant_id, branch_id) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT Contractor FROM mas_labour_Details WHERE tenant_id = ? AND branch_id = ? AND Contractor IS NOT NULL",
      [tenant_id, branch_id]
    );
    return result;
  } catch (err) {
    console.error("❌ fetchContractor Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch contractors", 500, err);
  }
};

/* ===============================
   Fetch Suppliers
=================================*/
exports.fetchSupplier = async (tenant_id, branch_id) => {
  try {
    const result = await pool.query(
      "SELECT * FROM mas_material_list WHERE tenant_id = ? AND branch_id = ? AND Supplier_Name IS NOT NULL",
      [tenant_id, branch_id]
    );
    return result;
  } catch (err) {
    console.error("❌ fetchSupplier Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch suppliers", 500, err);
  }
};

/* ===============================
   Delete Labour Type
=================================*/
exports.labourTypeDelete = async (Details, tenant_id, branch_id) => {
  try {
    const result = await pool.query(
      "DELETE FROM mas_labour_details WHERE id = ? AND tenant_id = ? AND branch_id = ?",
      [Number(Details.id), tenant_id, branch_id]
    );
    if (result[0].affectedRows === 0) {
      throw new AppError("Labour type not found", 404);
    }
    return { success: true, message: "Labour type deleted successfully" };
  } catch (err) {
    console.error("❌ labourTypeDelete Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to delete labour type", 500, err);
  }
};

module.exports = exports;
