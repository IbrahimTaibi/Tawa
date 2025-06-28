const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/auth");
const adminController = require("../controllers/adminController");

// All admin routes require authentication and admin role
router.use(protect, isAdmin);

// User management
router.get("/users", adminController.listUsers);
router.put("/users/:id/block", adminController.blockUser);
router.put("/users/:id/unblock", adminController.unblockUser);
router.put("/users/:id/promote", adminController.promoteUser);
router.put("/users/:id/demote", adminController.demoteUser);
router.delete("/users/:id", adminController.deleteUser);

// Service moderation
router.get("/services", adminController.listServices);
router.put("/services/:id/approve", adminController.approveService);
router.put("/services/:id/reject", adminController.rejectService);
router.put("/services/:id/feature", adminController.featureService);
router.put("/services/:id/unfeature", adminController.unfeatureService);
router.delete("/services/:id", adminController.deleteService);

// Review moderation
router.get("/reviews", adminController.listReviews);
router.put("/reviews/:id/approve", adminController.approveReview);
router.put("/reviews/:id/reject", adminController.rejectReview);
router.delete("/reviews/:id", adminController.deleteReview);

// Analytics
router.get("/dashboard/stats", adminController.dashboardStats);

module.exports = router;
