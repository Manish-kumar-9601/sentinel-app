import React from 'react';
import {
 
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../lib/i18n';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StringKeyframeTrack } from 'three/src/Three.Core.js';

// --- Helper function to get the correct emergency number ---
const getEmergencyNumber = (categoryId) => {
  switch (categoryId.toLowerCase()) {
    case 'medical':
    case 'accident':
      return { number: '108', label: 'Call Ambulance' };
    case 'fire':
      return { number: '101', label: 'Call Fire Brigade' };
    case 'violence':
      return { number: '100', label: 'Call Police' };
    case 'natural disaster':
      return { number: '1077', label: 'Call Disaster Mgmt' };
    case 'rescue':
      return { number: '112', label: 'Call Emergency Services' };
    default:
      return { number: '112', label: 'Call Emergency' };
  }
};

const EmergencyGuideScreen = () => {

  const { categoryId, categoryName } = useLocalSearchParams();
console.log(categoryId,categoryName)
  // Get all emergency guides for the current language from the i18n instance
  const allGuides = i18n.t('emergencies', { returnObjects: true });
  allGuides.map(i=>(
    console.log(i)
  ))
  // Find the correct guide by the category ID
  const content = allGuides.find((e) => e.category.toLowerCase() === categoryId.toLowerCase() );
console.log('content',content)
  const { number: emergencyNumber, label: callButtonLabel } = getEmergencyNumber(categoryId);

  const handleCall = (number) => {
    const phoneUrl = `tel:${number}`;
    Linking.canOpenURL(phoneUrl)
      .then(supported => {
        if (!supported) {
          Alert.alert('Phone number is not available');
        } else {
          return Linking.openURL(phoneUrl);
        }
      })
      .catch(err => console.error('An error occurred', err));
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
      
      <ScrollView >
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{content.title}</Text>
            <TouchableOpacity style={styles.needHelpButton}>
              <Text style={styles.needHelpText}>need help ?</Text>
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
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Need Medicine Instructions ?</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={() => handleCall(emergencyNumber)}>
          <Ionicons name="call" size={24} color="white" />
          <Text style={styles.primaryButtonText}>{callButtonLabel} ({emergencyNumber})</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1,  paddingTop: 0, backgroundColor: 'white' ,padding:0,margin:0},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,
    marginBottom: 0,
  },
 
  content: {
    paddingHorizontal: 20,
  },
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
  },
  needHelpButton: {
    backgroundColor: '#333',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  needHelpText: {
    color: 'white',
    fontWeight: 'bold',
  },
  summary: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  stepContainer: {
    marginBottom: 10,
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
    paddingBlockEnd: 20,
    paddingHorizontal: 20,
    borderTopWidth: 0,
    borderTopColor: '#f0f0f0',
  },
  secondaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
});

export default EmergencyGuideScreen;
