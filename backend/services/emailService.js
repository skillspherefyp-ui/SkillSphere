const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// Load the logo image and convert to base64
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'skillsphere-logo.png');
let LOGO_BASE64_PNG = '';
let LOGO_CID = 'skillsphere-logo';

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

// Get SMTP config at runtime (not module load time - important for Railway)
const getSmtpConfig = () => {
  return {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT) || 587
  };
};

// Log SMTP configuration status
const logSmtpConfig = () => {
  const config = getSmtpConfig();
  console.log('📧 Email Service Configuration:');
  console.log(`   SMTP_HOST: ${config.host}`);
  console.log(`   SMTP_PORT: ${config.port}`);
  console.log(`   SMTP_USER: ${config.user ? config.user.substring(0, 10) + '***' : '❌ NOT SET'}`);
  console.log(`   SMTP_PASS: ${config.pass ? '***SET*** (length: ' + config.pass.length + ')' : '❌ NOT SET'}`);

  if (!config.user || !config.pass) {
    console.error('❌ WARNING: SMTP credentials are not properly configured!');
  }
  return config;
};

// Create transporter using SMTP settings (Brevo/Gmail/etc)
const createTransporter = () => {
  const config = getSmtpConfig();

  if (!config.user || !config.pass) {
    console.error('❌ Cannot create transporter: SMTP credentials missing');
    console.error(`   SMTP_USER: ${config.user ? 'SET' : 'MISSING'}`);
    console.error(`   SMTP_PASS: ${config.pass ? 'SET' : 'MISSING'}`);
    return null;
  }

  console.log(`📧 Creating transporter: ${config.host}:${config.port}`);

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    pool: false,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000
  });
};

// Alternative transporter using SSL port 465 (fallback)
const createDirectTransporter = () => {
  const config = getSmtpConfig();

  if (!config.user || !config.pass) {
    console.error('❌ Cannot create direct transporter: SMTP credentials missing');
    return null;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: 465,
    secure: true,
    auth: {
      user: config.user,
      pass: config.pass
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000
  });
};

