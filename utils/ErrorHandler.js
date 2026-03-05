const { AppError } = require("../Logics/AppError");

module.exports = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === "development";

  console.error("❌ Error:", err);
  // console.log('ERRORHANDLER:',err,err.message,AppError)

  // ✅ Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(isDevelopment && { stack: err.stack }),
    });
  }

  // ✅ Handle MySQL Duplicate Entry Errors
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      message: "Duplicate entry: Resource already exists",
      ...(isDevelopment && { details: err.message, stack: err.stack }),
    });
  }

  // ✅ Handle MySQL Foreign Key Constraint Errors
  if (err.code === "ER_NO_REFERENCED_ROW_2" || err.code === "ER_FOREIGN_KEY") {
    return res.status(400).json({
      success: false,
      message: "Cannot delete/update: Related records exist",
      ...(isDevelopment && { details: err.message, stack: err.stack }),
    });
  }

  // ✅ Handle JWT Errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      ...(isDevelopment && { stack: err.stack }),
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
      ...(isDevelopment && { stack: err.stack }),
    });
  }

  // ✅ Handle Validation Errors (e.g., from Joi, express-validator)
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.details?.map((d) => d.message) || [err.message],
      ...(isDevelopment && { stack: err.stack }),
    });
  }

  // ✅ Handle Multer (File Upload) Errors
  if (err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
      ...(isDevelopment && { stack: err.stack }),
    });
  }

  // ✅ Handle Syntax Errors (Programming Bugs)
  if (err instanceof SyntaxError) {
    console.error("💥 Programming Error (Syntax):", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(isDevelopment && { stack: err.stack }),
    });
  }

  // ✅ Default: Unknown Errors
  console.error("💥 Unknown Error:", err);
  return res.status(500).json({
    success: false,
    message: isDevelopment
      ? `Internal server error: ${err.message}`
      : "Internal server error",
    ...(isDevelopment && { stack: err.stack }),
  });
};
