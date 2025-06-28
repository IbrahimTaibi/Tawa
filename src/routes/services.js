const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/serviceController");
const { protect } = require("../middleware/auth");

// Public routes
router.get("/", serviceController.getAllServices);
router.get("/:id", serviceController.getServiceById);
router.get("/provider/:providerId", serviceController.getServicesByProvider);

// Protected routes (require authentication)
router.post("/", protect, serviceController.createService);
router.put("/:id", protect, serviceController.updateService);
router.delete("/:id", protect, serviceController.deleteService);

module.exports = router;
