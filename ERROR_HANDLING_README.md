# Centralized Error Handling System - Tawa

## Overview

Tawa implements a comprehensive, centralized error handling system that provides consistent error responses, proper HTTP status codes, and detailed error information across the entire application.

## Features

- **Custom Error Classes**: Specific error types for different scenarios
- **Consistent Error Structure**: Standardized error response format
- **HTTP Status Codes**: Proper status codes for different error types
- **Error Codes**: Unique error codes for frontend handling
- **Detailed Error Information**: Field-level validation errors
- **Error Factory**: Easy creation of custom errors
- **Automatic Error Logging**: Comprehensive error logging with context
- **MongoDB Error Handling**: Automatic handling of MongoDB errors
- **JWT Error Handling**: Proper JWT token error handling
- **Joi Validation Integration**: Seamless integration with Joi validation

## Error Classes

### Base Error Class

```javascript
class AppError extends Error {
  constructor(message, statusCode, errorCode, details)
}
```

### Authentication Errors (4xx)

- `AuthenticationError` (401) - Authentication failures
- `AuthorizationError` (403) - Access denied, insufficient permissions
- `ValidationError` (400) - Input validation failures
- `NotFoundError` (404) - Resources not found
- `ConflictError` (409) - Resource conflicts (duplicates)
- `RateLimitError` (429) - Too many requests

### Business Logic Errors (4xx)

- `BookingError` (400) - Booking-related errors
- `ServiceError` (400) - Service-related errors
- `PaymentError` (400) - Payment-related errors
- `ChatError` (400) - Chat-related errors

### Server Errors (5xx)

- `DatabaseError` (500) - Database operation failures
- `EmailError` (500) - Email service failures
- `PushNotificationError` (500) - Push notification failures
- `ExternalServiceError` (500) - External API failures

## Predefined Error Instances

### Authentication

```javascript
Errors.INVALID_CREDENTIALS
Errors.TOKEN_EXPIRED
Errors.TOKEN_INVALID
Errors.TOKEN_MISSING
Errors.USER_NOT_FOUND
```

### Authorization

```javascript
Errors.INSUFFICIENT_PERMISSIONS
Errors.ROLE_REQUIRED(role)
Errors.OWNER_REQUIRED
```

### Validation

```javascript
Errors.INVALID_INPUT(field)
Errors.MISSING_REQUIRED_FIELD(field)
Errors.INVALID_EMAIL
Errors.INVALID_PASSWORD
Errors.INVALID_RATING
Errors.INVALID_DATE
Errors.INVALID_LOCATION
```

### Not Found

```javascript
Errors.USER_NOT_FOUND_BY_ID(id)
Errors.SERVICE_NOT_FOUND(id)
Errors.BOOKING_NOT_FOUND(id)
Errors.REVIEW_NOT_FOUND(id)
Errors.CHAT_NOT_FOUND(id)
Errors.MESSAGE_NOT_FOUND(id)
```

### Conflicts

```javascript
Errors.EMAIL_ALREADY_EXISTS
Errors.DUPLICATE_BOOKING
Errors.DUPLICATE_REVIEW
Errors.SERVICE_ALREADY_EXISTS
```

### Business Logic

```javascript
Errors.BOOKING_DATE_PAST
Errors.BOOKING_CANNOT_CANCEL
Errors.BOOKING_NOT_COMPLETED
Errors.SERVICE_NOT_AVAILABLE
Errors.SERVICE_NOT_APPROVED
Errors.INVALID_BOOKING_STATUS(status)
```

## Usage Examples

### Using Predefined Errors

```javascript
const { Errors } = require('../utils/errors');

// Simple error
if (!user) {
  throw Errors.USER_NOT_FOUND;
}

// Error with dynamic content
if (!service) {
  throw Errors.SERVICE_NOT_FOUND(serviceId);
}

// Role-based error
if (user.role !== 'admin') {
  throw Errors.ROLE_REQUIRED('admin');
}
```

### Creating Custom Errors

```javascript
const { ValidationError, NotFoundError } = require('../utils/errors');

// Custom validation error with details
const error = new ValidationError('Validation failed', [
  { field: 'email', message: 'Invalid email format' },
  { field: 'password', message: 'Password too short' }
]);

// Custom not found error
const error = new NotFoundError('Custom resource');
```

### Using Error Factory

```javascript
const { ErrorFactory } = require('../utils/errors');

// Create error by type
const error = ErrorFactory.create('AUTHENTICATION', 'Custom auth error');

// From Joi validation error
const { error } = schema.validate(data);
if (error) {
  throw ErrorFactory.fromJoiError(error);
}

// From MongoDB error
try {
  await user.save();
} catch (mongoError) {
  throw ErrorFactory.fromMongoError(mongoError);
}
```

## Error Response Format

All errors follow a consistent response format:

```javascript
{
  "success": false,
  "message": "Error message",
  "errorCode": "ERROR_CODE",
  "statusCode": 400,
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "value": "invalid-email"
    }
  ],
  "stack": "Error stack trace (development only)"
}
```

