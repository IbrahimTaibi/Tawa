// Email Configuration
// Add these environment variables to your .env file:

/*
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
FRONTEND_URL=http://localhost:3000
*/

// For Gmail setup:
// 1. Enable 2-factor authentication on your Google account
// 2. Generate an App Password: Google Account > Security > App Passwords
// 3. Use that App Password as EMAIL_PASSWORD

// For other email services:
// - Outlook/Hotmail: EMAIL_SERVICE=outlook
// - Yahoo: EMAIL_SERVICE=yahoo
// - Custom SMTP: Use host, port, secure options instead of service

module.exports = {
  service: process.env.EMAIL_SERVICE || "gmail",
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
};
