# Push Notifications System - Tawa

## Overview

Tawa implements a comprehensive push notification system using the Web Push API and service workers. This system provides real-time notifications for various events in the marketplace.

## Features

- **Real-time Notifications**: Instant push notifications for important events
- **User Preferences**: Granular control over notification types
- **Cross-platform**: Works on web browsers and mobile devices
- **Rich Notifications**: Support for actions, icons, and deep linking
- **Admin Broadcasting**: Send notifications to all users or filtered groups
- **Analytics**: Track notification engagement and delivery

## Notification Types

### 1. New Booking Notifications

- **Recipient**: Service Provider
- **Trigger**: When a customer books a service
- **Actions**: View Booking, Accept
- **Data**: Booking ID, Service ID, URL

### 2. Booking Status Updates

- **Recipient**: Customer
- **Trigger**: When provider updates booking status
- **Actions**: View Booking
- **Data**: Booking ID, New Status, URL

### 3. New Message Notifications

- **Recipient**: Chat participants
- **Trigger**: When a new message is sent
- **Actions**: Reply, View Chat
- **Data**: Message ID, Chat ID, Sender ID, URL

### 4. New Review Notifications

- **Recipient**: Service Provider
- **Trigger**: When a customer leaves a review
- **Actions**: View Review
- **Data**: Review ID, Service ID, Rating, URL

### 5. Service Approval Notifications

- **Recipient**: Service Provider
- **Trigger**: When admin approves a service
- **Actions**: View Service
- **Data**: Service ID, URL

### 6. Booking Reminders

- **Recipient**: Both Customer and Provider
- **Trigger**: Scheduled reminders before booking
- **Actions**: View Booking
- **Data**: Booking ID, URL

## Technical Implementation

### Backend Components

#### 1. Push Notification Service (`src/utils/pushNotificationService.js`)

```javascript
// Core service for managing push notifications
class PushNotificationService {
  // VAPID key management
  static getVapidPublicKey()

  // Subscription management
  static addSubscription(userId, subscription)
  static removeSubscription(userId, subscription)

  // Notification sending
  static sendNotificationToUser(userId, notification)
  static sendNotificationToUsers(userIds, notification)
  static sendNotificationToAll(notification)

  // Predefined notification templates
  static getNotificationTemplates()

  // Specific notification methods
  static sendNewBookingNotification(booking, service, providerId)
  static sendBookingStatusNotification(booking, newStatus, customerId)
  static sendNewMessageNotification(sender, message, receiverId)
  static sendNewReviewNotification(review, service, providerId)
  static sendServiceApprovedNotification(service, providerId)
  static sendBookingReminderNotification(booking, hours, userId)
}
```

#### 2. Push Notification Controller (`src/controllers/pushNotificationController.js`)

- Subscription management endpoints
- Notification preferences
- Test notifications
- Admin broadcasting
- Statistics and analytics

#### 3. User Model Updates

```javascript
// Added to User schema
pushSubscriptions: [{
  endpoint: String,
  keys: {
    p256dh: String,
    auth: String
  }
}],
notificationPreferences: {
  newBookings: Boolean,
  bookingUpdates: Boolean,
  newMessages: Boolean,
  newReviews: Boolean,
  serviceApprovals: Boolean,
  reminders: Boolean
}
```

### Frontend Components

#### 1. Service Worker (`public/sw.js`)

- Handles push events
- Shows notifications
- Manages notification clicks
- Handles deep linking
- Background sync support

#### 2. Web App Manifest (`public/manifest.json`)

- PWA configuration
- App icons and shortcuts
- Theme colors
- Display settings

## API Endpoints

### Public Endpoints

```
GET /api/push/vapid-public-key
```

### Protected Endpoints

```
POST /api/push/subscribe
POST /api/push/unsubscribe
GET /api/push/subscriptions
GET /api/push/preferences
PUT /api/push/preferences
POST /api/push/test
```

### Admin Endpoints

```
POST /api/push/broadcast
GET /api/push/stats
```

## Setup Instructions

### 1. Environment Variables

Add to your `.env` file:

```env
# Push Notification Settings
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=your-email@example.com
```

### 2. Generate VAPID Keys

```bash
# The service automatically generates keys, but you can set custom ones
# Replace the email in pushNotificationService.js with your actual email
```

### 3. Frontend Integration

```javascript
// Request notification permission
const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

// Subscribe to push notifications
const subscribeToPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey
    });

    // Send subscription to backend
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ subscription })
    });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
  }
};
```

## Usage Examples

### Sending a Notification

```javascript
// Backend - Send new booking notification
await PushNotificationService.sendNewBookingNotification(booking, service, providerId);

// Backend - Send custom notification
const notification = {
  title: 'Custom Title',
  body: 'Custom message',
  icon: '/icon-192x192.png',
  data: {
    type: 'custom',
    url: '/custom-page'
  }
};
await PushNotificationService.sendNotificationToUser(userId, notification);
```

### Admin Broadcasting

```javascript
// Send to all users
await fetch('/api/push/broadcast', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    title: 'System Maintenance',
    body: 'We will be performing maintenance tonight at 2 AM',
    data: { type: 'maintenance' }
  })
});

// Send to specific user group
await fetch('/api/push/broadcast', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    title: 'New Feature Available',
    body: 'Check out our new booking system!',
    data: { type: 'feature_update' },
    filters: { role: 'provider' }
  })
});
```

## Security Considerations

1. **VAPID Keys**: Store private keys securely, never expose them to frontend
2. **User Consent**: Always request explicit permission before subscribing
3. **Rate Limiting**: Implement rate limiting on notification endpoints
4. **Data Validation**: Validate all notification data before sending
5. **HTTPS Required**: Push notifications only work over HTTPS

## Testing

### Test Notification

```bash
curl -X POST http://localhost:5000/api/push/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test push notification",
    "data": {"type": "test"}
  }'
```

### Check Subscription Status

```bash
curl -X GET http://localhost:5000/api/push/subscriptions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Common Issues

1. **Notifications not showing**

   - Check browser permissions
   - Verify service worker registration
   - Check VAPID key configuration

2. **Subscription errors**

   - Ensure HTTPS is enabled
   - Check VAPID key format
   - Verify user authentication

3. **Service worker not updating**
   - Clear browser cache
   - Check service worker version
   - Verify file paths

### Debug Mode

Enable debug logging in the service worker:

```javascript
// Add to sw.js
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  // ... rest of the code
});
```

## Performance Optimization

1. **Batch Notifications**: Group multiple notifications when possible
2. **Lazy Loading**: Load notification preferences on demand
3. **Caching**: Cache VAPID keys and user preferences
4. **Error Handling**: Implement retry logic for failed notifications
5. **Analytics**: Track notification delivery and engagement

## Future Enhancements

1. **Rich Media**: Support for images and videos in notifications
2. **Scheduled Notifications**: Send notifications at specific times
3. **Geolocation**: Location-based notifications
4. **A/B Testing**: Test different notification formats
5. **Advanced Analytics**: Detailed engagement metrics
6. **Mobile App Integration**: Native app push notifications

## Support

For issues or questions about the push notification system:

1. Check the troubleshooting section
2. Review browser console logs
3. Verify API endpoint responses
4. Test with different browsers
5. Check service worker registration status
