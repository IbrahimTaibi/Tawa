const Booking = require("../models/Booking");
const Service = require("../models/Service");
const User = require("../models/User");
const Joi = require("joi");
const asyncHandler = require("../utils/asyncHandler");
const {
  sendBookingConfirmation,
  sendBookingStatusUpdate,
} = require("../utils/emailService");
const PushNotificationService = require("../utils/pushNotificationService");

const createBookingSchema = Joi.object({
  serviceId: Joi.string().required(),
  bookingDate: Joi.date().greater("now").required(),
  duration: Joi.number().min(0.5).max(24).required(),
  location: Joi.object({
    address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().optional(),
    coordinates: Joi.object({
      lat: Joi.number(),
      lng: Joi.number(),
    }).optional(),
  }).required(),
  customerNotes: Joi.string().max(1000).optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid("confirmed", "in-progress", "completed", "cancelled", "rejected")
    .required(),
  providerNotes: Joi.string().max(1000).optional(),
  cancellationReason: Joi.string().max(500).optional(),
});

// Create a new booking (customers only)
exports.createBooking = asyncHandler(async (req, res) => {
  // Check if user is a customer
  const user = await User.findById(req.userId);
  if (!user || user.role !== "customer") {
    const err = new Error("Only customers can create bookings");
    err.status = 403;
    throw err;
  }

  const { error } = createBookingSchema.validate(req.body);
  if (error) {
    const err = new Error(error.details[0].message);
    err.status = 400;
    throw err;
  }

  const { serviceId, bookingDate, duration, location, customerNotes } =
    req.body;

  // Get the service and verify it exists and is active
  const service = await Service.findById(serviceId);
  if (!service) {
    const err = new Error("Service not found");
    err.status = 404;
    throw err;
  }

  if (service.status !== "active") {
    const err = new Error("Service is not available for booking");
    err.status = 400;
    throw err;
  }

  // Check if booking date is not in the past
  if (new Date(bookingDate) <= new Date()) {
    const err = new Error("Booking date must be in the future");
    err.status = 400;
    throw err;
  }

  // Calculate total amount based on service pricing
  let totalAmount = 0;
  if (service.pricing.type === "hourly") {
    totalAmount = service.pricing.amount * duration;
  } else if (service.pricing.type === "fixed") {
    totalAmount = service.pricing.amount;
  } else {
    // negotiable - use the amount if provided, otherwise 0
    totalAmount = service.pricing.amount || 0;
  }

  const bookingData = {
    customer: req.userId,
    provider: service.provider,
    service: serviceId,
    bookingDate,
    duration,
    pricing: {
      type: service.pricing.type,
      amount: service.pricing.amount,
      currency: service.pricing.currency,
      totalAmount,
    },
    location,
    notes: {
      customerNotes,
    },
  };

  const booking = new Booking(bookingData);
  await booking.save();

  // Populate service and provider details for response
  await booking.populate([
    { path: "service", select: "title description category" },
    { path: "provider", select: "name businessName phone" },
    { path: "customer", select: "name email" },
  ]);

  // Send booking confirmation email (non-blocking)
  try {
    await sendBookingConfirmation(booking, booking.service, booking.customer);
  } catch (emailError) {
    console.error("Failed to send booking confirmation email:", emailError);
    // Don't fail the booking creation if email fails
  }

  // Send push notification to provider (non-blocking)
  try {
    if (booking.provider.notificationPreferences?.newBookings !== false) {
      await PushNotificationService.sendNewBookingNotification(
        booking,
        booking.service,
        booking.provider._id,
      );
    }
  } catch (pushError) {
    console.error("Failed to send push notification:", pushError);
    // Don't fail the booking creation if push notification fails
  }

  res.status(201).json({
    success: true,
    message: "Booking created successfully",
    booking,
  });
});

// Get user's bookings (customers and providers)
exports.getUserBookings = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    role = "customer", // 'customer' or 'provider'
  } = req.query;

  const query = {};

  if (role === "customer") {
    query.customer = req.userId;
  } else if (role === "provider") {
    query.provider = req.userId;
  }

  if (status) {
    query.status = status;
  }

  const bookings = await Booking.find(query)
    .populate("service", "title description category")
    .populate("provider", "name businessName phone")
    .populate("customer", "name email")
    .sort({ bookingDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

  const total = await Booking.countDocuments(query);

  res.json({
    success: true,
    bookings,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalBookings: total,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  });
});

