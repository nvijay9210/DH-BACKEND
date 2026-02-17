const express = require("express");
const fs = require("fs");
const path = require("path");
const { globalErrorHandler } = require("./utils/ErrorHandler");

const projectDetailsRouter=require('./Routes/ProjectRoute')
const materialRouter=require('./Routes/MaterialRoute')
const masterRouter=require('./Routes/MasterRoute')
const orderRouter=require('./Routes/OrderRoute')
const labourRouter=require('./Routes/LabourRoute')
const paymentRouter=require('./Routes/PaymentRoute')
const projectRouter=require('./Routes/ProjectRoute')
const userRouter=require('./Routes/UserRoute')

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cors = require("cors");

app.use(
  cors({
    origin: [
      "http://localhost:5173",        // Vite
      "http://localhost:3000",        // CRA
      "https://yourdomain.com"        // Production frontend
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  })
);

// 👇 VERY IMPORTANT
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "UPLOADS"))
);

// ✅ Health check
app.get("/", (req, res) => {
  res.send("Backend running successfully 🚀");
});

// ✅ Auto-load routers
const routesPath = path.join(__dirname, "routes");

// if (fs.existsSync(routesPath)) {
//   fs.readdirSync(routesPath).forEach((file) => {
//     if (file.endsWith("Router.js")) {

//       // Remove "Router.js"
//       const routeName = file.replace("Router.js", "").toLowerCase();

//       const routeFile = path.join(routesPath, file);

//       app.use(`/api/${routeName}`, require(routeFile));
//     }
//   });
// }

app.use(`/api/project`, projectDetailsRouter);
app.use(`/api/material`, materialRouter);
app.use(`/api/master`, masterRouter);
app.use(`/api/order`, orderRouter);
app.use(`/api/labour`, labourRouter);
app.use(`/api/payment`, paymentRouter);
app.use(`/api/project`, projectRouter);
app.use(`/api/user`, userRouter);



// ✅ Global error handler
app.use(globalErrorHandler);

module.exports = app;
