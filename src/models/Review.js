const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true,
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  review: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  helpfulVotes: {
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
    voters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "approved",
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  moderationNotes: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
reviewSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for efficient queries
reviewSchema.index({ service: 1, status: 1 });
reviewSchema.index({ provider: 1, status: 1 });
reviewSchema.index({ customer: 1 });
reviewSchema.index({ booking: 1 }, { unique: true }); // One review per booking
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

// Compound index for provider and rating (for rating calculations)
reviewSchema.index({ provider: 1, rating: 1, status: 1 });

module.exports = mongoose.model("Review", reviewSchema);
