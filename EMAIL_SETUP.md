# Email Setup Guide for Tawa

This guide will help you set up email notifications for the Tawa marketplace backend.

## Prerequisites

1. **Gmail Account** (recommended for development)
2. **2-Factor Authentication** enabled on your Google account
3. **App Password** generated for the application

## Step 1: Enable 2-Factor Authentication

1. Go to your [Google Account settings](https://myaccount.google.com/)
2. Navigate to **Security**
3. Enable **2-Step Verification** if not already enabled

## Step 2: Generate App Password

1. In Google Account settings, go to **Security**
2. Find **App passwords** (under 2-Step Verification)
3. Select **Mail** as the app and **Other** as the device
4. Enter a name like "Tawa Backend"
5. Click **Generate**
6. Copy the 16-character password (you'll only see it once!)

## Step 3: Create Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
FRONTEND_URL=http://localhost:3000
```

## Step 4: Test Email Configuration

You can test your email setup by running the server and triggering one of these actions:

1. **User Registration** - Sends welcome email
2. **Booking Creation** - Sends booking confirmation
3. **Booking Status Update** - Sends status notification
4. **New Message** - Sends message notification
5. **Password Reset** - Sends reset link

## Email Templates Available

The system includes these email templates:

### 1. Welcome Email

- **Trigger**: User registration
- **Recipients**: New users
- **Content**: Welcome message and platform overview

### 2. Booking Confirmation

- **Trigger**: New booking creation
- **Recipients**: Customers
- **Content**: Booking details, service info, provider contact

### 3. Booking Status Update

- **Trigger**: Booking status changes
- **Recipients**: Customers
- **Content**: Updated status and booking details

### 4. New Message Notification

- **Trigger**: New chat message
- **Recipients**: Chat participants
- **Content**: Sender info and link to view message

### 5. Password Reset

- **Trigger**: Password reset request
- **Recipients**: Users requesting reset
- **Content**: Reset link with 1-hour expiry

## Alternative Email Services

### Outlook/Hotmail

```env
EMAIL_SERVICE=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

### Yahoo

```env
EMAIL_SERVICE=yahoo
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
```

### Custom SMTP Server

```env
EMAIL_HOST=smtp.yourprovider.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-password
```

## Troubleshooting

### Common Issues

1. **"Invalid login" error**

   - Check if 2FA is enabled
   - Verify you're using App Password, not regular password
   - Ensure EMAIL_USER is correct

2. **"Authentication failed" error**

   - Regenerate App Password
   - Check if account has any security restrictions

3. **Emails not sending**
   - Check console logs for error messages
   - Verify all environment variables are set
   - Test with a simple email first

### Testing Email Functionality

You can test emails by:

1. **Registering a new user** - Should receive welcome email
2. **Creating a booking** - Should receive confirmation email
3. **Sending a chat message** - Should trigger notification email
4. **Requesting password reset** - Should receive reset link

## Security Notes

- Never commit your `.env` file to version control
- Use App Passwords instead of regular passwords
- Regularly rotate App Passwords
- Consider using environment-specific email configurations

## Production Considerations

For production deployment:

1. **Use a dedicated email service** like SendGrid, Mailgun, or AWS SES
2. **Set up proper DNS records** (SPF, DKIM, DMARC)
3. **Monitor email delivery rates**
4. **Implement email queuing** for high-volume scenarios
5. **Add email templates** for different languages/regions

## Example .env File

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/tawa

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify your email service credentials
3. Test with a simple nodemailer example first
4. Check your email provider's security settings
