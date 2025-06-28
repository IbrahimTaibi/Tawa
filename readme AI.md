# Tawa Backend (AI Self-Note)

## What is this?

This is a backend for a hyper-local services marketplace (like plumber/tutor finder) built with Node.js, Express, and MongoDB. Security is a top priority (Helmet, CORS, rate limiting, JWT, input validation). The project is modular and ready for advanced features (real-time chat, email notifications, push notifications, etc).

## Core Features (implemented)

- **Authentication:** JWT, role-based (customer/provider/admin), Joi validation, hashed passwords, password reset with email
- **Service Management:** CRUD, geospatial search, provider linkage, advanced filtering, text search, availability, ratings
- **Booking System:** Bookings with status lifecycle, pricing, cancellation, notes, payment status, provider/customer roles
- **Review System:** Ratings, moderation, helpful votes, one review per booking, rating aggregation
- **Enhanced Search:** Location-based, keyword, category, price, availability, and more
- **Real-time Chat:** Socket.IO, chat/message models, WebSocket server, typing indicators, read receipts
- **Email Notifications:** Nodemailer integration, welcome emails, booking confirmations, status updates, message notifications, password reset
- **Push Notifications:** Web Push API, service worker, VAPID keys, user preferences, admin broadcasting, rich notifications
- **Centralized Error Handling:** Custom error classes, consistent error responses, proper HTTP status codes, error codes, detailed error information
- **Admin Dashboard & Moderation:** User/service/review moderation, analytics, admin role, moderation fields
- **Error Handling:** Centralized, async wrapper, custom error classes, comprehensive logging
- **Security:** Helmet, CORS, rate limiting, input validation everywhere

## Folder Structure (important for me)

- `src/models/` — User, Service, Booking, Review, Chat, Message (all robust, indexed, role-aware, moderation-ready)
- `src/controllers/` — Auth, Service, Booking, Review, Search, Chat, Admin, Push (all RESTful, modular)
- `src/routes/` — Auth, Services, Bookings, Reviews, Search, Chats, Admin, Push (all protected as needed)
- `src/middleware/` — Auth (JWT), isAdmin, error handler, centralized error handling
- `src/utils/` — asyncHandler, emailService, pushNotificationService, errors (custom error classes and utilities)
- `src/config/` — email configuration and setup guide
- `src/socket/` — SocketServer (WebSocket, real-time chat)
- `public/` — Service worker (sw.js), web app manifest (manifest.json)
- `src/app.js` — Express app, middleware, routes, error handler
- `src/server.js` — MongoDB connect, server start, WebSocket init
- `.env` — PORT, MongoDB URI, JWT secret, email config, VAPID keys

## Implementation Reminders

- Auth: JWT, role-based (customer/provider/admin), Joi validation, password hashing, password reset with email
- Service: Geospatial, text index, provider ref, availability, status, rating, moderation (isApproved, isFeatured)
- Booking: Customer/provider, status, price, cancellation, notes, payment, indexed, email notifications, push notifications
- Review: One per booking, rating, moderation (isApproved), helpful, indexed, push notifications
- Search: Geospatial, keyword, category, price, availability
- Chat: Real-time, Socket.IO, JWT auth, rooms, typing, read receipts, unread counts, email notifications, push notifications
- Email: Nodemailer, welcome emails, booking confirmations, status updates, message notifications, password reset
- Push Notifications: Web Push API, VAPID keys, service worker, user preferences, admin broadcasting, rich notifications
- Error Handling: Custom error classes, consistent responses, proper status codes, error codes, detailed information, comprehensive logging
- Admin: User/service/review moderation, analytics, admin role, block/approve/feature actions, notification broadcasting
- Error handling: Centralized, async wrapper, custom error classes, comprehensive logging
- Security: Helmet, CORS, rate limiting, input validation
- All endpoints RESTful, protected as needed

## Email Notifications Implemented

- **Welcome Email:** Sent to new users upon registration
- **Booking Confirmation:** Sent to customers when booking is created
- **Booking Status Update:** Sent to customers when booking status changes
- **New Message Notification:** Sent to chat participants for new messages
- **Password Reset:** Sent to users requesting password reset with secure token

