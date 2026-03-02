class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 500;  // Default to 500 if no status is provided
    this.isOperational = true;  // Mark error as operational (user-caused)

    // Capture stack trace for better debugging
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {AppError};
