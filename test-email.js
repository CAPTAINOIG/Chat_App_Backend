
const emailService = require('./services/email.service');
const logger = require('./utils/logger');
const config = require('./config');

console.log('Testing email service...');
console.log('Email config:', {
  service: config.email.service,
  user: config.email.user,
  password: config.email.password ? '***' : undefined
});

async function testEmail() {
  try {
    console.log('Sending test password reset email...');
    await emailService.sendPasswordResetEmail('abdullahisamsudeen@gmail.com', '1234');
    console.log('Test email sent successfully!');
  } catch (error) {
    console.error('Error sending test email:', error);
  }
}

testEmail();
