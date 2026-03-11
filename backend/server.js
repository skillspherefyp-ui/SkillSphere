const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
require('./models');
const { User } = require('./models');
const { sendSuperAdminWelcomeEmail } = require('./services/emailService');
const syncUserAuthColumns = require('./scripts/syncUserAuthColumns');
const syncCourseColumns = require('./scripts/syncCourseColumns');

async function initSuperAdmin() {
  try {
    const superadminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superadminPassword = process.env.SUPER_ADMIN_PASSWORD;
    const superadminName = process.env.SUPER_ADMIN_NAME || 'Super Admin';

    if (!superadminEmail || !superadminPassword) {
      console.log('SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set in .env - skipping superadmin creation');
      return;
    }

    const existingSuperAdmin = await User.findOne({ where: { role: 'superadmin' } });

    if (!existingSuperAdmin) {
      await User.create({
        name: superadminName,
        email: superadminEmail,
        password: superadminPassword,
        role: 'superadmin',
        isActive: true,
        emailVerified: true,
        authProvider: 'local'
      });
      console.log('SuperAdmin created successfully');
      console.log(`Email: ${superadminEmail}`);

      try {
        await sendSuperAdminWelcomeEmail(superadminEmail, superadminName, superadminPassword);
        console.log('Welcome email sent to SuperAdmin');
      } catch (emailError) {
        console.log('Could not send welcome email:', emailError.message);
      }
    } else {
      console.log('SuperAdmin already exists');
    }
  } catch (error) {
    console.error('Error creating SuperAdmin:', error.message);
  }
}

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const courseRoutes = require('./routes/courseRoutes');
const topicRoutes = require('./routes/topicRoutes');
const materialRoutes = require('./routes/materialRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const progressRoutes = require('./routes/progressRoutes');
const quizRoutes = require('./routes/quizRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const certificateTemplateRoutes = require('./routes/certificateTemplateRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const aiChatRoutes = require('./routes/aiChatRoutes');
const aiTutorRoutes = require('./routes/aiTutorRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

function normalizeOrigin(origin) {
  return `${origin || ''}`.trim().replace(/\/$/, '');
}

function isAllowedVercelOrigin(origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  return /^https:\/\/([a-z0-9-]+\.)?vercel\.app$/i.test(normalizedOrigin)
    && (normalizedOrigin.includes('skill-sphere') || normalizedOrigin.includes('skillsphere'));
}

const corsOptions = {
  origin(origin, callback) {
    const normalizedOrigin = normalizeOrigin(origin);

    if (!normalizedOrigin) {
      callback(null, true);
      return;
    }

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:19006',
      'http://10.0.2.2:3000',
      'https://skill-sphere-app.vercel.app',
      process.env.FRONTEND_URL,
    ].map(normalizeOrigin).filter(Boolean);

    if (allowedOrigins.includes(normalizedOrigin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }

    if (isAllowedVercelOrigin(normalizedOrigin)) {
      console.log('CORS allowing Vercel deployment:', normalizedOrigin);
      callback(null, true);
      return;
    }

    console.log('CORS blocked origin:', normalizedOrigin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/certificate-templates', certificateTemplateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/ai-tutor', aiTutorRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

async function startServer() {
  try {
    await testConnection();
    await syncUserAuthColumns();
    await syncCourseColumns();
    await sequelize.sync();

    console.log('Database synced successfully');

    await initSuperAdmin();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
