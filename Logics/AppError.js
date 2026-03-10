class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode || 500;  // Default to 500 if no status is provided
    this.isOperational = true;  // Mark error as operational (user-caused)
    this.errors = errors;  // Store additional error details (like validation errors)

    // Capture stack trace for better debugging
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {AppError};
