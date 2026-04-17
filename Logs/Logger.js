// logs/Logger.js
require('dotenv').config();
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// ============================================================================
// 🔘 LOGGER TOGGLES - Read from .env
// ============================================================================
const LOG_ENABLED = process.env.LOG_ENABLED !== 'false';
const LOG_CONSOLE_ENABLED = process.env.LOG_CONSOLE_ENABLED !== 'false';
const LOG_FILE_ENABLED = process.env.LOG_FILE_ENABLED !== 'false';
const LOG_REQUESTS_ENABLED = process.env.LOG_REQUESTS_ENABLED !== 'false';

// If master switch is OFF, export a no-op logger
if (!LOG_ENABLED) {
  const noop = () => {};
  const dummyLogger = {
    silly: noop, debug: noop, info: noop, warn: noop, error: noop,
    log: noop, logWithMeta: noop, request: noop, response: noop,
    db: noop, auth: noop, cron: noop, redis: noop, api: noop,
  };
  // Still override console to silence everything if needed
  if (process.env.SILENCE_CONSOLE_ON_DISABLE === 'true') {
    console.log = console.info = console.warn = console.error = console.debug = noop;
  }
  module.exports = dummyLogger;
  return; // Stop here - no logger initialized
}

// ✅ Ensure logs directory exists (only if file logging enabled)
const logDir = path.join(__dirname, '../logs');
if (LOG_FILE_ENABLED && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 🎨 ANSI Colors for Console
const colors = {
  error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m',
  debug: '\x1b[90m', silly: '\x1b[35m', reset: '\x1b[0m',
};

// 🕐 IST Timestamp Formatter
const istTimestamp = () => {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: 'numeric', month: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  });
};

// 🧱 Custom Log Format
const logFormat = winston.format.printf(({ level, message, timestamp, module, emoji, url, method, userId, tenantId, error, stack, ...meta }) => {
  const levelUpper = level.toUpperCase();
  const modulePart = module ? `[${module}] ` : '';
  const emojiPart = emoji ? `${emoji} ` : '';
  const requestPart = url ? ` ${method} ${url}` : '';
  const userPart = userId ? ` (user:${userId})` : '';
  const tenantPart = tenantId ? ` [tenant:${tenantId}]` : '';
  
  let errorPart = '';
  if (error instanceof Error) {
    errorPart = ` {"error":"${error.message}","code":"${error.code || 'UNKNOWN'}"}`;
  } else if (typeof error === 'string') {
    errorPart = ` {"error":"${error}"}`;
  }
  
  const safeMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value !== undefined && typeof value !== 'function') {
      try { JSON.stringify(value); safeMeta[key] = value; } 
      catch { safeMeta[key] = String(value); }
    }
  }
  const metaPart = Object.keys(safeMeta).length > 0 ? ` ${JSON.stringify(safeMeta)}` : '';
  
  return `[${timestamp}] [${levelUpper}] ${modulePart}${emojiPart}${message}${requestPart}${userPart}${tenantPart}${errorPart}${metaPart}`;
});

// 🖥️ Console Format (with colors)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: istTimestamp }),
  winston.format.errors({ stack: true }),
  winston.format((info) => {
    if (process.env.NODE_ENV !== 'production') {
      info.message = `${colors[info.level] || colors.reset}${info.message}${colors.reset}`;
    }
    return info;
  })(),
  logFormat
);

// 📄 File Format (plain text)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: istTimestamp }),
  winston.format.errors({ stack: true }),
  logFormat
);

// ============================================================================
// 🪵 Build Transports Array Dynamically (based on toggles)
// ============================================================================
const transports = [];

// 📄 File: server.log
if (LOG_FILE_ENABLED) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'server.log'),
      level: process.env.LOG_LEVEL || 'silly',
      format: fileFormat,
      maxsize: parseInt(process.env.LOG_MAX_SIZE_MB) * 1024 * 1024 || 10 * 1024 * 1024,
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    })
  );
  
  // 📄 File: error.log (errors only)
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: parseInt(process.env.LOG_MAX_SIZE_MB) * 1024 * 1024 || 10 * 1024 * 1024,
      maxFiles: parseInt(process.env.LOG_ERROR_MAX_FILES) || 3,
    })
  );
}

