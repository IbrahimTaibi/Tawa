const jwt = require("jsonwebtoken");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");

class SocketServer {
  constructor(server) {
    this.io = require("socket.io")(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    this.userSockets = new Map(); // userId -> socketId
    this.socketUsers = new Map(); // socketId -> userId

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token || socket.handshake.headers.authorization;

        if (!token) {
          return next(new Error("Authentication error: No token provided"));
        }

        // Remove 'Bearer ' prefix if present
        const cleanToken = token.replace("Bearer ", "");

        const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
          return next(new Error("Authentication error: User not found"));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        next(new Error("Authentication error: Invalid token"));
      }
    });
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`User ${socket.userId} connected with socket ${socket.id}`);

      this.handleConnection(socket);
      this.handleDisconnection(socket);
      this.handleJoinChat(socket);
      this.handleLeaveChat(socket);
      this.handleSendMessage(socket);
      this.handleTyping(socket);
      this.handleStopTyping(socket);
      this.handleReadReceipt(socket);
    });
  }

  handleConnection(socket) {
    // Store user-socket mapping
    this.userSockets.set(socket.userId, socket.id);
    this.socketUsers.set(socket.id, socket.userId);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Emit online status to other users
    socket.broadcast.emit("user_online", {
      userId: socket.userId,
      timestamp: new Date(),
    });
  }

  handleDisconnection(socket) {
    console.log(`User ${socket.userId} disconnected`);

    // Remove user-socket mapping
    this.userSockets.delete(socket.userId);
    this.socketUsers.delete(socket.id);

    // Emit offline status to other users
    socket.broadcast.emit("user_offline", {
      userId: socket.userId,
      timestamp: new Date(),
    });
  }

  handleJoinChat(socket) {
    socket.on("join_chat", async (data) => {
      try {
        const { chatId } = data;

        // Verify user is participant in the chat
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(socket.userId)) {
          socket.emit("error", { message: "Access denied to chat" });
          return;
        }

        // Join the chat room
        socket.join(`chat_${chatId}`);

        // Mark messages as read
        await chat.markAsRead(socket.userId);

        socket.emit("joined_chat", { chatId });
        console.log(`User ${socket.userId} joined chat ${chatId}`);
      } catch (error) {
        console.error("Error joining chat:", error);
        socket.emit("error", { message: "Error joining chat" });
      }
    });
  }

  handleLeaveChat(socket) {
    socket.on("leave_chat", (data) => {
      const { chatId } = data;
      socket.leave(`chat_${chatId}`);
      socket.emit("left_chat", { chatId });
      console.log(`User ${socket.userId} left chat ${chatId}`);
    });
  }

  handleSendMessage(socket) {
    socket.on("send_message", async (data) => {
      try {
        const {
          chatId,
          content,
          messageType = "text",
          attachments = [],
          replyTo,
        } = data;

        // Verify chat exists and user is participant
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(socket.userId)) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        // Create new message
        const message = new Message({
          chatId,
          sender: socket.userId,
          content,
          messageType,
          attachments,
          replyTo,
        });

        await message.save();

        // Increment unread count for other participants
        const otherParticipants = chat.participants.filter(
          (p) => p.toString() !== socket.userId,
        );
        for (const participantId of otherParticipants) {
          await chat.incrementUnread(participantId);
        }

        // Populate message with sender details
        await message.populate("sender", "name email avatar");
        if (replyTo) {
          await message.populate("replyTo", "content sender");
        }

        // Emit message to chat room
        this.io.to(`chat_${chatId}`).emit("new_message", {
          message,
          chatId,
        });

        // Emit notification to other participants
        otherParticipants.forEach((participantId) => {
          const participantSocketId = this.userSockets.get(
            participantId.toString(),
          );
          if (participantSocketId) {
            this.io.to(participantSocketId).emit("message_notification", {
              chatId,
              message: {
                content: message.content,
                sender: message.sender,
                createdAt: message.createdAt,
              },
              unreadCount: chat.getUnreadCount(participantId),
            });
          }
        });

        console.log(`Message sent in chat ${chatId} by user ${socket.userId}`);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Error sending message" });
      }
    });
  }

  handleTyping(socket) {
    socket.on("typing", (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit("user_typing", {
        chatId,
        userId: socket.userId,
        userName: socket.user.name,
      });
    });
  }

  handleStopTyping(socket) {
    socket.on("stop_typing", (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit("user_stop_typing", {
        chatId,
        userId: socket.userId,
      });
    });
  }

  handleReadReceipt(socket) {
    socket.on("mark_read", async (data) => {
      try {
        const { chatId, messageIds } = data;

        // Verify user is participant in the chat
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(socket.userId)) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        // Mark messages as read
        if (messageIds && messageIds.length > 0) {
          await Message.updateMany(
            { _id: { $in: messageIds }, chatId },
            {
              $addToSet: {
                readBy: { user: socket.userId, readAt: new Date() },
              },
            },
          );
        }

        // Mark chat as read
        await chat.markAsRead(socket.userId);

        // Emit read receipt to chat room
        this.io.to(`chat_${chatId}`).emit("messages_read", {
          chatId,
          userId: socket.userId,
          messageIds,
        });
      } catch (error) {
        console.error("Error marking messages as read:", error);
        socket.emit("error", { message: "Error marking messages as read" });
      }
    });
  }

  // Utility methods for external use
  sendNotificationToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  sendNotificationToChat(chatId, event, data) {
    this.io.to(`chat_${chatId}`).emit(event, data);
  }

  getOnlineUsers() {
    return Array.from(this.userSockets.keys());
  }

  isUserOnline(userId) {
    return this.userSockets.has(userId);
  }
}

module.exports = SocketServer;
