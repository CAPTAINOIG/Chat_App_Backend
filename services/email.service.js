const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: config.email.service,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  async sendWelcomeEmail(email, username) {
    const Captain = "https://res.cloudinary.com/dbp6ovv7b/image/upload/v1715783819/tvf5apwj5bwmwf2qjfhh.png";
    
    const mailOptions = {
      from: config.email.user,
      to: email,
      subject: "Welcome to Captain Chat App",
      html: `
        <div style="background-color: rgb(4,48,64); padding: 20px; color: rgb(179,148,113); border-radius: 5px">
          <img src="${Captain}" alt="Captain Chat Logo" style="max-width: 150px; height: 130px; margin-bottom: 20px; margin-left: 300px;">
          <div style="text-align: center;">
            <p style="font-size: 18px;">Hello, ${username}!</p>
            <p style="font-size: 16px;">Welcome to Captain Chat App! We're thrilled that you've chosen to register with us.</p>
            <p style="font-size: 16px;">If you have any questions or need assistance, feel free to reach out.</p>
            <p style="font-size: 16px;">Thank you for joining us.</p>
            <p style="font-size: 16px;">Best regards,</p>
            <p style="font-size: 16px;">The Captain Chat App Team</p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send welcome email to ${email}:`, error);
      // Don't throw - email failure shouldn't break registration
    }
  }

  async sendPasswordResetEmail(email, resetToken) {
    const mailOptions = {
      from: config.email.user,
      to: email,
      subject: "Password Reset Request",
      html: `
        <div style="padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset. Use the code below:</p>
          <h3 style="background-color: #f0f0f0; padding: 10px; display: inline-block;">${resetToken}</h3>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}:`, error);
      throw new Error('Failed to send password reset email');
    }
  }
}

module.exports = new EmailService();
