const mongoose = require("mongoose");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Service = require("../models/Service");
const User = require("../models/User");
const Joi = require("joi");
const asyncHandler = require("../utils/asyncHandler");
const PushNotificationService = require("../utils/pushNotificationService");
const {
  Errors,
  ErrorFactory,
  NotFoundError,
  AuthorizationError,
  ValidationError,
  ConflictError,
} = require("../utils/errors");

const createReviewSchema = Joi.object({
  bookingId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().min(10).max(1000).required(),
  serviceQuality: Joi.number().min(1).max(5).optional(),
  communication: Joi.number().min(1).max(5).optional(),
  punctuality: Joi.number().min(1).max(5).optional(),
  valueForMoney: Joi.number().min(1).max(5).optional(),
});

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private (customers only)
const createReview = asyncHandler(async (req, res) => {
  const { error } = createReviewSchema.validate(req.body);
  if (error) {
    throw ErrorFactory.fromJoiError(error);
  }

  const {
    bookingId,
    rating,
    comment,
    serviceQuality,
    communication,
    punctuality,
    valueForMoney,
  } = req.body;

  // Check if booking exists and belongs to the user
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  if (booking.customer.toString() !== req.userId) {
    throw new AuthorizationError("You can only review your own bookings");
  }

  // Check if booking is completed
  if (booking.status !== "completed") {
    throw new ValidationError("You can only review completed bookings");
  }

  // Check if review already exists for this booking
  const existingReview = await Review.findOne({ booking: bookingId });
  if (existingReview) {
    throw new ConflictError("You have already reviewed this booking");
  }

  // Create the review
  const reviewData = {
    booking: bookingId,
    customer: req.userId,
    provider: booking.provider,
    service: booking.service,
    rating,
    comment,
    serviceQuality,
    communication,
    punctuality,
    valueForMoney,
  };

  const review = new Review(reviewData);
  await review.save();

  // Populate review with related data
  await review.populate([
    { path: "booking", select: "service" },
    { path: "customer", select: "name" },
    { path: "provider", select: "name" },
    { path: "service", select: "title" },
  ]);

  // Update service average rating
  await updateServiceRating(booking.service);

  // Update provider average rating
  await updateProviderRating(booking.provider);

  // Send push notification to provider (non-blocking)
  try {
    const provider = await User.findById(booking.provider).select(
      "notificationPreferences",
    );
    if (provider && provider.notificationPreferences?.newReviews !== false) {
      await PushNotificationService.sendNewReviewNotification(
        review,
        review.service,
        booking.provider,
      );
    }
  } catch (pushError) {
    console.error("Failed to send push notification:", pushError);
    // Don't fail the review creation if push notification fails
  }

  res.status(201).json({
    success: true,
    message: "Review created successfully",
    review,
  });
});

// @desc    Get reviews by service
// @route   GET /api/reviews/service/:serviceId
// @access  Public
const getServiceReviews = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

  const skip = (page - 1) * limit;

  // Build query
  const query = {
    service: serviceId,
    status: "approved",
  };

  // Get reviews with pagination
  const reviews = await Review.find(query)
    .populate("customer", "name email")
    .populate("provider", "name email")
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);

  // Get total count
  const total = await Review.countDocuments(query);

  // Calculate average rating
  const avgRating = await Review.aggregate([
    {
      $match: {
        service: new mongoose.Types.ObjectId(serviceId),
        status: "approved",
      },
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const averageRating = avgRating.length > 0 ? avgRating[0].avgRating : 0;
  const totalReviews = avgRating.length > 0 ? avgRating[0].totalReviews : 0;

  res.json({
    success: true,
    data: {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
      },
    },
  });
});

