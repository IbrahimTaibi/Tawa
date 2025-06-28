const asyncHandler = require("../utils/asyncHandler");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const Service = require("../models/Service");
const Booking = require("../models/Booking");
const { sendNewMessageNotification } = require("../utils/emailService");
const PushNotificationService = require("../utils/pushNotificationService");
const {
  Errors,
  ErrorFactory,
  NotFoundError,
  AuthorizationError,
  ValidationError,
} = require("../utils/errors");

// @desc    Get all chats for a user
// @route   GET /api/chats
// @access  Private
const getUserChats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const chats = await Chat.find({
    participants: userId,
    isActive: true,
  })
    .populate("participants", "name email avatar")
    .populate("serviceId", "title category price")
    .populate("lastMessage", "content createdAt sender")
    .populate("bookingId", "status totalAmount")
    .sort({ lastMessageAt: -1 });

  // Add unread count for each chat
  const chatsWithUnreadCount = chats.map((chat) => {
    const chatObj = chat.toObject();
    chatObj.unreadCount = chat.getUnreadCount(userId);
    return chatObj;
  });

  res.status(200).json({
    success: true,
    data: chatsWithUnreadCount,
  });
});

// @desc    Get or create chat between users for a service
// @route   POST /api/chats
// @access  Private
const createOrGetChat = asyncHandler(async (req, res) => {
  const { serviceId, otherUserId, bookingId } = req.body;
  const userId = req.user.id;

  // Validate service exists
  const service = await Service.findById(serviceId);
  if (!service) {
    throw new NotFoundError("Service not found");
  }

  // Validate other user exists
  const otherUser = await User.findById(otherUserId);
  if (!otherUser) {
    throw new NotFoundError("User not found");
  }

  // Check if chat already exists
  let chat = await Chat.findOne({
    participants: { $all: [userId, otherUserId] },
    serviceId: serviceId,
    isActive: true,
  })
    .populate("participants", "name email avatar")
    .populate("serviceId", "title category price");

  if (chat) {
    // Mark messages as read for the current user
    await chat.markAsRead(userId);

    return res.status(200).json({
      success: true,
      data: chat,
      message: "Chat found",
    });
  }

  // Create new chat
  chat = new Chat({
    participants: [userId, otherUserId],
    serviceId: serviceId,
    bookingId: bookingId || null,
  });

  await chat.save();

  // Populate the chat with user and service details
  await chat.populate("participants", "name email avatar");
  await chat.populate("serviceId", "title category price");

  res.status(201).json({
    success: true,
    data: chat,
    message: "Chat created successfully",
  });
});

// @desc    Get messages for a specific chat
// @route   GET /api/chats/:chatId/messages
// @access  Private
const getChatMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;
  const { page = 1, limit = 50 } = req.query;

  // Verify user is participant in the chat
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new NotFoundError("Chat not found");
  }

  if (!chat.participants.includes(userId)) {
    throw new AuthorizationError("Access denied");
  }

  // Mark messages as read
  await chat.markAsRead(userId);

  // Get messages with pagination
  const skip = (page - 1) * limit;
  const messages = await Message.find({
    chatId: chatId,
    isDeleted: false,
  })
    .populate("sender", "name email avatar")
    .populate("replyTo", "content sender")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const totalMessages = await Message.countDocuments({
    chatId: chatId,
    isDeleted: false,
  });

  res.status(200).json({
    success: true,
    data: messages.reverse(), // Return in chronological order
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
      hasNext: skip + messages.length < totalMessages,
      hasPrev: page > 1,
    },
  });
});

// @desc    Send a message
// @route   POST /api/chats/:chatId/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { content, messageType = "text", attachments = [], replyTo } = req.body;
  const userId = req.user.id;

  // Validate chat exists and user is participant
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new NotFoundError("Chat not found");
  }

  if (!chat.participants.includes(userId)) {
    throw new AuthorizationError("Access denied");
  }

  // Validate reply message if provided
  if (replyTo) {
    const replyMessage = await Message.findById(replyTo);
    if (!replyMessage || replyMessage.chatId.toString() !== chatId) {
      throw new ValidationError("Invalid reply message");
    }
  }

  // Create new message
  const message = new Message({
    chatId,
    sender: userId,
    content,
    messageType,
    attachments,
    replyTo,
  });

  await message.save();

  // Populate message with sender details
  await message.populate("sender", "name email avatar");
  await message.populate("replyTo", "content sender");

  // Update chat's last message
  chat.lastMessage = message._id;
  chat.lastMessageAt = new Date();
  await chat.save();

  // Get other participants for notifications
  const otherParticipants = chat.participants.filter(
    (participant) => participant.toString() !== userId,
  );

  // Send email notifications to other participants (non-blocking)
  try {
    for (const participantId of otherParticipants) {
      const participant = await User.findById(participantId);
      if (
        participant &&
        participant.notificationPreferences?.newMessages !== false
      ) {
        await sendNewMessageNotification(
          participant,
          message,
          chat,
          req.user.name,
        );
      }
    }
  } catch (emailError) {
    console.error("Failed to send email notifications:", emailError);
  }

  // Send push notifications to other participants (non-blocking)
  try {
    for (const participantId of otherParticipants) {
      const participant = await User.findById(participantId);
      if (
        participant &&
        participant.notificationPreferences?.newMessages !== false
      ) {
        await PushNotificationService.sendNewMessageNotification(
          message,
          chat,
          participantId,
        );
      }
    }
  } catch (pushError) {
    console.error("Failed to send push notifications:", pushError);
  }

  res.status(201).json({
    success: true,
    message: "Message sent successfully",
    data: message,
  });
});

