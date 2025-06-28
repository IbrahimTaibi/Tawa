const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  subcategory: {
    type: String,
    trim: true,
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
    },
    minAmount: {
      type: Number,
      min: 0,
    },
    maxAmount: {
      type: Number,
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
    country: {
      type: String,
      default: "USA",
      trim: true,
    },
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    serviceRadius: {
      type: Number,
      default: 50, // miles
      min: 1,
      max: 500,
    },
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  images: [
    {
      type: String,
      trim: true,
    },
  ],
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  requirements: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  availability: {
    monday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true },
    },
    tuesday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true },
    },
    wednesday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true },
    },
    thursday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true },
    },
    friday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true },
    },
    saturday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true },
    },
    sunday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true },
    },
    emergencyService: {
      type: Boolean,
      default: false,
    },
    responseTime: {
      type: Number, // hours
      default: 24,
      min: 1,
    },
  },
  status: {
    type: String,
    enum: ["active", "inactive", "booked", "completed"],
    default: "active",
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  // Search and filtering fields
  searchKeywords: [
    {
      type: String,
      trim: true,
    },
  ],
  isVerified: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  completionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  responseRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  moderationNotes: {
    type: String,
    trim: true,
  },
});

// Update the updatedAt field before saving
serviceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // Generate search keywords from title, description, and tags
  if (
    this.isModified("title") ||
    this.isModified("description") ||
    this.isModified("tags")
  ) {
    const keywords = new Set();

    // Add title words
    if (this.title) {
      this.title
        .toLowerCase()
        .split(/\s+/)
        .forEach((word) => {
          if (word.length > 2) keywords.add(word);
        });
    }

    // Add description words
    if (this.description) {
      this.description
        .toLowerCase()
        .split(/\s+/)
        .forEach((word) => {
          if (word.length > 2) keywords.add(word);
        });
    }

    // Add tags
    if (this.tags) {
      this.tags.forEach((tag) => {
        if (tag) keywords.add(tag.toLowerCase());
      });
    }

    // Add category and subcategory
    if (this.category) keywords.add(this.category.toLowerCase());
    if (this.subcategory) keywords.add(this.subcategory.toLowerCase());

    this.searchKeywords = Array.from(keywords);
  }

  next();
});

// Create indexes for efficient queries
serviceSchema.index({
  title: "text",
  description: "text",
  tags: "text",
  searchKeywords: "text",
});
serviceSchema.index({ category: 1, status: 1 });
serviceSchema.index({ provider: 1, status: 1 });
serviceSchema.index({ "location.coordinates": "2dsphere" });
serviceSchema.index({ "pricing.amount": 1 });
serviceSchema.index({ "rating.average": -1 });
serviceSchema.index({ isVerified: 1, isFeatured: 1 });
serviceSchema.index({ createdAt: -1 });
serviceSchema.index({ status: 1, isVerified: 1, "rating.average": -1 });

// Compound indexes for complex queries
serviceSchema.index({ category: 1, status: 1, "rating.average": -1 });
serviceSchema.index({ "location.city": 1, category: 1, status: 1 });
serviceSchema.index({ isFeatured: 1, status: 1, "rating.average": -1 });

module.exports = mongoose.model("Service", serviceSchema);
