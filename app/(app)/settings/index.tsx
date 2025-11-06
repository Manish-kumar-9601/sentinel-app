import { Feather, Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_Storing } from '../../../components/APIStore';
// --- Configuration ---
const FAKE_CALLER_NAME_KEY = 'fake_caller_name';
const FAKE_CALLER_NUMBER_KEY = 'fake_caller_number';
const FAKE_CALL_RINGTONE_KEY = 'fake_call_ringtone_uri';
// --- Reusable UI Component for a settings link ---
const SettingsRow = ({ icon, label, description, onPress, href }: { icon: ComponentProps<typeof Feather>['name']; label: string; description?: string; onPress?: () => void; href?: string }) => {
  const { colors } = useTheme();
  const content = (
    <TouchableOpacity style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth, backgroundColor: colors.card, borderBottomColor: colors.border
    }} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <Feather name={icon} size={20} color={colors.text} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {description && <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>{description}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  return href ? <Link href={href} asChild>{content}</Link> : content;
};

export default function SettingsScreen() {
  const router = useRouter();
  const [fakeCallerName, setFakeCallerName] = useState('');
  const [fakeCallerNumber, setFakeCallerNumber] = useState('');
  const [ringtoneName, setRingtoneName] = useState('Default');

  const { i18n } = useTranslation();
  const { themeMode, setThemeMode, activeTheme, colors } = useTheme();
  // Initialize state with the currently active language from i18next

  const [language, setLanguage] = useState(i18n.language);
  const { t } = useTranslation()
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <ScrollView>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>

          <TouchableOpacity style={styles.headerPressable} onPress={() => { router.back() }}>
            <Ionicons name="chevron-back" size={28} color={colors.navigatorColor} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>User & Medical Info</Text>
          </TouchableOpacity>


        </View>


        {/* --- My Circle Section --- */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>My Circle</Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
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
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Fake Call</Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={[styles.inputRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <Feather name="user" size={20} color={colors.textTertiary} />
              <TextInput
                placeholder="Caller Name (e.g., Mom)"
                placeholderTextColor={colors.inputPlaceholder}
                style={[styles.input, { color: colors.text }]}
                value={fakeCallerName}
                onChangeText={setFakeCallerName}
              />
            </View>
            <View style={[styles.inputRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <Feather name="phone" size={20} color={colors.textTertiary} />
              <TextInput
                placeholder="Caller Number"
                placeholderTextColor={colors.inputPlaceholder}
                style={[styles.input, { color: colors.text }]}
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
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.info }]} onPress={handleSaveSettings}>
            <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>Save Fake Call Settings</Text>
          </TouchableOpacity>
        </View>
        <API_Storing />
        {/* --- App Settings Section --- */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>App</Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <SettingsRow
              href="settings/language"
              icon="globe"
              label="Language"
              description={getLanguageName(language)}
            />
          </View>
        </View>

        {/* --- Sign Out Button --- */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.card }]} onPress={handleSignOut}>
          <Text style={[styles.logoutButtonText, { color: colors.error }]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20 },
  header: {
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
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 12,
  },
  card: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    marginLeft: 12,
  },
  saveButton: {
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    borderRadius: 10,
    margin: 16,
    padding: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
