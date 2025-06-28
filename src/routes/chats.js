const express = require("express");
const router = express.Router();
const {
  getUserChats,
  createOrGetChat,
  getChatMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markChatAsRead,
  getUnreadCount,
  archiveChat,
} = require("../controllers/chatController");
const { protect } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

// Chat management routes
router.get("/", getUserChats);
router.post("/", createOrGetChat);
router.get("/unread-count", getUnreadCount);

// Chat-specific routes
router.get("/:chatId/messages", getChatMessages);
router.post("/:chatId/messages", sendMessage);
router.put("/:chatId/read", markChatAsRead);
router.put("/:chatId/archive", archiveChat);

// Message management routes
router.put("/:chatId/messages/:messageId", editMessage);
router.delete("/:chatId/messages/:messageId", deleteMessage);

module.exports = router;
