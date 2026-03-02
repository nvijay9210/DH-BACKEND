const { pool } = require("../config/db");
const { deleteFile } = require("../utils/UploadFile");

/* ===============================
   Order - Insert Multiple + Stock Update
=================================*/
exports.order = async (orders, tenant_id, branch_id) => {
  let conn;
  try {
    if (!orders || orders.length === 0) {
      throw new Error("No orders found in the request");
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
        Project_id, Project_name, Material_Name, Quantity, Unit,
        Order_date, Delivery_Date, Supplier_name, Supplier_Contact,
        Rate, Amount, Payment_Date, Paid, Balance, Status,
        username, datetime
      } = order;

      // Insert order into Order_Details
      await conn.query(insertQuery, [
        tenant_id, branch_id, Project_id, Project_name, Material_Name, Quantity, Unit,
        Order_date, Delivery_Date, Supplier_name, Supplier_Contact, Rate, Amount,
        Payment_Date, Paid, Balance, Status, username, datetime
      ]);

      // Check if material exists in stock
      const stockResult = await conn.query(selectQuery, [Project_id, tenant_id, branch_id]);
      const stockRows = stockResult[0];
      
      const existingStock = stockRows.find(item => item.Material_List === Material_Name);
      
      if (existingStock) {
        // Update existing stock
        const updatedStock = Number(existingStock.Stock_List) + Number(Quantity);
        await conn.query(updateQuery, [
          updatedStock, Project_id, Material_Name, tenant_id, branch_id
        ]);
      } else {
        // Insert new stock entry
        await conn.query(insertStockQuery, [
          tenant_id, branch_id, Project_id, Project_name, Order_date, Material_Name, Quantity
        ]);
      }
    }
    
    console.log("✅ Orders saved to database");
    return { success: true, message: "Orders saved to database" };
    
  } catch (error) {
    console.error("❌ order Error:", error);
    throw error;
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
      throw new Error("Orders must be a non-empty array");
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
        Project_id, Material_Name, Quantity, Unit, Supplier_name,
        Supplier_Contact, Rate, Amount, Payment_Date, Paid, Balance,
        Status, Order_id, LAST_UPDATED_BY, LAST_UPDATED_DATETIME
      } = order;

      // Get current stock
      const stockResult = await conn.query(selectQuery, [
        Project_id, Material_Name, tenant_id, branch_id
      ]);
      const stockRows = stockResult[0];
      
      if (!stockRows || stockRows.length === 0) {
        throw new Error(`Stock not found for Project ${Project_id}, Material ${Material_Name}`);
      }
      const Stock = Number(stockRows[0].Stock_List);

      // Get original order quantity
      const orderResult = await conn.query(selectOrderQuery, [
        Order_id, Material_Name, tenant_id, branch_id
      ]);
      const orderRows = orderResult[0];
      
      if (!orderRows || orderRows.length === 0) {
        throw new Error(`Order not found: ${Order_id}`);
      }
      const orderStock = Number(orderRows[0].Quantity);
      const newQuantity = Number(Quantity);

      // Calculate stock adjustment
      let finalStock;
      if (orderStock > newQuantity) {
        // Reduced quantity → add back to stock
        finalStock = Stock - (orderStock - newQuantity);
      } else if (orderStock < newQuantity) {
        // Increased quantity → deduct from stock
        finalStock = Stock + (newQuantity - orderStock);
      } else {
        finalStock = Stock; // No change
      }

      // Update stock first
      await conn.query(updateStockQuery, [
        finalStock, Project_id, Material_Name, tenant_id, branch_id
      ]);

      // Update order details
      await conn.query(updateQuery, [
        Material_Name, Quantity, Unit, order.Order_date, order.Delivery_Date,
        Supplier_name, Supplier_Contact, Rate, Amount,
        Payment_Date != null ? convert(Payment_Date) : null,
        Paid, Balance, Status, LAST_UPDATED_BY, LAST_UPDATED_DATETIME,
        Order_id, tenant_id, branch_id
      ]);

      console.log(`✅ Order updated: ID ${Order_id}`);
    }
    
    return { success: true, message: "Orders updated in database" };
    
  } catch (error) {
    console.error("❌ updateOrder Error:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Delete Order + Revert Stock
=================================*/
exports.orderDelete = async (Details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Start transaction for atomic delete + stock revert
    await conn.beginTransaction();
    
    try {
      // Delete the order
      const deleteResult = await conn.query(
        `DELETE FROM order_details 
         WHERE Project_id = ? AND Order_id = ? AND tenant_id = ? AND branch_id = ?`,
        [Details.Project_id, Details.Order_id, tenant_id, branch_id]
      );
      
      if (deleteResult[0].affectedRows === 0) {
        throw new Error("Order not found or access denied");
      }
      
      // Get deleted order quantity for stock revert
      const quantity = Number(Details.Quantity);
      
      // Revert stock
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
          [newStock, Details.Project_id, Details.Material_Name, tenant_id, branch_id]
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
    throw error;
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
    
    return result[0];
    
  } catch (err) {
    console.error("❌ fetchOrderUpdate Error:", err);
    throw err;
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
    throw err;
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
      throw new Error("No payments provided");
    }

    conn = await pool.getConnection();
    
    for (const item of payments) {
      const {
        Order_id, Project_id, Material_Name, Supplier_name,
        PayAmount, Payment_Date, username, currentDate
      } = item;

      // Get current order record (with tenant filter)
      const orderResult = await conn.query(
        `SELECT Amount, Paid, Balance FROM order_details 
         WHERE Order_id = ? AND tenant_id = ? AND branch_id = ?`,
        [Order_id, tenant_id, branch_id]
      );
      
      const orderRows = orderResult[0];
      if (orderRows.length === 0) {
        throw new Error(`Order not found: ${Order_id}`);
      }
      
      const { Amount, Paid, Balance } = orderRows[0];
      const payAmount = Number(PayAmount);
      const balance = Number(Balance);

      if (payAmount > balance) {
        throw new Error("Pay amount exceeds balance");
      }

      const newPaid = Number(Paid) + payAmount;
      const newBalance = Number(Amount) - newPaid;
      const newStatus = newBalance === 0 ? "Paid" : "Partial";

      // Update order_details
      await conn.query(
        `UPDATE order_details 
         SET Paid = ?, Balance = ?, Status = ?, Payment_Date = ?
         WHERE Order_id = ? AND tenant_id = ? AND branch_id = ?`,
        [newPaid, newBalance, newStatus, Payment_Date, Order_id, tenant_id, branch_id]
      );

      // Insert into material_payments (with tenant/branch)
      await conn.query(
        `INSERT INTO material_payments 
         (tenant_id, branch_id, Project_id, Material_name, Supplier_name, 
          Payment_Date, Material_amount, Amount, Created_by, Created_Datetime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenant_id, branch_id, Project_id, Material_Name, Supplier_name,
          Payment_Date, payAmount, Amount, username, currentDate
        ]
      );
      
      console.log(`✅ Payment processed for Order ${Order_id}`);
    }

    return { success: true, message: "Payments processed successfully" };
    
  } catch (err) {
    console.error("❌ materialPaymentSelected Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};