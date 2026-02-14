const { pool } = require("../config/db");
const { deleteFile } = require("../utils/UploadFile");

exports.newPayment = async (details) => {
    console.log(details);
    details.forEach(async (order) => { 
        const { Project_id, Pay_Date,Amount,username,datetime } = order;

    try{
       const result = await pool.query("Insert into payment_details (Payment_date,Project_id,Amount,Created_by,Created_datetime) values (?,?,?,?,?);",[Pay_Date,Project_id,Number(Amount),username,datetime])
        .catch( (err)=>console.log(err));
        return('Payment saved to database');
    }catch(err){
        console.error(err);
        res.status(500);
    }
})
};

exports.fetchPaymentUpdate = async (details) => {
    try{
        const row = await pool.query("select * from payment_details where Payment_date = ? and Project_id =? ;",[details.date,details.Id])
        .catch( (err)=>console.log(err));
        return(row);
    }catch(err){
        console.error(err);
        res.status(500);
    }
}
exports.updatePaymentDetails = async (details) => {
     const convert = (str)=> {
        var date = new Date(str),
          mnth = ("0" + (date.getMonth() + 1)).slice(-2),
          day = ("0" + date.getDate()).slice(-2);
        return [date.getFullYear(), mnth, day].join("-");
      }
    details.forEach(async (order) => { 
        const {Payment_id, Project_id ,Payment_date,Amount,updated_by,update_date } = order;

    try{
        await pool.query("update payment_details set Payment_date = ?,Amount =?,Updated_by =?,Updated_datetime =? where Project_id =? and Payment_id = ?;",[convert(Payment_date),Number(Amount),updated_by,update_date,Project_id,Payment_id])
        .catch( (err)=>console.log(err));
       // return('Orders saved to database');
    }catch(err){
        console.error(err);
        res.status(500);
    }
})
return('Orders saved to database');
}
exports.projectPaymentDelete = async (Details) => {
      const row = await pool.query("Delete from payment_details where Project_id = ? and Payment_id=?;",[Details.Project_id,Details.Payment_id]).catch(err=>console.log(err))
            console.log(row)
            return("success");
}
exports.clientPaymentReport = async (Details) => {
  try {
        console.log('Request Body:', Details);

        // Run the query
        const material = await pool.query(
            'SELECT * FROM payment_details WHERE (Project_id = ?) AND (payment_date BETWEEN ? AND ?) ORDER BY payment_date',
            [Details.Id, Details.Start, Details.End]
        ).catch(err => {
            console.log('Query error:', err);
            throw err;
        });

        // Log the result to verify if data was retrieved
        console.log('Query result:', material);

        // Send the result back as JSON
        return(material);
    } catch (error) {
        console.error('Error in /api/ClientPaymentReport:', error);
        return({ error: "Internal server error" });
    }
}
exports.materialPaymentsUpdate = async (Details) => {
  try {
        console.log('Request Body:', Details);

        // Run the query
        const material = await pool.query(
            'SELECT * FROM payment_details WHERE (Project_id = ?) AND (payment_date BETWEEN ? AND ?) ORDER BY payment_date',
            [Details.Id, Details.Start, Details.End]
        ).catch(err => {
            console.log('Query error:', err);
            throw err;
        });

        // Log the result to verify if data was retrieved
        console.log('Query result:', material);

        // Send the result back as JSON
        return(material);
    } catch (error) {
        console.error('Error in /api/ClientPaymentReport:', error);
        return({ error: "Internal server error" });
    }
}
exports.allMaterialPaymentUpdate = async (Details) => {
   try {
        const select = await pool.query('SELECT Project_id,Material_Name,CREATED_DATETIME,Supplier_name,Balance,Amount,Paid FROM order_details WHERE STATUS <>"Paid" AND (Supplier_name = ?) AND (Order_date BETWEEN ? AND ?) Order by CREATED_DATETIME;',[Details.Supplier, Details.Start, Details.End]).catch(err => console.log(err));
        for (const item of select) {
            if (Total <= item.Balance) {
                item.Balance = item.Balance - Total;
                if (item.Balance === 0) {
                    await pool.query('Update order_details set Paid=Amount,Status="Paid",Balance=0, Payment_Date =? WHERE STATUS<>"Paid" AND (Supplier_name = ?) and (Project_id=?) and (Material_Name = ?) AND (CREATED_DATETIME = ?);',
                    [Details.Payment_Date, Details.Supplier, item.Project_id, item.Material_Name, item.CREATED_DATETIME]).catch(err => console.log(err));
                    await pool.query('insert into material_payments (Project_id,Bill_no,Material_name,Supplier_name,Payment_Date,Material_amount,Amount,Created_by,Created_Datetime) values(?,?,?,?,?,?,?,?,?)',[item.Project_id,Details.Billno,item.Material_Name,Details.Supplier,Details.Payment_Date,Total,Details.Amount,Details.username,Details.currentDate]).catch(err => console.log(err));
                } else {
                    await pool.query('insert into material_payments (Project_id,Bill_no,Material_name,Supplier_name,Payment_Date,Material_amount,Amount,Created_by,Created_Datetime) values(?,?,?,?,?,?,?,?,?)',[item.Project_id,Details.Billno,item.Material_Name,Details.Supplier,Details.Payment_Date,Total,Details.Amount,Details.username,Details.currentDate]).catch(err => console.log(err));
                    await pool.query('Update order_details set Paid=?,Status="UnPaid",Balance=?, Payment_Date =? WHERE STATUS<>"Paid" AND (Supplier_name = ?) and (Project_id=?) and (Material_Name = ?) AND (CREATED_DATETIME = ?);',
                    [item.Amount - item.Balance, item.Balance, Details.Payment_Date, Details.Supplier, item.Project_id, item.Material_Name, item.CREATED_DATETIME]).catch(err => console.log(err));
                }
                Total = 0;
                break;
            } else {
                await pool.query('insert into material_payments(Project_id,Bill_no,Material_name,Supplier_name,Payment_Date,Material_amount,Amount,Created_by,Created_Datetime) values(?,?,?,?,?,?,?,?,?)',[item.Project_id,Details.Billno,item.Material_Name,Details.Supplier,Details.Payment_Date,item.Balance,Details.Amount,Details.username,Details.currentDate]).catch(err => console.log(err));
                await pool.query('Update order_details set Paid=Amount,Status="Paid",Balance=0, Payment_Date =? WHERE STATUS<>"Paid" AND (Supplier_name = ?) and (Project_id=?) and (Material_Name = ?) AND (CREATED_DATETIME = ?);',
                [Details.Payment_Date, Details.Supplier, item.Project_id, item.Material_Name, item.CREATED_DATETIME]).catch(err => console.log(err));
                Total = Total - item.Balance;
            }
        }
    
       /*
        select.map( async(item,i)=>{
            if(Total <= item.Balance){
                item.Balance = item.Balance - Total;
                if(item.Balance === 0){
                    await pool.query('Update order_details set Paid=Amount,Status="Paid",Balance=0, Payment_Date =? WHERE STATUS<>"Paid" AND (Supplier_name = ?) and (Project_id=?) and (Material_Name = ?) AND (CREATED_DATETIME = ?);',[Details.Payment_Date,Details.Supplier,item.Project_id,item.Material_Name,item.CREATED_DATETIME] ).catch(err => console.log(err));
                }else{
                    await pool.query('Update order_details set Paid=?,Status="UnPaid",Balance=?, Payment_Date =? WHERE STATUS<>"Paid" AND (Supplier_name = ?) and (Project_id=?) and (Material_Name = ?) AND (CREATED_DATETIME = ?);',[item.Amount - item.Balance,item.Balance,Details.Payment_Date,Details.Supplier,item.Project_id,item.Material_Name,item.CREATED_DATETIME] ).catch(err => console.log(err));
                }
                Total = 0;
            }else{
                await pool.query('Update order_details set Paid=Amount,Status="Paid",Balance=0, Payment_Date =? WHERE STATUS<>"Paid" AND (Supplier_name = ?) and (Project_id=?) and (Material_Name = ?) AND (CREATED_DATETIME = ?);',[Details.Payment_Date,Details.Supplier,item.Project_id,item.Material_Name,item.CREATED_DATETIME] ).catch(err => console.log(err));
                Total = Total - item.Amount;
              //  item.Amount = 0;
            }
        })*/
      //  const insert = await pool.query('insert into material_payments (Supplier_name,Payment_Date,Amount,Created_by,Created_Datetime) values(?,?,?,?,?)',[Details.Supplier,Details.Payment_Date,Details.Amount,Details.username,Details.currentDate]).catch(err => console.log(err));
      //  console.table(select);
      //  console.log(Total)
       // const update = await pool.query('Update order_details set Paid=Amount,Status="Paid",Balance=0, Payment_Date =? WHERE STATUS<>"Paid" AND (Supplier_name = ?) AND (Order_date BETWEEN ? AND ?);',[Details.Payment_Date,Details.Supplier, Details.Start, Details.End] ).catch(err => console.log(err));
      //  const insert = await pool.query('insert into material_payments (Supplier_name,Payment_Date,Amount,Created_by,Created_Datetime) values(?,?,?,?,?)',[Details.Supplier,Details.Payment_Date,Details.Amount,Details.username,Details.currentDate]).catch(err => console.log(err));
        res.sendStatus(200);
    }catch(err){
        console.error(err);
        return({ error: "Internal server error" });
    }
}
exports.deleteMaterialPayments = async (Details) => {
    try{
        const result = await pool.query('select * from material_payments where Bill_no =?',[Number(Details.Billno)]).catch(err => console.error(err));
        await pool.query('delete from material_payments where Bill_no =?',[Number(Details.Billno)]).catch(err => console.error(err));
        console.log(result);
        for (const item of result){
            const data = await pool.query('select Paid,Amount from order_details where Project_id =? and Material_Name =? and Supplier_Name =?',[item.Project_Id,item.Material_name,item.Supplier_name]).catch(err => console.error(err));
           // console.log("================================== >",data)
            await pool.query('update order_details set Paid = ? , Balance =?,Status = "UnPaid" where Project_id =? and Material_Name =? and Supplier_Name =?',[Number(data[0].Paid) - Number(item.Material_amount),Number(data[0].Amount) - (Number(data[0].Paid) - Number(item.Material_amount)),item.Project_Id,item.Material_name,item.Supplier_name]).catch(err => console.error(err));
        }
        return({result:"success"});
    }catch(err){
        console.error(err);
        return({ error: "Internal server error" });
    }
}
exports.materialsPaymentView = async (Details) => {
    console.log(Details);
    try{
        const result = await pool.query('select * from material_payments where Bill_no =?',[Number(Details.Billno)]).catch(err => console.error(err));
        return(result);
    }catch(err){
        console.error(err);
        return({ error: "Internal server error" });
    }
}
exports.allMaterialPayment = async (Details) => {
   if(Details.Supplier == "null"){
    try {
        //console.log(req.body);
        const material = await pool.query('SELECT * FROM order_details WHERE STATUS <>"Paid" AND (Order_date BETWEEN ? AND ?) ;', [ Details.Start, Details.End]).catch(err => console.log(err));
        
        // Convert BigInt values to strings or numbers
        const materialWithConvertedBigInt = material.map(row => {
            return {
                ...row,
                Paid: row.Paid.toString(), // Convert Paid to string
                Amount: row.Amount.toString(), // Convert Amount to string
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
            const material = await pool.query('SELECT * FROM order_details WHERE STATUS <>"Paid" AND (Supplier_name = ?) AND (Order_date BETWEEN ? AND ?);', [Details.Supplier, Details.Start, Details.End]).catch(err => console.log(err));
            
            // Convert BigInt values to strings or numbers
            const materialWithConvertedBigInt = material.map(row => {
                return {
                    ...row,
                    Paid: row.Paid.toString(), // Convert Paid to string
                    Amount: row.Amount.toString(), // Convert Amount to string
                };
            });
            console.log(materialWithConvertedBigInt);
            return(materialWithConvertedBigInt);
        } catch (error) {
            console.error(error);
            return({ error: "Internal server error" });
        }
    }
}
exports.fetchMaterialBalance = async (Details) => {
    if(Details.Supplier == "null"){
    try {
        //console.log(req.body);
        const material = await pool.query('SELECT * FROM order_details WHERE (Project_id = ?) AND (STATUS <>"Paid") AND (Order_date BETWEEN ? AND ?);', [Details.Id, Details.Start, Details.End]).catch(err => console.log(err));
        
        // Convert BigInt values to strings or numbers
        const materialWithConvertedBigInt = material.map(row => {
            return {
                ...row,
                Paid: row.Paid.toString(), // Convert Salary to string
                Amount: row.Amount.toString(), // Convert Amount to string
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
            const material = await pool.query('SELECT * FROM order_details WHERE (Project_id = ?) AND (STATUS <>"Paid") AND (Supplier_name = ?) AND (Order_date BETWEEN ? AND ?);', [Details.Id,Details.Supplier, Details.Start, Details.End]).catch(err => console.log(err));
           // console.log("===================================================",material)
            // Convert BigInt values to strings or numbers
            const materialWithConvertedBigInt = material.map(row => {
                return {
                    ...row,
                    Paid: row.Paid.toString(), // Convert Salary to string
                    Amount: row.Amount.toString(), // Convert Amount to string
                };
            });
            console.log(materialWithConvertedBigInt);
            return(materialWithConvertedBigInt);
        } catch (error) {
            console.error(error);
            return({ error: "Internal server error" });
        }
    }
}
exports.fetchMaterialPay = async (Details) => {
     const material = await pool.query('SELECT supplier_name,SUM(balance) as Balance FROM order_details where STATUS <>"Paid" and balance > 0 GROUP BY supplier_name ; ').catch(err=>console.log(err))
        console.log(material)
        return(material);
}