// Logo Data URI for email embedding (uses loaded PNG)
const getLogoSrc = () => {
  if (LOGO_BASE64_PNG) {
    return `cid:${LOGO_CID}`;
  }
  // Fallback SVG logo if PNG not available
  const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#4F46E5"/>
        <stop offset="100%" style="stop-color:#22D3EE"/>
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#grad)"/>
    <text x="50" y="62" text-anchor="middle" fill="white" font-size="32" font-weight="bold" font-family="Arial">S</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString('base64')}`;
};

// Get logo attachment for emails
const getLogoAttachment = () => {
  if (LOGO_BASE64_PNG) {
    return {
      filename: 'skillsphere-logo.png',
      content: Buffer.from(LOGO_BASE64_PNG, 'base64'),
      cid: LOGO_CID,
      contentType: 'image/png',
    };
  }
  return null;
};

/**
 * Generate unified email template with dark mode support
 * @param {Object} options - Template options
 * @param {string} options.title - Header title
 * @param {string} options.subtitle - Header subtitle (optional)
 * @param {string} options.content - Main HTML content
 * @param {string} options.icon - Emoji icon for header (optional)
 */
const generateEmailTemplate = ({ title, subtitle, content, icon }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <style>
    /* Dark mode support for email clients */
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }

    /* Light mode (default) */
    body {
      background-color: #f4f4f4 !important;
    }
    .email-body {
      background-color: #ffffff !important;
    }
    .text-primary {
      color: #1a1a2e !important;
    }
    .text-secondary {
      color: #666666 !important;
    }
    .text-muted {
      color: #999999 !important;
    }
    .info-box {
      background-color: #f8fafc !important;
      border-color: #e2e8f0 !important;
    }
    .highlight-box {
      background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%) !important;
      border-color: #C7D2FE !important;
    }
    .footer-bg {
      background-color: #EEF2FF !important;
    }

    /* Dark mode overrides */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #1a1a2e !important;
      }
      .email-body {
        background-color: #2d2d44 !important;
      }
      .text-primary {
        color: #ffffff !important;
      }
      .text-secondary {
        color: #d1d5db !important;
      }
      .text-muted {
        color: #9ca3af !important;
      }
      .info-box {
        background-color: #374151 !important;
        border-color: #4b5563 !important;
      }
      .highlight-box {
        background: linear-gradient(135deg, #312e81 0%, #1e3a5f 100%) !important;
        border-color: #4338ca !important;
      }
      .footer-bg {
        background-color: #1e1e32 !important;
      }
      .code-display {
        background-color: #374151 !important;
        color: #22D3EE !important;
      }
    }

    /* Outlook dark mode */
    [data-ogsc] .email-body {
      background-color: #2d2d44 !important;
    }
    [data-ogsc] .text-primary {
      color: #ffffff !important;
    }
    [data-ogsc] .text-secondary {
      color: #d1d5db !important;
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(79,70,229,0.15);" class="email-body">

          <!-- Gradient Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #22D3EE 100%); padding: 35px 30px; text-align: center;">
              <!-- Logo -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 15px;">
                    <img src="${getLogoSrc()}" alt="SkillSphere" width="60" height="60" style="display: block; border: 0; border-radius: 12px;">
                  </td>
                </tr>
                ${icon ? `
                <tr>
                  <td align="center" style="padding-bottom: 10px;">
                    <span style="font-size: 40px; line-height: 1;">${icon}</span>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td align="center">
                    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">${title}</h1>
                    ${subtitle ? `<p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px; font-weight: 400;">${subtitle}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 35px 30px;" class="email-body">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #EEF2FF; padding: 25px 30px; text-align: center; border-top: 1px solid #E0E7FF;" class="footer-bg">
              <p style="color: #6366F1; margin: 0; font-size: 12px; font-weight: 600;">
                SkillSphere
              </p>
              <p style="color: #999999; margin: 8px 0 0 0; font-size: 11px;" class="text-muted">
                Empower your skills, Expand your sphere
              </p>
              <p style="color: #cccccc; margin: 12px 0 0 0; font-size: 10px;" class="text-muted">
                &copy; ${new Date().getFullYear()} SkillSphere. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// Send email with retry logic
const sendEmailWithRetry = async (mailOptions, maxRetries = 3) => {
  let lastError = null;
  const config = logSmtpConfig();
  const fromEmail = config.user;
  const toEmail = mailOptions.to;

  // Check if credentials are configured
  if (!config.user || !config.pass) {
    const error = new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables in Railway.');
    console.error('❌ Email Error:', error.message);
    throw error;
  }

  const isInstitutional = toEmail.includes('.edu') ||
                         toEmail.includes('.pk') ||
                         toEmail.includes('.ac.') ||
                         toEmail.includes('cust.pk');

  if (isInstitutional) {
    mailOptions.from = fromEmail;
    console.log(`📧 Institutional email detected: ${toEmail}`);
  }

  console.log(`📧 Sending email to: ${toEmail}`);
  console.log(`📧 Subject: ${mailOptions.subject}`);
  console.log(`📧 From: ${fromEmail}`);

  const primaryTransporter = createTransporter();
  const fallbackTransporter = createDirectTransporter();

  const transporters = [];
  if (primaryTransporter) {
    transporters.push({ name: 'SMTP Primary', transporter: primaryTransporter });
  }
  if (fallbackTransporter) {
    transporters.push({ name: 'SMTP SSL Fallback', transporter: fallbackTransporter });
  }

  if (transporters.length === 0) {
    throw new Error('No email transporters available. Check SMTP configuration.');
  }

  for (const { name, transporter } of transporters) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   Trying ${name} (attempt ${attempt}/${maxRetries})...`);

        // Verify transporter connection first
        if (attempt === 1) {
          try {
            await transporter.verify();
            console.log(`   ✅ ${name} connection verified`);
          } catch (verifyError) {
            console.error(`   ⚠️ ${name} verification failed:`, verifyError.message);
          }
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully via ${name}`);
        console.log(`   Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId, response: info.response };
      } catch (error) {
        lastError = error;
        console.error(`   ❌ ${name} attempt ${attempt} failed:`, error.message);
        console.error(`   Error code: ${error.code || 'N/A'}`);
        console.error(`   Error response: ${error.response || 'N/A'}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
  }

  console.error(`❌ All email attempts failed for: ${toEmail}`);
  console.error(`   Last error: ${lastError.message}`);
  throw lastError;
};

// ==================== EMAIL FUNCTIONS ====================

// Send OTP Email
const sendOTPEmail = async (email, otp, name = 'User') => {
  try {
    const fromEmail = getSmtpConfig().user;

    const content = `
      <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;" class="text-primary">Hello ${name}!</h2>
      <p style="color: #666666; margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;" class="text-secondary">
        Your verification code is:
      </p>

      <!-- OTP Code Box -->
      <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 0 0 25px 0; border: 1px solid #C7D2FE;" class="highlight-box">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #4F46E5;" class="code-display">${otp}</span>
      </div>

      <p style="color: #666666; margin: 0 0 15px 0; font-size: 14px; line-height: 1.6;" class="text-secondary">
        This code will expire in <strong>10 minutes</strong>.
      </p>
      <p style="color: #999999; margin: 0; font-size: 13px; line-height: 1.6;" class="text-muted">
        If you didn't request this code, please ignore this email.
      </p>
    `;

    const html = generateEmailTemplate({
      title: 'SkillSphere',
      subtitle: 'Verification Code',
      content
    });

    const logoAttachment = getLogoAttachment();
    const mailOptions = {
      from: { name: 'SkillSphere', address: fromEmail },
      to: email,
      subject: `${otp} is your SkillSphere verification code`,
      html,
      text: `Hello ${name},\n\nYour SkillSphere verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nSkillSphere`,
      attachments: logoAttachment ? [logoAttachment] : []
    };

    const result = await sendEmailWithRetry(mailOptions);
    console.log('OTP email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

// Send Welcome Email
const sendWelcomeEmail = async (email, name) => {
  try {
    const fromEmail = getSmtpConfig().user;

    const content = `
      <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;" class="text-primary">Hello ${name}!</h2>
      <p style="color: #666666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;" class="text-secondary">
        Thank you for joining <strong>SkillSphere</strong>! We're excited to have you on board.
      </p>

      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 0 0 25px 0; border: 1px solid #e2e8f0;" class="info-box">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #475569; font-weight: 600;" class="text-secondary">What you can do:</p>
        <ul style="color: #64748b; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;" class="text-secondary">
          <li>Browse and enroll in courses</li>
          <li>Track your learning progress</li>
          <li>Earn certificates upon completion</li>
          <li>Connect with expert instructors</li>
        </ul>
      </div>

      <p style="color: #10B981; margin: 0; font-size: 14px; line-height: 1.6; font-weight: 500;">
        Start exploring our courses and expand your skills today!
      </p>
    `;

    const html = generateEmailTemplate({
      title: 'Welcome to SkillSphere!',
      subtitle: 'Your learning journey begins',
      icon: '🎉',
      content
    });

    const logoAttachment = getLogoAttachment();
    const mailOptions = {
      from: { name: 'SkillSphere', address: fromEmail },
      to: email,
      subject: 'Welcome to SkillSphere!',
      html,
      text: `Hello ${name}!\n\nWelcome to SkillSphere! Thank you for joining us.\n\nStart exploring our courses and enhance your skills today!\n\nSkillSphere`,
      attachments: logoAttachment ? [logoAttachment] : []
    };

    const result = await sendEmailWithRetry(mailOptions);
    console.log('Welcome email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

// Send Admin Account Created Email
const sendAdminAccountCreatedEmail = async (email, name, password, role) => {
  try {
    const fromEmail = getSmtpConfig().user;
    const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);

    const content = `
      <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;" class="text-primary">Hello ${name}!</h2>
      <p style="color: #666666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;" class="text-secondary">
        You have been invited to join SkillSphere as an <strong>${roleDisplay}</strong>. Your account has been created and is ready to use.
      </p>

      <!-- Credentials Box -->
      <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 25px; margin: 0 0 25px 0; border: 1px solid #C7D2FE;" class="highlight-box">
        <p style="margin: 0 0 5px 0; font-size: 13px; color: #6366F1; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Your Login Credentials</p>
        <p style="margin: 15px 0 10px 0; font-size: 15px; color: #4F46E5;">
          <strong>Email:</strong> <span style="color: #1a1a2e;" class="text-primary">${email}</span>
        </p>
        <p style="margin: 0; font-size: 15px; color: #4F46E5;">
          <strong>Password:</strong> <span style="color: #1a1a2e;" class="text-primary">${password}</span>
        </p>
      </div>

      <!-- Alternative Login Methods -->
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 0 0 25px 0; border: 1px solid #e2e8f0;" class="info-box">
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569; font-weight: 600; text-transform: uppercase;" class="text-secondary">Alternative Login Options</p>
        <ul style="color: #64748b; margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; line-height: 1.8;" class="text-secondary">
          <li><strong>OTP Code:</strong> Request a one-time verification code</li>
          <li><strong>Google Sign-In:</strong> Use your Google account</li>
        </ul>
      </div>

      <p style="color: #e74c3c; margin: 0 0 15px 0; font-size: 14px; line-height: 1.6; font-weight: 500;">
        ⚠️ Please change your password after your first login for security.
      </p>
    `;

    const html = generateEmailTemplate({
      title: 'Account Created',
      subtitle: `${roleDisplay} Access Granted`,
      icon: '🔐',
      content
    });

    const logoAttachment = getLogoAttachment();
    const mailOptions = {
      from: { name: 'SkillSphere', address: fromEmail },
      to: email,
      subject: `Welcome to SkillSphere - Your ${roleDisplay} Account is Ready!`,
      html,
      text: `Hello ${name}!\n\nYou have been invited to join SkillSphere as an ${roleDisplay}.\n\nYour Login Credentials:\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after your first login.\n\nSkillSphere`,
      attachments: logoAttachment ? [logoAttachment] : []
    };

    const result = await sendEmailWithRetry(mailOptions);
    console.log('Admin account created email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending admin account created email:', error);
    throw error;
  }
};

// Send Certificate Email with PDF attachment
const sendCertificateEmail = async (email, studentName, courseName, certificateNumber, pdfBuffer) => {
  try {
    const fromEmail = getSmtpConfig().user;
    const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const content = `
      <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;" class="text-primary">Hello ${studentName}!</h2>
      <p style="color: #666666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;" class="text-secondary">
        We're thrilled to inform you that you have successfully completed the course:
      </p>

      <!-- Course Box -->
      <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 0 0 25px 0; border: 1px solid #C7D2FE;" class="highlight-box">
        <p style="margin: 0 0 5px 0; font-size: 13px; color: #6366F1; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Course Completed</p>
        <h3 style="font-size: 20px; font-weight: 700; color: #4F46E5; margin: 10px 0 0 0;">${courseName}</h3>
      </div>

      <!-- Certificate Info -->
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 0 0 25px 0; border: 1px solid #e2e8f0;" class="info-box">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #475569;" class="text-secondary">
          <strong>Certificate ID:</strong> ${certificateNumber}
        </p>
        <p style="margin: 0; font-size: 14px; color: #475569;" class="text-secondary">
          <strong>Issued Date:</strong> ${issueDate}
        </p>
      </div>

      <p style="color: #666666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;" class="text-secondary">
        Your certificate is attached to this email as a PDF. You can also view and download it from your SkillSphere dashboard.
      </p>

      <p style="color: #10B981; margin: 0; font-size: 14px; line-height: 1.6; font-weight: 500;">
        🎯 Keep up the great work and continue learning with SkillSphere!
      </p>
    `;

    const html = generateEmailTemplate({
      title: 'Congratulations!',
      subtitle: "You've earned a certificate",
      icon: '🏆',
      content
    });

    const logoAttachment = getLogoAttachment();
    const attachments = [
      {
        filename: `Certificate_${certificateNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ];
    if (logoAttachment) attachments.push(logoAttachment);

    const mailOptions = {
      from: { name: 'SkillSphere', address: fromEmail },
      to: email,
      subject: `Congratulations! Your Certificate for ${courseName}`,
      html,
      text: `Congratulations ${studentName}!\n\nYou have successfully completed the course: ${courseName}\n\nCertificate ID: ${certificateNumber}\nIssued Date: ${issueDate}\n\nYour certificate is attached to this email.\n\nSkillSphere`,
      attachments
    };

    const result = await sendEmailWithRetry(mailOptions);
    console.log('Certificate email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending certificate email:', error);
    throw error;
  }
};

