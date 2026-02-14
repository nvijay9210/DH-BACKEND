const { pool } = require("../config/db");
const { deleteFile } = require("../utils/UploadFile");
const jwt = require("jsonwebtoken");

exports.login = async (Details) => {
     console.log("Client Details:", Details);
     jwt_key=process.env.JWT_KEY

    try {
        const Result = await pool.query("SELECT * FROM users WHERE User_name = ?", [Details.username]);
        console.log("Result from database:", Result);

        if (Result.length === 0) {
            console.log("Username does not exist");
            return ({ msg: "Username does not exist", success: false });
        } else {
             if (Result[0].Password === Details.password && Result[0].Status === "Active") {
                console.log("Login successful.");
                  // Generate JWT token
                const token = jwt.sign({ username: Result[0].User_name }, jwt_key, { expiresIn: '1d' });


                return ({
                    msg: "Login successful",
                    success: true,
                    token,
                    username: Result[0].User_name,
                    rights: Result[0].Rights
                });

            }
            if(Result[0].Password === Details.password && Result[0].Status === "Inactive"){
                return ({ msg: "User Deactivated", success: false });
            }
            else {
                console.log("Incorrect password ");
                return ({ msg: "Incorrect password ", success: false });
            }
        }
    } catch (err) {
        console.error("Login error:", err);
         return ({ error: "Internal server error" });
    }
};
exports.logout = async (Details) => {
    res.clearCookie('token');
    return ({Status: "Success"});
};
exports.userDetails = async () => {
     const details = await pool.query("select * from users ").catch(err=>console.log(err))
        return(details);
};
exports.userList = async () => {
      try {
        const details = await pool.query("SELECT * FROM users ");
        return(details);
    } catch (err) {
        console.error("Error fetching user names:", err);
        return("Internal Server Error");
    }
};
exports.fullUserList = async () => {
      const details = await pool.query("select User_name from users").catch(err=>console.log(err))
    return(details);
};
exports.userAccess = async (Details) => {
      
        const material = await pool.query("update Users set Rights = ? , Status = ? where User_name =?;",[Details.rights,Details.status,Details.username]).catch(err=>console.log(err))
        console.log(material)
        return;
};
exports.adminPassChange = async (Details) => {
   
        const result = await pool.query("update Users set Password = ?  where User_name =?;",[Details.password,Details.username]).catch(err=>console.log(err))
        console.log(result)
        return;
};
exports.newUser = async (Details) => {
    console.log(Details);

    // Check if the username already exists in the database
    const existingUser=await pool.query("select * from Users where User_name = ?", [Details.newusername]);

    if(existingUser.length>0){
         // If the username exists, send an error response
        return res.status(400).json({error:" Username already exists"});
    }

     // If the username doesn't exist, proceed to insert the new user
    try {
        const Result = await pool.query("INSERT INTO Users (User_name, Password, Rights, Status,Created_by,Created_date) VALUES (?, ?, ?, ?, ? ,?)", [(Details.newusername).toUpperCase(), Details.password, Details.rights, Details.status, Details.username, Details.createdDate]);
        console.log(Result);
        return;
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
};