import React, { useState } from 'react';
import
  {

    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
  } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी (Hindi)' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
  { code: 'raj', name: 'राजस्थानी (Rajasthani)' },
];
const LANGUAGE_KEY = 'user_language';

const LanguageScreen = () =>
{
  const { i18n } = useTranslation();
  // Initialize state with the currently active language from i18next
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const handleSelectLanguage = async (langCode) =>
  {
    try
    {
      // 1. Change the language
      await i18n.changeLanguage(langCode);

      // 2. Save the new language preference to storage
      await AsyncStorage.setItem(LANGUAGE_KEY, langCode);

      // 3. Update the local state to show the checkmark immediately
      setCurrentLang(langCode);

      // 4. Alert the user and offer to restart the app
      Alert.alert(
        "Language Changed",
        "The app will now restart to apply the new language.",
        [{ text: "OK", onPress: () => Updates.reloadAsync() }]
      );
    } catch (error)
    {
      console.error("Failed to save or change language", error);
      Alert.alert("Error", "Could not apply the selected language.");
    }
  };

  const renderItem = ({ item }) =>
  {
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
      <View style={styles.header}>

        <TouchableOpacity style={styles.headerPressable} onPress={() => { router.back() }}>
          <Feather name="chevron-left" size={32} color="#007AFF" />
          <Text style={styles.headerTitle}>Language</Text>
        </TouchableOpacity>


      </View>
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
  header: {
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
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
