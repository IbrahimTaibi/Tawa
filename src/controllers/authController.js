const User = require("../models/User");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const asyncHandler = require("../utils/asyncHandler");
const {
  sendWelcomeEmail,
  sendPasswordResetEmail,
} = require("../utils/emailService");
const crypto = require("crypto");
const dotenv = require("dotenv");
const {
  Errors,
  ErrorFactory,
  ValidationError,
  ConflictError,
  AuthenticationError,
  EmailError,
} = require("../utils/errors");
dotenv.config();

const customerRegisterSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*d).+$"))
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, and one number.",
    }),
  role: Joi.string().valid("customer").required(),
  phone: Joi.string().optional(),
  address: Joi.string().optional(),
});

const providerRegisterSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*d).+$"))
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, and one number.",
    }),
  role: Joi.string().valid("provider").required(),
  businessName: Joi.string().min(2).max(100).required(),
  serviceCategory: Joi.string().min(2).max(50).required(),
  businessDescription: Joi.string().max(500).optional(),
  phone: Joi.string().required(),
  address: Joi.string().required(),
  profileImage: Joi.string().optional(),
  certifications: Joi.array().items(Joi.string()).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

exports.register = asyncHandler(async (req, res) => {
  const { error } = customerRegisterSchema.validate(req.body);
  if (error) {
    throw ErrorFactory.fromJoiError(error);
  }

  const {
    name,
    email,
    password,
    role,
    businessName,
    serviceCategory,
    businessDescription,
    phone,
    address,
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw Errors.EMAIL_ALREADY_EXISTS;
  }

  // Create user
  const userData = {
    name,
    email,
    password,
    role,
    ...(role === "provider" && {
      businessName,
      serviceCategory,
      businessDescription,
      phone,
      address,
    }),
  };

  const user = new User(userData);
  await user.save();

  // Generate JWT token
  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  // Send welcome email (non-blocking)
  try {
    await sendWelcomeEmail(user);
  } catch (emailError) {
    console.error("Failed to send welcome email:", emailError);
    // Don't fail registration if email fails
  }

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessName: user.businessName,
        serviceCategory: user.serviceCategory,
        isVerified: user.isVerified,
      },
      token,
    },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    throw ErrorFactory.fromJoiError(error);
  }

  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    throw Errors.INVALID_CREDENTIALS;
  }

  // Check if user is blocked
  if (user.isBlocked) {
    throw new AuthenticationError(
      "Account has been blocked. Please contact support.",
    );
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw Errors.INVALID_CREDENTIALS;
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.json({
    success: true,
    message: "Login successful",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessName: user.businessName,
        serviceCategory: user.serviceCategory,
        isVerified: user.isVerified,
        averageRating: user.averageRating,
        totalReviews: user.totalReviews,
      },
      token,
    },
  });
});

// Forgot password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw Errors.MISSING_REQUIRED_FIELD("email");
  }

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if email exists or not for security
    return res.json({
      success: true,
      message: "If the email exists, a password reset link has been sent",
    });
  }

  // Generate reset token
  const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  // Save reset token to user
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
  await user.save();

  // Send password reset email
  try {
    await sendPasswordResetEmail(user, resetToken);
  } catch (emailError) {
    console.error("Failed to send password reset email:", emailError);
    throw new EmailError("Failed to send password reset email");
  }

  res.json({
    success: true,
    message: "If the email exists, a password reset link has been sent",
  });
});

// Reset password
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ValidationError("Token and new password are required");
  }

  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (jwtError) {
    throw Errors.TOKEN_INVALID;
  }

  // Find user with valid reset token
  const user = await User.findOne({
    _id: decoded.userId,
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new AuthenticationError("Invalid or expired reset token");
  }

  // Validate new password
  const { error } = passwordSchema.validate({ password: newPassword });
  if (error) {
    throw ErrorFactory.fromJoiError(error);
  }

  // Update password
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({
    success: true,
    message: "Password reset successful",
  });
});
