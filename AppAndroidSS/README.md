# SkillSphere - React Native Learning App

A comprehensive React Native CLI application for an AI-powered learning platform with role-based access for Students, Experts, and Admins. Features professional dark/light mode theming based on the SkillSphere brand.

## ✨ Features

### 🎨 Professional Theme System
- **Dark/Light Mode Toggle** - Seamless theme switching
- **Brand Colors** - Blue to purple gradient matching SkillSphere logo
- **Theme Persistence** - Saves user preference
- **Consistent Design** - Professional UI throughout

### 🔐 Authentication
- Unified signup/login for all user roles (Student, Expert, Admin)
- Email verification via OTP
- Forgot password functionality
- Role-based navigation after login

### 👨‍💼 Admin Features
- Dashboard with statistics
- Create and manage courses
- Add topics and course outlines
- Upload course materials
- Submit courses for AI generation
- Publish/unpublish courses
- View and manage students
- Block/unblock students
- Manage skill categories
- Certificate management
- View expert feedback

### 👨‍🏫 Expert Features
- View published courses
- Review course materials and outlines
- Provide feedback on courses
- Rate courses

### 👨‍🎓 Student Features
- Browse available courses
- Select skills to master
- View course outlines with locked/unlocked topics
- Interactive AI-powered learning interface
- Pause and ask questions during lectures
- AI whiteboard for visual explanations
- Take AI-generated quizzes
- View quiz results and feedback
- Download flashcards
- Track learning progress
- Resume from last saved topic
- Apply for certificates
- Make payments for certificates
- Receive certificates in PDF format
- Create to-do lists and reminders
- Receive notifications
- AI Assistant chat mode with voice and text support

## 🛠 Tech Stack

- **React Native CLI** (not Expo)
- **React Navigation** for navigation
- **React Native Reanimated** for animations
- **Context API** for state management
- **React Native Linear Gradient** for gradients
- **React Native Vector Icons** for icons
- **React Native SVG** for logo
- **AsyncStorage** for persistence

## 📦 Installation

### Prerequisites

1. **Node.js** (v16 or higher)
2. **Java JDK** (JDK 11 or higher)
3. **Android Studio** (for Android development)
4. **Xcode** (for iOS development - Mac only)

### Setup Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Install iOS Pods** (iOS only)
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Run the App**

   **Android:**
   ```bash
   npm run android
   ```

   **iOS:**
   ```bash
   npm run ios
   ```

   **Start Metro Bundler:**
   ```bash
   npm start
   ```

## 🎨 Theme System

The app features a professional theme system based on the SkillSphere logo:

