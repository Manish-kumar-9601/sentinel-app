import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Keyboard, SafeAreaView
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import i18n from '../../lib/i18n';
import { useTranslation } from 'react-i18next';

// --- Configuration ---
const FAKE_CALLER_NAME_KEY = 'fake_caller_name';
const FAKE_CALLER_NUMBER_KEY = 'fake_caller_number';
const FAKE_CALL_RINGTONE_KEY = 'fake_call_ringtone_uri';

// --- Reusable UI Component for a settings link ---
const SettingsRow = ({ icon, label, description, onPress, href }) => {
  const content = (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: '#E8E8E8' }]}>
        <Feather name={icon} size={20} color="#333" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description} numberOfLines={1}>{description}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={22} color="#C7C7CC" />
    </TouchableOpacity>
  );

  return href ? <Link href={href} asChild>{content}</Link> : content;
};

export default function SettingsScreen() {
  const router = useRouter();
  const [fakeCallerName, setFakeCallerName] = useState('');
  const [fakeCallerNumber, setFakeCallerNumber] = useState('');
  const [ringtoneName, setRingtoneName] = useState('Default');
  const [theme, setTheme] = useState('Light'); // Placeholder state
  const [language, setLanguage] = useState(i18n.locale);
const {t} =useTranslation()
  // --- Load saved settings ---
  useEffect(() => {
    const loadSettings = async () => {
      const storedName = await AsyncStorage.getItem(FAKE_CALLER_NAME_KEY);
      if (storedName) setFakeCallerName(storedName);

      const storedNumber = await AsyncStorage.getItem(FAKE_CALLER_NUMBER_KEY);
      if (storedNumber) setFakeCallerNumber(storedNumber);

      const storedRingtoneUri = await AsyncStorage.getItem(FAKE_CALL_RINGTONE_KEY);
      if (storedRingtoneUri) {
        const fileInfo = await FileSystem.getInfoAsync(storedRingtoneUri);
        if (fileInfo.exists) {
          const originalName = storedRingtoneUri.split('/').pop().replace(/%20/g, ' ').replace('custom_ringtone_', '');
          setRingtoneName(originalName);
        }
      }
      // In a real app, you would also load saved theme and language here
    };
    loadSettings();
  }, []);

  // --- Handlers ---
  const handleSaveSettings = async () => {
    try {
      await AsyncStorage.setItem(FAKE_CALLER_NAME_KEY, fakeCallerName.trim());
      await AsyncStorage.setItem(FAKE_CALLER_NUMBER_KEY, fakeCallerNumber.trim());
      Alert.alert('Saved!', 'Fake call settings have been updated.');
      Keyboard.dismiss();
    } catch (error) {
      console.error('Failed to save settings.', error);
      Alert.alert('Error', 'Could not save your settings.');
    }
  };

  const handleSetRingtone = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const permanentUri = `${FileSystem.documentDirectory}custom_ringtone_${safeName}`;
            await FileSystem.copyAsync({ from: asset.uri, to: permanentUri });
            await AsyncStorage.setItem(FAKE_CALL_RINGTONE_KEY, permanentUri);
            setRingtoneName(asset.name);
            Alert.alert('Ringtone Set!', `Your fake call will now use "${asset.name}".`);
        }
    } catch (error) {
        console.error('Error picking ringtone:', error);
        Alert.alert('Error', 'Could not set the ringtone.');
    }
  };

  const handleSignOut = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: () => router.replace('/(auth)/login') }
    ]);
  };
  
  const getLanguageName = (code) => {
    switch (code) {
      case 'hi': return 'हिंदी';
      case 'gu': return 'ગુજરાતી';
      case 'mr': return 'मराठी';
      case 'kn': return 'ಕನ್ನಡ';
      case 'raj': return 'राजस्थानी';
      default: return 'English';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* --- My Circle Section --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Circle</Text>
          <View style={styles.card}>
            <SettingsRow
              href="settings/myCircle"
              icon="users"
              label="Manage Emergency Contacts"
              description="Add or remove trusted contacts"
            />
          </View>
        </View>

        {/* --- Fake Call Section --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fake Call</Text>
          <View style={styles.card}>
            <View style={styles.inputRow}>
              <Feather name="user" size={20} color="#999" />
              <TextInput
                placeholder="Caller Name (e.g., Mom)"
                style={styles.input}
                value={fakeCallerName}
                onChangeText={setFakeCallerName}
              />
            </View>
            <View style={styles.inputRow}>
              <Feather name="phone" size={20} color="#999" />
              <TextInput
                placeholder="Caller Number"
                style={styles.input}
                value={fakeCallerNumber}
                onChangeText={setFakeCallerNumber}
                keyboardType="phone-pad"
              />
            </View>
            <SettingsRow
              onPress={handleSetRingtone}
              icon="music"
              label="Ringtone"
              description={ringtoneName}
            />
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
            <Text style={styles.saveButtonText}>Save Fake Call Settings</Text>
          </TouchableOpacity>
        </View>
        
        {/* --- App Settings Section --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.card}>
             <SettingsRow
                onPress={() => Alert.alert("Theme", "Theme selection will be available soon!")}
                icon="sun"
                label="Theme"
                description={theme}
            />
             <SettingsRow
                href="settings/language"
                icon="globe"
                label="Language"
                description={getLanguageName(language)}
            />
          </View>
        </View>

        {/* --- Sign Out Button --- */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D6D72',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EFEFF4',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    color: '#000',
  },
  description: {
    fontSize: 13,
    color: '#6e6e73',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EFEFF4',
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 16,
    padding: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});
