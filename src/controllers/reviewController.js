const mongoose = require("mongoose");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Service = require("../models/Service");
const User = require("../models/User");
const Joi = require("joi");
const asyncHandler = require("../utils/asyncHandler");
const PushNotificationService = require("../utils/pushNotificationService");

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private (customers only)
const createReview = asyncHandler(async (req, res) => {
  const { error } = createReviewSchema.validate(req.body);
  if (error) {
    const err = new Error(error.details[0].message);
    err.status = 400;
    throw err;
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
    const err = new Error("Booking not found");
    err.status = 404;
    throw err;
  }

  if (booking.customer.toString() !== req.userId) {
    const err = new Error("You can only review your own bookings");
    err.status = 403;
    throw err;
  }

  // Check if booking is completed
  if (booking.status !== "completed") {
    const err = new Error("You can only review completed bookings");
    err.status = 400;
    throw err;
  }

  // Check if review already exists for this booking
  const existingReview = await Review.findOne({ booking: bookingId });
  if (existingReview) {
    const err = new Error("You have already reviewed this booking");
    err.status = 400;
    throw err;
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

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private (review author only)
const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, title, review } = req.body;

  const reviewDoc = await Review.findById(id);

  if (!reviewDoc) {
    return res.status(404).json({
      success: false,
      message: "Review not found",
    });
  }

  // Check if user is the author
  if (reviewDoc.customer.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "You can only update your own reviews",
    });
  }

  // Update fields
  if (rating !== undefined) {
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }
    reviewDoc.rating = rating;
  }

  if (title !== undefined) {
    reviewDoc.title = title;
  }

  if (review !== undefined) {
    reviewDoc.review = review;
  }

  await reviewDoc.save();

  // Update provider's average rating
  await updateProviderRating(reviewDoc.provider);

  // Populate the updated review
  await reviewDoc.populate([
    { path: "customer", select: "name email" },
    { path: "provider", select: "name email" },
    { path: "service", select: "title category" },
  ]);

  res.json({
    success: true,
    data: reviewDoc,
  });
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (review author only)
const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findById(id);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: "Review not found",
    });
  }

  // Check if user is the author
  if (review.customer.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "You can only delete your own reviews",
    });
  }

  await Review.findByIdAndDelete(id);

  // Update provider's average rating
  await updateProviderRating(review.provider);

  res.json({
    success: true,
    message: "Review deleted successfully",
  });
});

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
const markHelpful = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findById(id);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: "Review not found",
    });
  }

  const userId = req.user.id;
  const voterIndex = review.helpfulVotes.voters.indexOf(userId);

  if (voterIndex > -1) {
    // Remove vote
    review.helpfulVotes.voters.splice(voterIndex, 1);
    review.helpfulVotes.count = Math.max(0, review.helpfulVotes.count - 1);
  } else {
    // Add vote
    review.helpfulVotes.voters.push(userId);
    review.helpfulVotes.count += 1;
  }

  await review.save();

  res.json({
    success: true,
    data: {
      helpfulVotes: review.helpfulVotes,
      hasVoted: voterIndex === -1,
    },
  });
});

// @desc    Get user's reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
const getMyReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = { customer: req.user.id };

  const reviews = await Review.find(query)
    .populate("provider", "name email")
    .populate("service", "title category")
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

// Helper function to update provider's average rating
const updateProviderRating = async (providerId) => {
  try {
    const result = await Review.aggregate([
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

    const averageRating = result.length > 0 ? result[0].avgRating : 0;
    const totalReviews = result.length > 0 ? result[0].totalReviews : 0;

    // Update provider's rating in User model
    await User.findByIdAndUpdate(providerId, {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
    });
  } catch (error) {
    console.error("Error updating provider rating:", error);
  }
};

module.exports = {
  createReview,
  getServiceReviews,
  getProviderReviews,
  updateReview,
  deleteReview,
  markHelpful,
  getMyReviews,
};
