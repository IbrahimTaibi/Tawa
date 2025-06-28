const Service = require("../models/Service");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

// @desc    Advanced search with filters
// @route   GET /api/search
// @access  Public
const searchServices = asyncHandler(async (req, res) => {
  const {
    q, // search query
    category,
    subcategory,
    minPrice,
    maxPrice,
    minRating,
    maxRating,
    location,
    lat,
    lng,
    radius = 50, // miles
    verified,
    featured,
    emergency,
    availability,
    sortBy = "relevance",
    sortOrder = "desc",
    page = 1,
    limit = 20,
  } = req.query;

  const skip = (page - 1) * limit;
  const query = { status: "active" };

  // Text search
  if (q) {
    query.$text = { $search: q };
  }

  // Category filter
  if (category) {
    query.category = category;
  }

  // Subcategory filter
  if (subcategory) {
    query.subcategory = subcategory;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query["pricing.amount"] = {};
    if (minPrice) query["pricing.amount"].$gte = parseFloat(minPrice);
    if (maxPrice) query["pricing.amount"].$lte = parseFloat(maxPrice);
  }

  // Rating filter
  if (minRating || maxRating) {
    query["rating.average"] = {};
    if (minRating) query["rating.average"].$gte = parseFloat(minRating);
    if (maxRating) query["rating.average"].$lte = parseFloat(maxRating);
  }

  // Verified filter
  if (verified === "true") {
    query.isVerified = true;
  }

  // Featured filter
  if (featured === "true") {
    query.isFeatured = true;
  }

  // Emergency service filter
  if (emergency === "true") {
    query["availability.emergencyService"] = true;
  }

  // Location-based search
  if (lat && lng) {
    const coordinates = [parseFloat(lng), parseFloat(lat)];
    const maxDistance = parseFloat(radius) * 1609.34; // Convert miles to meters

    query["location.coordinates"] = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: coordinates,
        },
        $maxDistance: maxDistance,
      },
    };
  } else if (location) {
    // City/state search
    query["location.city"] = { $regex: location, $options: "i" };
  }

  // Build sort object
  let sort = {};
  switch (sortBy) {
    case "price":
      sort["pricing.amount"] = sortOrder === "asc" ? 1 : -1;
      break;
    case "rating":
      sort["rating.average"] = sortOrder === "asc" ? 1 : -1;
      break;
    case "distance":
      if (lat && lng) {
        // Distance sorting is handled by $near query
        sort = { createdAt: -1 };
      } else {
        sort["rating.average"] = -1;
      }
      break;
    case "newest":
      sort.createdAt = sortOrder === "asc" ? 1 : -1;
      break;
    case "featured":
      sort.isFeatured = -1;
      sort["rating.average"] = -1;
      break;
    case "relevance":
    default:
      if (q) {
        sort.score = { $meta: "textScore" };
      } else {
        sort.isFeatured = -1;
        sort["rating.average"] = -1;
      }
      break;
  }

  // Execute search
  const services = await Service.find(query)
    .populate(
      "provider",
      "name businessName averageRating totalReviews isVerified",
    )
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await Service.countDocuments(query);

  // Calculate distance for each service if coordinates provided
  let servicesWithDistance = services;
  if (lat && lng) {
    const userCoords = [parseFloat(lng), parseFloat(lat)];
    servicesWithDistance = services.map((service) => {
      const serviceCoords = service.location.coordinates.coordinates;
      const distance = calculateDistance(userCoords, serviceCoords);
      return {
        ...service.toObject(),
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
      };
    });
  }

  // Get search statistics
  const stats = await getSearchStats(query);

  res.json({
    success: true,
    data: {
      services: servicesWithDistance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      stats,
      filters: {
        applied: Object.keys(query).filter((key) => key !== "status"),
        available: await getAvailableFiltersHelper(),
      },
    },
  });
});

// @desc    Get search suggestions
// @route   GET /api/search/suggestions
// @access  Public
const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.length < 2) {
    return res.json({
      success: true,
      data: {
        suggestions: [],
        categories: [],
        popular: [],
      },
    });
  }

  // Get service suggestions
  const serviceSuggestions = await Service.find({
    $text: { $search: q },
    status: "active",
  })
    .select("title category subcategory tags")
    .limit(parseInt(limit))
    .sort({ score: { $meta: "textScore" } });

  // Get category suggestions
  const categorySuggestions = await Service.distinct("category", {
    category: { $regex: q, $options: "i" },
    status: "active",
  });

  // Get popular searches (mock data for now)
  const popularSearches = [
    "plumbing",
    "cleaning",
    "tutoring",
    "gardening",
    "electrical",
    "carpentry",
    "painting",
    "moving",
    "pet care",
    "cooking",
  ];

  res.json({
    success: true,
    data: {
      suggestions: serviceSuggestions.map((s) => ({
        type: "service",
        text: s.title,
        category: s.category,
        subcategory: s.subcategory,
      })),
      categories: categorySuggestions.map((cat) => ({
        type: "category",
        text: cat,
      })),
      popular: popularSearches
        .filter((term) => term.toLowerCase().includes(q.toLowerCase()))
        .map((term) => ({
          type: "popular",
          text: term,
        })),
    },
  });
});

