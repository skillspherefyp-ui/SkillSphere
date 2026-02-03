const path = require('path');
const fs = require('fs');

// Load the logo image and convert to base64
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'skillsphere-logo.png');
let LOGO_BASE64_PNG = '';

try {
  if (fs.existsSync(LOGO_PATH)) {
    const logoBuffer = fs.readFileSync(LOGO_PATH);
    LOGO_BASE64_PNG = logoBuffer.toString('base64');
    console.log('✅ Logo loaded successfully from:', LOGO_PATH);
  } else {
    console.log('⚠️ Logo file not found at:', LOGO_PATH);
  }
} catch (error) {
  console.error('Error loading logo:', error.message);
}

// Log Email Service Configuration
console.log('📧 Email Service Configuration:');
console.log(`   BREVO_API_KEY: ${process.env.BREVO_API_KEY ? '***configured***' : 'NOT SET'}`);
console.log(`   SMTP_FROM_EMAIL: ${process.env.SMTP_FROM_EMAIL || 'NOT SET'}`);
console.log('   Using: Brevo HTTP API (not SMTP)');

// Brevo API endpoint
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// Send email using Brevo HTTP API
const sendEmailWithBrevoAPI = async (emailData) => {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'skillspherefyp@gmail.com';

  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not configured');
  }

  console.log(`📧 Sending email to: ${emailData.to}`);
  console.log(`📧 Subject: ${emailData.subject}`);
  console.log(`📧 Using: Brevo HTTP API`);

  const payload = {
    sender: { name: 'SkillSphere', email: fromEmail },
    to: [{ email: emailData.to, name: emailData.toName || emailData.to }],
    subject: emailData.subject,
    htmlContent: emailData.html,
    textContent: emailData.text
  };

  // Add attachments if present (for certificates)
  if (emailData.attachments && emailData.attachments.length > 0) {
    payload.attachment = emailData.attachments
      .filter(att => att.content && att.filename)
      .map(att => ({
        name: att.filename,
        content: att.content.toString('base64')
      }));
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Brevo API error:', data);
      throw new Error(data.message || `Brevo API error: ${response.status}`);
    }

    console.log(`✅ Email sent successfully! Message ID: ${data.messageId}`);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('❌ Email failed:', error.message);
    throw error;
  }
};

// Get logo as data URI
const getLogoDataUri = () => {
  if (LOGO_BASE64_PNG) {
    return `data:image/png;base64,${LOGO_BASE64_PNG}`;
  }
  return null;
};

