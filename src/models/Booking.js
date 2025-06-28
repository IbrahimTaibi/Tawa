const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
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
  bookingDate: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number, // in hours
    required: true,
    min: 0.5,
    max: 24,
  },
  status: {
    type: String,
    enum: [
      "pending",
      "confirmed",
      "in-progress",
      "completed",
      "cancelled",
      "rejected",
    ],
    default: "pending",
  },
  pricing: {
    type: {
      type: String,
      enum: ["hourly", "fixed", "negotiable"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
      maxlength: 3,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  location: {
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  notes: {
    customerNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    providerNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "refunded", "cancelled"],
    default: "pending",
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  cancelledBy: {
    type: String,
    enum: ["customer", "provider", "system"],
  },
  completedAt: {
    type: Date,
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
bookingSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for efficient queries
bookingSchema.index({ customer: 1, status: 1 });
bookingSchema.index({ provider: 1, status: 1 });
bookingSchema.index({ bookingDate: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
