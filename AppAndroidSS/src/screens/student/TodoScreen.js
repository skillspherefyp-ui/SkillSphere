import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AppHeader from '../../components/ui/AppHeader';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';
import EmptyState from '../../components/ui/EmptyState';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';

const TodoScreen = () => {
  const { todos, addTodo } = useData();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [newTodo, setNewTodo] = useState('');
  
  const isWeb = Platform.OS === 'web';
  const maxWidth = isWeb && width > 1200 ? 1200 : '100%';

  const handleAddTodo = () => {
    if (!newTodo.trim()) return;
    addTodo({ text: newTodo, type: 'lesson' });
    setNewTodo('');
  };

  const renderTodo = ({ item, index }) => (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 50)}>
      <AppCard style={styles.todoCard}>
        <TouchableOpacity
          style={[
            styles.checkbox, 
            { 
              borderColor: theme.colors.border,
              backgroundColor: item.completed ? theme.colors.success : 'transparent'
            }
          ]}
          onPress={() => {
            // Toggle completion
          }}
        >
          {item.completed && <Icon name="checkmark" size={20} color="#ffffff" />}
        </TouchableOpacity>
        <View style={styles.todoContent}>
          <Text style={[
            styles.todoText, 
            { 
              color: item.completed ? theme.colors.textTertiary : theme.colors.textPrimary 
            },
            item.completed && styles.todoTextCompleted
          ]}>
            {item.text}
          </Text>
          <Text style={[styles.todoType, { color: theme.colors.textTertiary }]}>{item.type}</Text>
        </View>
        <TouchableOpacity style={styles.deleteButton}>
          <Icon name="trash" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </AppCard>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="To-Do List" />

      <View style={[styles.content, { maxWidth, alignSelf: 'center', width: '100%' }]}>
        <AppCard style={styles.addSection}>
          <AppInput
            label="New Reminder"
            value={newTodo}
            onChangeText={setNewTodo}
            placeholder="Enter reminder text"
          />
          <AppButton
            title="Add Reminder"
            onPress={handleAddTodo}
            variant="primary"
            fullWidth
            style={styles.addButton}
          />
        </AppCard>

        <FlatList
          data={todos}
          renderItem={renderTodo}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-circle-outline"
              title="No reminders yet"
              subtitle="Add your first reminder to get started"
            />
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  addSection: {
    marginBottom: 16,
  },
  addButton: {
    marginTop: 10,
  },
  listContent: {
    paddingBottom: 16,
  },
  todoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  todoContent: {
    flex: 1,
  },
  todoText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
  },
  todoType: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
});

export default TodoScreen;