// Get booking by ID (participants only)
exports.getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("service", "title description category pricing")
    .populate("provider", "name businessName phone address")
    .populate("customer", "name email phone");

  if (!booking) {
    const err = new Error("Booking not found");
    err.status = 404;
    throw err;
  }

  // Check if user is authorized to view this booking
  if (
    booking.customer._id.toString() !== req.userId &&
    booking.provider._id.toString() !== req.userId
  ) {
    const err = new Error("Not authorized to view this booking");
    err.status = 403;
    throw err;
  }

  res.json({
    success: true,
    booking,
  });
});

// Update booking status (provider only)
exports.updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    const err = new Error("Booking not found");
    err.status = 404;
    throw err;
  }

  // Check if user is the provider
  if (booking.provider.toString() !== req.userId) {
    const err = new Error("Only the provider can update booking status");
    err.status = 403;
    throw err;
  }

  const { error } = updateStatusSchema.validate(req.body);
  if (error) {
    const err = new Error(error.details[0].message);
    err.status = 400;
    throw err;
  }

  const { status, providerNotes, cancellationReason } = req.body;
  const previousStatus = booking.status;

  // Update booking
  booking.status = status;
  if (providerNotes) {
    booking.notes.providerNotes = providerNotes;
  }

  if (status === "cancelled" && cancellationReason) {
    booking.cancellationReason = cancellationReason;
    booking.cancelledBy = "provider";
  }

  if (status === "completed") {
    booking.completedAt = new Date();
  }

  await booking.save();

  // Populate details for response
  await booking.populate([
    { path: "service", select: "title description category" },
    { path: "provider", select: "name businessName phone" },
    { path: "customer", select: "name email" },
  ]);

  // Send status update email if status changed (non-blocking)
  if (previousStatus !== status) {
    try {
      await sendBookingStatusUpdate(
        booking,
        booking.service,
        booking.customer,
        status,
      );
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
      // Don't fail the status update if email fails
    }

    // Send push notification to customer (non-blocking)
    try {
      if (booking.customer.notificationPreferences?.bookingUpdates !== false) {
        await PushNotificationService.sendBookingStatusNotification(
          booking,
          status,
          booking.customer._id,
        );
      }
    } catch (pushError) {
      console.error("Failed to send push notification:", pushError);
      // Don't fail the status update if push notification fails
    }
  }

  res.json({
    success: true,
    message: "Booking status updated successfully",
    booking,
  });
});

// Cancel booking (customer only)
exports.cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    const err = new Error("Booking not found");
    err.status = 404;
    throw err;
  }

  // Check if user is the customer
  if (booking.customer.toString() !== req.userId) {
    const err = new Error("Only the customer can cancel this booking");
    err.status = 403;
    throw err;
  }

  // Check if booking can be cancelled
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    const err = new Error("Booking cannot be cancelled in its current status");
    err.status = 400;
    throw err;
  }

  // Check if booking is not too close to the scheduled time (e.g., within 24 hours)
  const hoursUntilBooking =
    (new Date(booking.bookingDate) - new Date()) / (1000 * 60 * 60);
  if (hoursUntilBooking < 24) {
    const err = new Error(
      "Booking cannot be cancelled within 24 hours of scheduled time",
    );
    err.status = 400;
    throw err;
  }

  booking.status = "cancelled";
  booking.cancelledBy = "customer";
  booking.cancellationReason =
    req.body.cancellationReason || "Cancelled by customer";
  await booking.save();

  // Populate details for response
  await booking.populate([
    { path: "service", select: "title description category" },
    { path: "provider", select: "name businessName phone" },
    { path: "customer", select: "name email" },
  ]);

  res.json({
    success: true,
    message: "Booking cancelled successfully",
    booking,
  });
});

// Get provider's bookings (provider only)
exports.getProviderBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { provider: req.params.providerId };

  if (status) {
    query.status = status;
  }

  // Check if user is authorized to view provider's bookings
  if (req.params.providerId !== req.userId) {
    const err = new Error("Not authorized to view these bookings");
    err.status = 403;
    throw err;
  }

  const bookings = await Booking.find(query)
    .populate("service", "title description category")
    .populate("customer", "name email phone")
    .sort({ bookingDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

  const total = await Booking.countDocuments(query);

  res.json({
    success: true,
    bookings,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalBookings: total,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  });
});
