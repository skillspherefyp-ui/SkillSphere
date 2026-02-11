import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Platform, useWindowDimensions, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AppCard from '../../components/ui/AppCard';
import AppButton from '../../components/ui/AppButton';
import EmptyState from '../../components/ui/EmptyState';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { categoryAPI, courseAPI } from '../../services/apiClient';
import ThemeToggle from '../../components/ThemeToggle';
import BrandLogo from '../../components/BrandLogo';
import { resolveFileUrl } from '../../utils/urlHelpers';

const ExploreCoursesScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  const isWeb = Platform.OS === 'web';
  const maxWidth = isWeb && width > 1200 ? 1200 : '100%';
  const isLargeScreen = width > 768;

  // Gradient colors matching landing page
  const gradientColors = theme.mode === 'dark'
    ? [theme.colors.background, theme.colors.backgroundSecondary, theme.colors.surface]
    : [theme.colors.gradientStart, theme.colors.gradientMid, theme.colors.gradientEnd];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch categories and courses without authentication
      const [categoriesRes, coursesRes] = await Promise.all([
        categoryAPI.getAll(),
        courseAPI.getAll()
      ]);

      if (categoriesRes.success) {
        setCategories(categoriesRes.categories || []);
      }
      if (coursesRes.success) {
        // Only show published courses
        setCourses((coursesRes.courses || []).filter(c => c.status === 'published'));
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = selectedCategory === 'all'
    ? courses
    : courses.filter(c => c.categoryId === selectedCategory);

  const handleEnroll = (course) => {
    // Redirect to signup page with a message
    navigation.navigate('Register', {
      message: `Sign up to enroll in ${course.name}`,
      redirectCourse: course.id
    });
  };

  const handleSeeDetails = (course) => {
    navigation.navigate('ExploreCourseDetail', { course });
  };

  const renderCourseCard = ({ item, index }) => (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 50)} style={styles.courseCardWrapper}>
      <AppCard style={styles.courseCard}>
        {item.thumbnailImage ? (
          <Image
            source={{ uri: resolveFileUrl(item.thumbnailImage) }}
            style={styles.courseThumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.courseThumbnailPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
            <Icon name="book" size={48} color={theme.colors.primary} />
          </View>
        )}
        <View style={styles.courseContent}>
          <Text style={[styles.courseTitle, { color: theme.colors.textPrimary }]}>{item.name}</Text>
          <Text style={[styles.courseDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.courseMetaRow}>
            <View style={styles.courseMeta}>
              <Icon name="time-outline" size={16} color={theme.colors.textTertiary} />
              <Text style={[styles.courseMetaText, { color: theme.colors.textTertiary }]}>
                {item.duration || 'Self-paced'}
              </Text>
            </View>
            <View style={styles.courseMeta}>
              <Icon name="bar-chart-outline" size={16} color={theme.colors.textTertiary} />
              <Text style={[styles.courseMetaText, { color: theme.colors.textTertiary }]}>
                {item.level || 'All levels'}
              </Text>
            </View>
            <View style={styles.courseMeta}>
              <Icon name="language-outline" size={16} color={theme.colors.textTertiary} />
              <Text style={[styles.courseMetaText, { color: theme.colors.textTertiary }]}>
                {item.language || 'English'}
              </Text>
            </View>
          </View>
          <View style={styles.buttonRow}>
            <AppButton
              title="See Details"
              onPress={() => handleSeeDetails(item)}
              variant="outline"
              style={styles.detailsButton}
              icon={<Icon name="eye-outline" size={16} color={theme.colors.primary} />}
              iconPosition="left"
            />
            <AppButton
              title="Sign Up to Enroll"
              onPress={() => handleEnroll(item)}
              variant="primary"
              style={styles.enrollButton}
              icon={<Icon name="person-add" size={16} color="#ffffff" />}
              iconPosition="left"
            />
          </View>
        </View>
      </AppCard>
    </Animated.View>
  );

  const NavbarContent = () => (
    <View style={styles.navbarContent}>
      <View style={styles.navbarLeft}>
        <BrandLogo size={40} />
        <Text style={styles.navbarTitle}>SkillSphere</Text>
      </View>
      <View style={styles.navbarRight}>
        <ThemeToggle />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={20} color="#ffffff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Custom Header/Navbar with Gradient */}
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { maxWidth, alignSelf: 'center', width: '100%' }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.headerSection}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Explore Our Courses
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Browse our collection of courses. Sign up to start learning!
          </Text>
        </Animated.View>

        {/* Category Filter */}
        <View style={styles.categorySection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <TouchableOpacity
              style={[
                styles.categoryChip,
                { backgroundColor: selectedCategory === 'all' ? theme.colors.primary : theme.colors.card },
                { borderColor: theme.colors.border }
              ]}
              onPress={() => setSelectedCategory('all')}
            >
              <Text style={[
                styles.categoryChipText,
                { color: selectedCategory === 'all' ? '#ffffff' : theme.colors.textPrimary }
              ]}>
                All Courses ({courses.length})
              </Text>
            </TouchableOpacity>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  { backgroundColor: selectedCategory === category.id ? theme.colors.primary : theme.colors.card },
                  { borderColor: theme.colors.border }
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text style={[
                  styles.categoryChipText,
                  { color: selectedCategory === category.id ? '#ffffff' : theme.colors.textPrimary }
                ]}>
                  {category.name} ({courses.filter(c => c.categoryId === category.id).length})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Courses Grid */}
        <View style={styles.coursesSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            {selectedCategory === 'all' ? 'All Courses' : categories.find(c => c.id === selectedCategory)?.name}
          </Text>
          {loading ? (
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading courses...</Text>
          ) : filteredCourses.length === 0 ? (
            <EmptyState
              icon="school-outline"
              title="No courses available"
              subtitle="Check back later for new courses!"
            />
          ) : (
            <FlatList
              data={filteredCourses}
              renderItem={renderCourseCard}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.coursesGrid}
              scrollEnabled={false}
              numColumns={isLargeScreen ? 2 : 1}
              key={isLargeScreen ? 'large' : 'small'}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navbar: {
    paddingHorizontal: 20,
    paddingVertical: 20,
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
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  navbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navbarTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  navbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  headerSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 600,
  },
  categorySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  coursesSection: {
    marginBottom: 24,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  coursesGrid: {
    paddingBottom: 20,
  },
  courseCardWrapper: {
    flex: 1,
    margin: 8,
    maxWidth: '100%',
  },
  courseCard: {
    padding: 0,
    overflow: 'hidden',
  },
  courseThumbnail: {
    width: '100%',
    height: 180,
  },
  courseThumbnailPlaceholder: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseContent: {
    padding: 16,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  courseDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  courseMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseMetaText: {
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  detailsButton: {
    flex: 1,
  },
  enrollButton: {
    flex: 1,
  },
});

export default ExploreCoursesScreen;
