/**
 * Email Delivery Test Script
 *
 * Tests email delivery using Brevo SMTP
 *
 * Usage: node test-email-delivery.js <email_address>
 * Example: node test-email-delivery.js danishshafique39@gmail.com
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = process.argv[2];

if (!testEmail) {
  console.log('Usage: node test-email-delivery.js <email_address>');
  console.log('Example: node test-email-delivery.js your-email@gmail.com');
  process.exit(1);
}

const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

console.log('='.repeat(60));
console.log('SkillSphere Email Delivery Test (Brevo SMTP)');
console.log('='.repeat(60));
console.log(`\nSMTP Host: ${process.env.SMTP_HOST}`);
console.log(`SMTP User: ${process.env.SMTP_USER}`);
console.log(`From Email: ${fromEmail}`);
console.log(`To: ${testEmail}`);
console.log('');

async function testBrevoSMTP() {
  console.log('\n--- Testing Brevo SMTP (Port 587) ---');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  await transporter.verify();
  console.log('✅ SMTP Connection verified');
  return transporter;
}

async function testEmailDelivery() {
  const testCode = Math.floor(100000 + Math.random() * 900000);

  const mailOptions = {
    from: { name: 'SkillSphere', address: fromEmail },
    to: testEmail,
    subject: `${testCode} - SkillSphere Test Code`,
    text: `Hello,

Your test verification code is: ${testCode}

This is a test email from SkillSphere.
If you received this, email delivery is working!

Sent to: ${testEmail}
Time: ${new Date().toISOString()}

SkillSphere Team`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
<h2 style="color: #4F46E5;">SkillSphere Test</h2>
<p>Your test verification code is:</p>
<h1 style="font-size: 32px; background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); padding: 15px; text-align: center; color: #4F46E5; border-radius: 8px;">${testCode}</h1>
<p>If you received this email, delivery is working correctly!</p>
<p style="color: #666; font-size: 12px;">Sent to: ${testEmail}<br>Time: ${new Date().toISOString()}</p>
</body>
</html>`
  };

  try {
    const transporter = await testBrevoSMTP();

    console.log('Sending email...');
    const info = await transporter.sendMail(mailOptions);

    console.log('\n' + '='.repeat(60));
    console.log('✅ EMAIL SENT SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Response: ${info.response}`);
    console.log(`Test Code: ${testCode}`);

    console.log('\n📋 CHECK YOUR EMAIL:');
    console.log('1. Wait 1-2 minutes');
    console.log('2. Check INBOX');
    console.log('3. Check SPAM/JUNK folder');
    console.log(`4. Look for subject: "${testCode} - SkillSphere Test Code"`);

  } catch (error) {
    console.error('\n❌ EMAIL FAILED:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    console.log('2. Verify Brevo API key is active');
    console.log('3. Check if sender email is verified in Brevo');
  }
}

testEmailDelivery();
