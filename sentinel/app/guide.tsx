import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../lib/i18n';  
// --- Reusable Chat Bubble Component ---
const ChatBubble = ({ message, isUser }) => (
  <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
    <Text style={isUser ? styles.userBubbleText : styles.aiBubbleText}>{message}</Text>
  </View>
);

// --- AI Help Modal Component ---
const AiHelpModal = ({ visible, onClose, guideContent }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);

  // Construct the system prompt from the guide content
  const systemPrompt = `You are a medical help and guidance assistant for the Sentinel app. Your goal is to provide calm, clear, and concise responses to user questions related to health and medical concerns. You may suggest safe, commonly used over-the-counter (OTC) medicines for minor issues (e.g., paracetamol for headache, oral rehydration salts for dehydration, antiseptic cream for minor burns). Always remind the user to follow packaging instructions or their doctor’s advice for dosage.

Never provide strong prescription drugs or complex treatments. If the user describes a serious, worsening, or unclear condition, guide them to immediately consult a qualified healthcare professional or call local emergency numbers. Your role is to support, not replace, medical professionals. 

  **Emergency Guide: ${guideContent.title}**
  **Summary:** ${guideContent.summary || 'N/A'}
  **Instructions:**
  ${guideContent.instructions.map(step => `Step ${step.step}: ${step.title} - ${step.details.join(' ')}`).join('\n')}
  `;
  
  // Add an initial message from the AI when the modal opens
  useEffect(() => {
    if (visible) {
      setMessages([
        { role: 'model', text: `Hello! I'm your AI assistant. How can I help you with this ${guideContent.category} emergency based on the guide?` }
      ]);
      setInput(''); // Clear input field
    }
  }, [visible, guideContent]);


  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const newUserMessage = { role: 'user', text: input };
    // Add the new user message to the state immediately for a responsive UI
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // For Expo, environment variables must be prefixed with EXPO_PUBLIC_
      // Ensure you have this set in your .env file
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      
      // --- FIX 1: Use the correct, latest model name ---
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
      
      // --- FIX 2: Send the entire conversation history in the payload ---
      const payload = {
        // Map messages to the format required by the API
        contents: updatedMessages.map(msg => ({
          // The API expects "user" and "model" roles
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        })),
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
  const result = await response.json();

// Safely access the AI response text
let aiText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

// Remove all ** from the text
aiText = aiText.replace(/\*\*/g, "");
      if (aiText) {
        const aiMessage = { role: 'model', text: aiText };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // Log the actual error response from the API for better debugging
        console.error("AI API Error Response:", JSON.stringify(result, null, 2));
        throw new Error("Invalid response structure from AI.");
      }

    } catch (error) {
      console.error("AI Help Error:", error);
      const errorMessage = { role: 'model', text: "Sorry, I'm having trouble connecting. Please rely on the guide and call emergency services if needed." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>AI Emergency Assistant</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close-circle" size={30} color="#ccc" />
          </TouchableOpacity>
        </View>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <ChatBubble message={item.text} isUser={item.role === 'user'} />}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.chatContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        {isLoading && <ActivityIndicator style={{ marginVertical: 10 }} size="large" />}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask for guidance..."
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend} // Allows sending with the return key
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={isLoading}>
              <Ionicons name="send" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};


const EmergencyGuideScreen = () => {
  const { categoryId = 'medical' } = useLocalSearchParams(); // Default to 'medical' for demonstration
  const [isAiModalVisible, setAiModalVisible] = useState(false);

  const allGuides = i18n.t('emergencies', { returnObjects: true });
  const content = allGuides.find((e) => e.category.toLowerCase() === categoryId.toLowerCase());

  const getEmergencyNumber = (catId) => {
    switch (catId.toLowerCase()) {
      case 'medical':
      case 'accident':
        return { number: '108', label: 'Call Ambulance' };
      case 'fire':
        return { number: '101', label: 'Call Fire Brigade' };
      case 'violence':
        return { number: '100', label: 'Call Police' };
      default:
        return { number: '112', label: 'Call Emergency' };
    }
  };

  const { number: emergencyNumber, label: callButtonLabel } = getEmergencyNumber(categoryId);

  const handleCall = async (number) => {
    const phoneUrl = `tel:${number}`;
    try {
      const supported = await Linking.canOpenURL(phoneUrl);
      if (supported) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Phone number is not available');
      }
    } catch (error) {
      Alert.alert('Failed to call', 'An error occurred while trying to make the phone call.');
      console.error('An error occurred', error);
    }
  };

  if (!content) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Error', headerShown: true }} />
        <View style={styles.content}>
          <Text>Instructions not found for this category.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{content.title}</Text>
            <TouchableOpacity style={styles.aiHelpButton} onPress={() => setAiModalVisible(true)}>
              <Ionicons name="sparkles" size={16} color="white" />
              <Text style={styles.aiHelpButtonText}>AI Help</Text>
            </TouchableOpacity>
          </View>
          {content.summary && <Text style={styles.summary}>{content.summary}</Text>}

          {content.instructions.map((item) => (
            <View key={item.step} style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Step {item.step}: {item.title}</Text>
              {item.details.map((detail, index) => (
                <Text key={index} style={styles.stepDetail}>• {detail}</Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
       
        <TouchableOpacity style={styles.primaryButton} onPress={() => handleCall(emergencyNumber)}>
          <Ionicons name="call" size={24} color="white" />
          <Text style={styles.primaryButtonText}>{callButtonLabel} ({emergencyNumber})</Text>
        </TouchableOpacity>
      </View>
      
      {content && (
        <AiHelpModal
          visible={isAiModalVisible}
          onClose={() => setAiModalVisible(false)}
          guideContent={content}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white',paddingTop:20 },
  content: { padding: 20 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  aiHelpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5856D6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  aiHelpButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  summary: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepDetail: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginLeft: 10,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: 'white'
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#FF3B30',
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // --- AI Modal Styles ---
  modalContainer: { flex: 1, backgroundColor: 'white' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  chatContainer: {
    padding: 10,
    flexGrow: 1,
  },
  bubble: {
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
  },
  userBubbleText: { color: 'white', fontSize: 16 },
  aiBubbleText: { color: 'black', fontSize: 16 },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
    backgroundColor: 'white'
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EmergencyGuideScreen;
