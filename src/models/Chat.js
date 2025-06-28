const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient querying
chatSchema.index({ participants: 1 });
chatSchema.index({ serviceId: 1 });
chatSchema.index({ lastMessageAt: -1 });

// Virtual for getting the other participant
chatSchema.virtual("otherParticipant").get(function () {
  return this.participants.filter((p) => p.toString() !== this.currentUserId);
});

// Method to get unread count for a user
chatSchema.methods.getUnreadCount = function (userId) {
  return this.unreadCount.get(userId.toString()) || 0;
};

// Method to mark messages as read for a user
chatSchema.methods.markAsRead = function (userId) {
  this.unreadCount.set(userId.toString(), 0);
  return this.save();
};

// Method to increment unread count for a user
chatSchema.methods.incrementUnread = function (userId) {
  const currentCount = this.getUnreadCount(userId);
  this.unreadCount.set(userId.toString(), currentCount + 1);
  return this.save();
};

module.exports = mongoose.model("Chat", chatSchema);
