// Service Worker for Tawa Push Notifications

const CACHE_NAME = "tawa-v1";
const urlsToCache = [
  "/",
  "/static/js/bundle.js",
  "/static/css/main.css",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/badge-72x72.png",
];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    }),
  );
});

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    }),
  );
});

// Push event - Handle incoming push notifications
self.addEventListener("push", (event) => {
  console.log("Push event received:", event);

  let notificationData = {
    title: "Tawa Notification",
    body: "You have a new notification",
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    data: {
      type: "default",
      url: "/",
    },
  };

  // Parse notification data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
      };
    } catch (error) {
      console.error("Error parsing push data:", error);
    }
  }

  // Show notification
  const notificationPromise = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      actions: notificationData.actions || [],
      requireInteraction: false,
      silent: false,
      tag: notificationData.data.type || "default",
      renotify: true,
    },
  );

  event.waitUntil(notificationPromise);
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  event.notification.close();

  const notificationData = event.notification.data;
  let urlToOpen = "/";

  // Handle different notification types
  switch (notificationData.type) {
    case "new_booking":
      urlToOpen = `/bookings/${notificationData.bookingId}`;
      break;
    case "booking_status_update":
      urlToOpen = `/bookings/${notificationData.bookingId}`;
      break;
    case "new_message":
      urlToOpen = `/chat/${notificationData.chatId}`;
      break;
    case "new_review":
      urlToOpen = `/services/${notificationData.serviceId}/reviews`;
      break;
    case "service_approved":
      urlToOpen = `/services/${notificationData.serviceId}`;
      break;
    case "booking_reminder":
      urlToOpen = `/bookings/${notificationData.bookingId}`;
      break;
    default:
      urlToOpen = notificationData.url || "/";
  }

  // Handle notification actions
  if (event.action) {
    switch (event.action) {
      case "view":
        // Open the main URL
        break;
      case "accept":
        // Handle accept action (e.g., accept booking)
        if (notificationData.type === "new_booking") {
          urlToOpen = `/bookings/${notificationData.bookingId}/accept`;
        }
        break;
      case "reply":
        // Handle reply action (e.g., reply to message)
        if (notificationData.type === "new_message") {
          urlToOpen = `/chat/${notificationData.chatId}?reply=true`;
        }
        break;
    }
  }

  // Open the URL
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus();
          }
        }

        // If no window/tab is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});

// Notification close event
self.addEventListener("notificationclose", (event) => {
  console.log("Notification closed:", event);

  // You can send analytics data here
  const notificationData = event.notification.data;

  // Example: Send analytics to your server
  if (notificationData.type) {
    fetch("/api/analytics/notification-closed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: notificationData.type,
        timestamp: new Date().toISOString(),
      }),
    }).catch((error) => {
      console.error("Error sending analytics:", error);
    });
  }
});

// Background sync for offline functionality
self.addEventListener("sync", (event) => {
  console.log("Background sync event:", event);

  if (event.tag === "background-sync") {
    event.waitUntil(
      // Handle background sync tasks
      console.log("Background sync completed"),
    );
  }
});

// Message event - Handle messages from main thread
self.addEventListener("message", (event) => {
  console.log("Message received in service worker:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
