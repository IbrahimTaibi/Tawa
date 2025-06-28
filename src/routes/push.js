const express = require("express");
const router = express.Router();
const pushNotificationController = require("../controllers/pushNotificationController");
const { protect, isAdmin } = require("../middleware/auth");

// Public routes
router.get("/vapid-public-key", pushNotificationController.getVapidPublicKey);

// Protected routes
router.use(protect);

// Subscription management
router.post(
  "/subscribe",
  pushNotificationController.subscribeToPushNotifications,
);
router.post(
  "/unsubscribe",
  pushNotificationController.unsubscribeFromPushNotifications,
);
router.get("/subscriptions", pushNotificationController.getUserSubscriptions);

// Notification preferences
router.get(
  "/preferences",
  pushNotificationController.getNotificationPreferences,
);
router.put(
  "/preferences",
  pushNotificationController.updateNotificationPreferences,
);

// Test notification (for development)
router.post("/test", pushNotificationController.testPushNotification);

// Admin routes
router.use(isAdmin);
router.post("/broadcast", pushNotificationController.broadcastNotification);
router.get("/stats", pushNotificationController.getNotificationStats);

module.exports = router;
