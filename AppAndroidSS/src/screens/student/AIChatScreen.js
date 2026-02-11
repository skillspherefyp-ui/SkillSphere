import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import MainLayout from '../../components/ui/MainLayout';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { aiChatAPI } from '../../services/apiClient';

const AIChatScreen = () => {
  const { theme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();

  // Chat state
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showChatSidebar, setShowChatSidebar] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const flatListRef = useRef(null);
  const recognitionRef = useRef(null);
  const isWeb = Platform.OS === 'web';

  // Responsive breakpoints
  const isPhone = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isLargeScreen = width >= 1024;

  // Fetch chat sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await aiChatAPI.getSessions();
      if (response.success) {
        setSessions(response.sessions || []);
        // If there are sessions, load the most recent one
        if (response.sessions && response.sessions.length > 0) {
          loadSession(response.sessions[0].id);
        } else {
          // Create a new session if none exist
          handleNewChat();
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      // If error, show default welcome message
      setMessages([{
        id: '1',
        content: "Hello! I'm SkillSphere AI, your personal assistant. I can help you with anything:\n\n• Answer any question on any topic\n• Help with coding and programming\n• Explain concepts in any subject\n• Assist with writing and research\n• Provide advice and guidance\n\nAsk me anything - I'm here to help!",
        sender: 'ai',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async (sessionId) => {
    try {
      const response = await aiChatAPI.getSession(sessionId);
      if (response.success && response.session) {
        setCurrentSession(response.session);
        const formattedMessages = (response.session.messages || []).map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp || msg.createdAt),
        }));
        setMessages(formattedMessages);
        setShowChatSidebar(false);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load chat session',
      });
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await aiChatAPI.createSession({ title: 'New Chat' });
      if (response.success && response.session) {
        setCurrentSession(response.session);
        const formattedMessages = (response.session.messages || []).map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp || msg.createdAt),
        }));
        setMessages(formattedMessages);
        // Add the new session to the list
        setSessions(prev => [response.session, ...prev]);
        setShowChatSidebar(false);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      // Fallback to local message
      setMessages([{
        id: '1',
        content: "Hello! I'm SkillSphere AI, your personal assistant. I can help you with anything:\n\n• Answer any question on any topic\n• Help with coding and programming\n• Explain concepts in any subject\n• Assist with writing and research\n• Provide advice and guidance\n\nAsk me anything - I'm here to help!",
        sender: 'ai',
        timestamp: new Date(),
      }]);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      const response = await aiChatAPI.deleteSession(sessionId);
      if (response.success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (currentSession?.id === sessionId) {
          // Load another session or create new
          const remaining = sessions.filter(s => s.id !== sessionId);
          if (remaining.length > 0) {
            loadSession(remaining[0].id);
          } else {
            handleNewChat();
          }
        }
        Toast.show({
          type: 'success',
          text1: 'Deleted',
          text2: 'Chat deleted successfully',
        });
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete chat',
      });
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sendingMessage) return;

    const userMessageText = inputText.trim();
    setInputText('');
    setSendingMessage(true);
    setIsTyping(true);

    // Add user message immediately for better UX
    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      content: userMessageText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      if (currentSession?.id) {
        const response = await aiChatAPI.sendMessage(currentSession.id, userMessageText);
        if (response.success) {
          // Replace temp message with real one and add AI response
          setMessages(prev => {
            const filtered = prev.filter(m => m.id !== tempUserMessage.id);
            return [
              ...filtered,
              { ...response.userMessage, timestamp: new Date(response.userMessage.timestamp || response.userMessage.createdAt) },
              { ...response.aiMessage, timestamp: new Date(response.aiMessage.timestamp || response.aiMessage.createdAt) },
            ];
          });

          // Update session in list with new title if changed
          setSessions(prev => prev.map(s =>
            s.id === currentSession.id
              ? { ...s, lastMessageAt: new Date(), title: userMessageText.substring(0, 50) + (userMessageText.length > 50 ? '...' : '') }
              : s
          ));
        }
      } else {
        // Fallback for local mode
        setTimeout(() => {
          const aiMessage = {
            id: (Date.now() + 1).toString(),
            content: "Thank you for your question! I'm here to help you learn better. This is a simulated response - in the full implementation, I would provide detailed answers based on your enrolled courses and learning materials.\n\nIs there anything specific you'd like to know more about?",
            sender: 'ai',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMessage]);
        }, 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Fallback response
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm having trouble connecting to the server. Please try again in a moment.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsTyping(false);
      setSendingMessage(false);
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  };

  // Voice recording handler
  const handleVoiceInput = () => {
    if (Platform.OS === 'web') {
      // Web Speech API
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        Toast.show({
          type: 'error',
          text1: 'Not Supported',
          text2: 'Voice input is not supported in this browser',
        });
        return;
      }

      if (isRecording) {
        // Stop recording
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        setIsRecording(false);
      } else {
        // Start recording
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputText(prev => prev + (prev ? ' ' : '') + transcript);
          setIsRecording(false);
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          if (event.error === 'not-allowed') {
            Toast.show({
              type: 'error',
              text1: 'Permission Denied',
              text2: 'Please allow microphone access',
            });
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
      }
    } else {
      // For native platforms, show a message
      Toast.show({
        type: 'info',
        text1: 'Voice Input',
        text2: 'Voice input requires native speech recognition module',
      });
    }
  };

  // Format date for sidebar
  const formatSessionDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Chat History Sidebar Content
  const renderChatSidebar = () => (
    <View style={styles.chatSidebarContent}>
      {/* Header */}
      <View style={styles.sidebarHeader}>
        <View style={styles.sidebarHeaderIcon}>
          <Icon name="chatbubbles" size={20} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sidebarTitle, { color: theme.colors.textPrimary }]}>Chat History</Text>
          <Text style={[styles.sidebarSubtitle, { color: theme.colors.textSecondary }]}>
            {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {!isLargeScreen && (
          <TouchableOpacity onPress={() => setShowChatSidebar(false)} style={styles.closeSidebar}>
            <Icon name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {/* New Chat Button */}
      <TouchableOpacity
        style={[styles.newChatButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleNewChat}
      >
        <Icon name="add" size={20} color="#fff" />
        <Text style={styles.newChatButtonText}>New Chat</Text>
      </TouchableOpacity>

      {/* Chat List */}
      <ScrollView style={styles.sessionsList} showsVerticalScrollIndicator={false}>
        {sessions.map((session) => (
          <TouchableOpacity
            key={session.id}
            style={[
              styles.sessionItem,
              currentSession?.id === session.id && styles.sessionItemActive,
              { backgroundColor: currentSession?.id === session.id ? (isDark ? 'rgba(79, 70, 229, 0.2)' : theme.colors.primary + '10') : 'transparent' }
            ]}
            onPress={() => loadSession(session.id)}
          >
            <View style={styles.sessionIcon}>
              <Icon
                name={currentSession?.id === session.id ? 'chatbubble' : 'chatbubble-outline'}
                size={18}
                color={currentSession?.id === session.id ? theme.colors.primary : theme.colors.textTertiary}
              />
            </View>
            <View style={styles.sessionInfo}>
              <Text
                style={[
                  styles.sessionTitle,
                  { color: currentSession?.id === session.id ? theme.colors.primary : theme.colors.textPrimary }
                ]}
                numberOfLines={1}
              >
                {session.title || 'New Chat'}
              </Text>
              <Text style={[styles.sessionDate, { color: theme.colors.textTertiary }]}>
                {formatSessionDate(session.lastMessageAt || session.createdAt)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteSession(session.id)}
            >
              <Icon name="trash-outline" size={16} color={theme.colors.error} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {sessions.length === 0 && (
          <View style={styles.emptySessions}>
            <Icon name="chatbubbles-outline" size={40} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
              No chat history yet
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const styles = getStyles(theme, isDark, isWeb, isPhone, isLargeScreen, width, height);

  const renderMessage = ({ item, index }) => (
    <Animated.View
      entering={FadeInDown.duration(300).delay(index * 30)}
      style={[
        styles.messageContainer,
        item.sender === 'user' ? styles.userMessage : styles.aiMessage,
      ]}
    >
      {item.sender === 'ai' && (
        <View style={[styles.aiAvatar, { backgroundColor: theme.colors.primary + '20' }]}>
          <Icon name="sparkles" size={isPhone ? 16 : 20} color={theme.colors.primary} />
        </View>
      )}
      <View
        style={[
          styles.messageContent,
          item.sender === 'user'
            ? { backgroundColor: theme.colors.primary }
            : {
                backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: theme.colors.border,
              },
        ]}
      >
        <Text
          style={[
            styles.messageText,
            { color: item.sender === 'user' ? '#ffffff' : theme.colors.textPrimary },
          ]}
        >
          {item.content || item.text}
        </Text>
        <Text
          style={[
            styles.messageTime,
            { color: item.sender === 'user' ? 'rgba(255,255,255,0.7)' : theme.colors.textTertiary },
          ]}
        >
          {item.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
        </Text>
      </View>
      {item.sender === 'user' && (
        <View style={[styles.userAvatar, { backgroundColor: theme.colors.primary }]}>
          <Icon name="person" size={isPhone ? 16 : 20} color="#ffffff" />
        </View>
      )}
    </Animated.View>
  );

  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.messageContainer, styles.aiMessage]}
      >
        <View style={[styles.aiAvatar, { backgroundColor: theme.colors.primary + '20' }]}>
          <Icon name="sparkles" size={isPhone ? 16 : 20} color={theme.colors.primary} />
        </View>
        <View
          style={[
            styles.messageContent,
            styles.typingBubble,
            {
              backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.typingDots}>
            <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
            <View style={[styles.dot, { backgroundColor: theme.colors.primary, opacity: 0.7 }]} />
            <View style={[styles.dot, { backgroundColor: theme.colors.primary, opacity: 0.4 }]} />
          </View>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <MainLayout
        showSidebar={false}
        showHeader={true}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading chats...
          </Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      showSidebar={false}
      showHeader={true}
      customSidebar={renderChatSidebar()}
      customSidebarVisible={showChatSidebar}
      onCustomSidebarToggle={setShowChatSidebar}
      customMenuIcon="chatbubbles-outline"
    >
      <View style={[styles.mainContainer, { backgroundColor: isDark ? theme.colors.background : theme.colors.background }]}>
        {/* Chat Area */}
        <View style={styles.chatArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            {/* Chat Header */}
            <View style={[styles.chatHeader, { backgroundColor: isDark ? theme.colors.card : theme.colors.surface, borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : theme.colors.backgroundSecondary }]}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-back" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <View style={[styles.chatHeaderIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                <Icon name="sparkles" size={isPhone ? 20 : 24} color={theme.colors.primary} />
              </View>
              <View style={styles.chatHeaderText}>
                <Text style={[styles.chatHeaderTitle, { color: theme.colors.textPrimary }]}>
                  {currentSession?.title || 'AI Learning Assistant'}
                </Text>
                <Text style={[styles.chatHeaderSubtitle, { color: theme.colors.textSecondary }]}>
                  Ask me anything about your courses
                </Text>
              </View>
              <View style={[styles.onlineIndicator, { backgroundColor: theme.colors.success }]} />
            </View>

            {/* Chat Messages */}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={renderTypingIndicator}
            />

            {/* Input Area */}
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: isDark ? theme.colors.card : theme.colors.surface, borderTopColor: theme.colors.border },
              ]}
            >
              {/* Voice Button */}
              <TouchableOpacity
                style={[
                  styles.voiceButton,
                  {
                    backgroundColor: isRecording
                      ? theme.colors.error
                      : isDark ? 'rgba(255,255,255,0.1)' : theme.colors.backgroundSecondary,
                  },
                ]}
                onPress={handleVoiceInput}
              >
                <Icon
                  name={isRecording ? 'stop' : 'mic'}
                  size={isPhone ? 20 : 22}
                  color={isRecording ? '#ffffff' : theme.colors.primary}
                />
              </TouchableOpacity>

              <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : theme.colors.backgroundSecondary }]}>
                <TextInput
                  style={[styles.input, { color: theme.colors.textPrimary }]}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={isRecording ? "Listening..." : "Ask me anything..."}
                  placeholderTextColor={isRecording ? theme.colors.error : theme.colors.textTertiary}
                  multiline
                  maxLength={1000}
                  onSubmitEditing={handleSend}
                  editable={!isRecording}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: inputText.trim() && !sendingMessage
                      ? theme.colors.primary
                      : theme.colors.textTertiary,
                    opacity: inputText.trim() && !sendingMessage ? 1 : 0.5,
                  },
                ]}
                onPress={handleSend}
                disabled={!inputText.trim() || sendingMessage || isRecording}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Icon name="send" size={isPhone ? 18 : 20} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </MainLayout>
  );
};

