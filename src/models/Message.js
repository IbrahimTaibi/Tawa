const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },
    attachments: [
      {
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        url: String,
      },
    ],
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient querying
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ readBy: 1 });

// Virtual for checking if message is read by a specific user
messageSchema.virtual("isReadBy").get(function () {
  return function (userId) {
    return this.readBy.some(
      (read) => read.user.toString() === userId.toString(),
    );
  };
});

// Method to mark message as read by a user
messageSchema.methods.markAsRead = function (userId) {
  const alreadyRead = this.readBy.find(
    (read) => read.user.toString() === userId.toString(),
  );
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date(),
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to check if user can edit message (within 5 minutes)
messageSchema.methods.canEdit = function (userId) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return (
    this.sender.toString() === userId.toString() &&
    this.createdAt > fiveMinutesAgo &&
    !this.isDeleted
  );
};

// Method to edit message
messageSchema.methods.editMessage = function (newContent) {
  this.content = newContent;
  this.editedAt = new Date();
  return this.save();
};

// Method to soft delete message
messageSchema.methods.deleteMessage = function () {
  this.isDeleted = true;
  this.content = "[Message deleted]";
  return this.save();
};

// Pre-save middleware to update chat's last message
messageSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const Chat = mongoose.model("Chat");
      await Chat.findByIdAndUpdate(this.chatId, {
        lastMessage: this._id,
        lastMessageAt: this.createdAt,
      });
    } catch (error) {
      console.error("Error updating chat last message:", error);
    }
  }
  next();
});

module.exports = mongoose.model("Message", messageSchema);
