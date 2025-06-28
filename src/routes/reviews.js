const express = require("express");
const router = express.Router();
const {
  createReview,
  getServiceReviews,
  getProviderReviews,
  updateReview,
  deleteReview,
  markHelpful,
  getMyReviews,
} = require("../controllers/reviewController");
const { protect } = require("../middleware/auth");

// Public routes
router.get("/service/:serviceId", getServiceReviews);
router.get("/provider/:providerId", getProviderReviews);

// Protected routes
router.use(protect);

router.post("/", createReview);
router.get("/my-reviews", getMyReviews);
router.put("/:id", updateReview);
router.delete("/:id", deleteReview);
router.post("/:id/helpful", markHelpful);

module.exports = router;
