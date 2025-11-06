import { Feather, Ionicons } from '@expo/vector-icons';
import Clipboard from '@react-native-clipboard/clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,

  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import i18n from '../../lib/i18n';
SafeAreaView
// --- Reusable Chat Bubble Component ---
const ChatBubble = ({ message, isUser }) => {
  const { colors } = useThemedStyles();
  return (
    <View style={[styles.bubble, isUser ? [styles.userBubble, { backgroundColor: colors.primary }] : [styles.aiBubble, { backgroundColor: colors.backgroundSecondary }]]}>
      <Text style={[isUser ? [styles.userBubbleText, { color: colors.textInverse }] : [styles.aiBubbleText, { color: colors.text }]]}>{message}</Text>
    </View>
  );
};

// --- AI Help Modal Component ---
const AiHelpModal = ({ visible, onClose, guideContent }) => {
  const { colors } = useThemedStyles();
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
    <>

      <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>AI Emergency Assistant</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={30} color={colors.textSecondary} />
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
          {isLoading && <ActivityIndicator style={{ marginVertical: 10 }} size="large" color={colors.primary} />}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundSecondary }]}
                placeholder="Ask for guidance..."
                placeholderTextColor={colors.textTertiary}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend} // Allows sending with the return key
              />
              <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.info }]} onPress={handleSend} disabled={isLoading}>
                <Ionicons name="send" size={24} color={colors.textInverse} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
};


const EmergencyGuideScreen = () => {
  const { colors } = useThemedStyles();
  const { categoryId = 'medical' }: { categoryId: string } = useLocalSearchParams(); // Default to 'medical' for demonstration
  const [isAiModalVisible, setAiModalVisible] = useState(false);

  const allGuides = i18n.t('emergencies', { returnObjects: true });
  const content = allGuides.find((e) => e.category.toLowerCase() === categoryId.toLowerCase());

  const getEmergencyNumber = (catId: String) => {
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
      // Check if the device can handle phone calls
      const canCall = await Linking.canOpenURL(phoneUrl);

      if (canCall) {
        // Device supports phone calls, attempt to make the call
        await Linking.openURL(phoneUrl);
      } else {
        // Device doesn't support phone calls (like simulator/tablet)
        showManualDialAlert(number);
      }
    } catch (error) {
      console.error('Phone call error:', error);
      // Fallback to manual dial alert
      showManualDialAlert(number);
    }
  };

  // Helper function to show manual dial alert with clipboard support
  const showManualDialAlert = (number) => {
    Alert.alert(
      'Manual Dialing Required',
      `Your device doesn't support direct calling. Please manually dial: ${number}`,
      [
        {
          text: 'Copy Number',
          onPress: async () => {
            try {
              await Clipboard.setString(number);
              Alert.alert('Copied!', 'Emergency number copied to clipboard');
            } catch (error) {
              console.error('Failed to copy to clipboard:', error);
              Alert.alert('Emergency Number', number);
            }
          }
        },
        {
          text: 'OK',
          style: 'default'
        }
      ],
      { cancelable: true }
    );
  };

  if (!content) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Error', headerShown: true }} />
        <View style={styles.content}>
          <Text style={{ color: colors.text }}>Instructions not found for this category.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>

          <TouchableOpacity style={styles.headerPressable} onPress={() => { router.back() }}>
            <Ionicons name="chevron-back" size={28} color={colors.navigatorColor} />

            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }} >{categoryId.charAt(0).toUpperCase() + categoryId.slice(1)}</Text>

          </TouchableOpacity>

          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 0
          }}  >

            <TouchableOpacity style={[styles.aiHelpButton, { backgroundColor: colors.primary }]} onPress={() => setAiModalVisible(true)}>
              <Ionicons name="sparkles" size={16} color={colors.textInverse} />
              <Text style={[styles.aiHelpButtonText, { color: colors.textInverse }]}>AI Help</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView>
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]}>{content.title}</Text>

            </View>
            {content.summary && <Text style={[styles.summary, { color: colors.textSecondary }]}>{content.summary}</Text>}

            {content.instructions.map((item) => (
              <View key={item.step} style={styles.stepContainer}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>Step {item.step}: {item.title}</Text>
                {item.details.map((detail, index) => (
                  <Text key={index} style={[styles.stepDetail, { color: colors.text }]}>• {detail}</Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.info }]} onPress={() => handleCall(emergencyNumber)}>
            <Ionicons name="call" size={24} color={colors.textInverse} />
            <Text style={[styles.primaryButtonText, { color: colors.textInverse }]}>{callButtonLabel} ({emergencyNumber})</Text>
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
    </>

  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  headerPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 24,
  },
  aiHelpButtonText: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  summary: {
    fontSize: 16,
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
    lineHeight: 24,
    marginLeft: 10,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
  },
  secondaryButton: {
    flexDirection: 'row',
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // --- AI Modal Styles ---
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
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
    alignSelf: 'flex-end',
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  userBubbleText: { fontSize: 16 },
  aiBubbleText: { fontSize: 16 },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EmergencyGuideScreen;
