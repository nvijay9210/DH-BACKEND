const { pool } = require("../config/db");
const { deleteFile } = require("../utils/UploadFile");

exports.labourList = async (Labour_Details) => {
    try{
        await pool.query("insert into mas_labour_Details (Labour_Details,Created_by,created_datetime,Salary,Ratio) values(?,?,?,?,?)", [Labour_Details.Labour_Details,Labour_Details.username,Labour_Details.createdDate,Number(Labour_Details.Salary),Number(Labour_Details.Ratio)]);
        console.log("Form data saved to database");
		return('Form data saved to database');
    }catch(err){
        console.error("Error saving form data to database: ", err);
        return('Error saving form data to database');
        return;
    }
};
exports.materialList = async (Material) => {
    //console.log(req.body);
    try{
        const result = await pool.query("insert into mas_material_list (Material_name,Created_by,created_datetime) values(?,?,?)", [Material.Material_name,Material.username,Material.createdDate]);
        console.log(result);
        console.log("Form data saved to database");
        return('Form data saved to database');
    }catch(err){
        console.log(err);
    }
};
exports.contractorList = async (Data) => {

    try{
        pool.query("insert into mas_labour_Details (Contractor,Created_By,created_datetime) values(?,?,?)", [Data.Contractor,Data.username,Data.createdDate]);
        console.log("Form data saved to database");
		return('Form data saved to database');
    }catch(err){
        console.error("Error saving form data to database: ", err);
        return('Error saving form data to database');
        return;
    }
};
exports.supplierList = async (Data) => {
  
    try{
        pool.query("insert into mas_material_list (Supplier_Name,Supplier_Contact,Created_By,created_datetime) values(?,?,?,?)", [Data.SupplierName,Data.SupplierContact,Data.username,Data.createdDate]);
        console.log("Form data saved to database");
		return('Form data saved to database');
    }catch(err){
        console.error("Error saving form data to database: ", err);
        return('Error saving form data to database');
        return;
    }
};
exports.fetchMaterial = async (Data) => {
  try{
    const rows = await pool.query("Select * from mas_material_list");
      return(rows)    
      }
      catch(err ) {
          console.log("Connection Failed",err)
      } 
};
exports.fetchLabour = async (Data) => {
 try{
    const rows = await pool.query("Select * from mas_labour_Details");
      return(rows)    
      }
      catch(err ) {
          console.log("Connection Failed",err)
      } 
};
exports.fetchContractor = async (Data) => {
  try{
    const rows = await pool.query("Select * from mas_labour_Details");
      return(rows);    
      }
      catch(err ) {
          console.log("Connection Failed",err)
      }  
};
exports.fetchSupplier = async (Data) => {
    try{
    const rows = await pool.query("Select * from mas_material_list");
      return(rows);    
      }
      catch(err ) {
          console.log("Connection Failed",err)
      } 
};