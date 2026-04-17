require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 5000;

// ✅ Import pool directly (DbConfig exports the pool itself)
const {pool} = require("./config/db");
const logger = require("./Logs/Logger"); // ✅ Optional: if using logger

(async () => {
  try {
    const conn = await pool.getConnection();
    logger.info("✅ Database connected", { 
      threadId: conn.threadId,
      config: {
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        connectionLimit: process.env.DB_CONNECTION_LIMIT,
      }
    });
    conn.release();
  } catch (err) {
    logger.error("❌ Database connection failed", { 
      error: err.message, 
      code: err.code,
      fatal: err.fatal 
    });
    // Optional: exit if DB is critical
    // process.exit(1);
  }
})();

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`, {
    env: process.env.NODE_ENV,
    pid: process.pid,
  });
});

// 🛡️ Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  if (pool?.cleanup) pool.cleanup(); // Stop idle cleanup timer
  pool?.end?.().then(() => {
    logger.info("✅ Database pool closed");
    server.close(() => process.exit(0));
  });
});