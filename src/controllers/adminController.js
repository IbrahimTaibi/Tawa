// Admin Controller: User, Service, Review moderation & analytics
const User = require("../models/User");
const Service = require("../models/Service");
const Review = require("../models/Review");
const Booking = require("../models/Booking");

// User management
exports.listUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json({ success: true, users });
};
exports.blockUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: true },
    { new: true },
  );
  res.json({ success: true, user });
};
exports.unblockUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: false },
    { new: true },
  );
  res.json({ success: true, user });
};
exports.promoteUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: "admin" },
    { new: true },
  );
  res.json({ success: true, user });
};
exports.demoteUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: "customer" },
    { new: true },
  );
  res.json({ success: true, user });
};
exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "User deleted" });
};

// Service moderation
exports.listServices = async (req, res) => {
  const services = await Service.find().populate("provider", "name email");
  res.json({ success: true, services });
};
exports.approveService = async (req, res) => {
  const service = await Service.findByIdAndUpdate(
    req.params.id,
    { isApproved: true },
    { new: true },
  );
  res.json({ success: true, service });
};
exports.rejectService = async (req, res) => {
  const service = await Service.findByIdAndUpdate(
    req.params.id,
    { isApproved: false },
    { new: true },
  );
  res.json({ success: true, service });
};
exports.featureService = async (req, res) => {
  const service = await Service.findByIdAndUpdate(
    req.params.id,
    { isFeatured: true },
    { new: true },
  );
  res.json({ success: true, service });
};
exports.unfeatureService = async (req, res) => {
  const service = await Service.findByIdAndUpdate(
    req.params.id,
    { isFeatured: false },
    { new: true },
  );
  res.json({ success: true, service });
};
exports.deleteService = async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Service deleted" });
};

// Review moderation
exports.listReviews = async (req, res) => {
  const reviews = await Review.find().populate(
    "customer provider service",
    "name email title",
  );
  res.json({ success: true, reviews });
};
exports.approveReview = async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { isApproved: true },
    { new: true },
  );
  res.json({ success: true, review });
};
exports.rejectReview = async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { isApproved: false },
    { new: true },
  );
  res.json({ success: true, review });
};
exports.deleteReview = async (req, res) => {
  await Review.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Review deleted" });
};

// Analytics
exports.dashboardStats = async (req, res) => {
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
};
