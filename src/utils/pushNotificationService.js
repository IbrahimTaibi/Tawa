const webpush = require("web-push");
const User = require("../models/User");

// Generate VAPID keys (you should store these in environment variables)
const vapidKeys = webpush.generateVAPIDKeys();

// Configure web-push
webpush.setVapidDetails(
  "mailto:your-email@example.com", // Replace with your email
  vapidKeys.publicKey,
  vapidKeys.privateKey,
);

// Store subscriptions in memory (in production, use database)
const subscriptions = new Map();

// Push notification service
class PushNotificationService {
  // Get VAPID public key for frontend
  static getVapidPublicKey() {
    return vapidKeys.publicKey;
  }

  // Add subscription for a user
  static addSubscription(userId, subscription) {
    if (!subscriptions.has(userId)) {
      subscriptions.set(userId, []);
    }
    subscriptions.get(userId).push(subscription);

    // Also save to user model
    User.findByIdAndUpdate(userId, {
      $addToSet: { pushSubscriptions: subscription },
    }).catch((err) => console.error("Error saving subscription:", err));
  }

  // Remove subscription for a user
  static removeSubscription(userId, subscription) {
    if (subscriptions.has(userId)) {
      const userSubs = subscriptions.get(userId);
      const index = userSubs.findIndex(
        (sub) => sub.endpoint === subscription.endpoint,
      );
      if (index > -1) {
        userSubs.splice(index, 1);
      }
    }

    // Also remove from user model
    User.findByIdAndUpdate(userId, {
      $pull: { pushSubscriptions: subscription },
    }).catch((err) => console.error("Error removing subscription:", err));
  }

  // Send notification to a specific user
  static async sendNotificationToUser(userId, notification) {
    try {
      const user = await User.findById(userId);
      if (
        !user ||
        !user.pushSubscriptions ||
        user.pushSubscriptions.length === 0
      ) {
        return { success: false, message: "No subscriptions found for user" };
      }

      const results = [];
      for (const subscription of user.pushSubscriptions) {
        try {
          const result = await webpush.sendNotification(
            subscription,
            JSON.stringify(notification),
          );
          results.push({ success: true, subscription, result });
        } catch (error) {
          console.error("Push notification error:", error);
          // Remove invalid subscription
          if (error.statusCode === 410) {
            this.removeSubscription(userId, subscription);
          }
          results.push({ success: false, subscription, error: error.message });
        }
      }

      return {
        success: true,
        message: `Sent to ${results.filter((r) => r.success).length} devices`,
        results,
      };
    } catch (error) {
      console.error("Error sending push notification:", error);
      return { success: false, error: error.message };
    }
  }

  // Send notification to multiple users
  static async sendNotificationToUsers(userIds, notification) {
    const results = [];
    for (const userId of userIds) {
      const result = await this.sendNotificationToUser(userId, notification);
      results.push({ userId, ...result });
    }
    return results;
  }

  // Send notification to all users
  static async sendNotificationToAll(notification) {
    try {
      const users = await User.find({
        pushSubscriptions: { $exists: true, $ne: [] },
      });
      const userIds = users.map((user) => user._id);
      return await this.sendNotificationToUsers(userIds, notification);
    } catch (error) {
      console.error("Error sending notification to all users:", error);
      return { success: false, error: error.message };
    }
  }

  // Predefined notification templates
  static getNotificationTemplates() {
    return {
      // New booking notification
      newBooking: (booking, service) => ({
        title: "New Booking Received!",
        body: `You have a new booking for ${service.title}`,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        data: {
          type: "new_booking",
          bookingId: booking._id,
          serviceId: service._id,
          url: `/bookings/${booking._id}`,
        },
        actions: [
          {
            action: "view",
            title: "View Booking",
            icon: "/view-icon.png",
          },
          {
            action: "accept",
            title: "Accept",
            icon: "/accept-icon.png",
          },
        ],
      }),

      // Booking status update
      bookingStatusUpdate: (booking, newStatus) => ({
        title: "Booking Status Updated",
        body: `Your booking status has been updated to ${newStatus}`,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        data: {
          type: "booking_status_update",
          bookingId: booking._id,
          status: newStatus,
          url: `/bookings/${booking._id}`,
        },
      }),

      // New message notification
      newMessage: (sender, message) => ({
        title: `New Message from ${sender.name}`,
        body:
          message.content.substring(0, 100) +
          (message.content.length > 100 ? "..." : ""),
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        data: {
          type: "new_message",
          messageId: message._id,
          chatId: message.chatId,
          senderId: sender._id,
          url: `/chat/${message.chatId}`,
        },
        actions: [
          {
            action: "reply",
            title: "Reply",
            icon: "/reply-icon.png",
          },
          {
            action: "view",
            title: "View Chat",
            icon: "/view-icon.png",
          },
        ],
      }),

      // New review notification
      newReview: (review, service) => ({
        title: "New Review Received!",
        body: `You received a ${review.rating}-star review for ${service.title}`,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        data: {
          type: "new_review",
          reviewId: review._id,
          serviceId: service._id,
          rating: review.rating,
          url: `/services/${service._id}/reviews`,
        },
      }),

      // Service approval notification
      serviceApproved: (service) => ({
        title: "Service Approved!",
        body: `Your service "${service.title}" has been approved and is now live`,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        data: {
          type: "service_approved",
          serviceId: service._id,
          url: `/services/${service._id}`,
        },
      }),

      // Reminder notification
      bookingReminder: (booking, hours) => ({
        title: "Booking Reminder",
        body: `You have a booking in ${hours} hour(s)`,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        data: {
          type: "booking_reminder",
          bookingId: booking._id,
          url: `/bookings/${booking._id}`,
        },
      }),
    };
  }

  // Send specific notification types
  static async sendNewBookingNotification(booking, service, providerId) {
    const templates = this.getNotificationTemplates();
    const notification = templates.newBooking(booking, service);
    return await this.sendNotificationToUser(providerId, notification);
  }

  static async sendBookingStatusNotification(booking, newStatus, customerId) {
    const templates = this.getNotificationTemplates();
    const notification = templates.bookingStatusUpdate(booking, newStatus);
    return await this.sendNotificationToUser(customerId, notification);
  }

  static async sendNewMessageNotification(sender, message, receiverId) {
    const templates = this.getNotificationTemplates();
    const notification = templates.newMessage(sender, message);
    return await this.sendNotificationToUser(receiverId, notification);
  }

  static async sendNewReviewNotification(review, service, providerId) {
    const templates = this.getNotificationTemplates();
    const notification = templates.newReview(review, service);
    return await this.sendNotificationToUser(providerId, notification);
  }

  static async sendServiceApprovedNotification(service, providerId) {
    const templates = this.getNotificationTemplates();
    const notification = templates.serviceApproved(service);
    return await this.sendNotificationToUser(providerId, notification);
  }

  static async sendBookingReminderNotification(booking, hours, userId) {
    const templates = this.getNotificationTemplates();
    const notification = templates.bookingReminder(booking, hours);
    return await this.sendNotificationToUser(userId, notification);
  }
}

module.exports = PushNotificationService;