// @desc    Edit a message
// @route   PUT /api/chats/:chatId/messages/:messageId
// @access  Private
const editMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  // Validate chat exists and user is participant
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return res.status(404).json({
      success: false,
      message: "Chat not found",
    });
  }

  if (!chat.participants.includes(userId)) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  // Find and validate message
  const message = await Message.findById(messageId);
  if (!message || message.chatId.toString() !== chatId) {
    return res.status(404).json({
      success: false,
      message: "Message not found",
    });
  }

  // Check if user can edit the message
  if (!message.canEdit(userId)) {
    return res.status(403).json({
      success: false,
      message: "Cannot edit this message",
    });
  }

  // Edit the message
  await message.editMessage(content);
  await message.populate("sender", "name email avatar");

  res.status(200).json({
    success: true,
    data: message,
    message: "Message edited successfully",
  });
});

// @desc    Delete a message
// @route   DELETE /api/chats/:chatId/messages/:messageId
// @access  Private
const deleteMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;
  const userId = req.user.id;

  const message = await Message.findById(messageId);
  if (!message) {
    throw new NotFoundError("Message not found");
  }

  if (message.chatId.toString() !== chatId) {
    throw new ValidationError("Message does not belong to this chat");
  }

  if (message.sender.toString() !== userId) {
    throw new AuthorizationError("You can only delete your own messages");
  }

  // Soft delete the message
  message.isDeleted = true;
  message.deletedAt = new Date();
  await message.save();

  res.json({
    success: true,
    message: "Message deleted successfully",
  });
});

// @desc    Mark chat as read
// @route   PUT /api/chats/:chatId/read
// @access  Private
const markChatAsRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new NotFoundError("Chat not found");
  }

  if (!chat.participants.includes(userId)) {
    throw new AuthorizationError("Access denied");
  }

  await chat.markAsRead(userId);

  res.json({
    success: true,
    message: "Chat marked as read",
  });
});

// @desc    Get unread message count for user
// @route   GET /api/chats/unread-count
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const chats = await Chat.find({
    participants: userId,
    isActive: true,
  });

  let totalUnread = 0;
  const unreadByChat = {};

  chats.forEach((chat) => {
    const unreadCount = chat.getUnreadCount(userId);
    totalUnread += unreadCount;
    if (unreadCount > 0) {
      unreadByChat[chat._id] = unreadCount;
    }
  });

  res.status(200).json({
    success: true,
    data: {
      totalUnread,
      unreadByChat,
    },
  });
});

// @desc    Archive/Deactivate a chat
// @route   PUT /api/chats/:chatId/archive
// @access  Private
const archiveChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  // Validate chat exists and user is participant
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return res.status(404).json({
      success: false,
      message: "Chat not found",
    });
  }

  if (!chat.participants.includes(userId)) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  // Archive the chat
  chat.isActive = false;
  await chat.save();

  res.status(200).json({
    success: true,
    message: "Chat archived successfully",
  });
});

// @desc    Get chat statistics
// @route   GET /api/chats/:chatId/stats
// @access  Private
const getChatStats = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new NotFoundError("Chat not found");
  }

  if (!chat.participants.includes(userId)) {
    throw new AuthorizationError("Access denied");
  }

  const stats = await Message.aggregate([
    {
      $match: {
        chatId: chat._id,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        totalAttachments: {
          $sum: { $size: { $ifNull: ["$attachments", []] } },
        },
      },
    },
  ]);

  const unreadCount = chat.getUnreadCount(userId);

  res.json({
    success: true,
    data: {
      totalMessages: stats[0]?.totalMessages || 0,
      totalAttachments: stats[0]?.totalAttachments || 0,
      unreadCount,
      participants: chat.participants.length,
    },
  });
});

module.exports = {
  getUserChats,
  createOrGetChat,
  getChatMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markChatAsRead,
  getUnreadCount,
  archiveChat,
  getChatStats,
};
