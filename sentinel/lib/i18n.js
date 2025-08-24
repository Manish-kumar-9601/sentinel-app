import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { english as en, gujarati as gu, hindi as hi, kannada as kn, marathi as mr, rajasthani as raj } from '../locales';
import AsyncStorage from '@react-native-async-storage/async-storage';
const LANGUAGE_KEY = 'user_language';

const i18n = new I18n();

// Set up the translations
i18n.translations = {
  en,
  hi,
  gu,
  mr,
  kn,
  raj,
};

// This function will be called on app startup
export const setI18nConfig = async () => {
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

  // If a language is saved, use it. Otherwise, use the device's language.
  const locale = savedLanguage || Localization.getLocales()[0].languageCode;
  
  i18n.locale = locale;
  i18n.enableFallback = true;
  
  return i18n;
};

// Set a default language initially
i18n.locale = Localization.getLocales()[0].languageCode;
i18n.enableFallback = true;

export default i18n;
