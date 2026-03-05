const { pool } = require("../config/db");
const { AppError } = require("../Logics/AppError");

/* ===============================
   New Payment - Insert Multiple
=================================*/
exports.newPayment = async (details, tenant_id, branch_id) => {
  let conn;
  try {
    if (!details || details.length === 0) {
      throw new AppError("No payment details provided", 400);
    }
    conn = await pool.getConnection();
    const insertQuery = `
      INSERT INTO payment_details
      (tenant_id, branch_id, Payment_date, Project_id, Amount, Created_by, Created_datetime)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    for (const order of details) {
      const { Project_id, Pay_Date, Amount, username, datetime } = order;
      await conn.query(insertQuery, [
        tenant_id,
        branch_id,
        Pay_Date,
        Project_id,
        Number(Amount),
        username,
        datetime,
      ]);
    }
    console.log("✅ Payments saved to database");
    return { success: true, message: "Payments saved successfully" };
  } catch (err) {
    console.error("❌ newPayment Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to save payments", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Fetch Payment Update (By Date & Project)
=================================*/
exports.fetchPaymentUpdate = async (details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT * FROM payment_details
      WHERE tenant_id = ? AND branch_id = ? AND Payment_date = ? AND Project_id = ?`,
      [tenant_id, branch_id, details.date, details.Id]
    );
    return result;
  } catch (err) {
    console.error("❌ fetchPaymentUpdate Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch payment records", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Update Payment Details
=================================*/
exports.updatePaymentDetails = async (details, tenant_id, branch_id) => {
  let conn;
  try {
    if (!details || details.length === 0) {
      throw new AppError("No payment updates provided", 400);
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
      UPDATE payment_details
      SET Payment_date = ?, Amount = ?, Updated_by = ?, Updated_datetime = ?
      WHERE Project_id = ? AND Payment_id = ? AND tenant_id = ? AND branch_id = ?
    `;
    for (const order of details) {
      const {
        Payment_id,
        Project_id,
        Payment_date,
        Amount,
        updated_by,
        update_date,
      } = order;
      const result = await conn.query(updateQuery, [
        convert(Payment_date),
        Number(Amount),
        updated_by,
        update_date,
        Project_id,
        Payment_id,
        tenant_id,
        branch_id,
      ]);
      if (result[0].affectedRows === 0) {
        throw new AppError(`Payment record not found: ${Payment_id}`, 404);
      }
    }
    console.log("✅ Payment details updated successfully");
    return { success: true, message: "Payment details updated successfully" };
  } catch (err) {
    console.error("❌ updatePaymentDetails Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to update payment details", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Project Payment Delete
=================================*/
exports.projectPaymentDelete = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `DELETE FROM payment_details
      WHERE Project_id = ? AND Payment_id = ? AND tenant_id = ? AND branch_id = ?`,
      [Details.Project_id, Details.Payment_id, tenant_id, branch_id]
    );
    if (result[0].affectedRows === 0) {
      throw new AppError("Payment record not found", 404);
    }
    console.log("✅ Payment record deleted successfully");
    return { success: true, message: "Payment record deleted successfully" };
  } catch (err) {
    console.error("❌ projectPaymentDelete Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to delete payment record", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Client Payment Report (Date Range)
=================================*/
exports.clientPaymentReport = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT * FROM payment_details
      WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
      AND payment_date BETWEEN ? AND ?
      ORDER BY payment_date`,
      [tenant_id, branch_id, Details.Id, Details.Start, Details.End]
    );
    return result;
  } catch (error) {
    console.error("❌ clientPaymentReport Error:", error);
    throw new AppError("Failed to fetch payment reports", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Material Payments Update (Date Range)
=================================*/
exports.materialPaymentsUpdate = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT * FROM payment_details
      WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
      AND payment_date BETWEEN ? AND ?
      ORDER BY payment_date`,
      [tenant_id, branch_id, Details.Id, Details.Start, Details.End]
    );
    return result;
  } catch (error) {
    console.error("❌ materialPaymentsUpdate Error:", error);
    throw new AppError("Failed to fetch payment records", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   All Material Payment Update (Complex Payment Logic)
=================================*/
exports.allMaterialPaymentUpdate = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const {
        Supplier,
        Start,
        End,
        Payment_Date,
        Billno,
        username,
        currentDate,
        Amount: TotalAmount,
      } = Details;
      let remainingAmount = Number(TotalAmount);
      const selectResult = await conn.query(
        `SELECT Project_id, Material_Name, CREATED_DATETIME, Supplier_name, Balance, Amount, Paid
        FROM order_details
        WHERE tenant_id = ? AND branch_id = ? AND STATUS != 'Paid'
        AND Supplier_name = ? AND Order_date BETWEEN ? AND ?
        ORDER BY CREATED_DATETIME`,
        [tenant_id, branch_id, Supplier, Start, End]
      );
      const orders = selectResult;
      for (const item of orders) {
        if (remainingAmount <= 0) break;
        const itemBalance = Number(item.Balance);
        const itemAmount = Number(item.Amount);
        const payNow = Math.min(remainingAmount, itemBalance);
        await conn.query(
          `INSERT INTO material_payments
          (tenant_id, branch_id, Project_id, Bill_no, Material_name, Supplier_name,
          Payment_Date, Material_amount, Amount, Created_by, Created_Datetime)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tenant_id,
            branch_id,
            item.Project_id,
            Billno,
            item.Material_Name,
            Supplier,
            Payment_Date,
            payNow,
            TotalAmount,
            username,
            currentDate,
          ]
        );
        const newPaid = Number(item.Paid) + payNow;
        const newBalance = itemAmount - newPaid;
        const newStatus = newBalance === 0 ? "Paid" : "Partial";
        await conn.query(
          `UPDATE order_details
          SET Paid = ?, Balance = ?, Status = ?, Payment_Date = ?
          WHERE Order_id = (
          SELECT Order_id FROM order_details
          WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
          AND Material_Name = ? AND Supplier_name = ? AND CREATED_DATETIME = ?
          LIMIT 1
          )`,
          [
            newPaid,
            newBalance,
            newStatus,
            Payment_Date,
            tenant_id,
            branch_id,
            item.Project_id,
            item.Material_Name,
            Supplier,
            item.CREATED_DATETIME,
          ]
        );
        remainingAmount -= payNow;
      }
      await conn.commit();
      console.log("✅ Material payments processed successfully");
      return {
        success: true,
        message: "Payments processed successfully",
        remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  } catch (err) {
    console.error("❌ allMaterialPaymentUpdate Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to process payments", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Delete Material Payments (By Bill No) + Revert Order Status
=================================*/
exports.deleteMaterialPayments = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const billNo = Number(Details.Billno);
      const paymentResult = await conn.query(
        `SELECT * FROM material_payments
        WHERE tenant_id = ? AND branch_id = ? AND Bill_no = ?`,
        [tenant_id, branch_id, billNo]
      );
      const payments = paymentResult[0];
      if (payments.length === 0) {
        throw new AppError(
          "No payment records found for this bill number",
          404
        );
      }
      await conn.query(
        `DELETE FROM material_payments
        WHERE tenant_id = ? AND branch_id = ? AND Bill_no = ?`,
        [tenant_id, branch_id, billNo]
      );
      for (const item of payments) {
        const materialAmount = Number(item.Material_amount);
        const orderResult = await conn.query(
          `SELECT Paid, Amount FROM order_details
          WHERE tenant_id = ? AND branch_id = ?
          AND Project_id = ? AND Material_Name = ? AND Supplier_name = ?`,
          [
            tenant_id,
            branch_id,
            item.Project_Id,
            item.Material_name,
            item.Supplier_name,
          ]
        );
        const orderRows = orderResult[0];
        if (orderRows.length === 0) continue;
        const currentPaid = Number(orderRows[0].Paid);
        const orderAmount = Number(orderRows[0].Amount);
        const newPaid = Math.max(0, currentPaid - materialAmount);
        const newBalance = orderAmount - newPaid;
        const newStatus =
          newBalance === 0 ? "Paid" : newPaid > 0 ? "Partial" : "UnPaid";
        await conn.query(
          `UPDATE order_details
          SET Paid = ?, Balance = ?, Status = ?
          WHERE tenant_id = ? AND branch_id = ?
          AND Project_id = ? AND Material_Name = ? AND Supplier_name = ?`,
          [
            newPaid,
            newBalance,
            newStatus,
            tenant_id,
            branch_id,
            item.Project_Id,
            item.Material_name,
            item.Supplier_name,
          ]
        );
      }
      await conn.commit();
      console.log(
        "✅ Material payments deleted and orders reverted successfully"
      );
      return { success: true, message: "Payments deleted successfully" };
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  } catch (err) {
    console.error("❌ deleteMaterialPayments Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to delete payments", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Materials Payment View (By Bill No)
=================================*/
exports.materialsPaymentView = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT * FROM material_payments
      WHERE tenant_id = ? AND branch_id = ? AND Bill_no = ?`,
      [tenant_id, branch_id, Number(Details.Billno)]
    );
    return result[0];
  } catch (err) {
    console.error("❌ materialsPaymentView Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch payment details", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   All Material Payment (Unpaid Orders)
=================================*/
exports.allMaterialPayment = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    let query, params;
    if (!Details.Supplier || Details.Supplier === "null") {
      query = `
        SELECT * FROM order_details
        WHERE tenant_id = ? AND branch_id = ? AND STATUS != 'Paid'
        AND Order_date BETWEEN ? AND ?
      `;
      params = [tenant_id, branch_id, Details.Start, Details.End];
    } else {
      query = `
        SELECT * FROM order_details
        WHERE tenant_id = ? AND branch_id = ? AND STATUS != 'Paid'
        AND Supplier_name = ? AND Order_date BETWEEN ? AND ?
      `;
      params = [
        tenant_id,
        branch_id,
        Details.Supplier,
        Details.Start,
        Details.End,
      ];
    }
    const result = await conn.query(query, params);
    const rows = result;
    const convertedRows = rows.map((row) => ({
      ...row,
      Paid: row.Paid?.toString(),
      Amount: row.Amount?.toString(),
      Balance: row.Balance?.toString(),
    }));
    return convertedRows;
  } catch (error) {
    console.error("❌ allMaterialPayment Error:", error);
    throw new AppError("Failed to fetch unpaid orders", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Fetch Material Balance (Unpaid by Project)
=================================*/
exports.fetchMaterialBalance = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    let query, params;
    if (!Details.Supplier || Details.Supplier === "null") {
      query = `
        SELECT * FROM order_details
        WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
        AND STATUS != 'Paid' AND Order_date BETWEEN ? AND ?
      `;
      params = [tenant_id, branch_id, Details.Id, Details.Start, Details.End];
    } else {
      query = `
        SELECT * FROM order_details
        WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
        AND STATUS != 'Paid' AND Supplier_name = ? AND Order_date BETWEEN ? AND ?
      `;
      params = [
        tenant_id,
        branch_id,
        Details.Id,
        Details.Supplier,
        Details.Start,
        Details.End,
      ];
    }
    const result = await conn.query(query, params);
    const rows = result;
    const convertedRows = rows.map((row) => ({
      ...row,
      Paid: row.Paid?.toString(),
      Amount: row.Amount?.toString(),
      Balance: row.Balance?.toString(),
    }));
    return convertedRows;
  } catch (error) {
    console.error("❌ fetchMaterialBalance Error:", error);
    throw new AppError("Failed to fetch material balance", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Fetch Material Pay (Supplier Balance Summary)
=================================*/
exports.fetchMaterialPay = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT supplier_name, SUM(balance) as Balance
      FROM order_details
      WHERE tenant_id = ? AND branch_id = ? AND STATUS != 'Paid' AND balance > 0
      GROUP BY supplier_name`,
      [tenant_id, branch_id]
    );
    return result;
  } catch (err) {
    console.error("❌ fetchMaterialPay Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch supplier balances", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

module.exports = exports;
