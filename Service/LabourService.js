const { pool } = require("../config/db");
const { deleteFile } = require("../utils/UploadFile");

exports.labourDetails = async (Order) => {
  // Check if Order is defined and has data
  if (!Order || Order.length === 0) {
    console.error("No details found in the request");
    return res.status(400).json({ error: "No details found in the request" });
  }
  // Insert each record into the database
  const insertQuery =
    "INSERT INTO labour_worked_details (Project_id, Project_name, Date,Contractor, Labour_types, No_Of_Persons, Salary, Ratio, Total, Site_supervisor, Payment_Date,Paid,Balance,Status, CREATED_BY, CREATED_DATETIME) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

  Order.forEach(async (details) => {
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

    try {
      await pool.query(insertQuery, [
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
      console.log("Details saved to the database");
    } catch (error) {
      console.error("Error saving details to database:", error.message);
      return res
        .status(500)
        .json({ error: "Error saving details to database" });
    }
  });
  // Respond with success message
  return("Details saved to the database");
};
exports.updateLabour = async (details) => {
  const { username, currentDate, LabourUpdate } = details; // Destructure username, currentDate, and LabourUpdate from the request body
  console.log("Received request:", LabourUpdate);
  const updateQuery =
    "UPDATE labour_worked_details SET Project_id =?, Project_name =?, DATE =?, Contractor=?, Labour_types =?, No_Of_Persons =?,  Salary =?, Ratio =?, Total =?, Site_supervisor =?, Payment_Date=?,Paid =?,Balance=?,Status=?, LAST_UPDATED_BY =?, LAST_UPDATED_DATETIME =? WHERE Labour_id =?";

  const convert = (str) => {
    var date = new Date(str),
      mnth = ("0" + (date.getMonth() + 1)).slice(-2),
      day = ("0" + date.getDate()).slice(-2);
    return [date.getFullYear(), mnth, day].join("-");
  };

  LabourUpdate.forEach(async (order) => {
    // Change 'labour' to 'LabourUpdate' here
    const date = convert(order.DATE);
    console.log(date);
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
      Paid,
      Balance,
      Status,
      Labour_id,
    } = order;

    try {
      const username = req.body.username;
      const currentDate = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " "); // Format date to 'YYYY-MM-DD HH:MM:SS'
      await pool.query(updateQuery, [
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
        currentDate,
        Labour_id,
      ]);
      console.log("Order update to database");
    } catch (error) {
      console.error("Error saving order to database:", error.message);
        return({ error: "Error saving order to database" });
    }
  });
  return("Orders saved to database");
};
exports.fetchLabourUpdate = async (Details) => {
  const row = await pool
    .query(
      "Delete from labour_worked_details where Project_id = ? and Labour_id=?;",
      [Details.Project_id, Details.Labour_id]
    )
    .catch((err) => console.log(err));
  console.log(row);
  return("success");
};
exports.labourDelete = async (Details) => {
  try {
    const labour = await pool.query(
      "SELECT * FROM labour_worked_details WHERE Project_id = ? AND Date = ?;",
      [Details.Id, Details.date]
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
    return(labourWithConvertedBigInt);
  } catch (error) {
    console.error(error);
    return({ error: "Internal server error" });
  }
};
exports.labourReports = async (Details) => {
   try {
        //console.log(req.body);
        const material = await pool.query(
  `SELECT * 
   FROM labour_worked_details 
   WHERE (Project_id = ?) 
     AND (Date BETWEEN ? AND ?)
   ORDER BY Labour_id, Date;`,
  [Details.Id, Details.Start, Details.End]
).catch(err => console.log(err));

        
        // Convert BigInt values to strings or numbers
        const materialWithConvertedBigInt = material.map(row => {
            return {
                ...row,
                Salary: row.Salary.toString(), // Convert Salary to string
                Total: row.Total.toString(), // Convert Total to string
            };
        });
        console.log(materialWithConvertedBigInt);
        return(materialWithConvertedBigInt);
    } catch (error) {
        console.error(error);
        return({ error: "Internal server error" });
    }
};
exports.labourPayment = async (Details) => {
   if(Details.contractor == "null"){
    try {
        //console.log(req.body);
        const material = await pool.query('SELECT * FROM labour_worked_details WHERE (Project_id = ?) AND (STATUS <>"Paid") AND (Date BETWEEN ? AND ?) Order By Date ASC ;', [Details.Id, Details.Start, Details.End]).catch(err => console.log(err));
        
        // Convert BigInt values to strings or numbers
        const materialWithConvertedBigInt = material.map(row => {
            return {
                ...row,
                Salary: row.Salary.toString(), // Convert Salary to string
                Total: row.Total.toString(), // Convert Total to string
            };
        });
        console.log(materialWithConvertedBigInt);
        return(materialWithConvertedBigInt);
    } catch (error) {
        console.error(error);
        return({ error: "Internal server error" });
    }
    }
    else{
        try {
            //console.log(req.body);
            const material = await pool.query('SELECT * FROM labour_worked_details WHERE (Project_id = ?) AND (STATUS <>"Paid") AND (Contractor = ?) AND (Date BETWEEN ? AND ?) Order By Date And Status != "Paid";', [Details.Id,Details.contractor, Details.Start, Details.End]).catch(err => console.log(err));
            
            // Convert BigInt values to strings or numbers
            const materialWithConvertedBigInt = material.map(row => {
                return {
                    ...row,
                    Salary: row.Salary.toString(), // Convert Salary to string
                    Total: row.Total.toString(), // Convert Total to string
                };
            });
            console.log(materialWithConvertedBigInt);
            return(materialWithConvertedBigInt);
        } catch (error) {
            console.error(error);
            return({ error: "Internal server error" });
        }
    }
};
exports.labourPaymentUpdate = async (Details) => {
   if(Details.contractor == "null"){
    try {
        const update = await pool.query('Update labour_worked_details set Paid=Total,Status="Paid",Balance=0,Payment_Date =? WHERE STATUS<>"Paid" and (Project_id = ?) AND (Date BETWEEN ? AND ?) Order By Date;',[Details.Payment_Date,Details.Id, Details.Start, Details.End] ).catch(err => console.log(err));
        res.sendStatus(200);
    }catch(err){
        console.error(err);
        return({ error: "Internal server error" });
    }
    }
    else{
        try {
            const update = await pool.query('Update labour_worked_details set Paid=Total,Status="Paid",Balance=0, Payment_Date =? WHERE STATUS<>"Paid" and (Project_id = ?) AND (Contractor = ?) AND (Date BETWEEN ? AND ?) Order By Date;',[Details.Payment_Date,Details.Id,Details.contractor, Details.Start, Details.End] ).catch(err => console.log(err));
            res.sendStatus(200);
        }catch(err){
            console.error(err);
            return({ error: "Internal server error" });
        }
    }
};
exports.allLabourPaymentUpdate = async (Details) => {
   if(Details.contractor == "null"){
    try {
        const update = await pool.query('Update labour_worked_details set Paid=Total,Status="Paid",Balance=0,Payment_Date =? WHERE STATUS <>"Paid" and (Date BETWEEN ? AND ?) Order By Date;',[Details.Payment_Date, Details.Start, Details.End] ).catch(err => console.log(err));
        res.sendStatus(200);
    }catch(err){
        console.error(err);
        return({ error: "Internal server error" });
    }
    }
    else{
        try {
        const update = await pool.query('Update labour_worked_details set Paid=Total,Status="Paid",Balance=0,Payment_Date=? WHERE STATUS <>"Paid" and (Contractor = ?) AND (Date BETWEEN ? AND ?) Order By Date;',[Details.Payment_Date,Details.contractor, Details.Start, Details.End] ).catch(err => console.log(err));
        res.sendStatus(200);
        }catch(err){
            console.error(err);
            return({ error: "Internal server error" });
        }
    }
};
exports.allLabourPayment = async (Details) => {
  if(Details.contractor == "null"){
    try {
        //console.log(req.body);
        const material = await pool.query('SELECT * FROM labour_worked_details WHERE STATUS <>"Paid" AND (Date BETWEEN ? AND ?) Order By Date ;', [ Details.Start, Details.End]).catch(err => console.log(err));
        
        // Convert BigInt values to strings or numbers
        const materialWithConvertedBigInt = material.map(row => {
            return {
                ...row,
                Salary: row.Salary.toString(), // Convert Salary to string
                Total: row.Total.toString(), // Convert Total to string
            };
        });
        console.log(materialWithConvertedBigInt);
        return(materialWithConvertedBigInt);
    } catch (error) {
        console.error(error);
        return({ error: "Internal server error" });
    }
    }
    else{
        try {
            //console.log(req.body);
            const material = await pool.query('SELECT * FROM labour_worked_details WHERE STATUS <>"Paid" AND (Contractor = ?) AND (Date BETWEEN ? AND ?) Order By Date ;', [Details.contractor, Details.Start, Details.End]).catch(err => console.log(err));
            
            // Convert BigInt values to strings or numbers
            const materialWithConvertedBigInt = material.map(row => {
                return {
                    ...row,
                    Salary: row.Salary.toString(), // Convert Salary to string
                    Total: row.Total.toString(), // Convert Total to string
                };
            });
            console.log(materialWithConvertedBigInt);
            return(materialWithConvertedBigInt);
        } catch (error) {
            console.error(error);
            return({ error: "Internal server error" });
        }
    }
};
exports.fetchContractorPay = async () => {
     const material = await pool.query('select Contractor , Balance from labour_worked_details where STATUS <>"Paid";').catch(err=>console.log(err))
            console.log(material)
            return(material);
};