## Controller Implementation

### Before (Old Way)

```javascript
exports.createBooking = asyncHandler(async (req, res) => {
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  if (user.role !== "customer") {
    const err = new Error("Only customers can create bookings");
    err.status = 403;
    throw err;
  }

  // ... rest of the code
});
```

### After (New Way)

```javascript
const { Errors } = require('../utils/errors');

exports.createBooking = asyncHandler(async (req, res) => {
  if (!user) {
    throw Errors.USER_NOT_FOUND;
  }

  if (user.role !== "customer") {
    throw Errors.ROLE_REQUIRED('customer');
  }

  // ... rest of the code
});
```

## Error Handler Middleware

The centralized error handler automatically:

1. **Logs errors** with context (URL, method, IP, user agent)
2. **Handles MongoDB errors** (duplicate keys, validation, cast errors)
3. **Handles JWT errors** (invalid token, expired token)
4. **Handles Joi validation errors** with field details
5. **Formats error responses** consistently
6. **Includes stack traces** in development mode

```javascript
// Global error handling
app.use(errorHandler);

// 404 handler for unmatched routes
app.use(notFoundHandler);
```

## Error Logging

Errors are automatically logged with comprehensive context:

```javascript
{
  message: "Error message",
  stack: "Error stack trace",
  url: "/api/bookings",
  method: "POST",
  ip: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  timestamp: "2024-01-01T00:00:00.000Z"
}
```

## Frontend Integration

The error system provides consistent error codes for frontend handling:

```javascript
// Frontend error handling
try {
  const response = await fetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData)
  });

  const data = await response.json();

  if (!data.success) {
    switch (data.errorCode) {
      case 'VALIDATION_ERROR':
        // Handle validation errors
        data.details.forEach(detail => {
          showFieldError(detail.field, detail.message);
        });
        break;
      case 'AUTH_ERROR':
        // Handle authentication errors
        redirectToLogin();
        break;
      case 'FORBIDDEN':
        // Handle authorization errors
        showAccessDenied();
        break;
      default:
        // Handle other errors
        showGenericError(data.message);
    }
  }
} catch (error) {
  // Handle network errors
  showNetworkError();
}
```

## Best Practices

### 1. Use Predefined Errors When Possible

```javascript
// Good
throw Errors.EMAIL_ALREADY_EXISTS;

// Avoid
throw new Error("Email already in use");
```

### 2. Provide Detailed Error Information

```javascript
// Good
throw new ValidationError('Validation failed', [
  { field: 'email', message: 'Invalid email format' }
]);

// Avoid
throw new Error("Validation failed");
```

### 3. Use Appropriate Error Types

```javascript
// Authentication issues
throw new AuthenticationError('Invalid credentials');

// Authorization issues
throw new AuthorizationError('Insufficient permissions');

// Business logic issues
throw new BookingError('Booking date must be in the future');
```

### 4. Handle External Service Errors

```javascript
try {
  await sendEmail(user);
} catch (emailError) {
  throw new EmailError('Failed to send email', emailError.message);
}
```

### 5. Use Error Factory for Complex Errors

```javascript
// From Joi validation
const { error } = schema.validate(data);
if (error) {
  throw ErrorFactory.fromJoiError(error);
}

// From MongoDB
try {
  await document.save();
} catch (mongoError) {
  throw ErrorFactory.fromMongoError(mongoError);
}
```

## Migration Guide

To migrate existing controllers to use the new error system:

1. **Import error utilities**:

   ```javascript
   const { Errors, ErrorFactory } = require('../utils/errors');
   ```

2. **Replace generic errors**:

   ```javascript
   // Old
   const err = new Error("User not found");
   err.status = 404;
   throw err;

   // New
   throw Errors.USER_NOT_FOUND;
   ```

3. **Replace Joi validation errors**:

   ```javascript
   // Old
   const err = new Error(error.details[0].message);
   err.status = 400;
   throw err;

   // New
   throw ErrorFactory.fromJoiError(error);
   ```

4. **Update error handling**:

   ```javascript
   // Old
   app.use((err, req, res, next) => {
     res.status(err.status || 500).json({
       success: false,
       message: err.message
     });
   });

   // New
   app.use(errorHandler);
   ```

## Benefits

1. **Consistency**: All errors follow the same structure
2. **Maintainability**: Centralized error handling logic
3. **Debugging**: Better error logging and stack traces
4. **Frontend Integration**: Consistent error codes and messages
5. **Type Safety**: Specific error types for different scenarios
6. **Extensibility**: Easy to add new error types
7. **Documentation**: Self-documenting error codes and messages

## Future Enhancements

1. **Error Analytics**: Track error patterns and frequency
2. **Error Reporting**: Integration with error reporting services
3. **Localization**: Multi-language error messages
4. **Error Recovery**: Automatic retry mechanisms
5. **Error Monitoring**: Real-time error monitoring and alerts
