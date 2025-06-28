# Tawa Backend (AI Self-Note)

## What is this?

This is a backend for a hyper-local services marketplace (like plumber/tutor finder) built with Node.js, Express, and MongoDB. Security is a top priority (Helmet, CORS, rate limiting, JWT, input validation). The project is modular and ready for advanced features (real-time chat, email notifications, etc).

## Core Features (implemented)

- **Authentication:** JWT, role-based (customer/provider/admin), Joi validation, hashed passwords, password reset with email
- **Service Management:** CRUD, geospatial search, provider linkage, advanced filtering, text search, availability, ratings
- **Booking System:** Bookings with status lifecycle, pricing, cancellation, notes, payment status, provider/customer roles
- **Review System:** Ratings, moderation, helpful votes, one review per booking, rating aggregation
- **Enhanced Search:** Location-based, keyword, category, price, availability, and more
- **Real-time Chat:** Socket.IO, chat/message models, WebSocket server, typing indicators, read receipts
- **Email Notifications:** Nodemailer integration, welcome emails, booking confirmations, status updates, message notifications, password reset
- **Admin Dashboard & Moderation:** User/service/review moderation, analytics, admin role, moderation fields
- **Error Handling:** Centralized, async wrapper
- **Security:** Helmet, CORS, rate limiting, input validation everywhere

## Folder Structure (important for me)

- `src/models/` — User, Service, Booking, Review, Chat, Message (all robust, indexed, role-aware, moderation-ready)
- `src/controllers/` — Auth, Service, Booking, Review, Search, Chat, Admin (all RESTful, modular)
- `src/routes/` — Auth, Services, Bookings, Reviews, Search, Chats, Admin (all protected as needed)
- `src/middleware/` — Auth (JWT), isAdmin, error handler
- `src/utils/` — asyncHandler, emailService (nodemailer templates and functions)
- `src/config/` — email configuration and setup guide
- `src/socket/` — SocketServer (WebSocket, real-time chat)
- `src/app.js` — Express app, middleware, routes, error handler
- `src/server.js` — MongoDB connect, server start, WebSocket init
- `.env` — PORT, MongoDB URI, JWT secret, email config

## Implementation Reminders

- Auth: JWT, role-based (customer/provider/admin), Joi validation, password hashing, password reset with email
- Service: Geospatial, text index, provider ref, availability, status, rating, moderation (isApproved, isFeatured)
- Booking: Customer/provider, status, price, cancellation, notes, payment, indexed, email notifications
- Review: One per booking, rating, moderation (isApproved), helpful, indexed
- Search: Geospatial, keyword, category, price, availability
- Chat: Real-time, Socket.IO, JWT auth, rooms, typing, read receipts, unread counts, email notifications
- Email: Nodemailer, welcome emails, booking confirmations, status updates, message notifications, password reset
- Admin: User/service/review moderation, analytics, admin role, block/approve/feature actions
- Error handling: Centralized, async wrapper
- Security: Helmet, CORS, rate limiting, input validation
- All endpoints RESTful, protected as needed

## Email Notifications Implemented

- **Welcome Email:** Sent to new users upon registration
- **Booking Confirmation:** Sent to customers when booking is created
- **Booking Status Update:** Sent to customers when booking status changes
- **New Message Notification:** Sent to chat participants for new messages
- **Password Reset:** Sent to users requesting password reset with secure token

## What's ready?

- Project structure, dependencies, .env, .gitignore
- All core models, controllers, routes, middleware
- Security and error handling
- Real-time chat system with WebSocket
- Email notification system with nodemailer (Gmail configured)
- Admin dashboard with full moderation capabilities
- Password reset functionality
- Comprehensive API documentation (API_DOCS.md)
- Email setup guide (EMAIL_SETUP.md)
- Modular, ready for new features (file uploads, push notifications, etc)

## How to use this note

If I (the AI) need to recall the project's architecture, features, or best practices, I'll look here. If the user says "look at readme ai to remember," I'll use this as my context. If the user updates the project, I should update this note.

## Next steps (if asked)

- File uploads (multer, sharp, cloud storage)
- Push notifications (mobile/web)
- Payment integration (Stripe/PayPal)
- Advanced analytics (charts, trends)
- Multi-language support
- API documentation
- Email templates customization
- Email queuing for high volume

## For details

See the full project files, API_DOCS.md for endpoint-level docs, and EMAIL_SETUP.md for email configuration details.

## Email Setup Required

To use email notifications:

1. Set up Gmail with 2FA and App Password
2. Create .env file with email credentials
3. See EMAIL_SETUP.md for detailed instructions

## Current Status

✅ **Backend Complete** - All core features implemented
✅ **Email System Working** - Gmail configured and tested
✅ **API Documentation** - Comprehensive docs created
✅ **Ready for Frontend** - All endpoints documented and tested

## Frontend Development Ready

The backend is now complete and ready for frontend development:

- All API endpoints documented in API_DOCS.md
- Real-time chat with WebSocket support
- Email notifications working
- Admin dashboard functional
- Security and validation in place
