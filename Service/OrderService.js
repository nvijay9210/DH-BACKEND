const { pool } = require("../config/db");
const { deleteFile } = require("../utils/UploadFile");

exports.order = async (orders) => {
  if (!orders || orders.length === 0) {
    console.error("No orders found in the request");
    return res.status(400).json({ error: "No orders found in the request" });
  }
  // Insert each order into Order_Details table along with Project_id and Project_name
  const insertQuery =
    "INSERT INTO Order_Details (Project_id, Project_name, Material_Name, Quantity, Unit, Order_date, Delivery_Date, Supplier_name, Supplier_Contact, Rate, Amount, Payment_Date,Paid,Balance,Status, Created_by, CREATED_DATETIME) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  const selectQuery = "SELECT * FROM material_stock_list WHERE Project_id = ? ";
  const updateQuery =
    "UPDATE material_stock_list SET Stock_List = ?  WHERE Project_id = ? AND Material_List = ?";

  try {
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

      // Insert order into Order_Details table
      await pool.query(insertQuery, [
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
        username, // Insert the username into Created_by column
        datetime, // Insert the current datetime into CREATED_DATETIME column
      ]);

      // Check if material exists in material_stock_list
      const result = await pool.query(selectQuery, [Project_id]);
      if (result.length > 0) {
        // Update material stock quantity
        const existingStock = result.find(
          (item) => item.Material_List === Material_Name
        );
        if (existingStock) {
          const updatedStock =
            Number(existingStock.Stock_List) + Number(Quantity);
          await pool.query(updateQuery, [
            updatedStock,
            Project_id,
            Material_Name,
          ]);
        } else {
          // Insert new material into material_stock_list
          await pool.query(
            "INSERT INTO material_stock_list (Project_id, Project_name, Pro_Date, Material_List, Stock_List) VALUES (?, ?, ?, ?, ?)",
            [Project_id, Project_name, Order_date, Material_Name, Quantity]
          );
        }
      } else {
        // Insert new material into material_stock_list
        await pool.query(
          "INSERT INTO material_stock_list (Project_id, Project_name, Pro_Date, Material_List, Stock_List) VALUES (?, ?, ?, ?, ?)",
          [Project_id, Project_name, Order_date, Material_Name, Quantity]
        );
      }
    }
    console.log("Orders saved to database");
    // Respond with success message
    return "Orders saved to database";
  } catch (error) {
    console.error("Error saving orders to database:", error.message);
    return { error: "Error saving orders to database" };
  }
};
exports.updateOrder = async (orders) => {
  const convert = (str) => {
    var date = new Date(str),
      mnth = ("0" + (date.getMonth() + 1)).slice(-2),
      day = ("0" + date.getDate()).slice(-2);
    return [date.getFullYear(), mnth, day].join("-");
  };

  // Check if orders is an array
  if (!Array.isArray(orders)) {
    return { error: "Orders must be an array" };
  }

  // Insert each order into Order_Details table along with Project_id and Project_name
  const updateQuery =
    "UPDATE Order_Details SET Material_Name=?, Quantity=?, Unit=?, Order_date=?, Delivery_Date=?, Supplier_name=?, Supplier_Contact=?, Rate=?, Amount=?, Payment_Date=?,Paid = ?,Balance = ?,Status =?, LAST_UPDATED_BY=?, LAST_UPDATED_DATETIME=? WHERE Order_id =?";
  const selectQuery =
    "Select Stock_List from material_stock_list where Project_id= ? and Material_List=?";
  const updateStock =
    "Update material_stock_list set Stock_List =? where Project_id= ? and Material_List=?";
  const selectOrder =
    "Select Quantity from order_details where Order_id =? and Material_Name =?";

  // Iterate over each order and execute the update query
  orders.forEach(async (order) => {
    const {
      Project_id,
      Project_name,
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
    } = order;

    try {
      const StockResult = await pool
        .query(selectQuery, [Project_id, Material_Name])
        .catch((err) => console.log(err));
      const Stock = StockResult[0].Stock_List;
      console.log(Stock);
      const orderResult = await pool
        .query(selectOrder, [Order_id, Material_Name])
        .catch((err) => console.log(err));
      const orderStock = orderResult[0].Quantity;
      console.log(orderStock);
      if (orderStock > Quantity) {
        const final =
          Number(Stock) - Number(Number(orderStock) - Number(Quantity));
        await pool.query(updateStock, [final, Project_id, Material_Name]);
      }
      if (orderStock < Quantity) {
        const final =
          Number(Number(Quantity) - Number(orderStock)) + Number(Stock);
        await pool.query(updateStock, [final, Project_id, Material_Name]);
      }
      await pool.query(updateQuery, [
        Material_Name,
        Quantity,
        Unit,
        order.Order_date,
        order.Delivery_Date,
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
      ]);

      console.log("Order updated in database");
    } catch (error) {
      console.error("Error updating order:", error.message);
      return { error: "Error updating order" };
    }
  });

  // Respond with success message
  return "Orders updated in database";
};
exports.orderDelete = async (Details) => {
  console.log(Details);
  const row = await pool
    .query("Delete from order_details where Project_id = ? and Order_id=?;", [
      Details.Project_id,
      Details.Order_id,
    ])
    .catch((err) => console.log(err));
  const select = await pool.query(
    "Select Stock_List from material_stock_list where Project_id =? AND Material_List =?",
    [Details.Project_id, Details.Material_Name]
  );
  const update = await pool.query(
    "Update material_stock_list set Stock_List = ? where Project_id =? AND Material_List =?",
    [
      Number(select[0].Stock_List) - Number(Details.Quantity),
      Details.Project_id,
      Details.Material_Name,
    ]
  );
  console.log(row);
  console.log(select);
  console.log(update);
  return "success";
};
exports.fetchOrderUpdate = async (Details) => {
  console.log(Details);
  const orders = await pool
    .query(
      "SELECT * FROM order_details WHERE Project_id = ? AND (Order_date BETWEEN ? AND ?) Order By Order_date",
      [Details.Id, Details.start_date, Details.end_date]
    )
    .catch((err) => console.log(err));
  return orders;
};
exports.orderReports = async (Details) => {
  const orders = await pool
    .query(
      "select * from order_details where (Project_id = ?) and (Order_date BETWEEN ? AND ?) Order By Order_date;",
      [Details.Id, Details.Start, Details.End]
    )
    .catch((err) => console.log(err));
  //console.log(orders)
  return orders;
};
exports.materialPaymentSelected = async (payments) => {
  try {
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

      // Get current order record
      const rows = await pool.query(
        "SELECT Amount, Paid, Balance FROM order_details WHERE Order_id = ?",
        [Order_id]
      );

      if (rows.length === 0) continue;

      const { Amount, Paid, Balance } = rows[0];

      if (PayAmount > Balance) {
        return res.status(400).json({ error: "Pay amount exceeds balance" });
      }

      const newPaid = Number(Paid) + Number(PayAmount);
      const newBalance = Number(Amount) - newPaid;
      const newStatus = newBalance === 0 ? "Paid" : "Partial";

      // ✅ Update order_details
      await pool.query(
        `UPDATE order_details 
         SET Paid = ?, Balance = ?, Status = ?, Payment_Date = ?
         WHERE Order_id = ?`,
        [newPaid, newBalance, newStatus, Payment_Date, Order_id]
      );

      // ✅ Insert into material_payments
      await pool.query(
        `INSERT INTO material_payments 
         (Project_id, Material_name, Supplier_name, Payment_Date, Material_amount, Amount, Created_by, Created_Datetime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Project_id,
          Material_Name,
          Supplier_name,
          Payment_Date,
          PayAmount,
          Amount,
          username,
          currentDate,
        ]
      );
    }

    return "Added";
  } catch (err) {
    console.error("MaterialPaymentSelected error:", err);
    return { error: "Internal server error" };
  }
};
