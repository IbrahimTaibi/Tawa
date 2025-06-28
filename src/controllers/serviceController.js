const Service = require("../models/Service");
const User = require("../models/User");
const Joi = require("joi");
const asyncHandler = require("../utils/asyncHandler");

const createServiceSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  category: Joi.string().min(2).max(50).required(),
  subcategory: Joi.string().min(2).max(50).optional(),
  pricing: Joi.object({
    type: Joi.string().valid("hourly", "fixed", "negotiable").required(),
    amount: Joi.number().min(0).required(),
    currency: Joi.string().default("USD"),
    minAmount: Joi.number().min(0).optional(),
    maxAmount: Joi.number().min(0).optional(),
  }).required(),
  location: Joi.object({
    address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().optional(),
    country: Joi.string().default("USA"),
    coordinates: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
    }).optional(),
    serviceRadius: Joi.number().min(1).max(500).default(50),
  }).required(),
  images: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  requirements: Joi.string().max(500).optional(),
  availability: Joi.object({
    monday: Joi.object({
      start: Joi.string().optional(),
      end: Joi.string().optional(),
      available: Joi.boolean().default(true),
    }).optional(),
    tuesday: Joi.object({
      start: Joi.string().optional(),
      end: Joi.string().optional(),
      available: Joi.boolean().default(true),
    }).optional(),
    wednesday: Joi.object({
      start: Joi.string().optional(),
      end: Joi.string().optional(),
      available: Joi.boolean().default(true),
    }).optional(),
    thursday: Joi.object({
      start: Joi.string().optional(),
      end: Joi.string().optional(),
      available: Joi.boolean().default(true),
    }).optional(),
    friday: Joi.object({
      start: Joi.string().optional(),
      end: Joi.string().optional(),
      available: Joi.boolean().default(true),
    }).optional(),
    saturday: Joi.object({
      start: Joi.string().optional(),
      end: Joi.string().optional(),
      available: Joi.boolean().default(true),
    }).optional(),
    sunday: Joi.object({
      start: Joi.string().optional(),
      end: Joi.string().optional(),
      available: Joi.boolean().default(true),
    }).optional(),
    emergencyService: Joi.boolean().default(false),
    responseTime: Joi.number().min(1).default(24),
  }).optional(),
});

const updateServiceSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  description: Joi.string().min(10).max(1000).optional(),
  category: Joi.string().min(2).max(50).optional(),
  subcategory: Joi.string().min(2).max(50).optional(),
  pricing: Joi.object({
    type: Joi.string().valid("hourly", "fixed", "negotiable").optional(),
    amount: Joi.number().min(0).optional(),
    currency: Joi.string().optional(),
    minAmount: Joi.number().min(0).optional(),
    maxAmount: Joi.number().min(0).optional(),
  }).optional(),
  location: Joi.object({
    address: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    country: Joi.string().optional(),
    coordinates: Joi.object({
      lat: Joi.number().optional(),
      lng: Joi.number().optional(),
    }).optional(),
    serviceRadius: Joi.number().min(1).max(500).optional(),
  }).optional(),
  images: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  requirements: Joi.string().max(500).optional(),
  availability: Joi.object({
    monday: Joi.object({
      start: Joi.string().optional(),
      end: Joi.string().optional(),
      available: Joi.boolean().optional(),
    }).optional(),
    tuesday: Joi.object({
      start: Joi.string().optional(),
      end: Joi.string().optional(),
      available: Joi.boolean().optional(),
    }).optional(),
    wednesday: Joi.object({
      start: Joi.string().optional(),
      end: Joi.string().optional(),
      available: Joi.boolean().optional(),
    }).optional(),
    thursday: Joi.object({
      start: Joi.string().optional(),
      end: Joi.string().optional(),
      available: Joi.boolean().optional(),
    }).optional(),
    friday: Joi.object({
      start: Joi.string().optional(),
      end: Joi.string().optional(),
      available: Joi.boolean().optional(),
    }).optional(),
    saturday: Joi.object({
      start: Joi.string().optional(),
      end: Joi.string().optional(),
      available: Joi.boolean().optional(),
    }).optional(),
    sunday: Joi.object({
      start: Joi.string().optional(),
      end: Joi.string().optional(),
      available: Joi.boolean().optional(),
    }).optional(),
    emergencyService: Joi.boolean().optional(),
    responseTime: Joi.number().min(1).optional(),
  }).optional(),
  status: Joi.string()
    .valid("active", "inactive", "booked", "completed")
    .optional(),
});

// Create a new service (providers only)
exports.createService = asyncHandler(async (req, res) => {
  // Check if user is a provider
  const user = await User.findById(req.user.id);
  if (!user || user.role !== "provider") {
    const err = new Error("Only providers can create services");
    err.status = 403;
    throw err;
  }

  const { error } = createServiceSchema.validate(req.body);
  if (error) {
    const err = new Error(error.details[0].message);
    err.status = 400;
    throw err;
  }

  const serviceData = {
    ...req.body,
    provider: req.user.id,
  };

  // Convert coordinates format if provided
  if (serviceData.location && serviceData.location.coordinates) {
    const { lat, lng } = serviceData.location.coordinates;
    serviceData.location.coordinates = {
      type: "Point",
      coordinates: [lng, lat], // MongoDB expects [longitude, latitude]
    };
  }

  const service = new Service(serviceData);
  await service.save();

  // Populate provider details
  await service.populate(
    "provider",
    "name businessName serviceCategory averageRating totalReviews",
  );

  res.status(201).json({
    success: true,
    message: "Service created successfully",
    data: service,
  });
});

// Get all services (public)
exports.getAllServices = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    category,
    status = "active",
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const query = { status };

  if (category) {
    query.category = category;
  }

  if (search) {
    query.$text = { $search: search };
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

  const services = await Service.find(query)
    .populate("provider", "name businessName serviceCategory")
    .sort(sortOptions)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

  const total = await Service.countDocuments(query);

  res.json({
    success: true,
    services,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalServices: total,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  });
});

// Get service by ID (public)
exports.getServiceById = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id).populate(
    "provider",
    "name businessName serviceCategory phone address",
  );

  if (!service) {
    const err = new Error("Service not found");
    err.status = 404;
    throw err;
  }

  res.json({
    success: true,
    service,
  });
});

// Update service (owner only)
exports.updateService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    const err = new Error("Service not found");
    err.status = 404;
    throw err;
  }

  if (service.provider.toString() !== req.userId) {
    const err = new Error("Not authorized to update this service");
    err.status = 403;
    throw err;
  }

  const { error } = updateServiceSchema.validate(req.body);
  if (error) {
    const err = new Error(error.details[0].message);
    err.status = 400;
    throw err;
  }

  const updatedService = await Service.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true },
  ).populate("provider", "name businessName serviceCategory");

  res.json({
    success: true,
    message: "Service updated successfully",
    service: updatedService,
  });
});

// Delete service (owner only)
exports.deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    const err = new Error("Service not found");
    err.status = 404;
    throw err;
  }

  if (service.provider.toString() !== req.userId) {
    const err = new Error("Not authorized to delete this service");
    err.status = 403;
    throw err;
  }

  await Service.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Service deleted successfully",
  });
});

// Get services by provider (public)
exports.getServicesByProvider = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = "active" } = req.query;

  const query = {
    provider: req.params.providerId,
    status,
  };

  const services = await Service.find(query)
    .populate("provider", "name businessName serviceCategory")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

  const total = await Service.countDocuments(query);

  res.json({
    success: true,
    services,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalServices: total,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  });
});
