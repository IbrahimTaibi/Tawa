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
  const { role } = req.body;

  // Choose validation schema based on role
  const schema =
    role === "provider" ? providerRegisterSchema : customerRegisterSchema;
  const { error } = schema.validate(req.body);

  if (error) {
    const err = new Error(error.details[0].message);
    err.status = 400;
    throw err;
  }

  const { email } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const err = new Error("Email already in use");
    err.status = 409;
    throw err;
  }

  const user = new User(req.body);
  try {
    await user.save();
  } catch (err) {
    if (err.code === 11000) {
      const error = new Error("Email already in use");
      error.status = 409;
      throw error;
    }
    throw err;
  }

  // Send welcome email (non-blocking)
  try {
    await sendWelcomeEmail(user);
  } catch (emailError) {
    console.error("Failed to send welcome email:", emailError);
    // Don't fail the registration if email fails
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );

  // Return user data based on role
  const userResponse = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  if (user.role === "provider") {
    userResponse.businessName = user.businessName;
    userResponse.serviceCategory = user.serviceCategory;
    userResponse.phone = user.phone;
    userResponse.address = user.address;
  }

  res.status(201).json({ token, user: userResponse });
});

exports.login = asyncHandler(async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    const err = new Error("Invalid email or password");
    err.status = 400;
    throw err;
  }
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );

  // Return user data based on role
  const userResponse = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  if (user.role === "provider") {
    userResponse.businessName = user.businessName;
    userResponse.serviceCategory = user.serviceCategory;
    userResponse.phone = user.phone;
    userResponse.address = user.address;
  }

  res.json({ token, user: userResponse });
});

// Request password reset
exports.requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    const err = new Error("Email is required");
    err.status = 400;
    throw err;
  }

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if email exists or not for security
    return res.json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

  // Save reset token to user
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = resetTokenExpiry;
  await user.save();

  // Send password reset email
  try {
    await sendPasswordResetEmail(user, resetToken);
  } catch (emailError) {
    console.error("Failed to send password reset email:", emailError);
    const err = new Error("Failed to send password reset email");
    err.status = 500;
    throw err;
  }

  res.json({
    success: true,
    message:
      "If an account with that email exists, a password reset link has been sent.",
  });
});

// Reset password with token
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    const err = new Error("Token and new password are required");
    err.status = 400;
    throw err;
  }

  // Validate password strength
  const passwordSchema = Joi.string()
    .min(8)
    .max(128)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*d).+$"))
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, and one number.",
    });

  const { error } = passwordSchema.validate(newPassword);
  if (error) {
    const err = new Error(error.details[0].message);
    err.status = 400;
    throw err;
  }

  // Find user with valid reset token
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    const err = new Error("Invalid or expired reset token");
    err.status = 400;
    throw err;
  }

  // Update password and clear reset token
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({
    success: true,
    message: "Password has been reset successfully",
  });
});
