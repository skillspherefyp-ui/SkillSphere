import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions } from 'react-native';
import AppHeader from '../../components/ui/AppHeader';
import AppCard from '../../components/ui/AppCard';
import Icon from 'react-native-vector-icons/Ionicons';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const CategoriesScreen = () => {
  const { categories } = useData();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const getStyles = (theme) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listContent: {
      padding: 16,
    },
    categoryCard: {
      marginBottom: 16,
      backgroundColor: theme.colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    categoryIcon: {
      width: 50,
      height: 50,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    categoryName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
  });

  const styles = getStyles(theme);

  const renderCategory = ({ item, index }) => (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 50)}>
      <TouchableOpacity onPress={() => navigation.navigate('Courses', { category: item.name })}>
        <AppCard style={styles.categoryCard}>
          <View style={styles.categoryInfo}>
            <View style={[styles.categoryIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Icon name="grid" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.categoryName}>{item.name}</Text>
          </View>
          <Icon name="chevron-forward" size={24} color={theme.colors.textTertiary} />
        </AppCard>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Browse Categories" showBack={true} />
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default CategoriesScreen;