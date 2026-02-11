import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Linking,
  TextInput,
  Image,
} from 'react-native';
import Toast from 'react-native-toast-message';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInLeft,
  SlideInRight,
  ZoomIn,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import BrandLogo from '../../components/BrandLogo';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';
import ThemeToggle from '../../components/ThemeToggle';
import { courseAPI, enrollmentAPI } from '../../services/apiClient';
import { resolveFileUrl } from '../../utils/urlHelpers';

const FeatureCard = ({ icon, title, description, delay, theme, isMobile }) => (
  <Animated.View
    entering={FadeInUp.duration(600).delay(delay)}
    style={[
      {
        width: '100%',
        maxWidth: 340,
        padding: isMobile ? 20 : 24,
        borderRadius: 20,
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        ...theme.shadows.md,
      }
    ]}
  >
    <View style={[{
      width: 60,
      height: 60,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      backgroundColor: theme.colors.primary + '20'
    }]}>
      <Icon name={icon} size={28} color={theme.colors.primary} />
    </View>
    <Text style={[{
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily.semiBold,
    }]}>{title}</Text>
    <Text style={[{
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 22,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
    }]}>
      {description}
    </Text>
  </Animated.View>
);

const StatItem = ({ number, label, theme }) => (
  <View style={{ alignItems: 'center' }}>
    <Text style={[{
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.primary,
      fontFamily: theme.typography.fontFamily.bold,
    }]}>{number}</Text>
    <Text style={[{
      fontSize: 12,
      marginTop: 4,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
    }]}>{label}</Text>
  </View>
);

const GradientText = ({ children, style, isLargeScreen, theme }) => {
  // Use theme colors for ultra-premium look
  const textColor = theme.mode === 'dark'
    ? theme.colors.secondary // Neon blue for dark mode
    : theme.colors.secondary; // Blue for light mode

  return <Text style={[style, { color: textColor }]}>{children}</Text>;
};

const TypingText = ({ text, style, delay = 0, speed = 100 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Wait for initial delay
    const delayTimeout = setTimeout(() => {
      if (currentIndex < text.length) {
        const typingTimeout = setTimeout(() => {
          setDisplayedText((prev) => prev + text[currentIndex]);
          setCurrentIndex((prev) => prev + 1);
        }, speed);
        return () => clearTimeout(typingTimeout);
      }
    }, delay);

    return () => clearTimeout(delayTimeout);
  }, [currentIndex, text, delay, speed]);

  return <Text style={style}>{displayedText}</Text>;
};

const LandingScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 1024;
  const isTablet = width > 768;
  const isMobile = width <= 480;
  const isWeb = Platform.OS === 'web';

  const styles = getStyles(theme, isDark, isLargeScreen, isTablet, isMobile);

  // Refs for scrolling to sections
  const scrollViewRef = useRef(null);
  const featuresRef = useRef(null);
  const demoRef = useRef(null);
  const aboutRef = useRef(null);
  const contactRef = useRef(null);
  const socialsRef = useRef(null);
  const carouselRef = useRef(null);
  const aboutCarouselRef = useRef(null);
  const topCoursesRef = useRef(null);

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentAboutSlide, setCurrentAboutSlide] = useState(0);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  // Top courses state
  const [topCourses, setTopCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Sidebar state
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Calculate card width - show 2 cards at a time on large screens, 1 on mobile
  const cardsPerView = isTablet ? 2 : 1;
  const maxCarouselWidth = isTablet ? Math.min(width, 900) : width; // Limit max width on large screens
  const cardWidth = (maxCarouselWidth - 40) / cardsPerView; // 40 for padding
  const scrollWidth = cardWidth * cardsPerView;

  // Feature cards data
  const features = [
    {
      icon: 'book-outline',
      title: 'Expert-Led Courses',
      description: 'Learn from industry professionals with real-world experience',
    },
    {
      icon: 'trophy-outline',
      title: 'Earn Certificates',
      description: 'Get recognized for your achievements with verified certificates',
    },
    {
      icon: 'people-outline',
      title: 'Community Learning',
      description: 'Connect with fellow learners and grow together',
    },
    {
      icon: 'analytics-outline',
      title: 'Track Progress',
      description: 'Monitor your learning journey with detailed analytics',
    },
    {
      icon: 'phone-portrait-outline',
      title: 'Learn Anywhere',
      description: 'Access courses on any device, anytime, anywhere',
    },
    {
      icon: 'checkmark-circle-outline',
      title: 'Interactive Quizzes',
      description: 'Test your knowledge with engaging quizzes and assessments',
    },
  ];

  // About sections data
  const aboutSections = [
    {
      icon: 'rocket-outline',
      title: 'Our Mission',
      description: 'To democratize education by providing accessible, high-quality learning experiences that empower individuals to achieve their goals and transform their lives.',
    },
    {
      icon: 'eye-outline',
      title: 'Our Vision',
      description: 'To become the world\'s most trusted learning platform, where anyone can learn anything from industry experts and build skills that matter.',
    },
    {
      icon: 'heart-outline',
      title: 'Our Values',
      description: 'Excellence in education, innovation in delivery, inclusivity in access, and integrity in everything we do.',
    },
  ];

  // Total slides (pairs of cards on large screens)
  const totalFeatureSlides = Math.ceil(features.length / cardsPerView);
  const totalAboutSlides = Math.ceil(aboutSections.length / cardsPerView);

  // Auto-play carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const nextSlide = (prev + 1) % totalFeatureSlides;
        carouselRef.current?.scrollTo({ x: scrollWidth * nextSlide, animated: true });
        return nextSlide;
      });
    }, 4000); // Change slide every 4 seconds for smoother experience

    return () => clearInterval(interval);
  }, [scrollWidth, totalFeatureSlides]);

  // Auto-play about carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAboutSlide((prev) => {
        const nextSlide = (prev + 1) % totalAboutSlides;
        aboutCarouselRef.current?.scrollTo({ x: scrollWidth * nextSlide, animated: true });
        return nextSlide;
      });
    }, 4000); // Change slide every 4 seconds for smoother experience

    return () => clearInterval(interval);
  }, [scrollWidth, totalAboutSlides]);

  // Fetch top courses
  useEffect(() => {
    const fetchTopCourses = async () => {
      try {
        setLoadingCourses(true);
        const response = await courseAPI.getAll();
        console.log('Courses API response:', response);

        // Handle different response formats
        let coursesArray = [];
        if (response.success && response.courses) {
          coursesArray = response.courses;
        } else if (Array.isArray(response)) {
          coursesArray = response;
        } else if (response.data && Array.isArray(response.data)) {
          coursesArray = response.data;
        }

        if (coursesArray.length > 0) {
          // First try to get published courses
          let coursesToShow = coursesArray.filter(c => c.isPublished === true);

          // If no published courses, show all courses
          if (coursesToShow.length === 0) {
            coursesToShow = coursesArray;
          }

          // Sort by enrollment count (highest first)
          const sortedCourses = coursesToShow.sort((a, b) =>
            (b.enrollmentCount || b.studentsEnrolled || 0) - (a.enrollmentCount || a.studentsEnrolled || 0)
          );

          // Take top 3
          setTopCourses(sortedCourses.slice(0, 3));
          console.log('Top courses set:', sortedCourses.slice(0, 3));
        }
      } catch (error) {
        console.log('Error fetching courses:', error);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchTopCourses();
  }, []);

  // Handle carousel scroll
  const handleCarouselScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / scrollWidth);
    setCurrentSlide(index);
  };

  // Handle about carousel scroll
  const handleAboutCarouselScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / scrollWidth);
    setCurrentAboutSlide(index);
  };

  const handleContactSubmit = () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all fields',
      });
      return;
    }

    // Create mailto link with form data
    const subject = encodeURIComponent(`Contact from ${contactName}`);
    const body = encodeURIComponent(`Name: ${contactName}\nEmail: ${contactEmail}\n\nMessage:\n${contactMessage}`);
    const mailtoLink = `mailto:support@skillsphere.com?subject=${subject}&body=${body}`;

    if (Platform.OS === 'web') {
      window.location.href = mailtoLink;
    } else {
      Linking.openURL(mailtoLink);
    }

    // Clear form
    setContactName('');
    setContactEmail('');
    setContactMessage('');
  };

  const scrollToSection = (ref) => {
    if (Platform.OS === 'web' && ref && ref.current) {
      // For web, use native scrollIntoView
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (ref && ref.current && scrollViewRef.current) {
      // For mobile
      ref.current.measureLayout(
        scrollViewRef.current.getScrollableNode ? scrollViewRef.current.getScrollableNode() : scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current.scrollTo({ y: y - 80, animated: true });
        },
        (error) => {
          console.log('Error measuring layout:', error);
        }
      );
    }
  };

  const gradientColors = theme.mode === 'dark'
    ? [theme.colors.background, theme.colors.backgroundSecondary, theme.colors.surface]
    : [theme.colors.gradientStart, theme.colors.gradientMid, theme.colors.gradientEnd];

  const containerStyle = isWeb ? [styles.container, {
    backgroundColor: theme.colors.background,
  }] : styles.container;

  const NavbarContent = () => (
    <View style={[styles.navbarContent, isTablet && styles.navbarContentLarge]}>
      <View style={styles.navbarLeft}>
        <BrandLogo size={isMobile ? 32 : 40} />
        <Text style={styles.navbarTitle}>SkillSphere</Text>
      </View>
      {isTablet && (
        <View style={styles.navbarCenter}>
          <TouchableOpacity style={styles.navLink} onPress={() => scrollToSection(topCoursesRef)}>
            <Text style={styles.navLinkText}>Top Courses</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navLink} onPress={() => scrollToSection(featuresRef)}>
            <Text style={styles.navLinkText}>Features</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navLink} onPress={() => scrollToSection(demoRef)}>
            <Text style={styles.navLinkText}>Demo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navLink} onPress={() => navigation.navigate('ExploreCourses')}>
            <Text style={styles.navLinkText}>Explore Courses</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navLink} onPress={() => scrollToSection(aboutRef)}>
            <Text style={styles.navLinkText}>About Us</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navLink} onPress={() => scrollToSection(contactRef)}>
            <Text style={styles.navLinkText}>Contact</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navLink} onPress={() => scrollToSection(socialsRef)}>
            <Text style={styles.navLinkText}>Socials</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.navbarRight}>
        <ThemeToggle />
        <TouchableOpacity
          style={styles.navSignInButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.navSignInText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Sidebar navigation items
  const sidebarItems = [
    { icon: 'trophy-outline', label: 'Top Courses', action: () => { scrollToSection(topCoursesRef); setSidebarVisible(false); } },
    { icon: 'star-outline', label: 'Features', action: () => { scrollToSection(featuresRef); setSidebarVisible(false); } },
    { icon: 'play-circle-outline', label: 'Demo', action: () => { scrollToSection(demoRef); setSidebarVisible(false); } },
    { icon: 'school-outline', label: 'Explore Courses', action: () => { navigation.navigate('ExploreCourses'); setSidebarVisible(false); } },
    { icon: 'information-circle-outline', label: 'About Us', action: () => { scrollToSection(aboutRef); setSidebarVisible(false); } },
    { icon: 'mail-outline', label: 'Contact', action: () => { scrollToSection(contactRef); setSidebarVisible(false); } },
    { icon: 'share-social-outline', label: 'Socials', action: () => { scrollToSection(socialsRef); setSidebarVisible(false); } },
  ];

  const content = (
      <ScrollView
        ref={scrollViewRef}
        style={isWeb ? { flex: 1, height: '100vh', backgroundColor: theme.colors.background } : { flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Navbar with Gradient */}
        {isWeb ? (
          <View style={[styles.navbar, {
            backgroundColor: gradientColors[0],
            background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
          }]}>
            <NavbarContent />
          </View>
        ) : (
          <LinearGradient
            colors={[gradientColors[0], gradientColors[1]]}
            style={styles.navbar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <NavbarContent />
          </LinearGradient>
        )}

        {/* Hero Section with Gradient */}
        {isWeb ? (
          <View style={[styles.heroSection, isTablet && styles.heroSectionLarge, {
            backgroundColor: gradientColors[0],
            background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 50%, ${gradientColors[2]} 100%)`,
          }]}>
            <Animated.View
              entering={FadeInDown.duration(800)}
              style={[styles.heroContent, isTablet && styles.heroContentLarge]}
            >
              <BrandLogo size={isMobile ? 80 : isTablet ? 140 : 100} />

              <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'baseline' }}>
                <Text style={[styles.heroTitle, isTablet && styles.heroTitleLarge, styles.heroTitleWhite]}>
                  Empower Your{' '}
                </Text>
                <TypingText
                  text="Skills"
                  style={[
                    styles.heroTitle,
                    isTablet && styles.heroTitleLarge,
                    { color: theme.mode === 'dark' ? theme.colors.secondary : '#164047' }
                  ]}
                  delay={500}
                  speed={100}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'baseline' }}>
                <Text style={[styles.heroTitle, isTablet && styles.heroTitleLarge, styles.heroTitleWhite]}>
                  Expand Your{' '}
                </Text>
                <TypingText
                  text="Sphere"
                  style={[
                    styles.heroTitle,
                    isTablet && styles.heroTitleLarge,
                    { color: theme.mode === 'dark' ? theme.colors.secondary : '#164047' }
                  ]}
                  delay={500}
                  speed={100}
                />
              </View>
              <Text style={[styles.heroSubtitle, isTablet && styles.heroSubtitleLarge, styles.heroSubtitleWhite]}>
                Discover world-class courses, learn new skills, and advance your career with
                SkillSphere - your gateway to continuous learning.
              </Text>

              <View style={[styles.heroButtons, isTablet && styles.heroButtonsLarge]}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('Signup')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Get Started</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('Login')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Stats Section */}
            <Animated.View
              entering={FadeIn.duration(600).delay(400)}
              style={[styles.statsContainer, { backgroundColor: theme.colors.card + 'E6' }]}
            >
              <StatItem number="10K+" label="Students" theme={theme} />
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
              <StatItem number="500+" label="Courses" theme={theme} />
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
              <StatItem number="100+" label="Experts" theme={theme} />
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
              <StatItem number="100+" label="Skills" theme={theme} />
            </Animated.View>
          </View>
        ) : (
          <LinearGradient
            colors={gradientColors}
            style={[styles.heroSection, isTablet && styles.heroSectionLarge]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View
              entering={FadeInDown.duration(800)}
              style={[styles.heroContent, isTablet && styles.heroContentLarge]}
            >
              <BrandLogo size={isMobile ? 80 : isTablet ? 140 : 100} />

              <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'baseline' }}>
                <Text style={[styles.heroTitle, isTablet && styles.heroTitleLarge, styles.heroTitleWhite]}>
                  Empower Your{' '}
                </Text>
                <TypingText
                  text="Skills"
                  style={[
                    styles.heroTitle,
                    isTablet && styles.heroTitleLarge,
                    { color: theme.mode === 'dark' ? theme.colors.secondary : '#0052cc' }
                  ]}
                  delay={500}
                  speed={100}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'baseline' }}>
                <Text style={[styles.heroTitle, isTablet && styles.heroTitleLarge, styles.heroTitleWhite]}>
                  Expand Your{' '}
                </Text>
                <TypingText
                  text="Sphere"
                  style={[
                    styles.heroTitle,
                    isTablet && styles.heroTitleLarge,
                    { color: theme.mode === 'dark' ? theme.colors.secondary : '#0052cc' }
                  ]}
                  delay={500}
                  speed={100}
                />
              </View>
              <Text style={[styles.heroSubtitle, isTablet && styles.heroSubtitleLarge, styles.heroSubtitleWhite]}>
                Discover world-class courses, learn new skills, and advance your career with
                SkillSphere - your gateway to continuous learning.
              </Text>

              <View style={[styles.heroButtons, isTablet && styles.heroButtonsLarge]}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('Signup')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Get Started</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('Login')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Stats Section */}
            <Animated.View
              entering={FadeIn.duration(600).delay(400)}
              style={[styles.statsContainer, { backgroundColor: theme.colors.card + 'E6' }]}
            >
              <StatItem number="10K+" label="Students" theme={theme} />
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
              <StatItem number="500+" label="Courses" theme={theme} />
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
              <StatItem number="100+" label="Experts" theme={theme} />
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
              <StatItem number="100+" label="Skills" theme={theme} />
            </Animated.View>
          </LinearGradient>
        )}

        {/* Top Courses Section - Modern Design */}
        {isWeb ? (
          <View
            ref={topCoursesRef}
            style={[styles.topCoursesSection, {
              background: isDark
                ? `linear-gradient(180deg, ${theme.colors.background} 0%, ${theme.colors.backgroundSecondary} 50%, ${theme.colors.background} 100%)`
                : `linear-gradient(180deg, ${theme.colors.background} 0%, ${theme.colors.primary}08 50%, ${theme.colors.background} 100%)`,
            }]}
          >
            {/* Section Header with Badge */}
            <Animated.View entering={FadeIn.duration(600)} style={styles.topCoursesHeader}>
              <View style={[styles.trendingBadge, { backgroundColor: theme.colors.primary }]}>
                <Icon name="flame" size={14} color="#fff" />
                <Text style={styles.trendingBadgeText}>TRENDING</Text>
              </View>
              <Text style={[styles.topCoursesTitle, { color: theme.colors.textPrimary }]}>
                Top Courses
              </Text>
              <Text style={[styles.topCoursesSubtitle, { color: theme.colors.textSecondary }]}>
                Join thousands of students in our most popular courses
              </Text>
            </Animated.View>

            {loadingCourses ? (
              <View style={styles.loadingContainer}>
                <View style={[styles.loadingSpinner, { borderColor: theme.colors.primary }]} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                  Loading courses...
                </Text>
              </View>
            ) : topCourses.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.topCoursesScrollContent}
                decelerationRate="fast"
                snapToInterval={isMobile ? 300 : 380}
              >
                {topCourses.map((course, index) => {
                  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                  const rankLabels = ['1st', '2nd', '3rd'];
                  return (
                    <Animated.View
                      key={course.id || index}
                      entering={FadeInDown.duration(500).delay(index * 150)}
                      style={styles.modernCourseCard}
                    >
                      {/* Rank Badge */}
                      <View style={[styles.rankBadge, { backgroundColor: rankColors[index] || theme.colors.primary }]}>
                        <Icon name="trophy" size={12} color="#fff" />
                        <Text style={styles.rankText}>{rankLabels[index] || `#${index + 1}`}</Text>
                      </View>

                      {/* Course Image with Gradient Overlay */}
                      <View style={styles.courseImageContainer}>
                        {course.thumbnailImage ? (
                          <Image
                            source={{ uri: resolveFileUrl(course.thumbnailImage) }}
                            style={styles.modernCourseThumbnail}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.modernCoursePlaceholder, {
                            background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`
                          }]}>
                            <Icon name="book" size={isMobile ? 40 : 56} color="rgba(255,255,255,0.9)" />
                          </View>
                        )}
                        <View style={styles.courseImageOverlay} />

                        {/* Floating Stats */}
                        <View style={styles.floatingStats}>
                          <View style={styles.floatingStat}>
                            <Icon name="people" size={14} color="#fff" />
                            <Text style={styles.floatingStatText}>
                              {course.enrollmentCount || course.studentsEnrolled || 0}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Course Info */}
                      <View style={[styles.modernCourseContent, { backgroundColor: theme.colors.card }]}>
                        <View>
                          {/* Category Tag */}
                          <View style={[styles.categoryTag, { backgroundColor: theme.colors.primary + '15' }]}>
                            <Text style={[styles.categoryTagText, { color: theme.colors.primary }]}>
                              {course.category?.name || course.categoryName || 'Development'}
                            </Text>
                          </View>

                          <Text style={[styles.modernCourseTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                            {course.name || course.title}
                          </Text>

                          <Text style={[styles.modernCourseDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                            {course.description || 'Explore this amazing course and enhance your skills.'}
                          </Text>

                          {/* Course Meta */}
                          <View style={styles.modernCourseMeta}>
                            <View style={styles.metaItem}>
                              <Icon name="time-outline" size={14} color={theme.colors.textTertiary} />
                              <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>
                                {course.duration || 'Self-paced'}
                              </Text>
                            </View>
                            <View style={[styles.metaDivider, { backgroundColor: theme.colors.border }]} />
                            <View style={styles.metaItem}>
                              <Icon name="bar-chart-outline" size={14} color={theme.colors.textTertiary} />
                              <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>
                                {course.level || 'All levels'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* CTA Button */}
                        <TouchableOpacity
                          style={[styles.enrollCTA, { backgroundColor: theme.colors.primary }]}
                          onPress={() => navigation.navigate('Signup')}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.enrollCTAText}>Enroll Now</Text>
                          <Icon name="arrow-forward" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyCoursesContainer}>
                <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                  <Icon name="school-outline" size={48} color={theme.colors.primary} />
                </View>
                <Text style={[styles.emptyCoursesText, { color: theme.colors.textSecondary }]}>
                  No courses available yet
                </Text>
              </View>
            )}

            {/* View All Button */}
            <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.viewAllContainer}>
              <TouchableOpacity
                style={[styles.viewAllButton, {
                  backgroundColor: isDark ? theme.colors.surface : '#fff',
                  borderColor: theme.colors.border,
                }]}
                onPress={() => navigation.navigate('ExploreCourses')}
                activeOpacity={0.8}
              >
                <Text style={[styles.viewAllText, { color: theme.colors.textPrimary }]}>
                  Explore All Courses
                </Text>
                <View style={[styles.viewAllArrow, { backgroundColor: theme.colors.primary }]}>
                  <Icon name="arrow-forward" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        ) : (
          <LinearGradient
            ref={topCoursesRef}
            colors={isDark
              ? [theme.colors.background, theme.colors.backgroundSecondary, theme.colors.background]
              : [theme.colors.background, theme.colors.primary + '08', theme.colors.background]
            }
            style={styles.topCoursesSection}
          >
            {/* Section Header with Badge */}
            <Animated.View entering={FadeIn.duration(600)} style={styles.topCoursesHeader}>
              <View style={[styles.trendingBadge, { backgroundColor: theme.colors.primary }]}>
                <Icon name="flame" size={14} color="#fff" />
                <Text style={styles.trendingBadgeText}>TRENDING</Text>
              </View>
              <Text style={[styles.topCoursesTitle, { color: theme.colors.textPrimary }]}>
                Top Courses
              </Text>
              <Text style={[styles.topCoursesSubtitle, { color: theme.colors.textSecondary }]}>
                Join thousands of students in our most popular courses
              </Text>
            </Animated.View>

            {loadingCourses ? (
              <View style={styles.loadingContainer}>
                <View style={[styles.loadingSpinner, { borderColor: theme.colors.primary }]} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                  Loading courses...
                </Text>
              </View>
            ) : topCourses.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.topCoursesScrollContent}
                decelerationRate="fast"
                snapToInterval={isMobile ? 300 : 380}
              >
                {topCourses.map((course, index) => {
                  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                  const rankLabels = ['1st', '2nd', '3rd'];
                  return (
                    <Animated.View
                      key={course.id || index}
                      entering={FadeInDown.duration(500).delay(index * 150)}
                      style={styles.modernCourseCard}
                    >
                      {/* Rank Badge */}
                      <View style={[styles.rankBadge, { backgroundColor: rankColors[index] || theme.colors.primary }]}>
                        <Icon name="trophy" size={12} color="#fff" />
                        <Text style={styles.rankText}>{rankLabels[index] || `#${index + 1}`}</Text>
                      </View>

                      {/* Course Image with Gradient Overlay */}
                      <View style={styles.courseImageContainer}>
                        {course.thumbnailImage ? (
                          <Image
                            source={{ uri: resolveFileUrl(course.thumbnailImage) }}
                            style={styles.modernCourseThumbnail}
                            resizeMode="cover"
                          />
                        ) : (
                          <LinearGradient
                            colors={[theme.colors.primary, theme.colors.secondary]}
                            style={styles.modernCoursePlaceholder}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Icon name="book" size={isMobile ? 40 : 56} color="rgba(255,255,255,0.9)" />
                          </LinearGradient>
                        )}
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.7)']}
                          style={styles.courseImageOverlay}
                        />

                        {/* Floating Stats */}
                        <View style={styles.floatingStats}>
                          <View style={styles.floatingStat}>
                            <Icon name="people" size={14} color="#fff" />
                            <Text style={styles.floatingStatText}>
                              {course.enrollmentCount || course.studentsEnrolled || 0}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Course Info */}
                      <View style={[styles.modernCourseContent, { backgroundColor: theme.colors.card }]}>
                        <View>
                          {/* Category Tag */}
                          <View style={[styles.categoryTag, { backgroundColor: theme.colors.primary + '15' }]}>
                            <Text style={[styles.categoryTagText, { color: theme.colors.primary }]}>
                              {course.category?.name || course.categoryName || 'Development'}
                            </Text>
                          </View>

                          <Text style={[styles.modernCourseTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                            {course.name || course.title}
                          </Text>

                          <Text style={[styles.modernCourseDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                            {course.description || 'Explore this amazing course and enhance your skills.'}
                          </Text>

                          {/* Course Meta */}
                          <View style={styles.modernCourseMeta}>
                            <View style={styles.metaItem}>
                              <Icon name="time-outline" size={14} color={theme.colors.textTertiary} />
                              <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>
                                {course.duration || 'Self-paced'}
                              </Text>
                            </View>
                            <View style={[styles.metaDivider, { backgroundColor: theme.colors.border }]} />
                            <View style={styles.metaItem}>
                              <Icon name="bar-chart-outline" size={14} color={theme.colors.textTertiary} />
                              <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>
                                {course.level || 'All levels'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* CTA Button */}
                        <TouchableOpacity
                          style={[styles.enrollCTA, { backgroundColor: theme.colors.primary }]}
                          onPress={() => navigation.navigate('Signup')}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.enrollCTAText}>Enroll Now</Text>
                          <Icon name="arrow-forward" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyCoursesContainer}>
                <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                  <Icon name="school-outline" size={48} color={theme.colors.primary} />
                </View>
                <Text style={[styles.emptyCoursesText, { color: theme.colors.textSecondary }]}>
                  No courses available yet
                </Text>
              </View>
            )}

            {/* View All Button */}
            <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.viewAllContainer}>
              <TouchableOpacity
                style={[styles.viewAllButton, {
                  backgroundColor: isDark ? theme.colors.surface : '#fff',
                  borderColor: theme.colors.border,
                }]}
                onPress={() => navigation.navigate('ExploreCourses')}
                activeOpacity={0.8}
              >
                <Text style={[styles.viewAllText, { color: theme.colors.textPrimary }]}>
                  Explore All Courses
                </Text>
                <View style={[styles.viewAllArrow, { backgroundColor: theme.colors.primary }]}>
                  <Icon name="arrow-forward" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          </LinearGradient>
        )}

        {/* Features Section */}
        <View ref={featuresRef} style={[styles.section, { backgroundColor: theme.colors.background }]}>
          <Animated.Text
            entering={FadeIn.duration(600)}
            style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
          >
            Why Choose SkillSphere?
          </Animated.Text>
          <Animated.Text
            entering={FadeIn.duration(600).delay(100)}
            style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}
          >
            Everything you need to accelerate your learning journey
          </Animated.Text>

          <View style={styles.carouselWrapper}>
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              onScroll={handleCarouselScroll}
              scrollEventThrottle={16}
              snapToInterval={scrollWidth}
              decelerationRate={0.9}
              style={[styles.carouselScroll, { width: maxCarouselWidth }]}
              contentContainerStyle={{ paddingHorizontal: 10 }}
            >
              {features.map((feature, index) => (
                <View
                  key={index}
                  style={[styles.carouselCard, { width: cardWidth }]}
                >
                  <View style={styles.carouselCardInner}>
                    <FeatureCard
                      {...feature}
                      delay={0}
                      theme={theme}
                      isMobile={isMobile}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Pagination Dots */}
          <View style={styles.paginationContainer}>
            {Array.from({ length: totalFeatureSlides }).map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  carouselRef.current?.scrollTo({ x: scrollWidth * index, animated: true });
                  setCurrentSlide(index);
                }}
              >
                <View
                  style={[
                    styles.paginationDot,
                    {
                      backgroundColor: currentSlide === index ? theme.colors.primary : theme.colors.textTertiary,
                      opacity: currentSlide === index ? 1 : 0.3,
                      width: currentSlide === index ? 24 : 8,
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Demo Video Section */}
        <View ref={demoRef} style={[styles.section, styles.videoSection]}>
          <Animated.Text
            entering={FadeIn.duration(600)}
            style={[styles.videoSectionTitle, { color: theme.colors.textPrimary }]}
          >
            See SkillSphere in Action
          </Animated.Text>

          <Animated.View
            entering={FadeInUp.duration(600).delay(200)}
            style={styles.videoContainer}
          >
            <View style={[styles.videoPlaceholder, { backgroundColor: theme.colors.card }]}>
              <TouchableOpacity
                style={[styles.playButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  const url = 'https://www.youtube.com/watch?v=demo';
                  if (Platform.OS === 'web') {
                    window.open(url, '_blank');
                  } else {
                    Linking.openURL(url);
                  }
                }}
              >
                <Icon name="play" size={isMobile ? 32 : 40} color="#fff" />
              </TouchableOpacity>
              <Text style={[styles.videoText, { color: theme.colors.textSecondary }]}>
                Watch Demo Video
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* CTA Section */}
        <View style={[styles.ctaSection, { backgroundColor: theme.colors.primary }]}>
          <Animated.Text entering={FadeIn.duration(600)} style={styles.ctaTitle}>
            Ready to Start Learning?
          </Animated.Text>
          <Animated.Text entering={FadeIn.duration(600).delay(100)} style={styles.ctaSubtitle}>
            Join thousands of learners and start your journey today
          </Animated.Text>
          <Animated.View entering={FadeInUp.duration(600).delay(200)}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => navigation.navigate('Signup')}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>Create Free Account</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* About Us Section */}
        <View ref={aboutRef} style={[styles.section, { backgroundColor: theme.colors.background }]}>
          <Animated.Text
            entering={FadeIn.duration(600)}
            style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
          >
            About SkillSphere
          </Animated.Text>
          <Animated.Text
            entering={FadeIn.duration(600).delay(100)}
            style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}
          >
            Empowering learners worldwide with quality education
          </Animated.Text>

          <View style={styles.carouselWrapper}>
            <ScrollView
              ref={aboutCarouselRef}
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              onScroll={handleAboutCarouselScroll}
              scrollEventThrottle={16}
              snapToInterval={scrollWidth}
              decelerationRate={0.9}
              style={[styles.carouselScroll, { width: maxCarouselWidth }]}
              contentContainerStyle={{ paddingHorizontal: 10 }}
            >
              {aboutSections.map((section, index) => (
                <View
                  key={index}
                  style={[styles.carouselCard, { width: cardWidth }]}
                >
                  <View style={styles.carouselCardInner}>
                    <AppCard style={styles.aboutCard}>
                      <View style={[styles.aboutIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                        <Icon name={section.icon} size={32} color={theme.colors.primary} />
                      </View>
                      <Text style={[styles.aboutCardTitle, { color: theme.colors.textPrimary }]}>
                        {section.title}
                      </Text>
                      <Text style={[styles.aboutCardText, { color: theme.colors.textSecondary }]}>
                        {section.description}
                      </Text>
                    </AppCard>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Pagination Dots */}
          <View style={styles.paginationContainer}>
            {Array.from({ length: totalAboutSlides }).map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  aboutCarouselRef.current?.scrollTo({ x: scrollWidth * index, animated: true });
                  setCurrentAboutSlide(index);
                }}
              >
                <View
                  style={[
                    styles.paginationDot,
                    {
                      backgroundColor: currentAboutSlide === index ? theme.colors.primary : theme.colors.textTertiary,
                      opacity: currentAboutSlide === index ? 1 : 0.3,
                      width: currentAboutSlide === index ? 24 : 8,
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Contact Form Section */}
        <View ref={contactRef} style={[styles.contactSection, { backgroundColor: theme.colors.background }]}>
          <Animated.Text
            entering={FadeIn.duration(600)}
            style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
          >
            Get in Touch
          </Animated.Text>
          <Animated.Text
            entering={FadeIn.duration(600).delay(100)}
            style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}
          >
            Have questions? Send us a message
          </Animated.Text>

          <Animated.View
            entering={FadeInUp.duration(600).delay(200)}
            style={[styles.contactFormContainer, isTablet && styles.contactFormContainerLarge]}
          >
            <AppCard style={styles.contactFormCard}>
              <TextInput
                style={[styles.contactInput, {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                }]}
                placeholder="Your Name"
                placeholderTextColor={theme.colors.textSecondary}
                value={contactName}
                onChangeText={setContactName}
              />
              <TextInput
                style={[styles.contactInput, {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                }]}
                placeholder="Your Email"
                placeholderTextColor={theme.colors.textSecondary}
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.contactInput, styles.contactTextArea, {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                }]}
                placeholder="Your Message"
                placeholderTextColor={theme.colors.textSecondary}
                value={contactMessage}
                onChangeText={setContactMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.contactSubmitButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleContactSubmit}
                activeOpacity={0.8}
              >
                <Icon name="send" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.contactSubmitText}>Send Message</Text>
              </TouchableOpacity>
            </AppCard>
          </Animated.View>
        </View>

        {/* Socials Section */}
        <View ref={socialsRef} style={[styles.socialsSection, { backgroundColor: theme.colors.background }]}>
          <Animated.Text
            entering={FadeIn.duration(600)}
            style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
          >
            Connect With Us
          </Animated.Text>

          <Animated.View
            entering={FadeInUp.duration(600).delay(200)}
            style={styles.compactSocialContainer}
          >
            <View style={styles.compactSocialIcons}>
              <TouchableOpacity
                style={[styles.compactSocialIcon, {
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }]}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.location.href = 'mailto:support@skillsphere.com';
                  } else {
                    Linking.openURL('mailto:support@skillsphere.com');
                  }
                }}
              >
                <Icon name="mail-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.compactSocialIcon, {
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }]}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.location.href = 'tel:+15551234567';
                  } else {
                    Linking.openURL('tel:+15551234567');
                  }
                }}
              >
                <Icon name="call-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.compactSocialIcon, {
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }]}
                onPress={() => Linking.openURL('https://facebook.com')}
              >
                <Icon name="logo-facebook" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.compactSocialIcon, {
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }]}
                onPress={() => Linking.openURL('https://twitter.com')}
              >
                <Icon name="logo-twitter" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.compactSocialIcon, {
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }]}
                onPress={() => Linking.openURL('https://linkedin.com')}
              >
                <Icon name="logo-linkedin" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.compactSocialIcon, {
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }]}
                onPress={() => Linking.openURL('https://instagram.com')}
              >
                <Icon name="logo-instagram" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>

        {/* Footer - Professional Multi-Column */}
        <View style={[styles.footer, { backgroundColor: isDark ? theme.colors.surface : '#1a1a2e', borderTopColor: theme.colors.border }]}>
          {/* Main Footer Content */}
          <View style={styles.footerMain}>
            {/* Brand Column */}
            <View style={styles.footerBrandColumn}>
              <View style={styles.footerBrand}>
                <BrandLogo size={36} />
                <Text style={styles.footerBrandName}>SkillSphere</Text>
              </View>
              <Text style={styles.footerTagline}>
                Empowering learners worldwide with quality education. Learn new skills, advance your career.
              </Text>
              {/* Social Icons */}
              <View style={styles.footerSocials}>
                <TouchableOpacity style={styles.footerSocialIcon} onPress={() => Linking.openURL('https://facebook.com')}>
                  <Icon name="logo-facebook" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerSocialIcon} onPress={() => Linking.openURL('https://twitter.com')}>
                  <Icon name="logo-twitter" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerSocialIcon} onPress={() => Linking.openURL('https://linkedin.com')}>
                  <Icon name="logo-linkedin" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerSocialIcon} onPress={() => Linking.openURL('https://instagram.com')}>
                  <Icon name="logo-instagram" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerSocialIcon} onPress={() => Linking.openURL('https://youtube.com')}>
                  <Icon name="logo-youtube" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Links Columns Container */}
            <View style={styles.footerLinksContainer}>
              {/* Courses Column */}
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Courses</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ExploreCourses')}>
                  <Text style={styles.footerLink}>Browse All Courses</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('ExploreCourses')}>
                  <Text style={styles.footerLink}>Popular Courses</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('ExploreCourses')}>
                  <Text style={styles.footerLink}>New Courses</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('ExploreCourses')}>
                  <Text style={styles.footerLink}>Categories</Text>
                </TouchableOpacity>
              </View>

              {/* Company Column */}
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Company</Text>
                <TouchableOpacity onPress={() => scrollToSection(aboutRef)}>
                  <Text style={styles.footerLink}>About Us</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Careers</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Press</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Blog</Text>
                </TouchableOpacity>
              </View>

              {/* Community Column */}
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Community</Text>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Learners</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Partners</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Instructors</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Affiliates</Text>
                </TouchableOpacity>
              </View>

              {/* Support Column */}
              <View style={styles.footerColumn}>
                <Text style={styles.footerColumnTitle}>Support</Text>
                <TouchableOpacity onPress={() => scrollToSection(contactRef)}>
                  <Text style={styles.footerLink}>Contact Us</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Help Center</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>FAQ</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Feedback</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Footer Divider */}
          <View style={styles.footerDivider} />

          {/* Bottom Footer */}
          <View style={styles.footerBottom}>
            <Text style={styles.copyright}>© 2026 SkillSphere. All rights reserved.</Text>
            <View style={styles.footerLegalLinks}>
              <TouchableOpacity>
                <Text style={styles.footerLegalLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.footerLegalDivider}>•</Text>
              <TouchableOpacity>
                <Text style={styles.footerLegalLink}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.footerLegalDivider}>•</Text>
              <TouchableOpacity>
                <Text style={styles.footerLegalLink}>Cookie Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
  );

  // Sidebar components to render at root level
  const sidebarComponents = (
    <>
      {/* Sidebar Trigger - Fixed position */}
      <View
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: 20,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
          cursor: isWeb ? 'pointer' : 'default',
        }}
        onMouseEnter={isWeb ? () => setSidebarVisible(true) : undefined}
        onTouchStart={!isWeb ? () => setSidebarVisible(true) : undefined}
      >
        <View style={[styles.sidebarTriggerLine, { backgroundColor: theme.colors.primary }]} />
      </View>

      {/* Sidebar Overlay */}
      {sidebarVisible && (
        <TouchableOpacity
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
          }}
          activeOpacity={1}
          onPress={() => setSidebarVisible(false)}
        />
      )}

      {/* Sidebar */}
      <Animated.View
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 280,
          height: '100%',
          zIndex: 1001,
          backgroundColor: theme.colors.card,
          transform: [{ translateX: sidebarVisible ? 0 : -280 }],
          shadowColor: '#000',
          shadowOffset: { width: 4, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
          elevation: 10,
          paddingTop: Platform.OS === 'ios' ? 50 : 20,
          ...(isWeb && {
            transition: 'transform 0.3s ease-in-out',
          }),
        }}
        onMouseEnter={isWeb ? () => setSidebarVisible(true) : undefined}
        onMouseLeave={isWeb ? () => setSidebarVisible(false) : undefined}
      >
        <View style={styles.sidebarHeader}>
          <BrandLogo size={40} />
          <Text style={[styles.sidebarTitle, { color: theme.colors.textPrimary }]}>SkillSphere</Text>
          <TouchableOpacity
            style={styles.sidebarCloseButton}
            onPress={() => setSidebarVisible(false)}
          >
            <Icon name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.sidebarContent}>
          {sidebarItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.sidebarItem, { borderBottomColor: theme.colors.border }]}
              onPress={item.action}
              activeOpacity={0.7}
            >
              <Icon name={item.icon} size={22} color={theme.colors.primary} />
              <Text style={[styles.sidebarItemText, { color: theme.colors.textPrimary }]}>
                {item.label}
              </Text>
              <Icon name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sidebarFooter}>
          <TouchableOpacity
            style={[styles.sidebarSignInButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => { navigation.navigate('Login'); setSidebarVisible(false); }}
          >
            <Icon name="log-in-outline" size={20} color="#ffffff" />
            <Text style={styles.sidebarSignInText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sidebarSignUpButton, { borderColor: theme.colors.primary }]}
            onPress={() => { navigation.navigate('Signup'); setSidebarVisible(false); }}
          >
            <Text style={[styles.sidebarSignUpText, { color: theme.colors.primary }]}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );

  if (isWeb) {
    return (
      <div style={{ minHeight: '100vh', position: 'relative', backgroundColor: theme.colors.background }}>
        {content}
        <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 20, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onMouseEnter={() => setSidebarVisible(true)}
        >
          <div style={{ width: 4, height: 60, borderRadius: 2, backgroundColor: theme.colors.primary, opacity: 0.6 }} />
        </div>
        {sidebarVisible && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000 }}
            onClick={() => setSidebarVisible(false)}
          />
        )}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 280,
          height: '100vh',
          zIndex: 1001,
          backgroundColor: theme.colors.card,
          transform: sidebarVisible ? 'translateX(0)' : 'translateX(-280px)',
          transition: 'transform 0.3s ease-in-out',
          boxShadow: '4px 0 20px rgba(0,0,0,0.2)',
          paddingTop: 20,
          display: 'flex',
          flexDirection: 'column',
        }}
          onMouseEnter={() => setSidebarVisible(true)}
          onMouseLeave={() => setSidebarVisible(false)}
        >
          <View style={styles.sidebarHeader}>
            <BrandLogo size={40} />
            <Text style={[styles.sidebarTitle, { color: theme.colors.textPrimary }]}>SkillSphere</Text>
            <TouchableOpacity
              style={styles.sidebarCloseButton}
              onPress={() => setSidebarVisible(false)}
            >
              <Icon name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.sidebarContent}>
            {sidebarItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.sidebarItem, { borderBottomColor: theme.colors.border }]}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <Icon name={item.icon} size={22} color={theme.colors.primary} />
                <Text style={[styles.sidebarItemText, { color: theme.colors.textPrimary }]}>
                  {item.label}
                </Text>
                <Icon name="chevron-forward" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sidebarFooter}>
            <TouchableOpacity
              style={[styles.sidebarSignInButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => { navigation.navigate('Login'); setSidebarVisible(false); }}
            >
              <Icon name="log-in-outline" size={20} color="#ffffff" />
              <Text style={styles.sidebarSignInText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sidebarSignUpButton, { borderColor: theme.colors.primary }]}
              onPress={() => { navigation.navigate('Signup'); setSidebarVisible(false); }}
            >
              <Text style={[styles.sidebarSignUpText, { color: theme.colors.primary }]}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </div>
      </div>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {content}
      {sidebarComponents}
    </View>
  );
};

