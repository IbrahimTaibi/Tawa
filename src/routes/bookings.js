const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { protect } = require("../middleware/auth");

// All booking routes require authentication
router.use(protect);

// Create booking (customers only)
router.post("/", bookingController.createBooking);

// Get user's bookings (customers and providers)
router.get("/", bookingController.getUserBookings);

// Get specific booking (participants only)
router.get("/:id", bookingController.getBookingById);

// Update booking status (provider only)
router.put("/:id/status", bookingController.updateBookingStatus);

// Cancel booking (customer only)
router.delete("/:id", bookingController.cancelBooking);

// Get provider's bookings (provider only)
router.get("/provider/:providerId", bookingController.getProviderBookings);

module.exports = router;