// Send Super Admin Welcome Email
const sendSuperAdminWelcomeEmail = async (email, name, password) => {
  try {
    const fromEmail = getSmtpConfig().user;

    const content = `
      <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;" class="text-primary">Welcome, ${name}!</h2>
      <p style="color: #666666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;" class="text-secondary">
        Your Super Admin account for SkillSphere has been created successfully. You have full administrative access to manage the platform.
      </p>

      <!-- Credentials Box -->
      <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 25px; margin: 0 0 25px 0; border: 1px solid #C7D2FE;" class="highlight-box">
        <p style="margin: 0 0 5px 0; font-size: 13px; color: #6366F1; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Your Login Credentials</p>
        <p style="margin: 15px 0 10px 0; font-size: 15px; color: #4F46E5;">
          <strong>Email:</strong> <span style="color: #1a1a2e;" class="text-primary">${email}</span>
        </p>
        <p style="margin: 0; font-size: 15px; color: #4F46E5;">
          <strong>Password:</strong> <span style="color: #1a1a2e;" class="text-primary">${password}</span>
        </p>
      </div>

      <!-- Permissions Info -->
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 0 0 25px 0; border: 1px solid #e2e8f0;" class="info-box">
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569; font-weight: 600; text-transform: uppercase;" class="text-secondary">Your Permissions</p>
        <ul style="color: #64748b; margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; line-height: 1.8;" class="text-secondary">
          <li>Manage all users (students, experts, admins)</li>
          <li>Create and manage courses & categories</li>
          <li>Configure certificate templates</li>
          <li>View analytics and reports</li>
          <li>Full system configuration access</li>
        </ul>
      </div>

      <p style="color: #e74c3c; margin: 0; font-size: 14px; line-height: 1.6; font-weight: 500;">
        ⚠️ Please change your password after your first login for security.
      </p>
    `;

    const html = generateEmailTemplate({
      title: 'SkillSphere',
      subtitle: 'Super Administrator Access Granted',
      icon: '👑',
      content
    });

    const logoAttachment = getLogoAttachment();
    const mailOptions = {
      from: { name: 'SkillSphere', address: fromEmail },
      to: email,
      subject: 'Welcome Super Admin - Your SkillSphere Account is Ready!',
      html,
      text: `Welcome ${name}!\n\nYour Super Admin account for SkillSphere has been created successfully.\n\nYour Login Credentials:\nEmail: ${email}\nPassword: ${password}\n\nYour Permissions:\n- Manage all users (students, experts, admins)\n- Create and manage courses & categories\n- Configure certificate templates\n- View analytics and reports\n- Full system configuration access\n\nPlease change your password after your first login for security.\n\nSkillSphere`,
      attachments: logoAttachment ? [logoAttachment] : []
    };

    const result = await sendEmailWithRetry(mailOptions);
    console.log('Super admin welcome email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending super admin welcome email:', error);
    throw error;
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendAdminAccountCreatedEmail,
  sendCertificateEmail,
  sendSuperAdminWelcomeEmail,
  logSmtpConfig
};
