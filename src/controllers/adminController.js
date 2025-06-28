// Admin Controller: User, Service, Review moderation & analytics
const User = require("../models/User");
const Service = require("../models/Service");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const asyncHandler = require("../utils/asyncHandler");
const {
  Errors,
  ErrorFactory,
  NotFoundError,
  AuthorizationError,
} = require("../utils/errors");

// User management
exports.listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");
  res.json({ success: true, users });
});

exports.blockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: true },
    { new: true },
  );

  if (!user) {
    throw Errors.USER_NOT_FOUND;
  }

  res.json({ success: true, user });
});

exports.unblockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: false },
    { new: true },
  );

  if (!user) {
    throw Errors.USER_NOT_FOUND;
  }

  res.json({ success: true, user });
});

exports.promoteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: "admin" },
    { new: true },
  );

  if (!user) {
    throw Errors.USER_NOT_FOUND;
  }

  res.json({ success: true, user });
});

exports.demoteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: "customer" },
    { new: true },
  );

  if (!user) {
    throw Errors.USER_NOT_FOUND;
  }

  res.json({ success: true, user });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    throw Errors.USER_NOT_FOUND;
  }

  res.json({ success: true, message: "User deleted" });
});

// Service moderation
exports.listServices = asyncHandler(async (req, res) => {
  const services = await Service.find().populate("provider", "name email");
  res.json({ success: true, services });
});

exports.approveService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(
    req.params.id,
    { isApproved: true },
    { new: true },
  );

  if (!service) {
    throw new NotFoundError("Service not found");
  }

  res.json({ success: true, service });
});

exports.rejectService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(
    req.params.id,
    { isApproved: false },
    { new: true },
  );

  if (!service) {
    throw new NotFoundError("Service not found");
  }

  res.json({ success: true, service });
});

exports.featureService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(
    req.params.id,
    { isFeatured: true },
    { new: true },
  );

  if (!service) {
    throw new NotFoundError("Service not found");
  }

  res.json({ success: true, service });
});

exports.unfeatureService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(
    req.params.id,
    { isFeatured: false },
    { new: true },
  );

  if (!service) {
    throw new NotFoundError("Service not found");
  }

  res.json({ success: true, service });
});

exports.deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndDelete(req.params.id);

  if (!service) {
    throw new NotFoundError("Service not found");
  }

  res.json({ success: true, message: "Service deleted" });
});

// Review moderation
exports.listReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find().populate(
    "customer provider service",
    "name email title",
  );
  res.json({ success: true, reviews });
});

exports.approveReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { isApproved: true },
    { new: true },
  );

  if (!review) {
    throw new NotFoundError("Review not found");
  }

  res.json({ success: true, review });
});

exports.rejectReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { isApproved: false },
    { new: true },
  );

  if (!review) {
    throw new NotFoundError("Review not found");
  }

  res.json({ success: true, review });
});

exports.deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);

  if (!review) {
    throw new NotFoundError("Review not found");
  }

  res.json({ success: true, message: "Review deleted" });
});

// Analytics
exports.dashboardStats = asyncHandler(async (req, res) => {
  const [
    userCount,
    providerCount,
    serviceCount,
    bookingCount,
    reviewCount,
    blockedUsers,
    pendingServices,
    pendingReviews,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "provider" }),
    Service.countDocuments(),
    Booking.countDocuments(),
    Review.countDocuments(),
    User.countDocuments({ isBlocked: true }),
    Service.countDocuments({ isApproved: false }),
    Review.countDocuments({ isApproved: false }),
  ]);

  res.json({
    success: true,
    stats: {
      userCount,
      providerCount,
      serviceCount,
      bookingCount,
      reviewCount,
      blockedUsers,
      pendingServices,
      pendingReviews,
    },
  });
});
