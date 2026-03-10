const express = require("express");
const fs = require("fs");
const path = require("path");
const errorHandler = require("./utils/ErrorHandler");

const materialRouter = require("./Routes/MaterialRoute");
const masterRouter = require("./Routes/MasterRoute");
const orderRouter = require("./Routes/OrderRoute");
const labourRouter = require("./Routes/LabourRoute");
const paymentRouter = require("./Routes/PaymentRoute");
const projectRouter = require("./Routes/ProjectRoute");
const userRouter = require("./Routes/UserRoute");
const tenantRouter = require("./Routes/TenantRoute");
const branchRouter = require("./Routes/BranchRoute");
const userBranchRouter = require("./Routes/UserBranchRoute");
const ssoAuth = require("./Keycloak/SSOAuth");

const authMiddleware = require("./Middleware/AuthMiddleware");
const contextMiddleware = require("./Middleware/ContextMiddleware");
// const branchAccessMiddleware = require("./Middleware/BranchAccessMiddleware");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cors = require("cors");
const { AppError } = require("./Logics/AppError");
const cookieParser = require("cookie-parser");

app.use(
  cors({
    origin: [
      "http://localhost:5173", // Vite
      "http://localhost:3000", // CRA
      "https://yourdomain.com", // Production frontend
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(cookieParser());

// 👇 VERY IMPORTANT
// Create a middleware to serve protected files
const serveProtectedFile = (req, res, next) => {
  const filePath = path.join(__dirname, "..", "UPLOADS", req.params[0]);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }

  // If token is valid (set by validateToken middleware), serve the file
  if (req.user_id) {
    res.sendFile(filePath);
  } else {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Apply validation + file serving
app.get("/uploads/*", ssoAuth.validateToken, serveProtectedFile);
// Remove the old public static line

// ✅ Health check
app.get("/", (req, res) => {
  res.send("Backend running successfully 🚀");
});

// app.js - AFTER imports, BEFORE app.use()

// ✅ Helper to apply validateToken + optional authMiddleware
const withAuth = (router, includeContext = false) => {
  return includeContext
    ? [ssoAuth.validateToken, authMiddleware, router]
    : [ssoAuth.validateToken, router];
};

app.use(`/api/keycloak`, ssoAuth.router);

app.use(`/api/material`, ssoAuth.validateToken, materialRouter);
app.use(`/api/master`, ssoAuth.validateToken, masterRouter);
app.use(`/api/order`, ssoAuth.validateToken, orderRouter);
app.use(`/api/labour`, ssoAuth.validateToken, labourRouter);
app.use(`/api/payment`, ssoAuth.validateToken, paymentRouter);
app.use(`/api/project`, ssoAuth.validateToken, projectRouter);
app.use(`/api/user`, userRouter);
app.use(`/api/tenant`, ssoAuth.validateToken, tenantRouter);
app.use(`/api/branch`, ssoAuth.validateToken, branchRouter);
app.use(`/api/userbranch`, ssoAuth.validateToken, userBranchRouter);

// ✅ Global error handler
app.use(errorHandler);

module.exports = app;
