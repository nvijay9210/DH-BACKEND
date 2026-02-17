const { pool } = require("../config/db");
const { deleteFile } = require("../utils/UploadFile");

exports.materialList = async (Material) => {
  try {
    const result = await pool.query(
      "insert into mas_material_list (Material_name,Created_by,created_datetime) values(?,?,?)",
      [Material.Material_name, Material.username, Material.createdDate]
    );
    console.log(result);
    console.log("Form data saved to database");
    return "Form data saved to database";
  } catch (err) {
    console.log(err);
  }
};
exports.materialUsed = async (Mat_Used) => {
  try {
    const selectQuery =
      "select Stock_List from material_stock_list where Project_id =?  and Material_List = ? ; ";
    const updateQuery =
      "Update material_stock_list set Stock_List= ? where Project_id =? and Material_List =? ";
    const insertQuery =
      "insert into materials_used(Project_id , Project_name , Date , Material_List , Material_Used,Created_by,CREATED_DATETIME) values (?,?,?,?,?,?,?)";

    Mat_Used.forEach(async (details) => {
      const {
        Project_id,
        Project_name,
        date,
        Material,
        Used,
        username,
        createdDate,
      } = details;

      try {
        const Result = await pool.query(selectQuery, [Project_id, Material]);
        const Stock = Result[0].Stock_List;
        await pool.query(insertQuery, [
          Project_id,
          Project_name,
          date,
          Material,
          Used,
          username,
          createdDate,
        ]);
        await pool.query(updateQuery, [Stock - Used, Project_id, Material]);
        console.log("details saved to database");
        return "details saved to database";
      } catch (error) {
        console.error("Error saving details to database:", error.message);
        return { error: "Error saving details to database" };
      }
    });
  } catch (err) {
    console.log("Connection Failed", err);
  }
};
exports.EditMaterialUsed = async (Mat_Used) => {
  const convert = (str) => {
    var date = new Date(str),
      mnth = ("0" + (date.getMonth() + 1)).slice(-2),
      day = ("0" + date.getDate()).slice(-2);
    return [date.getFullYear(), mnth, day].join("-");
  };

  try {
    const selectusedQuery =
      "select Material_Used from materials_used where Project_id =? and Material_List = ? and DATE=?; ";
    const selectstockQuery =
      "select Stock_List from material_stock_list where Project_id =? and Material_List = ? ; ";
    const stockupdateQuery =
      "Update material_stock_list set Stock_List= ?  where Project_id =? and Material_List =? ";
    const usedupdateQuery =
      "Update materials_used set Material_Used =?,LAST_UPDATED_BY=?,LAST_UPDATED_DATETIME =? where Project_id =? and Material_List =? and DATE =? ";

    Mat_Used.forEach(async (details) => {
      const {
        Project_id,
        Project_name,
        DATE,
        Material_List,
        Material_Used,
        username,
        currentDate,
      } = details;

      try {
        const alreadyused = await pool.query(selectusedQuery, [
          Project_id,
          Material_List,
          convert(DATE),
        ]);
        const alreadyusedStock = alreadyused[0].Material_Used;
        console.log(alreadyusedStock);
        const stockResult = await pool.query(selectstockQuery, [
          Project_id,
          Material_List,
        ]);
        const Stock = stockResult[0].Stock_List;
        console.log(Number(Stock));
        console.log(Number(Material_Used));
        if (alreadyusedStock > Material_Used) {
          await pool
            .query(usedupdateQuery, [
              Material_Used,
              username,
              convert(currentDate),
              Project_id,
              Material_List,
              convert(DATE),
            ])
            .then((res) => console.log("1 - usedupdate", res))
            .catch((err) => console.log(err));
          const Result =
            Number(Stock) + (Number(alreadyusedStock) - Number(Material_Used));
          await pool
            .query(stockupdateQuery, [Result, Project_id, Material_List])
            .then((res) => console.log("1 - stockupdate", res))
            .catch((err) => console.log(err));
        }
        if (alreadyusedStock < Material_Used) {
          await pool
            .query(usedupdateQuery, [
              Material_Used,
              username,
              convert(currentDate),
              Project_id,
              Material_List,
              convert(DATE),
            ])
            .then((res) => console.log("2 -usedupdate", res))
            .catch((err) => console.log(err));
          const Result =
            Number(Stock) - (Number(Material_Used) - Number(alreadyusedStock));
          await pool
            .query(stockupdateQuery, [Result, Project_id, Material_List])
            .then((res) => console.log("2 - stockupdate", res))
            .catch((err) => console.log(err));
        }
        console.log("details saved to database");
      } catch (error) {
        console.error("Error saving details to database:", error.message);
        return { error: "Error saving details to database" };
      }
    });
  } catch (err) {
    console.log("Connection Failed", err);
  }
  return { msg: "details saved to database" };
};
exports.measurementDetails = async (material_report) => {
  const convert = (str) => {
    var date = new Date(str),
      mnth = ("0" + (date.getMonth() + 1)).slice(-2),
      day = ("0" + date.getDate()).slice(-2);
    return [date.getFullYear(), mnth, day].join("-");
  };
  if (!material_report || material_report.length === 0) {
    console.error("No details found in the request");
    return { error: "No details found in the request" };
  }
  try {
    const {
      Project_id,
      Project_name,
      Date,
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
      Photos,
      Paid,
      Balance,
      Status,
      username,
      currentDate,
    } = req.body;

    // Construct file path for the database (relative to the images folder)
    const photoPath = req.file ? path.join("images", req.file.filename) : null;

    // Insert measurement details into the database
    await pool.query(
      "INSERT INTO daily_process_details (Project_id, Project_name, DATE, Measurement,Units, Nos,Length, Breadth, D_H, Quantity, Rate, Amount, Remarks, Photos,Paid,Balance,Status, CREATED_BY, CREATED_DATETIME) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        Project_id,
        Project_name,
        Date,
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
        username,
        convert(currentDate),
      ]
    );

    console.log("Measurement details inserted successfully");
    return "Measurement details inserted successfully";
  } catch (error) {
    console.error("Error:", error);
    return "Internal server error";
  }
};
exports.updateMaterial = async (materialUpdates) => {
  const convert = (str)=> {
        var date = new Date(str),
          mnth = ("0" + (date.getMonth() + 1)).slice(-2),
          day = ("0" + date.getDate()).slice(-2);
        return [date.getFullYear(), mnth, day].join("-");
      }
    
    // Check if materialUpdates is an array
    if (!Array.isArray(materialUpdates)) {
        return res.status(400).json({ error: 'Material updates must be an array' });
    }

    // Iterate over each update and execute the necessary database operations
    for (const update of materialUpdates) {
        // Extract relevant data from the update object
        const { username, currentDate, ...materialUpdate } = update;

        // Convert DATE to MySQL datetime format
        materialUpdate.DATE = convert(materialUpdate.DATE);
        materialUpdate.LAST_UPDATED_DATETIME = convert(materialUpdate.LAST_UPDATED_DATETIME);
        // Construct the update query
        const updateQuery = `
            UPDATE daily_process_details 
            SET 
                Project_id = ?, 
                Project_name = ?, 
                Date = ?, 
                Measurement = ?,
                Units = ?, 
                Nos = ?, 
                Length = ?, 
                Breadth = ?, 
                D_H = ?, 
                Quantity = ?, 
                Rate = ?, 
                Amount = ?, 
                Remarks = ?, 
                Paid = ?,
                Balance = ?,
                Status =?,
                LAST_UPDATED_BY = ?, 
                LAST_UPDATED_DATETIME = ? 
            WHERE 
                Dailyprocess_id = ?
        `;

        // Extract necessary data from materialUpdate
        const { Project_id, Project_name, DATE, Measurement,Units, Nos, Length, breadth, D_H, Quantity, Rate, Amount, Remarks,Paid,Balance,Status,LAST_UPDATED_BY,LAST_UPDATED_DATETIME, Dailyprocess_id } = materialUpdate;

        try {
            // Execute the update query
            await pool.query(updateQuery, [
                Project_id,
                Project_name,
                DATE,
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
                LAST_UPDATED_BY,
                LAST_UPDATED_DATETIME, // Using only date portion
                Dailyprocess_id
            ]);
            console.log('Details saved to the database');
            return ('Details saved to the database');
        } catch (error) {
            console.error('Error saving details to the database:', error.message);
            return ({ error: 'Error saving details to the database' });
        }
    }
};
exports.fetchMaterialUpdate = async (Details) => {
     const material = await pool.query("select * from daily_process_details where Project_id = ? and Date =?;",[Details.Id,Details.date]).catch(err=>console.log(err))
            console.log(material)
            return (material);
};
exports.fetchMaterialUsed = async (Details) => {
        const material = await pool.query("select * from materials_used where Project_id = ? and Date =?;",[Details.Id,Details.date]).catch(err=>console.log(err))
            console.log(material)
            return (material);
};
exports.fetchMaterial = async (Details) => {
     try{
    const rows = await pool.query("Select * from mas_material_list");
      return(rows)    
      }
      catch(err ) {
          console.log("Connection Failed",err)
      } 
};
exports.materialDelete = async (Details) => {
 console.log(Details);
        const row = await pool.query("Delete from mas_material_list where id=?;",[Number(Details.id)]).catch(err=>console.log(err))
            console.log(row)
            return ("success");
};
exports.materialPaymentReports = async (Details) => {
        const orders = await pool.query("select Supplier_name,Payment_Date,Amount from material_payments where (Project_id = ?) and (Payment_Date BETWEEN ? AND ?) Order By Payment_Date;",[Details.Id,Details.Start,Details.End]).catch(err=>console.log(err))
            //console.log(orders)
            return(orders);
};
exports.stockList = async (project) => {
    try{
    const rows = await pool.query("Select * from material_stock_list where Project_id = ? ",[project.pro_id]);
    res.send(rows) ;  
    }catch(err ) {
        console.log("Connection Failed",err)
    } 
};
exports.measurementDelete = async (Details) => {
        const row = await pool.query("Delete from daily_process_details where Project_id = ? and Dailyprocess_id=?;",[Details.Project_id,Details.Dailyprocess_id]).catch(err=>console.log(err))
            console.log(row)
            return("success");
};
exports.measurementReports = async (Details) => {
     
        //console.log(req.body);
        const material = await pool.query("select * from daily_process_details where (Project_id = ?) and (Date BETWEEN ? AND ?) Order By Date;",[Details.Id,Details.Start,Details.End]).catch(err=>console.log(err))
        console.log(material)
        return(material);
};
exports.overAllReports = async (Details) => {
    const orders = await pool.query('select DATE ,contractor," " as site_location, total as total,paid as paid,balance as balance,STATUS FROM labour_worked_details WHERE Project_id = ? and  DATE BETWEEN ? AND ?  union all SELECT order_date,supplier_name,material_name,amount,paid,balance ,status from order_details where project_id= ? and order_date BETWEEN ? AND ? order by date;',[Details.Id,Details.Start,Details.End,Details.Id,Details.Start,Details.End]).catch(err=>console.log(err))
            //console.log(orders)
            return(orders);
};
exports.reports = async (Details) => {
     try {
        const Details = req.body;
        //console.log(req.body);
        const orders = await pool.query("SELECT * FROM order_details WHERE (Project_id = ?) AND (Order_date BETWEEN ? AND ?) Order By Order_date;", [Details.Id, Details.Start, Details.End]).catch(err => console.log(err));
        const Labour = await pool.query("SELECT * FROM labour_worked_details WHERE (Project_id = ?) AND (Date BETWEEN ? AND ?) Order By Date;", [Details.Id, Details.Start, Details.End]).catch(err => console.log(err));
        console.log(orders, Labour)
        const detail = {
            order: orders,
            labour: Labour
        };
        return(detail);
    } catch (error) {
        console.error(error);
       return({ error: "Internal server error" });
    }
};
exports.deleteMaterial = async (Details) => {
      const materialName = Details.materialName;
    pool.query("DELETE FROM mas_material_list WHERE Material_name = ?", [materialName], (err, result) => {
        if (err) {
            console.error("Error deleting material from database: ", err);
            res.status(500).send('Error deleting material from database');
            return;
        }
        console.log("Material deleted from database");
        return({ message: 'Material deleted successfully' });
    });
};