const getStyles = (theme, isDark, isLargeScreen, isTablet, isMobile) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    // Navbar styles - keeping unchanged as requested
    navbar: {
      paddingHorizontal: isMobile ? 16 : 20,
      paddingVertical: isMobile ? 16 : 20,
      paddingTop: Platform.OS === 'ios' ? 50 : isMobile ? 16 : 20,
      ...Platform.select({
        web: {
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        },
      }),
    },
    navbarContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    navbarContentLarge: {
      maxWidth: 1200,
      alignSelf: 'center',
    },
    navbarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    navbarTitle: {
      fontSize: isMobile ? 18 : 22,
      fontWeight: '700',
      color: '#fff',
      marginLeft: isMobile ? 8 : 10,
      fontFamily: theme.typography.fontFamily.bold,
    },
    navbarCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isLargeScreen ? 32 : 24,
    },
    navLink: {
      paddingVertical: 8,
      paddingHorizontal: 4,
      cursor: Platform.OS === 'web' ? 'pointer' : 'default',
    },
    navLinkText: {
      fontSize: isLargeScreen ? 16 : 14,
      fontWeight: '600',
      color: '#fff',
      opacity: 0.9,
      fontFamily: theme.typography.fontFamily.semiBold,
      transition: Platform.OS === 'web' ? 'opacity 0.2s' : undefined,
    },
    navbarRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isMobile ? 8 : 16,
    },
    navSignInButton: {
      paddingVertical: isMobile ? 8 : 10,
      paddingHorizontal: isMobile ? 12 : 20,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    navSignInText: {
      fontSize: isMobile ? 12 : 14,
      fontWeight: '600',
      color: '#fff',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    // Hero Section
    heroSection: {
      paddingHorizontal: isMobile ? 16 : 20,
      paddingVertical: isMobile ? 32 : 40,
      alignItems: 'center',
    },
    heroSectionLarge: {
      paddingVertical: isLargeScreen ? 80 : 60,
      paddingHorizontal: isLargeScreen ? 60 : 40,
    },
    heroContent: {
      alignItems: 'center',
      maxWidth: 600,
    },
    heroContentLarge: {
      maxWidth: isLargeScreen ? 800 : 700,
    },
    heroTitle: {
      fontSize: isMobile ? 28 : 36,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: isMobile ? 16 : 24,
      letterSpacing: 0.5,
      fontFamily: theme.typography.fontFamily.bold,
    },
    heroTitleWhite: {
      color: '#ffffff',
    },
    heroTitleLarge: {
      fontSize: isLargeScreen ? 56 : 48,
    },
    heroSubtitle: {
      fontSize: isMobile ? 14 : 16,
      textAlign: 'center',
      marginTop: isMobile ? 12 : 16,
      lineHeight: isMobile ? 22 : 26,
      paddingHorizontal: isMobile ? 8 : 10,
      fontFamily: theme.typography.fontFamily.regular,
    },
    heroSubtitleWhite: {
      color: 'rgba(255, 255, 255, 0.9)',
    },
    heroSubtitleLarge: {
      fontSize: isLargeScreen ? 20 : 18,
      lineHeight: isLargeScreen ? 32 : 28,
    },
    heroButtons: {
      flexDirection: 'column',
      gap: 12,
      marginTop: isMobile ? 24 : 32,
      width: '100%',
      maxWidth: isMobile ? 280 : 300,
    },
    heroButtonsLarge: {
      flexDirection: 'row',
      maxWidth: 400,
    },
    primaryButton: {
      backgroundColor: '#ffffff',
      paddingVertical: isMobile ? 14 : 16,
      paddingHorizontal: isMobile ? 24 : 32,
      borderRadius: 12,
      alignItems: 'center',
      flex: 1,
      ...theme.shadows.md,
    },
    primaryButtonText: {
      color: '#164047',
      fontWeight: '700',
      fontSize: isMobile ? 14 : 16,
      fontFamily: theme.typography.fontFamily.bold,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      paddingVertical: isMobile ? 14 : 16,
      paddingHorizontal: isMobile ? 24 : 32,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#fff',
      alignItems: 'center',
      flex: 1,
    },
    secondaryButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: isMobile ? 14 : 16,
      fontFamily: theme.typography.fontFamily.bold,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      marginTop: isMobile ? 32 : 48,
      paddingVertical: isMobile ? 16 : 24,
      paddingHorizontal: isMobile ? 12 : 16,
      borderRadius: 20,
      width: '100%',
      maxWidth: isMobile ? 320 : 600,
      ...theme.shadows.lg,
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: isMobile ? 20 : 24,
      fontWeight: '800',
      fontFamily: theme.typography.fontFamily.bold,
    },
    statLabel: {
      fontSize: isMobile ? 10 : 12,
      marginTop: 4,
      fontFamily: theme.typography.fontFamily.regular,
    },
    statDivider: {
      width: 1,
      height: isMobile ? 30 : 40,
    },
    // Sections
    section: {
      paddingVertical: isMobile ? 40 : isTablet ? 50 : 60,
      paddingHorizontal: isMobile ? 16 : 20,
    },
    sectionTitle: {
      fontSize: isMobile ? 22 : isTablet ? 26 : 28,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 12,
      fontFamily: theme.typography.fontFamily.bold,
    },
    sectionSubtitle: {
      fontSize: isMobile ? 14 : 16,
      textAlign: 'center',
      marginBottom: isMobile ? 24 : 40,
      fontFamily: theme.typography.fontFamily.regular,
    },
    featuresGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: isMobile ? 12 : 16,
    },
    featuresGridLarge: {
      maxWidth: 1200,
      alignSelf: 'center',
    },
    featureCard: {
      width: '100%',
      maxWidth: 340,
      padding: isMobile ? 20 : 24,
      borderRadius: 20,
      alignItems: 'center',
      ...theme.shadows.md,
    },
    featureIcon: {
      width: isMobile ? 50 : 60,
      height: isMobile ? 50 : 60,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    featureTitle: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    featureDescription: {
      fontSize: isMobile ? 13 : 14,
      textAlign: 'center',
      lineHeight: isMobile ? 20 : 22,
      fontFamily: theme.typography.fontFamily.regular,
    },
    carouselWrapper: {
      width: '100%',
      overflow: 'hidden',
      alignItems: 'center',
    },
    carouselScroll: {
      maxWidth: 900,
    },
    carouselCard: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: isMobile ? 4 : 8,
    },
    carouselCardInner: {
      width: '100%',
      maxWidth: isMobile ? 320 : 420,
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: isMobile ? 16 : 24,
      gap: 8,
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: isMobile ? 4 : 6,
      transition: 'all 0.3s ease',
    },
    // Video Section
    videoSection: {
      backgroundColor: 'transparent',
    },
    videoSectionTitle: {
      fontSize: isMobile ? 22 : 28,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: isMobile ? 16 : 24,
      fontFamily: theme.typography.fontFamily.bold,
    },
    videoContainer: {
      alignItems: 'center',
    },
    videoPlaceholder: {
      width: '100%',
      maxWidth: isMobile ? 340 : 700,
      aspectRatio: 16 / 9,
      borderRadius: isMobile ? 16 : 20,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      ...theme.shadows.lg,
    },
    playButton: {
      width: isMobile ? 60 : 80,
      height: isMobile ? 60 : 80,
      borderRadius: isMobile ? 30 : 40,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.lg,
    },
    videoText: {
      marginTop: isMobile ? 12 : 16,
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    // CTA Section
    ctaSection: {
      paddingVertical: isMobile ? 40 : 60,
      paddingHorizontal: isMobile ? 16 : 20,
      alignItems: 'center',
    },
    ctaTitle: {
      fontSize: isMobile ? 24 : 32,
      fontWeight: '800',
      color: '#fff',
      textAlign: 'center',
      marginBottom: 12,
      fontFamily: theme.typography.fontFamily.bold,
    },
    ctaSubtitle: {
      fontSize: isMobile ? 14 : 16,
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      marginBottom: isMobile ? 24 : 32,
      fontFamily: theme.typography.fontFamily.regular,
    },
    ctaButton: {
      backgroundColor: '#fff',
      paddingVertical: isMobile ? 14 : 18,
      paddingHorizontal: isMobile ? 32 : 48,
      borderRadius: 12,
      ...theme.shadows.md,
    },
    ctaButtonText: {
      color: '#0052cc',
      fontWeight: '700',
      fontSize: isMobile ? 16 : 18,
      fontFamily: theme.typography.fontFamily.bold,
    },
    // About Section
    aboutContent: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: isMobile ? 16 : 24,
      marginTop: 20,
    },
    aboutContentLarge: {
      maxWidth: 1200,
      alignSelf: 'center',
    },
    aboutCard: {
      width: '100%',
      maxWidth: isMobile ? 300 : 340,
      padding: isMobile ? 20 : 24,
      borderRadius: 20,
      alignItems: 'center',
    },
    aboutIconContainer: {
      width: isMobile ? 56 : 64,
      height: isMobile ? 56 : 64,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    aboutCardTitle: {
      fontSize: isMobile ? 18 : 20,
      fontWeight: '700',
      marginBottom: 12,
      textAlign: 'center',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    aboutCardText: {
      fontSize: isMobile ? 14 : 15,
      textAlign: 'center',
      lineHeight: isMobile ? 22 : 24,
      fontFamily: theme.typography.fontFamily.regular,
    },
    // Contact Section
    contactSection: {
      paddingVertical: isMobile ? 48 : 80,
      paddingHorizontal: isMobile ? 16 : 20,
    },
    contactFormContainer: {
      width: '100%',
      alignItems: 'center',
      marginTop: 20,
    },
    contactFormContainerLarge: {
      maxWidth: isLargeScreen ? 800 : 600,
      alignSelf: 'center',
    },
    contactFormCard: {
      width: '100%',
      padding: isMobile ? 20 : 32,
      borderRadius: 20,
    },
    contactInput: {
      width: '100%',
      padding: isMobile ? 14 : 16,
      borderRadius: 12,
      borderWidth: 1,
      fontSize: isMobile ? 14 : 16,
      marginBottom: isMobile ? 12 : 16,
      fontFamily: theme.typography.fontFamily.regular,
    },
    contactTextArea: {
      height: isMobile ? 120 : 150,
      paddingTop: isMobile ? 14 : 16,
    },
    contactSubmitButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: isMobile ? 14 : 16,
      paddingHorizontal: isMobile ? 24 : 32,
      borderRadius: 12,
      marginTop: 8,
      ...theme.shadows.sm,
    },
    contactSubmitText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: isMobile ? 14 : 16,
      fontFamily: theme.typography.fontFamily.bold,
    },
    // Socials Section
    socialsSection: {
      paddingVertical: isMobile ? 48 : 80,
      paddingHorizontal: isMobile ? 16 : 20,
    },
    compactSocialContainer: {
      alignItems: 'center',
      marginTop: isMobile ? 24 : 32,
    },
    compactSocialIcons: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: isMobile ? 12 : 16,
    },
    compactSocialIcon: {
      width: isMobile ? 48 : 56,
      height: isMobile ? 48 : 56,
      borderRadius: isMobile ? 24 : 28,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    contactGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: isMobile ? 16 : 24,
      marginBottom: isMobile ? 40 : 60,
      marginTop: 20,
    },
    contactGridLarge: {
      maxWidth: 1200,
      alignSelf: 'center',
    },
    contactCard: {
      width: '100%',
      maxWidth: isMobile ? 300 : 340,
      padding: isMobile ? 24 : 32,
      borderRadius: 20,
      alignItems: 'center',
      ...theme.shadows.lg,
    },
    contactIcon: {
      width: isMobile ? 64 : 80,
      height: isMobile ? 64 : 80,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isMobile ? 16 : 20,
    },
    contactCardTitle: {
      fontSize: isMobile ? 18 : 20,
      fontWeight: '700',
      marginBottom: 12,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    contactCardText: {
      fontSize: isMobile ? 14 : 15,
      textAlign: 'center',
      marginTop: 4,
      fontFamily: theme.typography.fontFamily.regular,
    },
    socialLinksContainer: {
      alignItems: 'center',
      marginTop: 20,
      paddingTop: isMobile ? 28 : 40,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    socialTitle: {
      fontSize: isMobile ? 18 : 20,
      fontWeight: '700',
      marginBottom: isMobile ? 20 : 24,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    socialIcons: {
      flexDirection: 'row',
      gap: isMobile ? 16 : 20,
    },
    socialIcon: {
      width: isMobile ? 48 : 56,
      height: isMobile ? 48 : 56,
      borderRadius: isMobile ? 24 : 28,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    // Footer - Professional Multi-Column
    footer: {
      paddingTop: isMobile ? 40 : 60,
      paddingBottom: isMobile ? 24 : 32,
      paddingHorizontal: isMobile ? 20 : isTablet ? 40 : 80,
      borderTopWidth: 1,
    },
    footerMain: {
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      gap: isMobile ? 32 : 40,
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    },
    footerBrandColumn: {
      flex: isMobile ? undefined : 1.2,
      maxWidth: isMobile ? '100%' : 280,
    },
    footerBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    footerBrandName: {
      fontSize: isMobile ? 20 : 22,
      fontWeight: '700',
      marginLeft: 10,
      color: '#fff',
      fontFamily: theme.typography.fontFamily.bold,
    },
    footerTagline: {
      fontSize: isMobile ? 13 : 14,
      color: 'rgba(255,255,255,0.7)',
      lineHeight: isMobile ? 20 : 22,
      marginBottom: 20,
      fontFamily: theme.typography.fontFamily.regular,
    },
    footerSocials: {
      flexDirection: 'row',
      gap: 12,
    },
    footerSocialIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    footerLinksContainer: {
      flex: isMobile ? undefined : 2.5,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isMobile ? 24 : 32,
    },
    footerColumn: {
      minWidth: isMobile ? '45%' : 120,
      flex: isMobile ? undefined : 1,
    },
    footerColumnTitle: {
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 16,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontFamily: theme.typography.fontFamily.bold,
    },
    footerLink: {
      fontSize: isMobile ? 13 : 14,
      color: 'rgba(255,255,255,0.7)',
      marginBottom: 12,
      fontFamily: theme.typography.fontFamily.regular,
    },
    footerDivider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.1)',
      marginVertical: isMobile ? 24 : 32,
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    },
    footerBottom: {
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'center' : 'center',
      gap: isMobile ? 12 : 0,
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    },
    copyright: {
      fontSize: isMobile ? 12 : 13,
      color: 'rgba(255,255,255,0.5)',
      fontFamily: theme.typography.fontFamily.regular,
    },
    footerLegalLinks: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: isMobile ? 4 : 8,
    },
    footerLegalLink: {
      fontSize: isMobile ? 12 : 13,
      color: 'rgba(255,255,255,0.5)',
      fontFamily: theme.typography.fontFamily.regular,
    },
    footerLegalDivider: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.3)',
      marginHorizontal: 4,
    },
    // Top Courses Section - Modern Design
    topCoursesSection: {
      paddingVertical: isMobile ? 48 : 80,
      paddingHorizontal: 0,
      alignItems: 'center',
      width: '100%',
    },
    topCoursesHeader: {
      alignItems: 'center',
      marginBottom: isMobile ? 32 : 48,
      paddingHorizontal: isMobile ? 16 : 24,
    },
    trendingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginBottom: 16,
    },
    trendingBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      fontFamily: theme.typography.fontFamily.bold,
    },
    topCoursesTitle: {
      fontSize: isMobile ? 28 : isTablet ? 36 : 42,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 12,
      fontFamily: theme.typography.fontFamily.bold,
      letterSpacing: -0.5,
    },
    topCoursesSubtitle: {
      fontSize: isMobile ? 14 : 16,
      textAlign: 'center',
      maxWidth: 500,
      fontFamily: theme.typography.fontFamily.regular,
      lineHeight: isMobile ? 22 : 26,
    },
    topCoursesScrollContent: {
      paddingHorizontal: isMobile ? 16 : 40,
      paddingVertical: 20,
      gap: isMobile ? 16 : 24,
    },
    modernCourseCard: {
      width: isMobile ? 280 : 340,
      height: isMobile ? 420 : 480,
      borderRadius: 24,
      overflow: 'hidden',
      ...theme.shadows.lg,
    },
    rankBadge: {
      position: 'absolute',
      top: 16,
      left: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      zIndex: 10,
      ...theme.shadows.md,
    },
    rankText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },
    courseImageContainer: {
      position: 'relative',
      width: '100%',
      height: isMobile ? 160 : 200,
    },
    modernCourseThumbnail: {
      width: '100%',
      height: '100%',
    },
    modernCoursePlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    courseImageOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60%',
    },
    floatingStats: {
      position: 'absolute',
      bottom: 12,
      left: 12,
      flexDirection: 'row',
      gap: 8,
    },
    floatingStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      backdropFilter: 'blur(10px)',
    },
    floatingStatText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    modernCourseContent: {
      flex: 1,
      padding: isMobile ? 16 : 20,
      justifyContent: 'space-between',
    },
    categoryTag: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      marginBottom: 12,
    },
    categoryTagText: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    modernCourseTitle: {
      fontSize: isMobile ? 17 : 19,
      fontWeight: '700',
      marginBottom: 8,
      fontFamily: theme.typography.fontFamily.bold,
      lineHeight: isMobile ? 24 : 26,
    },
    modernCourseDescription: {
      fontSize: isMobile ? 13 : 14,
      marginBottom: 16,
      lineHeight: isMobile ? 20 : 22,
      fontFamily: theme.typography.fontFamily.regular,
    },
    modernCourseMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.regular,
    },
    metaDivider: {
      width: 1,
      height: 14,
      marginHorizontal: 12,
    },
    enrollCTA: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: isMobile ? 12 : 14,
      borderRadius: 12,
      ...theme.shadows.sm,
    },
    enrollCTAText: {
      color: '#fff',
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },
    viewAllContainer: {
      marginTop: isMobile ? 32 : 48,
      paddingHorizontal: isMobile ? 16 : 24,
    },
    viewAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: isMobile ? 14 : 16,
      paddingHorizontal: isMobile ? 24 : 32,
      borderRadius: 16,
      borderWidth: 1,
      ...theme.shadows.md,
    },
    viewAllText: {
      fontSize: isMobile ? 15 : 16,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    viewAllArrow: {
      width: 32,
      height: 32,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    loadingSpinner: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 3,
      borderTopColor: 'transparent',
      marginBottom: 12,
    },
    loadingContainer: {
      paddingVertical: isMobile ? 28 : 40,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: isMobile ? 14 : 16,
      fontFamily: theme.typography.fontFamily.regular,
    },
    emptyCoursesContainer: {
      paddingVertical: isMobile ? 28 : 40,
      alignItems: 'center',
      gap: 12,
    },
    emptyCoursesText: {
      fontSize: isMobile ? 14 : 16,
      textAlign: 'center',
      fontFamily: theme.typography.fontFamily.regular,
    },
    // Sidebar Styles
    sidebarTrigger: {
      position: Platform.OS === 'web' ? 'fixed' : 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 20,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999,
      cursor: Platform.OS === 'web' ? 'pointer' : 'default',
    },
    sidebarTriggerLine: {
      width: 4,
      height: 60,
      borderRadius: 2,
      opacity: 0.6,
    },
    sidebarOverlay: {
      position: Platform.OS === 'web' ? 'fixed' : 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      zIndex: 1000,
    },
    sidebar: {
      position: Platform.OS === 'web' ? 'fixed' : 'absolute',
      top: 0,
      left: 0,
      width: 280,
      height: '100%',
      zIndex: 1001,
      ...theme.shadows.lg,
      paddingTop: Platform.OS === 'ios' ? 50 : 20,
    },
    sidebarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: isMobile ? 16 : 20,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    sidebarTitle: {
      fontSize: isMobile ? 18 : 20,
      fontWeight: '700',
      marginLeft: 12,
      flex: 1,
      fontFamily: theme.typography.fontFamily.bold,
    },
    sidebarCloseButton: {
      padding: 8,
    },
    sidebarContent: {
      flex: 1,
      paddingVertical: isMobile ? 12 : 16,
    },
    sidebarItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: isMobile ? 14 : 16,
      paddingHorizontal: isMobile ? 16 : 20,
      borderBottomWidth: 1,
      gap: 16,
    },
    sidebarItemText: {
      flex: 1,
      fontSize: isMobile ? 15 : 16,
      fontWeight: '500',
      fontFamily: theme.typography.fontFamily.medium,
    },
    sidebarFooter: {
      padding: isMobile ? 16 : 20,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    sidebarSignInButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: isMobile ? 12 : 14,
      borderRadius: 12,
    },
    sidebarSignInText: {
      color: '#ffffff',
      fontSize: isMobile ? 15 : 16,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    sidebarSignUpButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: isMobile ? 12 : 14,
      borderRadius: 12,
      borderWidth: 2,
    },
    sidebarSignUpText: {
      fontSize: isMobile ? 15 : 16,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semiBold,
    },
  });

export default LandingScreen;