// Generate email template
const generateEmailTemplate = ({ title, subtitle, content, icon }) => {
  const logoDataUri = getLogoDataUri();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>${title}</title>
  <style>
    :root { color-scheme: light dark; }
    body { background-color: #f4f4f4 !important; margin: 0; padding: 0; }
    .email-body { background-color: #ffffff !important; }
    .text-primary { color: #1a1a2e !important; }
    .text-secondary { color: #666666 !important; }
    .text-muted { color: #999999 !important; }
    .highlight-box { background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%) !important; border-color: #C7D2FE !important; }
    .info-box { background-color: #f8fafc !important; border-color: #e2e8f0 !important; }
    .footer-bg { background-color: #EEF2FF !important; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a2e !important; }
      .email-body { background-color: #2d2d44 !important; }
      .text-primary { color: #ffffff !important; }
      .text-secondary { color: #d1d5db !important; }
      .highlight-box { background: linear-gradient(135deg, #312e81 0%, #1e3a5f 100%) !important; }
      .info-box { background-color: #374151 !important; }
      .code-display { background-color: #374151 !important; color: #22D3EE !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(79,70,229,0.12);" class="email-body">

          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%); padding: 40px 30px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <!-- Logo -->
                ${logoDataUri ? `
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <img src="${logoDataUri}" alt="SkillSphere" width="180" height="auto" style="display: block; border: 0; max-width: 180px;">
                  </td>
                </tr>
                ` : ''}
                <!-- Icon (if provided) -->
                ${icon ? `
                <tr>
                  <td align="center" style="padding-bottom: 15px;">
                    <span style="font-size: 50px; line-height: 1;">${icon}</span>
                  </td>
                </tr>
                ` : ''}
                <!-- Title -->
                <tr>
                  <td align="center">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${title}</h1>
                    ${subtitle ? `<p style="color: rgba(255,255,255,0.85); margin: 12px 0 0 0; font-size: 15px; font-weight: 400;">${subtitle}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 35px;" class="email-body">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%); padding: 30px; text-align: center;">
              ${logoDataUri ? `
              <img src="${logoDataUri}" alt="SkillSphere" width="120" height="auto" style="display: inline-block; margin-bottom: 15px; opacity: 0.9;">
              ` : `
              <p style="color: #8B5CF6; margin: 0 0 10px 0; font-size: 18px; font-weight: 700;">SkillSphere</p>
              `}
              <p style="color: #a0aec0; margin: 0 0 8px 0; font-size: 12px;">Empower your skills, Expand your sphere</p>
              <p style="color: #718096; margin: 0; font-size: 11px;">&copy; ${new Date().getFullYear()} SkillSphere. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// Send OTP Email
const sendOTPEmail = async (email, otp, name = 'User') => {
  const content = `
    <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;" class="text-primary">Hello ${name}!</h2>
    <p style="color: #666666; margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;" class="text-secondary">Your verification code is:</p>
    <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 0 0 25px 0; border: 1px solid #C7D2FE;" class="highlight-box">
      <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #4F46E5;" class="code-display">${otp}</span>
    </div>
    <p style="color: #666666; margin: 0 0 15px 0; font-size: 14px;" class="text-secondary">This code will expire in <strong>10 minutes</strong>.</p>
    <p style="color: #999999; margin: 0; font-size: 13px;" class="text-muted">If you didn't request this code, please ignore this email.</p>
  `;

  return await sendEmailWithBrevoAPI({
    to: email,
    toName: name,
    subject: `${otp} is your SkillSphere verification code`,
    html: generateEmailTemplate({ title: 'SkillSphere', subtitle: 'Verification Code', content }),
    text: `Hello ${name},\n\nYour SkillSphere verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nSkillSphere`
  });
};

// Send Welcome Email
const sendWelcomeEmail = async (email, name) => {
  const content = `
    <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;" class="text-primary">Hello ${name}!</h2>
    <p style="color: #666666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;" class="text-secondary">Thank you for joining <strong>SkillSphere</strong>! We're excited to have you on board.</p>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 0 0 25px 0; border: 1px solid #e2e8f0;" class="info-box">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #475569; font-weight: 600;">What you can do:</p>
      <ul style="color: #64748b; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
        <li>Browse and enroll in courses</li>
        <li>Track your learning progress</li>
        <li>Earn certificates upon completion</li>
        <li>Connect with expert instructors</li>
      </ul>
    </div>
    <p style="color: #10B981; margin: 0; font-size: 14px; font-weight: 500;">Start exploring our courses and expand your skills today!</p>
  `;

  return await sendEmailWithBrevoAPI({
    to: email,
    toName: name,
    subject: 'Welcome to SkillSphere!',
    html: generateEmailTemplate({ title: 'Welcome to SkillSphere!', subtitle: 'Your learning journey begins', icon: '🎉', content }),
    text: `Hello ${name}!\n\nWelcome to SkillSphere! Thank you for joining us.\n\nSkillSphere`
  });
};

// Send Admin Account Created Email
const sendAdminAccountCreatedEmail = async (email, name, password, role) => {
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
  const content = `
    <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;" class="text-primary">Hello ${name}!</h2>
    <p style="color: #666666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;" class="text-secondary">You have been invited to join SkillSphere as an <strong>${roleDisplay}</strong>.</p>
    <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 25px; margin: 0 0 25px 0; border: 1px solid #C7D2FE;" class="highlight-box">
      <p style="margin: 0 0 5px 0; font-size: 13px; color: #6366F1; font-weight: 600; text-transform: uppercase;">Your Login Credentials</p>
      <p style="margin: 15px 0 10px 0; font-size: 15px; color: #4F46E5;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 0; font-size: 15px; color: #4F46E5;"><strong>Password:</strong> ${password}</p>
    </div>
    <p style="color: #e74c3c; margin: 0; font-size: 14px; font-weight: 500;">⚠️ Please change your password after your first login.</p>
  `;

  return await sendEmailWithBrevoAPI({
    to: email,
    toName: name,
    subject: `Welcome to SkillSphere - Your ${roleDisplay} Account is Ready!`,
    html: generateEmailTemplate({ title: 'Account Created', subtitle: `${roleDisplay} Access Granted`, icon: '🔐', content }),
    text: `Hello ${name}!\n\nYou have been invited as ${roleDisplay}.\n\nEmail: ${email}\nPassword: ${password}\n\nSkillSphere`
  });
};

// Send Certificate Email
const sendCertificateEmail = async (email, studentName, courseName, certificateNumber, pdfBuffer) => {
  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const content = `
    <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;" class="text-primary">Hello ${studentName}!</h2>
    <p style="color: #666666; margin: 0 0 20px 0; font-size: 16px;" class="text-secondary">You have successfully completed the course:</p>
    <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 0 0 25px 0; border: 1px solid #C7D2FE;" class="highlight-box">
      <p style="margin: 0 0 5px 0; font-size: 13px; color: #6366F1; font-weight: 600; text-transform: uppercase;">Course Completed</p>
      <h3 style="font-size: 20px; font-weight: 700; color: #4F46E5; margin: 10px 0 0 0;">${courseName}</h3>
    </div>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 0 0 25px 0; border: 1px solid #e2e8f0;" class="info-box">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #475569;"><strong>Certificate ID:</strong> ${certificateNumber}</p>
      <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Issued Date:</strong> ${issueDate}</p>
    </div>
    <p style="color: #10B981; margin: 0; font-size: 14px; font-weight: 500;">🎯 Keep up the great work!</p>
  `;

  return await sendEmailWithBrevoAPI({
    to: email,
    toName: studentName,
    subject: `Congratulations! Your Certificate for ${courseName}`,
    html: generateEmailTemplate({ title: 'Congratulations!', subtitle: "You've earned a certificate", icon: '🏆', content }),
    text: `Congratulations ${studentName}!\n\nYou completed: ${courseName}\nCertificate ID: ${certificateNumber}\n\nSkillSphere`,
    attachments: [{ filename: `Certificate_${certificateNumber}.pdf`, content: pdfBuffer }]
  });
};

// Send Super Admin Welcome Email
const sendSuperAdminWelcomeEmail = async (email, name, password) => {
  const content = `
    <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;" class="text-primary">Welcome, ${name}!</h2>
    <p style="color: #666666; margin: 0 0 20px 0; font-size: 16px;" class="text-secondary">Your Super Admin account has been created successfully.</p>
    <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 25px; margin: 0 0 25px 0; border: 1px solid #C7D2FE;" class="highlight-box">
      <p style="margin: 0 0 5px 0; font-size: 13px; color: #6366F1; font-weight: 600; text-transform: uppercase;">Your Login Credentials</p>
      <p style="margin: 15px 0 10px 0; font-size: 15px; color: #4F46E5;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 0; font-size: 15px; color: #4F46E5;"><strong>Password:</strong> ${password}</p>
    </div>
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 0 0 25px 0; border: 1px solid #e2e8f0;" class="info-box">
      <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569; font-weight: 600; text-transform: uppercase;">Your Permissions</p>
      <ul style="color: #64748b; margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
        <li>Manage all users</li>
        <li>Create and manage courses</li>
        <li>Configure certificates</li>
        <li>View analytics</li>
      </ul>
    </div>
    <p style="color: #e74c3c; margin: 0; font-size: 14px; font-weight: 500;">⚠️ Please change your password after your first login.</p>
  `;

  return await sendEmailWithBrevoAPI({
    to: email,
    toName: name,
    subject: 'Welcome Super Admin - Your SkillSphere Account is Ready!',
    html: generateEmailTemplate({ title: 'SkillSphere', subtitle: 'Super Administrator Access Granted', icon: '👑', content }),
    text: `Welcome ${name}!\n\nYour Super Admin account is ready.\n\nEmail: ${email}\nPassword: ${password}\n\nSkillSphere`
  });
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendAdminAccountCreatedEmail,
  sendCertificateEmail,
  sendSuperAdminWelcomeEmail
};
