const { pool } = require("../config/db");
const { AppError } = require("../Logics/AppError");

/* ===============================
   Order - Insert Multiple + Stock Update
=================================*/
exports.order = async (orders, tenant_id, branch_id) => {
  let conn;
  try {
    if (!orders || orders.length === 0) {
      throw new AppError("No orders provided", 400);
    }
    conn = await pool.getConnection();
    const insertQuery = `
      INSERT INTO Order_Details
      (tenant_id, branch_id, Project_id, Project_name, Material_Name, Quantity, Unit,
      Order_date, Delivery_Date, Supplier_name, Supplier_Contact, Rate, Amount,
      Payment_Date, Paid, Balance, Status, Created_by, CREATED_DATETIME)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const selectQuery = `
      SELECT * FROM material_stock_list
      WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?
    `;
    const updateQuery = `
      UPDATE material_stock_list
      SET Stock_List = ?
      WHERE Project_id = ? AND Material_List = ? AND tenant_id = ? AND branch_id = ?
    `;
    const insertStockQuery = `
      INSERT INTO material_stock_list
      (tenant_id, branch_id, Project_id, Project_name, Pro_Date, Material_List, Stock_List)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    for (const order of orders) {
      const {
        Project_id,
        Project_name,
        Material_Name,
        Quantity,
        Unit,
        Order_date,
        Delivery_Date,
        Supplier_name,
        Supplier_Contact,
        Rate,
        Amount,
        Payment_Date,
        Paid,
        Balance,
        Status,
        username,
        datetime,
      } = order;
      await conn.query(insertQuery, [
        tenant_id,
        branch_id,
        Project_id,
        Project_name,
        Material_Name,
        Quantity,
        Unit,
        Order_date,
        Delivery_Date,
        Supplier_name,
        Supplier_Contact,
        Rate,
        Amount,
        Payment_Date,
        Paid,
        Balance,
        Status,
        username,
        datetime,
      ]);
      const stockResult = await conn.query(selectQuery, [
        Project_id,
        tenant_id,
        branch_id,
      ]);
      const stockRows = stockResult[0];
      const existingStock = stockRows?.find(
        (item) => item.Material_List === Material_Name
      );
      if (existingStock) {
        const updatedStock =
          Number(existingStock.Stock_List) + Number(Quantity);
        await conn.query(updateQuery, [
          updatedStock,
          Project_id,
          Material_Name,
          tenant_id,
          branch_id,
        ]);
      } else {
        await conn.query(insertStockQuery, [
          tenant_id,
          branch_id,
          Project_id,
          Project_name,
          Order_date,
          Material_Name,
          Quantity,
        ]);
      }
    }
    console.log("✅ Orders saved to database");
    return { success: true, message: "Orders saved successfully" };
  } catch (error) {
    console.error("❌ order Error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError("Duplicate order entry", 409, error);
    }
    throw new AppError("Failed to save orders", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Update Order + Stock Adjustment
=================================*/
exports.updateOrder = async (orders, tenant_id, branch_id) => {
  let conn;
  try {
    if (!Array.isArray(orders) || orders.length === 0) {
      throw new AppError("Orders must be a non-empty array", 400);
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
      UPDATE Order_Details
      SET Material_Name=?, Quantity=?, Unit=?, Order_date=?, Delivery_Date=?,
      Supplier_name=?, Supplier_Contact=?, Rate=?, Amount=?, Payment_Date=?,
      Paid=?, Balance=?, Status=?, LAST_UPDATED_BY=?, LAST_UPDATED_DATETIME=?
      WHERE Order_id = ? AND tenant_id = ? AND branch_id = ?
    `;
    const selectQuery = `
      SELECT Stock_List FROM material_stock_list
      WHERE Project_id = ? AND Material_List = ? AND tenant_id = ? AND branch_id = ?
    `;
    const updateStockQuery = `
      UPDATE material_stock_list
      SET Stock_List = ?
      WHERE Project_id = ? AND Material_List = ? AND tenant_id = ? AND branch_id = ?
    `;
    const selectOrderQuery = `
      SELECT Quantity FROM order_details
      WHERE Order_id = ? AND Material_Name = ? AND tenant_id = ? AND branch_id = ?
    `;
    for (const order of orders) {
      const {
        Project_id,
        Material_Name,
        Quantity,
        Unit,
        Supplier_name,
        Supplier_Contact,
        Rate,
        Amount,
        Payment_Date,
        Paid,
        Balance,
        Status,
        Order_id,
        LAST_UPDATED_BY,
        LAST_UPDATED_DATETIME,
        Order_date,
        Delivery_Date,
      } = order;
      const stockResult = await conn.query(selectQuery, [
        Project_id,
        Material_Name,
        tenant_id,
        branch_id,
      ]);
      const stockRows = stockResult[0];
      if (!stockRows || stockRows.length === 0) {
        throw new AppError(
          `Stock not found for Project ${Project_id}, Material ${Material_Name}`,
          404
        );
      }
      const Stock = Number(stockRows[0].Stock_List);
      const orderResult = await conn.query(selectOrderQuery, [
        Order_id,
        Material_Name,
        tenant_id,
        branch_id,
      ]);
      const orderRows = orderResult[0];
      if (!orderRows || orderRows.length === 0) {
        throw new AppError(`Order not found: ${Order_id}`, 404);
      }
      const orderStock = Number(orderRows[0].Quantity);
      const newQuantity = Number(Quantity);
      let finalStock;
      if (orderStock > newQuantity) {
        finalStock = Stock - (orderStock - newQuantity);
      } else if (orderStock < newQuantity) {
        finalStock = Stock + (newQuantity - orderStock);
      } else {
        finalStock = Stock;
      }
      await conn.query(updateStockQuery, [
        finalStock,
        Project_id,
        Material_Name,
        tenant_id,
        branch_id,
      ]);
      await conn.query(updateQuery, [
        Material_Name,
        Quantity,
        Unit,
        Order_date,
        Delivery_Date,
        Supplier_name,
        Supplier_Contact,
        Rate,
        Amount,
        Payment_Date != null ? convert(Payment_Date) : null,
        Paid,
        Balance,
        Status,
        LAST_UPDATED_BY,
        LAST_UPDATED_DATETIME,
        Order_id,
        tenant_id,
        branch_id,
      ]);
      console.log(`✅ Order updated: ID ${Order_id}`);
    }
    return { success: true, message: "Orders updated successfully" };
  } catch (error) {
    console.error("❌ updateOrder Error:", error);
    throw new AppError("Failed to update orders", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Delete Order + Revert Stock (With Transaction)
=================================*/
exports.orderDelete = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const deleteResult = await conn.query(
        `DELETE FROM order_details
        WHERE Project_id = ? AND Order_id = ? AND tenant_id = ? AND branch_id = ?`,
        [Details.Project_id, Details.Order_id, tenant_id, branch_id]
      );
      if (deleteResult[0].affectedRows === 0) {
        throw new AppError("Order not found", 404);
      }
      const quantity = Number(Details.Quantity);
      const stockResult = await conn.query(
        `SELECT Stock_List FROM material_stock_list
        WHERE Project_id = ? AND Material_List = ? AND tenant_id = ? AND branch_id = ?`,
        [Details.Project_id, Details.Material_Name, tenant_id, branch_id]
      );
      const stockRows = stockResult[0];
      if (stockRows && stockRows.length > 0) {
        const currentStock = Number(stockRows[0].Stock_List);
        const newStock = currentStock - quantity;
        await conn.query(
          `UPDATE material_stock_list
          SET Stock_List = ?
          WHERE Project_id = ? AND Material_List = ? AND tenant_id = ? AND branch_id = ?`,
          [
            newStock,
            Details.Project_id,
            Details.Material_Name,
            tenant_id,
            branch_id,
          ]
        );
      }
      await conn.commit();
      console.log("✅ Order deleted and stock reverted successfully");
      return { success: true, message: "Order deleted successfully" };
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  } catch (error) {
    console.error("❌ orderDelete Error:", error);
    throw new AppError("Failed to delete order", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Fetch Order Update (Date Range)
=================================*/
exports.fetchOrderUpdate = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT * FROM order_details
      WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
      AND Order_date BETWEEN ? AND ?
      ORDER BY Order_date`,
      [tenant_id, branch_id, Details.Id, Details.start_date, Details.end_date]
    );
    return result;
  } catch (err) {
    console.error("❌ fetchOrderUpdate Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch orders", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Order Reports (Date Range)
=================================*/
exports.orderReports = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT * FROM order_details
      WHERE tenant_id = ? AND branch_id = ? AND Project_id = ?
      AND Order_date BETWEEN ? AND ?
      ORDER BY Order_date`,
      [tenant_id, branch_id, Details.Id, Details.Start, Details.End]
    );
    return result[0];
  } catch (err) {
    console.error("❌ orderReports Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch order reports", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Material Payment Selected (Process Payment)
=================================*/
exports.materialPaymentSelected = async (payments, tenant_id, branch_id) => {
  let conn;
  try {
    if (!payments || payments.length === 0) {
      throw new AppError("No payments provided", 400);
    }
    conn = await pool.getConnection();
    for (const item of payments) {
      const {
        Order_id,
        Project_id,
        Material_Name,
        Supplier_name,
        PayAmount,
        Payment_Date,
        username,
        currentDate,
      } = item;
      const orderResult = await conn.query(
        `SELECT Amount, Paid, Balance FROM order_details
        WHERE Order_id = ? AND tenant_id = ? AND branch_id = ?`,
        [Order_id, tenant_id, branch_id]
      );
      const orderRows = orderResult[0];
      if (orderRows.length === 0) {
        throw new AppError(`Order not found: ${Order_id}`, 404);
      }
      const { Amount, Paid, Balance } = orderRows[0];
      const payAmount = Number(PayAmount);
      const balance = Number(Balance);
      if (payAmount > balance) {
        throw new AppError("Payment amount exceeds remaining balance", 400);
      }
      const newPaid = Number(Paid) + payAmount;
      const newBalance = Number(Amount) - newPaid;
      const newStatus = newBalance === 0 ? "Paid" : "Partial";
      await conn.query(
        `UPDATE order_details
        SET Paid = ?, Balance = ?, Status = ?, Payment_Date = ?
        WHERE Order_id = ? AND tenant_id = ? AND branch_id = ?`,
        [
          newPaid,
          newBalance,
          newStatus,
          Payment_Date,
          Order_id,
          tenant_id,
          branch_id,
        ]
      );
      await conn.query(
        `INSERT INTO material_payments
        (tenant_id, branch_id, Project_id, Material_name, Supplier_name,
        Payment_Date, Material_amount, Amount, Created_by, Created_Datetime)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenant_id,
          branch_id,
          Project_id,
          Material_Name,
          Supplier_name,
          Payment_Date,
          payAmount,
          Amount,
          username,
          currentDate,
        ]
      );
      console.log(`✅ Payment processed for Order ${Order_id}`);
    }
    return { success: true, message: "Payments processed successfully" };
  } catch (err) {
    console.error("❌ materialPaymentSelected Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to process payments", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

module.exports = exports;
