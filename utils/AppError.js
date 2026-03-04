class AppError extends Error {
  constructor(message, statusCode, originalError = null) {
    // console.log('HELLO:',message, statusCode,originalError)
    const finalMessage = originalError
      ? `${message}: ${originalError.message}`
      : message;

    super(finalMessage);

    this.statusCode = statusCode;
    this.originalError = originalError;
    this.isOperational = true; // ✅ Mark as operational error

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { AppError };