/**
 * Email Delivery Test Script
 *
 * Tests email delivery to different email providers including institutional emails
 *
 * Usage: node test-email-delivery.js <email_address>
 * Example: node test-email-delivery.js BCS223076@cust.pk
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = process.argv[2];

if (!testEmail) {
  console.log('Usage: node test-email-delivery.js <email_address>');
  console.log('Example: node test-email-delivery.js BCS223076@cust.pk');
  process.exit(1);
}

const isInstitutional = testEmail.includes('.edu') ||
                       testEmail.includes('.pk') ||
                       testEmail.includes('.ac.') ||
                       testEmail.includes('cust.pk');

console.log('='.repeat(60));
console.log('SkillSphere Email Delivery Test');
console.log('='.repeat(60));
console.log(`\nTesting email delivery to: ${testEmail}`);
console.log(`Email type: ${isInstitutional ? 'INSTITUTIONAL' : 'Regular'}`);
console.log(`From: ${process.env.SMTP_USER}`);
console.log('');

async function testWithGmailService() {
  console.log('\n--- Method 1: Gmail Service ---');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.verify();
  console.log('✅ Connection verified');
  return transporter;
}

async function testWithDirectSMTP() {
  console.log('\n--- Method 2: Direct SMTP (SSL) ---');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.verify();
  console.log('✅ Connection verified');
  return transporter;
}

async function testEmailDelivery() {
  const fromEmail = process.env.SMTP_USER;
  const testCode = Math.floor(100000 + Math.random() * 900000);

  // Simple email for institutional addresses
  const simpleMailOptions = {
    from: fromEmail,
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
<h2>SkillSphere Test</h2>
<p>Your test verification code is:</p>
<h1 style="font-size: 32px; background: #f0f0f0; padding: 15px; text-align: center;">${testCode}</h1>
<p>If you received this email, delivery is working correctly!</p>
<p style="color: #666; font-size: 12px;">Sent to: ${testEmail}<br>Time: ${new Date().toISOString()}</p>
</body>
</html>`
  };

  const methods = [
    { name: 'Gmail Service', fn: testWithGmailService },
    { name: 'Direct SMTP', fn: testWithDirectSMTP }
  ];

  for (const method of methods) {
    try {
      const transporter = await method.fn();

      console.log(`Sending email via ${method.name}...`);
      const info = await transporter.sendMail(simpleMailOptions);

      console.log('\n' + '='.repeat(60));
      console.log(`✅ EMAIL SENT via ${method.name}!`);
      console.log('='.repeat(60));
      console.log(`Message ID: ${info.messageId}`);
      console.log(`Response: ${info.response}`);
      console.log(`Test Code: ${testCode}`);

      console.log('\n📋 CHECK YOUR EMAIL:');
      console.log('1. Wait 1-5 minutes');
      console.log('2. Check INBOX');
      console.log('3. Check SPAM/JUNK folder');
      console.log('4. Look for subject: "' + testCode + ' - SkillSphere Test Code"');

      if (isInstitutional) {
        console.log('\n⚠️  INSTITUTIONAL EMAIL:');
        console.log('If not received, the university server may be blocking.');
        console.log('Options:');
        console.log('1. Ask IT to whitelist: ' + fromEmail);
        console.log('2. Add ' + fromEmail + ' to your contacts');
        console.log('3. Check quarantine/blocked emails');
      }

      return; // Success, exit

    } catch (error) {
      console.error(`❌ ${method.name} failed:`, error.message);
    }
  }

  console.error('\n❌ ALL METHODS FAILED');
  console.log('Please check your SMTP credentials in .env file');
}

testEmailDelivery();
