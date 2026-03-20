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
const dateMiddleware = require("./Middleware/DateTimeConversion");

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

app.use(dateMiddleware);

app.use(`/api/keycloak`, ssoAuth.router);

const maxmind = require('maxmind');

let lookup;

// Initialize DB properly
async function initLookup() {
    const dbPath = path.join(__dirname, 'data', 'GeoLite2-City.mmdb');
    lookup = await maxmind.open(dbPath);
    console.log("✅ MaxMind DB loaded");
}

// Call and WAIT before starting server
initLookup().catch(console.error);

// Helper: get real client IP
const getClientIp = (req) => {
    let ip =
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.socket?.remoteAddress ||
        '';

    // Normalize IPv6 localhost
    if (ip === '::1') {
        return '8.8.8.8'; // fallback (Google DNS)
    }

    // Remove IPv6 prefix
    if (ip.includes('::ffff:')) {
        ip = ip.split('::ffff:')[1];
    }

    return ip;
};

// Route
app.get('/api/user-activity', async (req, res) => {
    try {
        if (!lookup) {
            return res.status(500).send('Geo DB not loaded yet');
        }

        let ip = getClientIp(req);

        console.log("🌐 IP:", ip);

        // ⚠️ Handle localhost testing
        if (!ip || ip === '127.0.0.1') {
            ip = '8.8.8.8'; // fallback test IP
        }

        const location = lookup.get(ip);

        console.log("📍 Location:", location);

        if (location) {
            return res.json({
                city: location.city?.names?.en,
                country: location.country?.iso_code,
                lat: location.location?.latitude,
                lon: location.location?.longitude
            });
        } else {
            return res.status(404).send('Location not found');
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching location');
    }
});

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
