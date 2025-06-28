const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Email templates
const emailTemplates = {
  // Booking confirmation
  bookingConfirmation: (booking, service, customer) => ({
    subject: `Booking Confirmed - ${service.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Booking Confirmed!</h2>
        <p>Hi ${customer.name},</p>
        <p>Your booking has been confirmed for <strong>${
          service.title
        }</strong>.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Booking Details:</h3>
          <p><strong>Service:</strong> ${service.title}</p>
          <p><strong>Provider:</strong> ${service.provider.name}</p>
          <p><strong>Date:</strong> ${new Date(
            booking.scheduledDate,
          ).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(
            booking.scheduledDate,
          ).toLocaleTimeString()}</p>
          <p><strong>Price:</strong> $${booking.price}</p>
          <p><strong>Status:</strong> ${booking.status}</p>
        </div>
        
        <p>You can view your booking details in your dashboard.</p>
        <p>Thank you for choosing Tawa!</p>
      </div>
    `,
  }),

  // Booking status update
  bookingStatusUpdate: (booking, service, customer, newStatus) => ({
    subject: `Booking Status Updated - ${service.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Booking Status Updated</h2>
        <p>Hi ${customer.name},</p>
        <p>Your booking for <strong>${
          service.title
        }</strong> has been updated.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Updated Status:</h3>
          <p><strong>New Status:</strong> ${newStatus}</p>
          <p><strong>Service:</strong> ${service.title}</p>
          <p><strong>Provider:</strong> ${service.provider.name}</p>
          <p><strong>Date:</strong> ${new Date(
            booking.scheduledDate,
          ).toLocaleDateString()}</p>
        </div>
        
        <p>You can view your booking details in your dashboard.</p>
      </div>
    `,
  }),

  // New message notification
  newMessage: (sender, receiver, chatId) => ({
    subject: `New Message from ${sender.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">New Message</h2>
        <p>Hi ${receiver.name},</p>
        <p>You have received a new message from <strong>${sender.name}</strong>.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>Click the link below to view the message:</p>
          <a href="${process.env.FRONTEND_URL}/chat/${chatId}" 
             style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Message
          </a>
        </div>
        
        <p>Thank you for using Tawa!</p>
      </div>
    `,
  }),

  // Welcome email
  welcome: (user) => ({
    subject: `Welcome to Tawa, ${user.name}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome to Tawa!</h2>
        <p>Hi ${user.name},</p>
        <p>Welcome to Tawa - your local services marketplace!</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>What you can do:</h3>
          <ul>
            <li>Browse local services</li>
            <li>Book appointments with providers</li>
            <li>Chat with service providers</li>
            <li>Leave reviews and ratings</li>
          </ul>
        </div>
        
        <p>Start exploring services in your area!</p>
        <p>Thank you for joining Tawa!</p>
      </div>
    `,
  }),

  // Password reset
  passwordReset: (user, resetToken) => ({
    subject: "Password Reset Request - Tawa",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>You requested a password reset for your Tawa account.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>Click the link below to reset your password:</p>
          <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" 
             style="background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
        </div>
        
        <p>If you didn't request this, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      </div>
    `,
  }),
};

// Send email function
const sendEmail = async (to, template, data) => {
  try {
    const emailContent = emailTemplates[template](...data);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", result.messageId);
    return result;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

// Specific email functions
const sendBookingConfirmation = async (booking, service, customer) => {
  return sendEmail(customer.email, "bookingConfirmation", [
    booking,
    service,
    customer,
  ]);
};

const sendBookingStatusUpdate = async (
  booking,
  service,
  customer,
  newStatus,
) => {
  return sendEmail(customer.email, "bookingStatusUpdate", [
    booking,
    service,
    customer,
    newStatus,
  ]);
};

const sendNewMessageNotification = async (sender, receiver, chatId) => {
  return sendEmail(receiver.email, "newMessage", [sender, receiver, chatId]);
};

const sendWelcomeEmail = async (user) => {
  return sendEmail(user.email, "welcome", [user]);
};

const sendPasswordResetEmail = async (user, resetToken) => {
  return sendEmail(user.email, "passwordReset", [user, resetToken]);
};

module.exports = {
  sendEmail,
  sendBookingConfirmation,
  sendBookingStatusUpdate,
  sendNewMessageNotification,
  sendWelcomeEmail,
  sendPasswordResetEmail,
};
