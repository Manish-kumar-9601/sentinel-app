import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates'; // <-- CORRECTED IMPORT
import i18n from '../../lib/i18n';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी (Hindi)' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
  { code: 'raj', name: 'राजस्थानी (Rajasthani)' },
];
const LANGUAGE_KEY = 'user_language';

const LanguageScreen = () => {
  const router = useRouter();
  const [currentLang, setCurrentLang] = useState(i18n.locale);

  const handleSelectLanguage = async (langCode) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, langCode);
      Alert.alert(
        "Language Changed",
        "The app will now restart to apply the new language.",
        [{ text: "OK", onPress: () => Updates.reloadAsync() }]
      );
    } catch (error) {
      console.error("Failed to save language", error);
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = currentLang === item.code;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleSelectLanguage(item.code)}
      >
        <Text style={[styles.label, isSelected && styles.selectedLabel]}>{item.name}</Text>
        {isSelected && <Ionicons name="checkmark-circle" size={24} color="#FF4500" />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Select Language', headerShown: true }} />
      <FlatList
        data={LANGUAGES}
        renderItem={renderItem}
        keyExtractor={(item) => item.code}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EFEFF4',
  },
  label: {
    fontSize: 16,
    color: '#000',
  },
  selectedLabel: {
    fontWeight: 'bold',
    color: '#FF4500',
  },
});

export default LanguageScreen;
