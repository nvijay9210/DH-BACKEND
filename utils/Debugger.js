// ============================================================================
// 🛠️ DebugUtils.js - Reusable Debug Logger for Entire Project
// Supports: Modules, BigInt serialization, ENV-based toggling
// ============================================================================

/**
 * Create a debug logger instance for a specific module
 * @param {string} moduleName - Name of the module (e.g., "LoanService", "AuthService")
 * @param {string} envVarName - Environment variable to toggle debug (e.g., "DEBUG_LOAN")
 * @returns {object} Debug logger with log, error, warn, info methods
 */
const createDebugLogger = (moduleName, envVarName = "DEBUG") => {
  const isEnabled = process.env.DEBUG_AUTH

  /**
   * Safe JSON stringify that handles BigInt, circular refs, and errors
   */
  const safeStringify = (data, indent = 2) => {
    if (!data) return "";
    try {
      return JSON.stringify(
        data,
        (key, value) => {
          if (typeof value === "bigint") return value.toString();
          if (value instanceof Error) {
            return {
              name: value.name,
              message: value.message,
              stack: value.stack,
            };
          }
          return value;
        },
        indent
      );
    } catch (err) {
      return `<serialization-error: ${err.message}>`;
    }
  };

  /**
   * Get formatted timestamp
   */
  const getTimestamp = () => {
    return new Date().toISOString().split("T")[1].replace("Z", "");
  };

  return {
    /**
     * Log debug information
     */
    log: (label, message, data = null) => {
      if (!isEnabled) return;
      const timestamp = getTimestamp();
      console.log(
        `🔍 [${timestamp}] [${moduleName}:${label}] ${message}`,
        data ? `\n📦 ${safeStringify(data)}` : ""
      );
    },

    /**
     * Log error with stack trace
     */
    error: (label, message, error = null) => {
      const timestamp = getTimestamp();
      console.error(
        `❌ [${timestamp}] [${moduleName}:${label}] ${message}`,
        error?.message || error || ""
      );
      if (error?.stack && isEnabled) {
        console.error(`   📋 Stack: ${error.stack.split("\n")[1]?.trim()}`);
      }
    },

    /**
     * Log warning
     */
    warn: (label, message, data = null) => {
      if (!isEnabled) return;
      const timestamp = getTimestamp();
      console.warn(
        `⚠️  [${timestamp}] [${moduleName}:${label}] ${message}`,
        data ? `\n📦 ${safeStringify(data)}` : ""
      );
    },

    /**
     * Log info (always shown, regardless of DEBUG flag)
     */
    info: (label, message, data = null) => {
      const timestamp = getTimestamp();
      console.info(
        `ℹ️  [${timestamp}] [${moduleName}:${label}] ${message}`,
        data ? `\n📦 ${safeStringify(data)}` : ""
      );
    },

    /**
     * Check if debug is enabled
     */
    isEnabled: () => isEnabled,
  };
};

// ============================================================================
// 📤 EXPORT
// ============================================================================
module.exports = {
  createDebugLogger,
};