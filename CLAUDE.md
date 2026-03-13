# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SkillSphere is a Learning Management System (LMS) with three separate services:

1. **`AppAndroidSS/`** — React Native Web frontend (runs on web, Android, iOS)
2. **`backend/`** — Express.js REST API with MySQL/Sequelize
3. **`ai-backend/`** — Python Flask service using Groq (llama-3.3-70b-versatile) for AI chat

## Development Commands

### Backend (Express.js)
```bash
cd backend
npm install
npm run dev          # Start with nodemon (hot reload)
npm start            # Production start
npm run seed         # Seed superadmin user
npm run reset:db     # Reset database (destructive)
npm run migrate:permissions  # Add permissions column migration
```
Backend runs on `http://localhost:5000`

### Frontend (React Native Web)
```bash
cd AppAndroidSS
npm install
npm run web:dev      # Dev server with webpack.dev.js
npm run web          # Production webpack serve
npm run build:web    # Production build
npm run android      # Run on Android emulator
npm run ios          # Run on iOS
npm test             # Jest tests
npm run lint         # ESLint
```
Frontend runs on `http://localhost:3000`

### AI Backend (Flask/Groq)
```bash
cd ai-backend
pip install -r requirements.txt
python app.py        # Runs on port 5001 (default Flask)
```

## Environment Variables

### Backend (`backend/.env`)
```
MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB=SkillSphere_Db
PORT=5000
NODE_ENV=development
JWT_SECRET=...
SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_NAME
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
FRONTEND_URL=http://localhost:3000
```

### Frontend (`AppAndroidSS/.env`)
```
REACT_APP_API_URL=http://localhost:5000
```

### AI Backend (`ai-backend/.env`)
```
GROQ_API_KEY=...
```

## Architecture

### Role-Based Navigation
The frontend routes users based on their role via `AppNavigator.js`. Four roles exist: `superadmin`, `admin`, `expert`, and `student` (default). Each role has its own navigator in `src/navigation/`.

### API Client (`AppAndroidSS/src/services/apiClient.js`)
Handles host resolution per platform:
- Android emulator: `http://10.0.2.2:5000`
- Web: reads `REACT_APP_API_URL` env var, falls back to `http://localhost:5000`
- JWT token stored in AsyncStorage under `@skillsphere:token`

### Backend Structure
- `server.js` — Entry point; registers all routes, initializes SuperAdmin on startup
- `config/database.js` — Sequelize connection
- `models/index.js` — Loads all 17 models and associations
- `middleware/auth.js` — JWT verification middleware
- `services/emailService.js` — Nodemailer (OTP, welcome emails)
- `services/certificateService.js` — PDF certificate generation via `@react-pdf/renderer`
- `services/geminiService.js` — Alternative AI backend integration
- `uploads/` — Local file storage for Multer (Cloudinary also configured)

### Frontend Context
- `AuthContext.js` — User authentication state, token management
- `ThemeContext.js` — Dark/light theme (edit here to change colors)
- `DataContext.js` — Shared data state
- `ToastContext.js` — App-wide toast notifications

### Database Models (17 total)
User → Enrollment → Course → Topic → Material (hierarchy)
Quiz → QuizResult, Certificate → CertificateTemplate ↔ TemplateCourse
AIChatSession → AIChatMessage, Notification, Feedback, Category, Progress

### Deployment
- Frontend: Vercel (`AppAndroidSS/vercel.json`)
- Backend: Railway (`backend/railway.json`, `backend/Procfile`)
- Root `railway.toml` and `nixpacks.toml` for Railway build config