## Push Notifications Implemented

- **New Booking Notifications:** Sent to providers when customers book services
- **Booking Status Updates:** Sent to customers when booking status changes
- **New Message Notifications:** Sent to chat participants for new messages
- **New Review Notifications:** Sent to providers when customers leave reviews
- **Service Approval Notifications:** Sent to providers when services are approved
- **Booking Reminders:** Scheduled reminders before bookings
- **Admin Broadcasting:** Send notifications to all users or filtered groups
- **User Preferences:** Granular control over notification types
- **Rich Notifications:** Support for actions, icons, and deep linking

## Error Handling System Implemented

- **Custom Error Classes:** AuthenticationError, AuthorizationError, ValidationError, NotFoundError, ConflictError, etc.
- **Predefined Error Instances:** Common errors like INVALID_CREDENTIALS, EMAIL_ALREADY_EXISTS, USER_NOT_FOUND
- **Error Factory:** Easy creation of custom errors and conversion from Joi/MongoDB errors
- **Consistent Error Responses:** Standardized format with error codes, status codes, and details
- **Comprehensive Logging:** Error logging with context (URL, method, IP, user agent, timestamp)
- **Automatic Error Handling:** MongoDB errors, JWT errors, Joi validation errors handled automatically
- **Frontend Integration:** Error codes for consistent frontend error handling

## What's ready?

- Project structure, dependencies, .env, .gitignore
- All core models, controllers, routes, middleware
- Security and error handling
- Real-time chat system with WebSocket
- Email notification system with nodemailer (Gmail configured)
- Push notification system with Web Push API (VAPID keys, service worker)
- Centralized error handling system with custom error classes
- Admin dashboard with full moderation capabilities
- Password reset functionality
- Comprehensive API documentation (API_DOCS.md)
- Email setup guide (EMAIL_SETUP.md)
- Push notification documentation (PUSH_NOTIFICATIONS_README.md)
- Error handling documentation (ERROR_HANDLING_README.md)
- Modular, ready for new features (file uploads, payments, etc)

## How to use this note

If I (the AI) need to recall the project's architecture, features, or best practices, I'll look here. If the user says "look at readme ai to remember," I'll use this as my context. If the user updates the project, I should update this note.

## Next steps (if asked)

- File uploads (multer, sharp, cloud storage)
- Payment integration (Stripe/PayPal)
- Advanced analytics (charts, trends)
- Multi-language support
- API documentation updates
- Email templates customization
- Email queuing for high volume
- Mobile app push notifications
- Error analytics and monitoring

## For details

See the full project files, API_DOCS.md for endpoint-level docs, EMAIL_SETUP.md for email configuration details, PUSH_NOTIFICATIONS_README.md for push notification implementation, and ERROR_HANDLING_README.md for error handling system.

## Email Setup Required

To use email notifications:

1. Set up Gmail with 2FA and App Password
2. Create .env file with email credentials
3. See EMAIL_SETUP.md for detailed instructions

## Push Notification Setup Required

To use push notifications:

1. VAPID keys are auto-generated but can be customized
2. Update email in pushNotificationService.js
3. Frontend needs service worker registration
4. See PUSH_NOTIFICATIONS_README.md for detailed instructions

## Error Handling Setup

The error handling system is automatically configured and ready to use:

1. Custom error classes are available in `src/utils/errors.js`
2. Predefined error instances for common scenarios
3. Error factory for creating custom errors
4. Automatic error handling middleware
5. See ERROR_HANDLING_README.md for detailed usage

## Current Status

✅ **Backend Complete** - All core features implemented
✅ **Email System Working** - Gmail configured and tested
✅ **Push Notifications Working** - Web Push API implemented and tested
✅ **Error Handling System Working** - Centralized error handling implemented and tested
✅ **API Documentation** - Comprehensive docs created
✅ **Ready for Frontend** - All endpoints documented and tested

## Frontend Development Ready

The backend is now complete and ready for frontend development:

- All API endpoints documented in API_DOCS.md
- Real-time chat with WebSocket support
- Email notifications working
- Push notifications with service worker ready
- Centralized error handling with consistent error codes
- Admin dashboard functional
- Security and validation in place
