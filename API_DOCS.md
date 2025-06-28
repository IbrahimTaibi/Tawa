# Tawa API Documentation

## Base URL

```
http://localhost:5050/api
```

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Table of Contents

1. [Authentication](#authentication-endpoints)
2. [Services](#service-endpoints)
3. [Bookings](#booking-endpoints)
4. [Reviews](#review-endpoints)
5. [Chat](#chat-endpoints)
6. [Search](#search-endpoints)
7. [Admin](#admin-endpoints)

---

## Authentication Endpoints

### Register User

**POST** `/auth/register`

Register a new customer or provider account.

#### Customer Registration

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "customer",
  "phone": "+1234567890",
  "address": "123 Main St, City, State"
}
```

#### Provider Registration

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass123",
  "role": "provider",
  "businessName": "Jane's Plumbing",
  "serviceCategory": "Plumbing",
  "businessDescription": "Professional plumbing services",
  "phone": "+1234567890",
  "address": "456 Business Ave, City, State",
  "certifications": ["Licensed Plumber", "Insurance Certified"]
}
```

#### Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  }
}
```

### Login

**POST** `/auth/login`

```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### Request Password Reset

**POST** `/auth/forgot-password`

```json
{
  "email": "john@example.com"
}
```

### Reset Password

**POST** `/auth/reset-password`

```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123"
}
```

---

## Service Endpoints

### Create Service

**POST** `/services` _(Provider only)_

```json
{
  "title": "Professional Plumbing Service",
  "description": "Expert plumbing repairs and installations",
  "category": "Plumbing",
  "pricing": {
    "type": "hourly",
    "amount": 75,
    "currency": "USD"
  },
  "location": {
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "coordinates": {
      "lat": 40.7128,
      "lng": -74.0060
    }
  },
  "availability": {
    "monday": ["09:00-17:00"],
    "tuesday": ["09:00-17:00"],
    "wednesday": ["09:00-17:00"],
    "thursday": ["09:00-17:00"],
    "friday": ["09:00-17:00"]
  },
  "tags": ["emergency", "repair", "installation"]
}
```

### Get All Services

**GET** `/services`

#### Query Parameters

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `category` (string): Filter by category
- `location` (string): Search by location
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `rating` (number): Minimum rating filter

#### Example

```
GET /services?page=1&limit=10&category=Plumbing&location=New York&minPrice=50&maxPrice=100&rating=4
```

### Get Service by ID

**GET** `/services/:id`

### Update Service

**PUT** `/services/:id` _(Provider only)_

### Delete Service

**DELETE** `/services/:id` _(Provider only)_

---

## Booking Endpoints

### Create Booking

**POST** `/bookings` _(Customer only)_

```json
{
  "serviceId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "bookingDate": "2024-02-15T14:00:00.000Z",
  "duration": 2,
  "location": {
    "address": "789 Customer St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10002",
    "coordinates": {
      "lat": 40.7589,
      "lng": -73.9851
    }
  },
  "customerNotes": "Please bring all necessary tools"
}
```

### Get User Bookings

**GET** `/bookings`

#### Query Parameters

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status (pending, confirmed, in-progress, completed, cancelled)
- `role` (string): "customer" or "provider" (default: "customer")

### Get Booking by ID

**GET** `/bookings/:id`

### Update Booking Status

**PUT** `/bookings/:id/status` _(Provider only)_

```json
{
  "status": "confirmed",
  "providerNotes": "I'll be there on time with all tools"
}
```

### Cancel Booking

**DELETE** `/bookings/:id` _(Customer only)_

---

## Review Endpoints

### Create Review

**POST** `/reviews` _(Customer only)_

```json
{
  "bookingId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "rating": 5,
  "comment": "Excellent service! Very professional and completed the work quickly.",
  "serviceQuality": 5,
  "communication": 5,
  "punctuality": 4,
  "valueForMoney": 5
}
```

### Get Service Reviews

**GET** `/reviews/service/:serviceId`

### Get Provider Reviews

**GET** `/reviews/provider/:providerId`

### Vote Review as Helpful

**POST** `/reviews/:id/helpful`

---

## Chat Endpoints

### Get User Chats

**GET** `/chats`

### Create or Get Chat

**POST** `/chats`

```json
{
  "serviceId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "otherUserId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "bookingId": "60f7b3b3b3b3b3b3b3b3b3b3"
}
```

### Get Chat Messages

**GET** `/chats/:chatId/messages`

### Send Message

**POST** `/chats/:chatId/messages`

```json
{
  "content": "When can you come for the repair?",
  "messageType": "text",
  "attachments": [],
  "replyTo": "60f7b3b3b3b3b3b3b3b3b3b3"
}
```

### Edit Message

**PUT** `/chats/:chatId/messages/:messageId`

### Delete Message

**DELETE** `/chats/:chatId/messages/:messageId`

### Mark Chat as Read

**PUT** `/chats/:chatId/read`

### Get Unread Count

**GET** `/chats/unread-count`

---

## Search Endpoints

### Search Services

**GET** `/search/services`

#### Query Parameters

- `q` (string): Search query
- `location` (string): Location for geospatial search
- `category` (string): Service category
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `rating` (number): Minimum rating
- `availability` (string): Date for availability check
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)

#### Example

```
GET /search/services?q=plumbing&location=New York&category=Plumbing&minPrice=50&maxPrice=100&rating=4&availability=2024-02-15
```

### Search Providers

**GET** `/search/providers`

### Get Popular Categories

**GET** `/search/categories`

---

## Admin Endpoints

_All admin endpoints require admin role authentication_

### Get Dashboard Stats

**GET** `/admin/dashboard`

### Get Users for Moderation

**GET** `/admin/users`

### Moderate User

**PUT** `/admin/users/:id/moderate`

```json
{
  "action": "block",
  "reason": "Violation of terms of service",
  "notes": "User was reported for inappropriate behavior"
}
```

### Get Services for Moderation

**GET** `/admin/services`

### Moderate Service

**PUT** `/admin/services/:id/moderate`

### Get Reviews for Moderation

**GET** `/admin/reviews`

### Moderate Review

**PUT** `/admin/reviews/:id/moderate`

---

## WebSocket Events (Real-time Chat)

### Connection

```javascript
// Connect to WebSocket
const socket = io('http://localhost:5050', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### Join Chat Room

```javascript
socket.emit('join-chat', { chatId: 'chat-id' });
```

#### Send Message

```javascript
socket.emit('send-message', {
  chatId: 'chat-id',
  content: 'Hello!',
  messageType: 'text'
});
```

#### Typing Indicator

```javascript
socket.emit('typing', { chatId: 'chat-id', isTyping: true });
```

#### Listen for Messages

```javascript
socket.on('new-message', (message) => {
  console.log('New message:', message);
});
```

---

## Error Responses

### Validation Error (400)

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Authentication Error (401)

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### Authorization Error (403)

```json
{
  "success": false,
  "message": "Access denied"
}
```

### Not Found Error (404)

```json
{
  "success": false,
  "message": "Service not found"
}
```

---

## Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 5 requests per 15 minutes per IP

Rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

---

## Testing

You can test the API using:

- **Postman**
- **Insomnia**
- **cURL**
- **Frontend application**

### Example cURL Commands

#### Register User

```bash
curl -X POST http://localhost:5050/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "role": "customer"
  }'
```

#### Create Service

```bash
curl -X POST http://localhost:5050/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Professional Plumbing Service",
    "description": "Expert plumbing repairs",
    "category": "Plumbing",
    "pricing": {
      "type": "hourly",
      "amount": 75,
      "currency": "USD"
    }
  }'
```

---

## Email Notifications

The API automatically sends email notifications for:

- **Welcome emails** on user registration
- **Booking confirmations** when bookings are created
- **Status updates** when booking status changes
- **Message notifications** for new chat messages
- **Password reset** emails with secure links

---

## Support

For API support or questions:

- Check the error responses for specific issues
- Verify your authentication token is valid
- Ensure all required fields are provided
- Check rate limiting if you're getting 429 errors
