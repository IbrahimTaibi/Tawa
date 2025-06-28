const asyncHandler = require("../utils/asyncHandler");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const Service = require("../models/Service");
const Booking = require("../models/Booking");
const { sendNewMessageNotification } = require("../utils/emailService");
const PushNotificationService = require("../utils/pushNotificationService");

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
    return res.status(404).json({
      success: false,
      message: "Service not found",
    });
  }

  // Validate other user exists
  const otherUser = await User.findById(otherUserId);
  if (!otherUser) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
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

  // Validate reply message if provided
  if (replyTo) {
    const replyMessage = await Message.findById(replyTo);
    if (!replyMessage || replyMessage.chatId.toString() !== chatId) {
      return res.status(400).json({
        success: false,
        message: "Invalid reply message",
      });
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

  // Increment unread count for other participants
  const otherParticipants = chat.participants.filter(
    (p) => p.toString() !== userId,
  );
  for (const participantId of otherParticipants) {
    await chat.incrementUnread(participantId);
  }

  // Populate message with sender details
  await message.populate("sender", "name email avatar");
  if (replyTo) {
    await message.populate("replyTo", "content sender");
  }

  // Send email notification to other participants (non-blocking)
  try {
    const sender = await User.findById(userId).select("name email");
    const otherParticipant = await User.findById(otherParticipants[0]).select(
      "name email",
    );

    if (sender && otherParticipant) {
      await sendNewMessageNotification(sender, otherParticipant, chatId);
    }
  } catch (emailError) {
    console.error("Failed to send message notification email:", emailError);
    // Don't fail the message sending if email fails
  }

  // Send push notification to other participants (non-blocking)
  try {
    const sender = await User.findById(userId).select("name");
    for (const participantId of otherParticipants) {
      const receiver = await User.findById(participantId).select(
        "notificationPreferences",
      );
      if (receiver && receiver.notificationPreferences?.newMessages !== false) {
        await PushNotificationService.sendNewMessageNotification(
          sender,
          message,
          participantId,
        );
      }
    }
  } catch (pushError) {
    console.error("Failed to send push notification:", pushError);
    // Don't fail the message sending if push notification fails
  }

  res.status(201).json({
    success: true,
    data: message,
    message: "Message sent successfully",
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

  // Check if user can delete the message (sender or admin)
  if (message.sender.toString() !== userId.toString()) {
    return res.status(403).json({
      success: false,
      message: "Cannot delete this message",
    });
  }

  // Soft delete the message
  await message.deleteMessage();

  res.status(200).json({
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

  // Mark chat as read
  await chat.markAsRead(userId);

  res.status(200).json({
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
};
