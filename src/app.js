const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const authRoutes = require("./routes/auth");
const serviceRoutes = require("./routes/services");
const bookingRoutes = require("./routes/bookings");
const reviewRoutes = require("./routes/reviews");
const searchRoutes = require("./routes/search");
const chatRoutes = require("./routes/chats");
const pushRoutes = require("./routes/push");
const errorHandler = require("./middleware/errorHandler");
const adminRoutes = require("./routes/admin");

const app = express();

// Security HTTP headers
app.use(helmet());
// Enable CORS
app.use(cors());
// Logging
app.use(morgan("dev"));
// Body parser
app.use(express.json());
// Rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Tawa API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/admin", adminRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