// @desc    Get reviews by provider
// @route   GET /api/reviews/provider/:providerId
// @access  Public
const getProviderReviews = asyncHandler(async (req, res) => {
  const { providerId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

  const skip = (page - 1) * limit;

  // Build query
  const query = {
    provider: providerId,
    status: "approved",
  };

  // Get reviews with pagination
  const reviews = await Review.find(query)
    .populate("customer", "name email")
    .populate("service", "title category")
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);

  // Get total count
  const total = await Review.countDocuments(query);

  // Calculate average rating
  const avgRating = await Review.aggregate([
    {
      $match: {
        provider: new mongoose.Types.ObjectId(providerId),
        status: "approved",
      },
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const averageRating = avgRating.length > 0 ? avgRating[0].avgRating : 0;
  const totalReviews = avgRating.length > 0 ? avgRating[0].totalReviews : 0;

  res.json({
    success: true,
    data: {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
      },
    },
  });
});

// @desc    Get user's reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
const getMyReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role = "customer" } = req.query;
  const userId = req.userId;

  const skip = (page - 1) * limit;

  // Build query based on role
  const query = {};
  if (role === "customer") {
    query.customer = userId;
  } else if (role === "provider") {
    query.provider = userId;
  }

  const reviews = await Review.find(query)
    .populate("customer", "name email")
    .populate("provider", "name email")
    .populate("service", "title category")
    .populate("booking", "bookingDate")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Review.countDocuments(query);

  res.json({
    success: true,
    data: {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// @desc    Update a review
// @route   PUT /api/reviews/:reviewId
// @access  Private (review owner only)
const updateReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.userId;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new NotFoundError("Review not found");
  }

  if (review.customer.toString() !== userId) {
    throw new AuthorizationError("You can only update your own reviews");
  }

  // Check if review is approved (can't edit approved reviews)
  if (review.status === "approved") {
    throw new ValidationError("Cannot edit approved reviews");
  }

  const {
    rating,
    comment,
    serviceQuality,
    communication,
    punctuality,
    valueForMoney,
  } = req.body;

  // Update review fields
  if (rating !== undefined) review.rating = rating;
  if (comment !== undefined) review.comment = comment;
  if (serviceQuality !== undefined) review.serviceQuality = serviceQuality;
  if (communication !== undefined) review.communication = communication;
  if (punctuality !== undefined) review.punctuality = punctuality;
  if (valueForMoney !== undefined) review.valueForMoney = valueForMoney;

  review.updatedAt = new Date();
  await review.save();

  // Update service and provider ratings
  await updateServiceRating(review.service);
  await updateProviderRating(review.provider);

  // Populate review for response
  await review.populate([
    { path: "customer", select: "name email" },
    { path: "provider", select: "name email" },
    { path: "service", select: "title category" },
  ]);

  res.json({
    success: true,
    message: "Review updated successfully",
    review,
  });
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:reviewId
// @access  Private (review owner only)
const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.userId;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new NotFoundError("Review not found");
  }

  if (review.customer.toString() !== userId) {
    throw new AuthorizationError("You can only delete your own reviews");
  }

  // Store service and provider IDs before deletion
  const serviceId = review.service;
  const providerId = review.provider;

  await Review.findByIdAndDelete(reviewId);

  // Update service and provider ratings
  await updateServiceRating(serviceId);
  await updateProviderRating(providerId);

  res.json({
    success: true,
    message: "Review deleted successfully",
  });
});

// @desc    Mark review as helpful
// @route   POST /api/reviews/:reviewId/helpful
// @access  Private
const markReviewHelpful = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.userId;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new NotFoundError("Review not found");
  }

  // Check if user already marked this review as helpful
  if (review.helpfulVotes.includes(userId)) {
    throw new ConflictError("You have already marked this review as helpful");
  }

  review.helpfulVotes.push(userId);
  await review.save();

  res.json({
    success: true,
    message: "Review marked as helpful",
    helpfulCount: review.helpfulVotes.length,
  });
});

// @desc    Remove helpful vote from review
// @route   DELETE /api/reviews/:reviewId/helpful
// @access  Private
const removeHelpfulVote = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.userId;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new NotFoundError("Review not found");
  }

  // Remove user from helpful votes
  review.helpfulVotes = review.helpfulVotes.filter(
    (vote) => vote.toString() !== userId,
  );
  await review.save();

  res.json({
    success: true,
    message: "Helpful vote removed",
    helpfulCount: review.helpfulVotes.length,
  });
});

// Helper function to update service rating
const updateServiceRating = async (serviceId) => {
  const stats = await Review.aggregate([
    {
      $match: {
        service: new mongoose.Types.ObjectId(serviceId),
        status: "approved",
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const averageRating = stats.length > 0 ? stats[0].averageRating : 0;
  const totalReviews = stats.length > 0 ? stats[0].totalReviews : 0;

  await Service.findByIdAndUpdate(serviceId, {
    "rating.average": Math.round(averageRating * 10) / 10,
    "rating.totalReviews": totalReviews,
  });
};

// Helper function to update provider rating
const updateProviderRating = async (providerId) => {
  const stats = await Review.aggregate([
    {
      $match: {
        provider: new mongoose.Types.ObjectId(providerId),
        status: "approved",
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const averageRating = stats.length > 0 ? stats[0].averageRating : 0;
  const totalReviews = stats.length > 0 ? stats[0].totalReviews : 0;

  await User.findByIdAndUpdate(providerId, {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews: totalReviews,
  });
};

module.exports = {
  createReview,
  getServiceReviews,
  getProviderReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  markReviewHelpful,
  removeHelpfulVote,
};
