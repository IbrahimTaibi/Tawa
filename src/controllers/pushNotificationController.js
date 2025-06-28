const asyncHandler = require("../utils/asyncHandler");
const PushNotificationService = require("../utils/pushNotificationService");
const User = require("../models/User");

// @desc    Get VAPID public key
// @route   GET /api/push/vapid-public-key
// @access  Public
const getVapidPublicKey = asyncHandler(async (req, res) => {
  const publicKey = PushNotificationService.getVapidPublicKey();

  res.json({
    success: true,
    publicKey,
  });
});

// @desc    Subscribe to push notifications
// @route   POST /api/push/subscribe
// @access  Private
const subscribeToPushNotifications = asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  const userId = req.user.id;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({
      success: false,
      message: "Invalid subscription object",
    });
  }

  // Add subscription to user
  PushNotificationService.addSubscription(userId, subscription);

  res.json({
    success: true,
    message: "Successfully subscribed to push notifications",
  });
});

// @desc    Unsubscribe from push notifications
// @route   POST /api/push/unsubscribe
// @access  Private
const unsubscribeFromPushNotifications = asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  const userId = req.user.id;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({
      success: false,
      message: "Invalid subscription object",
    });
  }

  // Remove subscription from user
  PushNotificationService.removeSubscription(userId, subscription);

  res.json({
    success: true,
    message: "Successfully unsubscribed from push notifications",
  });
});

// @desc    Update notification preferences
// @route   PUT /api/push/preferences
// @access  Private
const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { notificationPreferences } = req.body;

  if (!notificationPreferences) {
    return res.status(400).json({
      success: false,
      message: "Notification preferences are required",
    });
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { notificationPreferences },
    { new: true, runValidators: true },
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.json({
    success: true,
    message: "Notification preferences updated successfully",
    notificationPreferences: user.notificationPreferences,
  });
});

// @desc    Get notification preferences
// @route   GET /api/push/preferences
// @access  Private
const getNotificationPreferences = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId).select("notificationPreferences");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.json({
    success: true,
    notificationPreferences: user.notificationPreferences,
  });
});

// @desc    Get user subscriptions
// @route   GET /api/push/subscriptions
// @access  Private
const getUserSubscriptions = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId).select("pushSubscriptions");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.json({
    success: true,
    subscriptions: user.pushSubscriptions || [],
  });
});

// @desc    Test push notification (for development)
// @route   POST /api/push/test
// @access  Private
const testPushNotification = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { title, body, data } = req.body;

  const notification = {
    title: title || "Test Notification",
    body: body || "This is a test push notification",
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    data: data || { type: "test" },
  };

  const result = await PushNotificationService.sendNotificationToUser(
    userId,
    notification,
  );

  res.json({
    success: true,
    message: "Test notification sent",
    result,
  });
});

// @desc    Send notification to all users (admin only)
// @route   POST /api/push/broadcast
// @access  Private (Admin)
const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, body, data, filters } = req.body;

  if (!title || !body) {
    return res.status(400).json({
      success: false,
      message: "Title and body are required",
    });
  }

  const notification = {
    title,
    body,
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    data: data || { type: "broadcast" },
  };

  let result;
  if (filters) {
    // Apply filters to target specific users
    const query = {};
    if (filters.role) query.role = filters.role;
    if (filters.category) query.serviceCategory = filters.category;

    const users = await User.find(query).select("_id");
    const userIds = users.map((user) => user._id);
    result = await PushNotificationService.sendNotificationToUsers(
      userIds,
      notification,
    );
  } else {
    // Send to all users
    result = await PushNotificationService.sendNotificationToAll(notification);
  }

  res.json({
    success: true,
    message: "Broadcast notification sent",
    result,
  });
});

// @desc    Get notification statistics (admin only)
// @route   GET /api/push/stats
// @access  Private (Admin)
const getNotificationStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const usersWithSubscriptions = await User.countDocuments({
    pushSubscriptions: { $exists: true, $ne: [] },
  });

  const stats = {
    totalUsers,
    usersWithSubscriptions,
    subscriptionRate:
      totalUsers > 0
        ? ((usersWithSubscriptions / totalUsers) * 100).toFixed(2)
        : 0,
    subscriptionsByRole: {
      customer: await User.countDocuments({
        role: "customer",
        pushSubscriptions: { $exists: true, $ne: [] },
      }),
      provider: await User.countDocuments({
        role: "provider",
        pushSubscriptions: { $exists: true, $ne: [] },
      }),
      admin: await User.countDocuments({
        role: "admin",
        pushSubscriptions: { $exists: true, $ne: [] },
      }),
    },
  };

  res.json({
    success: true,
    stats,
  });
});

module.exports = {
  getVapidPublicKey,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  updateNotificationPreferences,
  getNotificationPreferences,
  getUserSubscriptions,
  testPushNotification,
  broadcastNotification,
  getNotificationStats,
};