const getStyles = (theme, isDark, isWeb, isPhone, isLargeScreen, width, height) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
    },
    mainContainer: {
      flex: 1,
    },

    // Chat Sidebar
    chatSidebarContent: {
      flex: 1,
      paddingTop: 8,
    },
    sidebarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    sidebarHeaderIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(79, 70, 229, 0.2)' : theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sidebarTitle: {
      fontSize: 14,
      fontWeight: '600',
    },
    sidebarSubtitle: {
      fontSize: 12,
    },
    closeSidebar: {
      padding: 4,
    },
    newChatButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 16,
      paddingVertical: 12,
      borderRadius: 12,
    },
    newChatButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    sessionsList: {
      flex: 1,
      paddingHorizontal: 8,
    },
    sessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      marginHorizontal: 8,
      marginBottom: 4,
      borderRadius: 10,
      gap: 10,
    },
    sessionItemActive: {
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    sessionIcon: {
      width: 28,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sessionInfo: {
      flex: 1,
    },
    sessionTitle: {
      fontSize: 13,
      fontWeight: '500',
      marginBottom: 2,
    },
    sessionDate: {
      fontSize: 11,
    },
    deleteButton: {
      padding: 6,
    },
    emptySessions: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      marginTop: 12,
      fontSize: 13,
    },

    // Chat Area
    chatArea: {
      flex: 1,
    },
    keyboardView: {
      flex: 1,
    },
    chatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: isPhone ? 12 : 16,
      borderBottomWidth: 1,
      gap: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chatHeaderIcon: {
      width: isPhone ? 40 : 48,
      height: isPhone ? 40 : 48,
      borderRadius: isPhone ? 20 : 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chatHeaderText: {
      flex: 1,
    },
    chatHeaderTitle: {
      fontSize: isPhone ? 14 : 16,
      fontWeight: '600',
    },
    chatHeaderSubtitle: {
      fontSize: isPhone ? 11 : 13,
      marginTop: 2,
    },
    onlineIndicator: {
      width: isPhone ? 8 : 10,
      height: isPhone ? 8 : 10,
      borderRadius: isPhone ? 4 : 5,
    },
    messagesList: {
      padding: isPhone ? 12 : 20,
      paddingBottom: 8,
    },
    messageContainer: {
      flexDirection: 'row',
      marginBottom: isPhone ? 12 : 16,
      alignItems: 'flex-end',
    },
    userMessage: {
      justifyContent: 'flex-end',
    },
    aiMessage: {
      justifyContent: 'flex-start',
    },
    aiAvatar: {
      width: isPhone ? 28 : 36,
      height: isPhone ? 28 : 36,
      borderRadius: isPhone ? 14 : 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: isPhone ? 8 : 12,
    },
    userAvatar: {
      width: isPhone ? 28 : 36,
      height: isPhone ? 28 : 36,
      borderRadius: isPhone ? 14 : 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: isPhone ? 8 : 12,
    },
    messageContent: {
      maxWidth: '75%',
      borderRadius: isPhone ? 16 : 20,
      padding: isPhone ? 12 : 16,
    },
    messageText: {
      fontSize: isPhone ? 14 : 15,
      lineHeight: isPhone ? 20 : 24,
    },
    messageTime: {
      fontSize: isPhone ? 10 : 11,
      marginTop: 6,
      textAlign: 'right',
    },
    typingBubble: {
      paddingVertical: isPhone ? 14 : 18,
      paddingHorizontal: isPhone ? 18 : 24,
    },
    typingDots: {
      flexDirection: 'row',
      gap: isPhone ? 5 : 6,
    },
    dot: {
      width: isPhone ? 7 : 8,
      height: isPhone ? 7 : 8,
      borderRadius: isPhone ? 3.5 : 4,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: isPhone ? 12 : 16,
      borderTopWidth: 1,
      gap: isPhone ? 8 : 10,
    },
    voiceButton: {
      width: isPhone ? 44 : 48,
      height: isPhone ? 44 : 48,
      borderRadius: isPhone ? 22 : 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inputWrapper: {
      flex: 1,
      borderRadius: isPhone ? 22 : 26,
      paddingHorizontal: isPhone ? 14 : 18,
      paddingVertical: Platform.OS === 'ios' ? (isPhone ? 12 : 14) : (isPhone ? 8 : 10),
      maxHeight: isPhone ? 100 : 140,
    },
    input: {
      fontSize: isPhone ? 15 : 16,
      lineHeight: isPhone ? 20 : 24,
      maxHeight: isPhone ? 80 : 120,
    },
    sendButton: {
      width: isPhone ? 44 : 52,
      height: isPhone ? 44 : 52,
      borderRadius: isPhone ? 22 : 26,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default AIChatScreen;
