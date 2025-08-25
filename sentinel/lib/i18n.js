import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import {english as en,gujarati as gu,hindi as hi,kannada as kn,  marathi as mr,rajasthani as raj } from '../locales';

const LANGUAGE_KEY = 'user_language';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  gu: { translation: gu },
  mr: { translation: mr },
  kn: { translation: kn },
  raj: { translation: raj },
};

// Get the device's language as a default
const deviceLanguage = Localization.getLocales()[0].languageCode;

i18next
  .use(initReactI18next)
  .init({
    resources:resources,
    lng:  deviceLanguage || 'en', 
    fallbackLng: 'en',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false,
    },
  });

// This function will be called when the app starts
export const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage) {
      await i18next.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.error('Failed to load saved language.', error);
  }
};
loadSavedLanguage();
export default i18next;
