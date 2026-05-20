/**
 * =====================================================
 * DB CONFIG - Optimized, Safe & .ENV Based
 * =====================================================
 */

require("dotenv").config();
const mariadb = require("mariadb");

// ============================================================================
// 🔹 DEBUG CONFIG (Simple toggle)
// ============================================================================
const DEBUG = process.env.DEBUG_DB === "true";

const log = (type, msg, data = null) => {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString().split("T")[1].replace("Z", "");
  const label = `[DB:${type.toUpperCase()}]`;
  console.log(`[${timestamp}] ${label} ${msg}${data ? " " + JSON.stringify(data) : ""}`);
};

// ============================================================================
// 🔹 POOL CONFIG - From .env with Fallbacks
// ============================================================================
const poolConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "dreamhouse",
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS !== "false",
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: Number(process.env.DB_QUEUE_LIMIT) || 0,
  minimumIdle: Number(process.env.DB_MINIMUM_IDLE) || 2,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT) || 10000,
  acquireTimeout: Number(process.env.DB_ACQUIRE_TIMEOUT) || 20000,
  idleTimeout: Number(process.env.DB_IDLE_TIMEOUT) || 60000,
  idleConnectionCheckInterval: Number(process.env.DB_IDLE_CHECK_INTERVAL) || 30000,
  validateConnections: process.env.DB_VALIDATE_CONNECTIONS !== "false",
  connectionValidationQuery: process.env.DB_VALIDATION_QUERY || "SELECT 1",
  timezone: process.env.DB_TIMEZONE || "+00:00",
  supportBigNumbers: process.env.DB_SUPPORT_BIG_NUMBERS !== "false",
  bigNumberStrings: process.env.DB_BIG_NUMBER_STRINGS === "true",
  charset: process.env.DB_CHARSET || "utf8mb4",
  dateStrings: process.env.DB_DATE_STRINGS === "true",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
};

// ============================================================================
// 🔹 POOL INITIALIZATION (Singleton)
// ============================================================================
let pool;

if (!global._mariaPool) {
  log("init", "🔹 Creating new MariaDB pool", {
    host: poolConfig.host,
    database: poolConfig.database,
    connectionLimit: poolConfig.connectionLimit,
  });

  global._mariaPool = mariadb.createPool(poolConfig);

  // ✅ Idle Connection Cleanup Timer
  if (process.env.DB_CLEANUP_TIMER_ENABLED !== "false") {
    const IDLE_TIMEOUT = poolConfig.idleTimeout;
    const MIN_IDLE = poolConfig.minimumIdle;
    const CHECK_INTERVAL = poolConfig.idleConnectionCheckInterval;

    global._mariaPool._idleCleanupTimer = setInterval(() => {
      try {
        const poolInternal = global._mariaPool._pool;
        if (!poolInternal?.freeConnections) return;
        const freeConns = poolInternal.freeConnections;
        const now = Date.now();
        let cleaned = 0;

        for (let i = freeConns.length - 1; i >= 0; i--) {
          const conn = freeConns[i];
          if (!conn?._lastUsed) { conn._lastUsed = now; continue; }
          const idleTime = now - conn._lastUsed;
          if (idleTime > IDLE_TIMEOUT && freeConns.length > MIN_IDLE) {
            freeConns.splice(i, 1);
            if (conn.end) conn.end().catch(() => {});
            else if (conn.destroy) conn.destroy();
            cleaned++;
            log("cleanup", `🗑️ Destroyed idle connection`, { threadId: conn.threadId, idle_sec: Math.round(idleTime/1000) });
          }
        }
        if (cleaned > 0) log("cleanup", `✅ Cleaned ${cleaned} idle connections`);
      } catch (err) {
        log("error", `Cleanup timer error: ${err.message}`);
      }
    }, CHECK_INTERVAL);

    global._mariaPool.on("acquire", (conn) => { if (conn) conn._lastUsed = Date.now(); });
    global._mariaPool.on("release", (conn) => { if (conn) conn._lastUsed = Date.now(); });
  }

  log("init", "✅ Pool created successfully");
} else {
  log("init", "♻️ Reusing existing pool instance");
}

pool = global._mariaPool;

// ============================================================================
// 🔹 HELPER METHODS (Attach to pool instance)
// ============================================================================
pool.getStats = function() {
  const p = pool._pool;
  if (!p) return null;
  const total = p._allConnections?.length || p.allConnections?.length || 0;
  const free = p._freeConnections?.length || p.freeConnections?.length || 0;
  const queued = p._connectionQueue?.length || p.connectionQueue?.length || 0;
  return { total, free, active: total - free, queued, config: { connectionLimit: poolConfig.connectionLimit, idleTimeout: poolConfig.idleTimeout, minimumIdle: poolConfig.minimumIdle } };
};

pool.getHealth = function() {
  const stats = pool.getStats();
  if (!stats) return { status: "unknown" };
  const { active, queued, config } = stats;
  const utilization = config.connectionLimit > 0 ? Math.round((active / config.connectionLimit) * 100) : 0;
  let status = "healthy";
  if (queued > 0 || utilization > 90) status = "critical";
  else if (utilization > 70) status = "warning";
  return { status, ...stats, utilization_percent: utilization, timestamp: new Date().toISOString() };
};

pool.cleanup = function() {
  if (global._mariaPool._idleCleanupTimer) {
    clearInterval(global._mariaPool._idleCleanupTimer);
    log("init", "⏹️ Cleanup timer stopped");
  }
};

if (DEBUG) {
  pool.debugQuery = async function(sql, params = null) {
    const start = Date.now();
    let conn;
    try {
      conn = await pool.getConnection();
      const result = await conn.query(sql, params);
      const duration = Date.now() - start;
      if (duration > 1000) log("slow", `🐌 Slow query (${duration}ms)`, { sql: sql.substring(0, 100) });
      return result;
    } catch (err) {
      log("error", `Query failed: ${err.message}`, { sql: sql.substring(0, 100) });
      throw err;
    } finally { if (conn) conn.release(); }
  };
}

// ============================================================================
// 🔹 ✅ FIXED EXPORTS - Named exports for { pool } destructuring
// ============================================================================
log("init", "✅ DbConfig loaded", { 
  DEBUG, 
  connectionLimit: poolConfig.connectionLimit, 
  idleTimeout: `${poolConfig.idleTimeout}ms`,
  database: poolConfig.database 
});

// ✅ Export as object with named properties
module.exports = {
  pool,                    // ✅ Main pool instance (for getConnection, query, etc.)
  DEBUG,                   // ✅ Debug flag
  poolConfig,              // ✅ Config object for debugging
  getStats: () => pool.getStats(),    // ✅ Helper methods
  getHealth: () => pool.getHealth(),
  cleanup: () => pool.cleanup(),
};