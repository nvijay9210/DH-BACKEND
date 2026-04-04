// Test harness for basic CRUD operations against the running backend.
// Usage: node scripts/testCrud.js
// Make sure backend is running on port 8006. Adjust baseURL if necessary.

const axios = require("axios");
const tough = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");

// create axios instance with cookie jar support so we can maintain session
const jar = new tough.CookieJar();
const client = wrapper(
  axios.create({
    baseURL: "http://localhost:8006/api",
    timeout: 20000,
    withCredentials: true,
    jar,
  })
);

// login using credentials provided by user
async function login() {
  console.log("🔐 Attempting login...");
  const resp = await client.post("/keycloak/login", {
    username: "DHADMIN",
    password: "1234",
    host: "localhost",
  });
  console.log("✅ Logged in, received user:", resp.data);
}

// simple UUID generator for test data
global.generateId = () => Math.floor(Math.random() * 1000000);

async function testBranchCrud() {
  console.log("\n🏢 Testing Branch CRUD");
  const code = `BR${generateId()}`;
  // CREATE
  const createResp = await client.post("/branch", {
    branch_name: "Test Branch",
    branch_code: code,
    address: "123 Test St",
    city: "Testville",
    state: "TS",
    pincode: "123456",
    email: "test@example.com",
    phone: "9876543210",
  });
  console.log("Created branch id", createResp.data.data.branchId);
  const id = createResp.data.data.branchId;

  // READ LIST
  const listResp = await client.get("/branch");
  console.log(
    "Total branches returned",
    listResp.data.count || listResp.data.length
  );

  // READ BY ID
  const one = await client.get(`/branch/${id}`);
  console.log("Fetched branch by id:", one.data.data);

  // UPDATE
  await client.put(`/branch/${id}`, { branch_name: "Updated Branch" });
  console.log("Updated branch name");

  // DELETE
  await client.delete(`/branch/${id}`);
  console.log("Deleted branch");
}

async function testUserCrud() {
  console.log("\n👤 Testing User CRUD");
  const username = `user${generateId()}`;

  // CREATE
  const createResp = await client.post("/user/NewUser", {
    username,
    password: "password123",
    role: "Admin",
    status: "Active",
  });
  console.log("Created user id", createResp.data.userId);

  // LIST
  const listResp = await client.get("/user/UserList");
  console.log("User count", listResp.data.data.length);

  // UPDATE ACCESS
  await client.put("/user/UserAccess", {
    username,
    role: "Operator",
    status: "Active",
  });
  console.log("Updated user access");

  // DELETE
  await client.delete(`/user/${createResp.data.userId}`);
  console.log("Deleted user");
}

async function testLabourModule() {
  console.log("\n👷 Testing Labour module");
  // create a labour detail
  const now = new Date().toISOString().split("T")[0];
  const labourPayload = {
    Order: [
      {
        Project_id: 1,
        Project_name: "TestProject",
        Date: now,
        Contractor: "TestContractor",
        Labour_types: "TestLabour",
        No_Of_Persons: 1,
        Salary: 100,
        Ratio: 0,
        Total: 100,
        Site_supervisor: "Supervisor",
        Payment_Date: now,
        Paid: 0,
        Balance: 100,
        Status: "Pending",
        username: "DHADMIN",
        currentDate: now,
      },
    ],
  };
  const createResp = await client.post("/labour/Labour_details", labourPayload);
  console.log("Labour create response", createResp.data);

  // fetch for update (by project and date)
  const fetchResp = await client.post("/labour/FetchLabourUpdate", {
    Id: 1,
    date: now,
  });
  console.log("Fetched labour records count", fetchResp.data.data.length);
}

async function testMaterialModule() {
  console.log("\n📦 Testing Material module");
  const now = new Date().toISOString().split("T")[0];
  const materialPayload = {
    Mat_Used: [
      {
        Project_id: 1,
        Project_name: "TestProject",
        date: now,
        Material: 1,
        Used: 10,
        username: "DHADMIN",
        createdDate: now,
      },
    ],
  };
  const resp = await client.put("/material/MatUsed", materialPayload);
  console.log("Material used response", resp.data);

  const fetchResp = await client.post("/material/FetchMaterialUsed", {});
  console.log("FetchMaterialUsed count", fetchResp.data.data.length);
}

async function testOrderModule() {
  console.log("\n🧾 Testing Order module");
  const now = new Date().toISOString().split("T")[0];
  const orderPayload = {
    orders: [
      {
        Project_id: 1,
        Project_name: "TestProject",
        Material_Name: "Material1",
        Quantity: 5,
        Unit: "pcs",
        Order_date: now,
        Delivery_Date: now,
        Supplier_name: "Supplier",
        Supplier_Contact: "9876543210",
        Rate: 50,
        Amount: 250,
        Payment_Date: now,
        Paid: 0,
        Balance: 250,
        Status: "Ordered",
        Created_by: "DHADMIN",
        CREATED_DATETIME: now,
      },
    ],
  };
  const resp = await client.post("/order/order", orderPayload);
  console.log("Order create response", resp.data);

  const fetchResp = await client.post("/order/OrderReports", {
    Start: now,
    End: now,
    Id: 1,
  });
  console.log("Order report rows", fetchResp.data.data.length);
}

async function testPaymentModule() {
  console.log("\n💰 Testing Payment module");
  const now = new Date().toISOString().split("T")[0];
  const paymentPayload = {
    details: [
      {
        Project_id: 1,
        Pay_Date: now,
        Amount: 1000,
        username: "DHADMIN",
        datetime: now,
      },
    ],
  };
  const resp = await client.post("/payment/NewPayment", paymentPayload);
  console.log("NewPayment resp", resp.data);

  const reportResp = await client.post("/payment/ClientPaymentReport", {
    start_date: now,
    end_date: now,
  });
  console.log(
    "ClientPaymentReport length",
    reportResp.data.length || reportResp.data.data.length
  );
}

async function testProjectModule() {
  console.log("\n🏗️ Testing Project module");
  // only create and list; file uploads not needed here
  const now = new Date().toISOString();
  const payload = {
    Project_name: "AutoTestProject",
    Project_type: "Residential",
    Project_cost: 100000,
    Margin: 10,
    Project_Estimation_Cost: 110000,
    Project_start_date: now,
    Estimated_end_date: now,
    Site_location: "TestSite",
    Contractor: "Contractor1",
    Site_supervisor: "Supervisor1",
    Username: "DHADMIN",
  };
  const resp = await client.post("/projects", payload);
  console.log("Create project resp", resp.data);

  const listResp = await client.get("/projects");
  console.log("Projects count", listResp.data.count || listResp.data.length);
}

async function run() {
  try {
    await login();
    await testBranchCrud();
    await testUserCrud();
    await testLabourModule();
    await testMaterialModule();
    await testOrderModule();
    await testPaymentModule();
    await testProjectModule();
    console.log("\n🎉 Full CRUD smoke tests completed successfully.");
  } catch (err) {
    console.error(
      "❌ Test error:",
      err.response ? err.response.data : err.message
    );
  }
}

async function run() {
  try {
    await login();
    await testBranchCrud();
    await testUserCrud();
    console.log("\n🎉 CRUD smoke tests completed successfully.");
  } catch (err) {
    console.error(
      "❌ Test error:",
      err.response ? err.response.data : err.message
    );
  }
}

run();