- **Light Mode**: Clean white backgrounds with blue-purple gradient accents
- **Dark Mode**: Dark backgrounds with brighter blue-purple accents
- **Gradient**: Blue (#6366f1) to Purple (#8b5cf6)
- **Auto-adaptation**: All components automatically adapt to current theme

### Toggle Theme

The theme toggle button appears in the header of most screens. Tap it to switch between light and dark modes. Your preference is saved automatically.

## 🧪 Test Accounts

For testing purposes, you can use these dummy accounts:

- **Admin**: 
  - Email: `admin@skillsphere.com`
  - Password: `admin123`

- **Expert**: 
  - Email: `expert@skillsphere.com`
  - Password: `expert123`

- **Student**: 
  - Email: `student@skillsphere.com`
  - Password: `student123`

## 📱 Building APK

See [docs/BUILD_APK.md](./docs/BUILD_APK.md) for detailed instructions on building Android APK.

## 📁 Project Structure

```
SkillSphereApp/
├── android/              # Android native code
├── ios/                  # iOS native code
├── src/
│   ├── components/       # Reusable components
│   │   ├── Logo.js       # SkillSphere logo component
│   │   ├── ThemeToggle.js
│   │   ├── AnimatedButton.js
│   │   ├── AnimatedInput.js
│   │   └── GradientBackground.js
│   ├── context/          # Context providers
│   │   ├── ThemeContext.js
│   │   ├── AuthContext.js
│   │   └── DataContext.js
│   ├── navigation/       # Navigation setup
│   └── screens/          # Screen components
│       ├── auth/         # Authentication screens
│       ├── admin/         # Admin screens
│       ├── expert/        # Expert screens
│       └── student/       # Student screens
├── docs/                 # Documentation files
│   ├── README.md         # Documentation index
│   ├── BUILD_APK.md      # APK building guide
│   ├── QUICK_START.md    # Quick start guide
│   └── ...               # Other documentation
├── scripts/              # Helper scripts
│   ├── kill-metro.ps1    # Kill Metro bundler (port 8081)
│   ├── fix-java17-complete.ps1  # Java 17 configuration fix
│   └── ...               # Other utility scripts
├── App.js                # Main app component
├── index.js               # Entry point
└── package.json
```

## 🔄 Migration from Expo

This project has been converted from Expo to React Native CLI. Key changes:

- ✅ Removed all Expo dependencies
- ✅ Added React Native CLI compatible packages
- ✅ Updated entry point to `index.js`
- ✅ Replaced Expo components with React Native equivalents
- ✅ Added professional theme system
- ✅ Integrated SkillSphere logo

## 📚 Documentation

All documentation is organized in the `docs/` folder. See [docs/README.md](./docs/README.md) for a complete index.

**Quick Links:**
- [Quick Start Guide](./docs/QUICK_START.md) - Get started quickly
- [Complete Setup Guide](./docs/COMPLETE_SETUP_GUIDE.md) - Detailed setup instructions
- [Build APK Guide](./docs/BUILD_APK.md) - APK building instructions
- [Java 17 Fix Guide](./docs/README_JAVA17_FIX.md) - Java configuration fixes
- [Android 13+ Compatibility](./docs/ANDROID_13_COMPATIBILITY_FIX.md) - Android 13+ support

## 🛠 Helper Scripts

All helper scripts are in the `scripts/` folder:

- **`kill-metro.ps1`** / **`kill-metro.bat`** - Kill Metro bundler if port 8081 is in use
- **`fix-java17-complete.ps1`** - Fix Java 17 configuration issues
- **`fix-all-build-errors.ps1`** - Clean all build caches

**Usage:**
```powershell
# Kill Metro bundler (if port 8081 is busy)
.\scripts\kill-metro.ps1

# Fix Java 17 configuration
.\scripts\fix-java17-complete.ps1
```

## 🐛 Troubleshooting

### Android Build Issues

1. **Port 8081 already in use**:
   ```powershell
   # Run the kill script
   .\scripts\kill-metro.ps1
   # Or manually:
   netstat -ano | findstr :8081
   taskkill /F /PID <PID>
   ```

2. **Clean build**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npm run android
   ```

3. **Clear Metro cache**:
   ```bash
   npm start -- --reset-cache
   ```

4. **Java version errors**:
   ```powershell
   # Run the Java 17 fix script
   .\scripts\fix-java17-complete.ps1
   ```

### iOS Build Issues

1. **Reinstall pods**:
   ```bash
   cd ios
   rm -rf Pods Podfile.lock
   pod install
   cd ..
   ```

### Vector Icons Not Showing

**Android**: Add to `android/app/build.gradle`:
```gradle
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

## 📝 Notes

- This is a frontend-only implementation with dummy data
- No backend integration is included
- All data is stored in React Context
- AI features are simulated with dummy responses
- OTP verification is simulated (no actual emails sent)
- Payment processing is simulated

## 🚀 Future Enhancements

- Backend API integration
- Real AI integration for content generation
- Real-time notifications
- Voice input/output
- Video/audio lecture playback
- File upload/download
- Real payment gateway integration
- Push notifications
- Offline mode support

## 📄 License

This project is created for educational purposes.

---

**Built with ❤️ using React Native CLI**
