// Custom Error Classes for Tawa Application

class AppError extends Error {
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true; // Mark as operational error (expected)

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Authentication Errors (4xx)
class AuthenticationError extends AppError {
  constructor(message = "Authentication failed", details = null) {
    super(message, 401, "AUTH_ERROR", details);
  }
}

class AuthorizationError extends AppError {
  constructor(message = "Access denied", details = null) {
    super(message, 403, "FORBIDDEN", details);
  }
}

class ValidationError extends AppError {
  constructor(message = "Validation failed", details = null) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

class NotFoundError extends AppError {
  constructor(resource = "Resource", details = null) {
    super(`${resource} not found`, 404, "NOT_FOUND", details);
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource conflict", details = null) {
    super(message, 409, "CONFLICT", details);
  }
}

class RateLimitError extends AppError {
  constructor(message = "Too many requests", details = null) {
    super(message, 429, "RATE_LIMIT", details);
  }
}

// Business Logic Errors (4xx)
class BookingError extends AppError {
  constructor(message = "Booking error", details = null) {
    super(message, 400, "BOOKING_ERROR", details);
  }
}

class ServiceError extends AppError {
  constructor(message = "Service error", details = null) {
    super(message, 400, "SERVICE_ERROR", details);
  }
}

class PaymentError extends AppError {
  constructor(message = "Payment error", details = null) {
    super(message, 400, "PAYMENT_ERROR", details);
  }
}

class ChatError extends AppError {
  constructor(message = "Chat error", details = null) {
    super(message, 400, "CHAT_ERROR", details);
  }
}

// Server Errors (5xx)
class DatabaseError extends AppError {
  constructor(message = "Database error", details = null) {
    super(message, 500, "DATABASE_ERROR", details);
  }
}

class EmailError extends AppError {
  constructor(message = "Email service error", details = null) {
    super(message, 500, "EMAIL_ERROR", details);
  }
}

class PushNotificationError extends AppError {
  constructor(message = "Push notification error", details = null) {
    super(message, 500, "PUSH_ERROR", details);
  }
}

class ExternalServiceError extends AppError {
  constructor(message = "External service error", details = null) {
    super(message, 500, "EXTERNAL_SERVICE_ERROR", details);
  }
}

// Specific Error Instances
const Errors = {
  // Authentication
  INVALID_CREDENTIALS: new AuthenticationError("Invalid email or password"),
  TOKEN_EXPIRED: new AuthenticationError("Token has expired"),
  TOKEN_INVALID: new AuthenticationError("Invalid token"),
  TOKEN_MISSING: new AuthenticationError("No token provided"),
  USER_NOT_FOUND: new AuthenticationError("User not found"),

  // Authorization
  INSUFFICIENT_PERMISSIONS: new AuthorizationError("Insufficient permissions"),
  ROLE_REQUIRED: (role) => new AuthorizationError(`Role '${role}' required`),
  OWNER_REQUIRED: new AuthorizationError(
    "Only the owner can perform this action",
  ),

  // Validation
  INVALID_INPUT: (field) => new ValidationError(`Invalid ${field}`),
  MISSING_REQUIRED_FIELD: (field) =>
    new ValidationError(`${field} is required`),
  INVALID_EMAIL: new ValidationError("Invalid email format"),
  INVALID_PASSWORD: new ValidationError(
    "Password must be at least 6 characters",
  ),
  INVALID_RATING: new ValidationError("Rating must be between 1 and 5"),
  INVALID_DATE: new ValidationError("Invalid date format"),
  INVALID_LOCATION: new ValidationError("Invalid location coordinates"),

  // Not Found
  USER_NOT_FOUND_BY_ID: (id) => new NotFoundError(`User with ID ${id}`),
  SERVICE_NOT_FOUND: (id) => new NotFoundError(`Service with ID ${id}`),
  BOOKING_NOT_FOUND: (id) => new NotFoundError(`Booking with ID ${id}`),
  REVIEW_NOT_FOUND: (id) => new NotFoundError(`Review with ID ${id}`),
  CHAT_NOT_FOUND: (id) => new NotFoundError(`Chat with ID ${id}`),
  MESSAGE_NOT_FOUND: (id) => new NotFoundError(`Message with ID ${id}`),

  // Conflicts
  EMAIL_ALREADY_EXISTS: new ConflictError("Email already in use"),
  DUPLICATE_BOOKING: new ConflictError("Booking already exists for this time"),
  DUPLICATE_REVIEW: new ConflictError("You have already reviewed this booking"),
  SERVICE_ALREADY_EXISTS: new ConflictError(
    "Service with this title already exists",
  ),

  // Business Logic
  BOOKING_DATE_PAST: new BookingError("Booking date must be in the future"),
  BOOKING_CANNOT_CANCEL: new BookingError(
    "Booking cannot be cancelled in its current status",
  ),
  BOOKING_NOT_COMPLETED: new BookingError(
    "Booking must be completed before reviewing",
  ),
  SERVICE_NOT_AVAILABLE: new ServiceError(
    "Service is not available for booking",
  ),
  SERVICE_NOT_APPROVED: new ServiceError("Service is not approved yet"),
  INVALID_BOOKING_STATUS: (status) =>
    new BookingError(`Invalid booking status: ${status}`),

  // Rate Limiting
  TOO_MANY_REQUESTS: new RateLimitError(
    "Too many requests, please try again later",
  ),
  TOO_MANY_LOGIN_ATTEMPTS: new RateLimitError(
    "Too many login attempts, please try again later",
  ),

  // Server Errors
  DATABASE_CONNECTION_FAILED: new DatabaseError("Database connection failed"),
  EMAIL_SEND_FAILED: new EmailError("Failed to send email"),
  PUSH_NOTIFICATION_FAILED: new PushNotificationError(
    "Failed to send push notification",
  ),
  EXTERNAL_API_FAILED: new ExternalServiceError(
    "External API service unavailable",
  ),

  // Generic
  INTERNAL_SERVER_ERROR: new AppError(
    "Internal server error",
    500,
    "INTERNAL_ERROR",
  ),
  BAD_REQUEST: new AppError("Bad request", 400, "BAD_REQUEST"),
  METHOD_NOT_ALLOWED: new AppError(
    "Method not allowed",
    405,
    "METHOD_NOT_ALLOWED",
  ),
  UNSUPPORTED_MEDIA_TYPE: new AppError(
    "Unsupported media type",
    415,
    "UNSUPPORTED_MEDIA_TYPE",
  ),
};

// Error factory for creating custom errors
class ErrorFactory {
  static create(type, message, details = null) {
    switch (type) {
      case "AUTHENTICATION":
        return new AuthenticationError(message, details);
      case "AUTHORIZATION":
        return new AuthorizationError(message, details);
      case "VALIDATION":
        return new ValidationError(message, details);
      case "NOT_FOUND":
        return new NotFoundError(message, details);
      case "CONFLICT":
        return new ConflictError(message, details);
      case "BOOKING":
        return new BookingError(message, details);
      case "SERVICE":
        return new ServiceError(message, details);
      case "PAYMENT":
        return new PaymentError(message, details);
      case "CHAT":
        return new ChatError(message, details);
      case "DATABASE":
        return new DatabaseError(message, details);
      case "EMAIL":
        return new EmailError(message, details);
      case "PUSH":
        return new PushNotificationError(message, details);
      case "EXTERNAL_SERVICE":
        return new ExternalServiceError(message, details);
      case "RATE_LIMIT":
        return new RateLimitError(message, details);
      default:
        return new AppError(message, 500, "UNKNOWN_ERROR", details);
    }
  }

  static fromJoiError(joiError) {
    const details = joiError.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
      value: detail.context?.value,
    }));

    return new ValidationError("Validation failed", details);
  }

  static fromMongoError(mongoError) {
    if (mongoError.code === 11000) {
      // Duplicate key error
      const field = Object.keys(mongoError.keyPattern)[0];
      return new ConflictError(`${field} already exists`);
    }

    return new DatabaseError("Database operation failed", mongoError.message);
  }
}

// Error response formatter
class ErrorResponse {
  static format(error, includeStack = false) {
    const response = {
      success: false,
      message: error.message,
      errorCode: error.errorCode || "UNKNOWN_ERROR",
      statusCode: error.statusCode || 500,
    };

    if (error.details) {
      response.details = error.details;
    }

    if (includeStack && error.stack) {
      response.stack = error.stack;
    }

    return response;
  }
}

module.exports = {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  BookingError,
  ServiceError,
  PaymentError,
  ChatError,
  DatabaseError,
  EmailError,
  PushNotificationError,
  ExternalServiceError,
  Errors,
  ErrorFactory,
  ErrorResponse,
};
