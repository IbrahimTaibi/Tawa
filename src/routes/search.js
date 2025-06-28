const express = require("express");
const router = express.Router();
const {
  searchServices,
  getSearchSuggestions,
  getAvailableFilters,
  getNearbyServices,
} = require("../controllers/searchController");

// All search routes are public
router.get("/", searchServices);
router.get("/suggestions", getSearchSuggestions);
router.get("/filters", getAvailableFilters);
router.get("/nearby", getNearbyServices);

module.exports = router;
