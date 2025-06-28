const {
  ErrorResponse,
  AppError,
  DatabaseError,
  ValidationError,
} = require("../utils/errors");

// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error("Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field} already exists`;
    error = new AppError(message, 409, "DUPLICATE_KEY");
  }

  // MongoDB validation error
  if (err.name === "ValidationError") {
    const details = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
      value: val.value,
    }));
    error = new ValidationError("Validation failed", details);
  }

  // MongoDB cast error (invalid ObjectId)
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new AppError(message, 400, "INVALID_ID");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid token", 401, "INVALID_TOKEN");
  }

  if (err.name === "TokenExpiredError") {
    error = new AppError("Token expired", 401, "TOKEN_EXPIRED");
  }

  // Joi validation errors
  if (err.isJoi) {
    const details = err.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
      value: detail.context?.value,
    }));
    error = new ValidationError("Validation failed", details);
  }

  // Rate limiting errors
  if (err.type === "entity.too.large") {
    error = new AppError("Request entity too large", 413, "ENTITY_TOO_LARGE");
  }

  // Network errors
  if (err.code === "ECONNREFUSED") {
    error = new DatabaseError("Database connection refused");
  }

  if (err.code === "ENOTFOUND") {
    error = new AppError("Service not found", 503, "SERVICE_UNAVAILABLE");
  }

  // Default error if not handled above
  if (!error.statusCode) {
    error = new AppError("Internal server error", 500, "INTERNAL_ERROR");
  }

  // Format error response
  const response = ErrorResponse.format(
    error,
    process.env.NODE_ENV === "development",
  );

  // Send error response
  res.status(error.statusCode || 500).json(response);
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    "ROUTE_NOT_FOUND",
  );
  next(error);
};

// Async error wrapper (alternative to asyncHandler)
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  catchAsync,
};