// @desc    Get available filters
// @route   GET /api/search/filters
// @access  Public
const getAvailableFilters = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const baseQuery = { status: "active" };

  if (category) {
    baseQuery.category = category;
  }

  // Get categories
  const categories = await Service.distinct("category", baseQuery);

  // Get subcategories
  const subcategories = await Service.distinct("subcategory", baseQuery);

  // Get price range
  const priceStats = await Service.aggregate([
    { $match: baseQuery },
    {
      $group: {
        _id: null,
        minPrice: { $min: "$pricing.amount" },
        maxPrice: { $max: "$pricing.amount" },
        avgPrice: { $avg: "$pricing.amount" },
      },
    },
  ]);

  // Get rating range
  const ratingStats = await Service.aggregate([
    { $match: baseQuery },
    {
      $group: {
        _id: null,
        minRating: { $min: "$rating.average" },
        maxRating: { $max: "$rating.average" },
        avgRating: { $avg: "$rating.average" },
      },
    },
  ]);

  // Get popular tags
  const popularTags = await Service.aggregate([
    { $match: baseQuery },
    { $unwind: "$tags" },
    {
      $group: {
        _id: "$tags",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);

  res.json({
    success: true,
    data: {
      categories: categories.filter(Boolean),
      subcategories: subcategories.filter(Boolean),
      priceRange: priceStats[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 },
      ratingRange: ratingStats[0] || {
        minRating: 0,
        maxRating: 5,
        avgRating: 0,
      },
      popularTags: popularTags.map((tag) => ({
        tag: tag._id,
        count: tag.count,
      })),
      features: {
        verified: await Service.countDocuments({
          ...baseQuery,
          isVerified: true,
        }),
        featured: await Service.countDocuments({
          ...baseQuery,
          isFeatured: true,
        }),
        emergency: await Service.countDocuments({
          ...baseQuery,
          "availability.emergencyService": true,
        }),
      },
    },
  });
});

// @desc    Get nearby services
// @route   GET /api/search/nearby
// @access  Public
const getNearbyServices = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 25, category, limit = 10 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      message: "Latitude and longitude are required",
    });
  }

  const coordinates = [parseFloat(lng), parseFloat(lat)];
  const maxDistance = parseFloat(radius) * 1609.34; // Convert miles to meters

  const query = {
    status: "active",
    "location.coordinates": {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: coordinates,
        },
        $maxDistance: maxDistance,
      },
    },
  };

  if (category) {
    query.category = category;
  }

  const services = await Service.find(query)
    .populate("provider", "name businessName averageRating totalReviews")
    .limit(parseInt(limit));

  // Calculate distances
  const servicesWithDistance = services.map((service) => {
    const serviceCoords = service.location.coordinates.coordinates;
    const distance = calculateDistance(coordinates, serviceCoords);
    return {
      ...service.toObject(),
      distance: Math.round(distance * 10) / 10,
    };
  });

  res.json({
    success: true,
    data: {
      services: servicesWithDistance,
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      radius: parseFloat(radius),
    },
  });
});

// Helper function to calculate distance between two points (Haversine formula)
const calculateDistance = (coord1, coord2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const dLon = ((coord2[0] - coord1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1[1] * Math.PI) / 180) *
      Math.cos((coord2[1] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper function to get search statistics
const getSearchStats = async (query) => {
  const totalServices = await Service.countDocuments(query);
  const avgRating = await Service.aggregate([
    { $match: query },
    { $group: { _id: null, avg: { $avg: "$rating.average" } } },
  ]);

  const priceRange = await Service.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        min: { $min: "$pricing.amount" },
        max: { $max: "$pricing.amount" },
      },
    },
  ]);

  return {
    totalServices,
    averageRating: avgRating[0]?.avg || 0,
    priceRange: priceRange[0] || { min: 0, max: 0 },
  };
};

// Helper function to get available filters (for internal use)
const getAvailableFiltersHelper = async () => {
  const categories = await Service.distinct("category", { status: "active" });
  const priceRange = await Service.aggregate([
    { $match: { status: "active" } },
    {
      $group: {
        _id: null,
        min: { $min: "$pricing.amount" },
        max: { $max: "$pricing.amount" },
      },
    },
  ]);

  return {
    categories: categories.filter(Boolean),
    priceRange: priceRange[0] || { min: 0, max: 0 },
  };
};

module.exports = {
  searchServices,
  getSearchSuggestions,
  getAvailableFilters,
  getNearbyServices,
};