// 💻 Console (if enabled)
if (LOG_CONSOLE_ENABLED) {
  transports.push(
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : (process.env.LOG_LEVEL || 'silly'),
      format: consoleFormat,
      silent: process.env.NODE_ENV === 'production' && (process.env.LOG_LEVEL === 'error' || process.env.LOG_LEVEL === 'warn'),
    })
  );
}

// ============================================================================
// 🪵 Create Logger
// ============================================================================
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'silly',
  defaultMeta: {},
  transports: transports,
  // Exit on error only in production (prevent crash loops)
  exitOnError: process.env.NODE_ENV !== 'production',
});

// ============================================================================
// 🔧 Helper: Format args
// ============================================================================
function formatArgs(args) {
  return args
    .map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        try { return JSON.stringify(arg); } catch { return String(arg); }
      }
      return String(arg);
    })
    .join(' ');
}

// ============================================================================
// 🔄 Override console.* (only if enabled)
// ============================================================================
if (LOG_ENABLED) {
  console.log = (...args) => logger.info(formatArgs(args));
  console.info = (...args) => logger.info(formatArgs(args));
  console.warn = (...args) => logger.warn(formatArgs(args));
  console.error = (...args) => logger.error(formatArgs(args));
  console.debug = (...args) => logger.debug(formatArgs(args));
}

// ============================================================================
// 🎯 Logger methods with module/emoji/URL support
// ============================================================================
logger.logWithMeta = (level, message, { module, emoji, url, method, userId, tenantId, ...meta } = {}) => {
  logger.log(level, message, { module, emoji, url, method, userId, tenantId, ...meta });
};

// 🔹 Request logging (only if LOG_REQUESTS_ENABLED)
logger.request = (req, level = 'info', message = 'Request received') => {
  if (!LOG_REQUESTS_ENABLED) return;
  logger.log(level, message, {
    module: 'HTTP', emoji: '🌐',
    url: req.originalUrl || req.url,
    method: req.method,
    userId: req.user_id || req.user?.user_id,
    tenantId: req.headers?.['x-tenant-id'],
    ip: req.ip,
    userAgent: req.get('user-agent')?.substring(0, 100),
  });
};

logger.response = (req, res, durationMs, message = 'Request completed') => {
  if (!LOG_REQUESTS_ENABLED) return;
  logger.log(res.statusCode >= 400 ? 'warn' : 'debug', message, {
    module: 'HTTP', emoji: res.statusCode >= 400 ? '⚠️' : '✅',
    url: req.originalUrl || req.url,
    method: req.method,
    status: res.statusCode,
    duration_ms: durationMs,
    userId: req.user_id || req.user?.user_id,
  });
};

// 🔹 Shorthand helpers
logger.db = (msg, meta) => logger.logWithMeta('info', msg, { module: 'DB', emoji: '🗄️', ...meta });
logger.auth = (msg, meta) => logger.logWithMeta('info', msg, { module: 'SsoAuth:SSO_AUTH', emoji: '🔐', ...meta });
logger.cron = (msg, meta) => logger.logWithMeta('info', msg, { module: 'CRON', emoji: '📅', ...meta });
logger.redis = (msg, meta) => logger.logWithMeta('info', msg, { module: 'Redis', emoji: '🚀', ...meta });
logger.api = (msg, meta) => logger.logWithMeta('info', msg, { module: 'API', emoji: '🔌', ...meta });

// ============================================================================
// 🚀 Startup log (only if enabled)
// ============================================================================
if (LOG_ENABLED) {
  logger.info('🪵 Logger initialized', {
    env: process.env.NODE_ENV,
    log_level: logger.level,
    toggles: {
      master: LOG_ENABLED,
      console: LOG_CONSOLE_ENABLED,
      file: LOG_FILE_ENABLED,
      requests: LOG_REQUESTS_ENABLED,
    },
    log_directory: LOG_FILE_ENABLED ? logDir : 'disabled',
  });
}

module.exports = logger;
module.exports.toggles = { LOG_ENABLED, LOG_CONSOLE_ENABLED, LOG_FILE_ENABLED, LOG_REQUESTS_ENABLED }; // For debugging