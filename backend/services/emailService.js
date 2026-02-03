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

// Professional Email Template
const generateEmailTemplate = ({ title, subtitle, content, accentColor = '#4F46E5' }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8;">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <!-- Main Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(79, 70, 229, 0.12);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #06B6D4 100%); padding: 40px 32px; text-align: center;">
              <!-- Logo -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <div style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 16px; padding: 12px 20px;">
                      <span style="font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Skill</span><span style="font-size: 28px; font-weight: 800; color: #22D3EE; letter-spacing: -0.5px;">Sphere</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; line-height: 1.3;">${title}</h1>
                    ${subtitle ? `<p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">${subtitle}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px 40px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); padding: 28px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <span style="font-size: 18px; font-weight: 700; color: #4F46E5;">Skill</span><span style="font-size: 18px; font-weight: 700; color: #06B6D4;">Sphere</span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="color: #64748b; margin: 0; font-size: 12px; line-height: 1.5;">Empower your skills, Expand your sphere</p>
                    <p style="color: #94a3b8; margin: 12px 0 0 0; font-size: 11px;">&copy; ${new Date().getFullYear()} SkillSphere. All rights reserved.</p>
                  </td>
                </tr>
              </table>
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
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="color: #1e293b; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Hello ${name}!</p>
          <p style="color: #64748b; margin: 0 0 28px 0; font-size: 15px; line-height: 1.6;">Use the verification code below to complete your sign-in:</p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 0 0 28px 0;">
          <!-- OTP Box -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 16px; border: 2px solid #C7D2FE;">
            <tr>
              <td style="padding: 24px 40px;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #4F46E5; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">${otp}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
            <tr>
              <td style="padding: 14px 16px;">
                <p style="color: #92400e; margin: 0; font-size: 13px; font-weight: 500;">
                  <span style="font-size: 14px;">&#9201;</span> This code expires in <strong>10 minutes</strong>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 24px;">
          <p style="color: #94a3b8; margin: 0; font-size: 13px; line-height: 1.5;">If you didn't request this code, you can safely ignore this email. Someone might have entered your email by mistake.</p>
        </td>
      </tr>
    </table>
  `;

  return await sendEmailWithBrevoAPI({
    to: email,
    toName: name,
    subject: `${otp} is your SkillSphere verification code`,
    html: generateEmailTemplate({ title: 'Verification Code', subtitle: 'One-time password for your account', content }),
    text: `Hello ${name},\n\nYour SkillSphere verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nSkillSphere`
  });
};

// Send Welcome Email
const sendWelcomeEmail = async (email, name) => {
  const content = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="color: #1e293b; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Welcome aboard, ${name}!</p>
          <p style="color: #64748b; margin: 0 0 28px 0; font-size: 15px; line-height: 1.6;">Your account has been created successfully. We're thrilled to have you join our learning community!</p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0;">
            <tr>
              <td style="padding: 20px 24px;">
                <p style="margin: 0 0 14px 0; font-size: 14px; color: #475569; font-weight: 600;">What you can do now:</p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;"><span style="color: #10b981; margin-right: 8px;">&#10003;</span> Browse and enroll in courses</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;"><span style="color: #10b981; margin-right: 8px;">&#10003;</span> Track your learning progress</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;"><span style="color: #10b981; margin-right: 8px;">&#10003;</span> Earn certificates upon completion</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;"><span style="color: #10b981; margin-right: 8px;">&#10003;</span> Connect with expert instructors</td></tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center">
          <p style="color: #10b981; margin: 0; font-size: 15px; font-weight: 600;">Start exploring our courses today!</p>
        </td>
      </tr>
    </table>
  `;

  return await sendEmailWithBrevoAPI({
    to: email,
    toName: name,
    subject: 'Welcome to SkillSphere - Let\'s Start Learning!',
    html: generateEmailTemplate({ title: 'Welcome to SkillSphere!', subtitle: 'Your learning journey begins now', content }),
    text: `Welcome ${name}!\n\nYour account has been created successfully.\n\nYou can now:\n- Browse and enroll in courses\n- Track your learning progress\n- Earn certificates upon completion\n- Connect with expert instructors\n\nStart exploring our courses today!\n\nSkillSphere`
  });
};

// Send Admin Account Created Email
const sendAdminAccountCreatedEmail = async (email, name, password, role) => {
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
  const content = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="color: #1e293b; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Hello ${name}!</p>
          <p style="color: #64748b; margin: 0 0 28px 0; font-size: 15px; line-height: 1.6;">You've been invited to join SkillSphere as an <strong style="color: #4F46E5;">${roleDisplay}</strong>.</p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 14px; border: 1px solid #C7D2FE;">
            <tr>
              <td style="padding: 24px;">
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #6366F1; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Your Login Credentials</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #64748b; font-size: 13px;">Email</span><br>
                      <span style="color: #1e293b; font-size: 15px; font-weight: 600;">${email}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-top: 1px solid #C7D2FE;">
                      <span style="color: #64748b; font-size: 13px;">Password</span><br>
                      <span style="color: #1e293b; font-size: 15px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace;">${password}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 12px; border-left: 4px solid #ef4444;">
            <tr>
              <td style="padding: 14px 16px;">
                <p style="color: #dc2626; margin: 0; font-size: 13px; font-weight: 500;">
                  <span style="font-size: 14px;">&#9888;</span> Please change your password after your first login
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return await sendEmailWithBrevoAPI({
    to: email,
    toName: name,
    subject: `Welcome to SkillSphere - Your ${roleDisplay} Account is Ready!`,
    html: generateEmailTemplate({ title: 'Account Created', subtitle: `${roleDisplay} access granted`, content }),
    text: `Hello ${name}!\n\nYou have been invited to join SkillSphere as ${roleDisplay}.\n\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after your first login.\n\nSkillSphere`
  });
};

// Send Certificate Email
const sendCertificateEmail = async (email, studentName, courseName, certificateNumber, pdfBuffer) => {
  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const content = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="color: #1e293b; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Congratulations, ${studentName}!</p>
          <p style="color: #64748b; margin: 0 0 28px 0; font-size: 15px; line-height: 1.6;">You've successfully completed a course. Your certificate is attached to this email.</p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom: 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fdf4ff 0%, #ede9fe 100%); border-radius: 16px; border: 2px solid #d8b4fe; width: 100%;">
            <tr>
              <td style="padding: 28px 24px; text-align: center;">
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #9333ea; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Course Completed</p>
                <h2 style="margin: 12px 0 0 0; font-size: 20px; font-weight: 700; color: #7c3aed; line-height: 1.3;">${courseName}</h2>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px;">
            <tr>
              <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b; font-size: 12px;">Certificate ID</span><br>
                <span style="color: #1e293b; font-size: 14px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace;">${certificateNumber}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 20px;">
                <span style="color: #64748b; font-size: 12px;">Issue Date</span><br>
                <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${issueDate}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center">
          <p style="color: #10b981; margin: 0; font-size: 15px; font-weight: 600;">Keep up the great work! &#127942;</p>
        </td>
      </tr>
    </table>
  `;

  return await sendEmailWithBrevoAPI({
    to: email,
    toName: studentName,
    subject: `Congratulations! Your Certificate for ${courseName}`,
    html: generateEmailTemplate({ title: 'Certificate Earned!', subtitle: 'You\'ve achieved something great', content }),
    text: `Congratulations ${studentName}!\n\nYou have successfully completed: ${courseName}\n\nCertificate ID: ${certificateNumber}\nIssue Date: ${issueDate}\n\nYour certificate is attached to this email.\n\nKeep up the great work!\n\nSkillSphere`,
    attachments: [{ filename: `Certificate_${certificateNumber}.pdf`, content: pdfBuffer }]
  });
};

// Send Super Admin Welcome Email
const sendSuperAdminWelcomeEmail = async (email, name, password) => {
  const content = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="color: #1e293b; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Welcome, ${name}!</p>
          <p style="color: #64748b; margin: 0 0 28px 0; font-size: 15px; line-height: 1.6;">Your <strong style="color: #4F46E5;">Super Admin</strong> account has been created with full system access.</p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 14px; border: 1px solid #C7D2FE;">
            <tr>
              <td style="padding: 24px;">
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #6366F1; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Your Login Credentials</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #64748b; font-size: 13px;">Email</span><br>
                      <span style="color: #1e293b; font-size: 15px; font-weight: 600;">${email}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-top: 1px solid #C7D2FE;">
                      <span style="color: #64748b; font-size: 13px;">Password</span><br>
                      <span style="color: #1e293b; font-size: 15px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace;">${password}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0;">
            <tr>
              <td style="padding: 20px 24px;">
                <p style="margin: 0 0 14px 0; font-size: 14px; color: #475569; font-weight: 600;">Your Permissions:</p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;"><span style="color: #4F46E5; margin-right: 8px;">&#9733;</span> Manage all users and admins</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;"><span style="color: #4F46E5; margin-right: 8px;">&#9733;</span> Create and manage courses</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;"><span style="color: #4F46E5; margin-right: 8px;">&#9733;</span> Configure certificate templates</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748b; font-size: 14px;"><span style="color: #4F46E5; margin-right: 8px;">&#9733;</span> View analytics and reports</td></tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 12px; border-left: 4px solid #ef4444;">
            <tr>
              <td style="padding: 14px 16px;">
                <p style="color: #dc2626; margin: 0; font-size: 13px; font-weight: 500;">
                  <span style="font-size: 14px;">&#9888;</span> Please change your password after your first login
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return await sendEmailWithBrevoAPI({
    to: email,
    toName: name,
    subject: 'Welcome Super Admin - Your SkillSphere Account is Ready!',
    html: generateEmailTemplate({ title: 'Super Admin Access', subtitle: 'Full system privileges granted', content }),
    text: `Welcome ${name}!\n\nYour Super Admin account has been created.\n\nEmail: ${email}\nPassword: ${password}\n\nYour Permissions:\n- Manage all users and admins\n- Create and manage courses\n- Configure certificate templates\n- View analytics and reports\n\nPlease change your password after your first login.\n\nSkillSphere`
  });
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendAdminAccountCreatedEmail,
  sendCertificateEmail,
  sendSuperAdminWelcomeEmail
};
