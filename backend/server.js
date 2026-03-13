const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { sequelize, testConnection } = require('./config/database');
require('./models');
const { User } = require('./models');
const { sendSuperAdminWelcomeEmail } = require('./services/emailService');
const syncCourseColumns = require('./scripts/syncCourseColumns');
const syncAITutorColumns = require('./scripts/syncAITutorColumns');

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
const lectureChatRoutes = require('./routes/lectureChatRoutes');
const streakRoutes = require('./routes/streakRoutes');
const todoRoutes = require('./routes/todoRoutes');
const { initScheduledReminders } = require('./controllers/todoController');

const app = express();
const PORT = process.env.PORT || 5000;

function normalizeOrigin(origin) {
  return `${origin || ''}`
    .trim()
    .replace(/^"|"$/g, '')
    .replace(/\/$/, '');
}

function parseAllowedOrigins(value) {
  return `${value || ''}`
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

function buildAllowedOrigins() {
  return Array.from(new Set([
    'https://skill-sphere-app.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:19006',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:19006',
    'http://10.0.2.2:3000',
    'http://10.0.2.2:3001',
    'http://10.0.2.2:19006',
    normalizeOrigin(process.env.FRONTEND_URL),
    ...parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  ].filter(Boolean)));
}

function isPrivateNetworkOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/i.test(origin);
}

const allowedOrigins = buildAllowedOrigins();
const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

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

app.use((req, res, next) => {
  const requestOrigin = normalizeOrigin(req.headers.origin);

  res.header('Vary', 'Origin');

  if (!requestOrigin) {
    if (req.method === 'OPTIONS') {
      return res.sendStatus(corsOptions.optionsSuccessStatus);
    }
    return next();
  }

  if (
    !allowedOrigins.includes(requestOrigin) &&
    !isPrivateNetworkOrigin(requestOrigin) &&
    !(requestOrigin.includes('.vercel.app') && (requestOrigin.includes('skill-sphere') || requestOrigin.includes('skillsphere')))
  ) {
    console.log('CORS blocked origin:', requestOrigin);

    if (req.method === 'OPTIONS') {
      return res.status(403).json({ error: 'Not allowed by CORS' });
    }

    return res.status(403).json({ error: 'Not allowed by CORS' });
  }

  res.header('Access-Control-Allow-Origin', requestOrigin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', corsOptions.methods.join(','));
  res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));

  if (req.method === 'OPTIONS') {
    return res.sendStatus(corsOptions.optionsSuccessStatus);
  }

  return next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

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
app.use('/api/lecture-chat', lectureChatRoutes);
app.use('/api/streak', streakRoutes);
app.use('/api/todos', todoRoutes);

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
    await syncCourseColumns();
    const aiTutorSchemaSummary = await syncAITutorColumns();
    console.log('AI Tutor schema compatibility sync completed:', JSON.stringify(aiTutorSchemaSummary));
    await sequelize.sync();

    console.log('Database synced successfully');

    await initSuperAdmin();
    await initScheduledReminders();

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
