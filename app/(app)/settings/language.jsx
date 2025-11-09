import { StorageService } from '@/services/StorageService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import
  {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles } from '../../../hooks/useThemedStyles';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी (Hindi)' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
  { code: 'raj', name: 'राजस्थानी (Rajasthani)' },
];

const LanguageScreen = () =>
{
  const { i18n, t } = useTranslation();
  const { colors } = useThemedStyles();
  // Initialize state with the currently active language from i18next
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const handleSelectLanguage = async (langCode) =>
  {
    try
    {
      // 1. Change the language
      await i18n.changeLanguage(langCode);

      // 2. Save the new language preference to storage
      await StorageService.setLanguage(langCode);

      // 3. Update the local state to show the checkmark immediately
      setCurrentLang(langCode);

      // 4. Alert the user and offer to restart the app
      Alert.alert(
        t('language.languageChanged'),
        t('language.restartMessage'),
        [{ text: "OK", onPress: () => Updates.reloadAsync() }]
      );
    } catch (error)
    {
      console.error("Failed to save or change language", error);
      Alert.alert(t('language.error'), t('language.languageError'));
    }
  };

  const renderItem = ({ item }) =>
  {
    const isSelected = currentLang === item.code;
    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        onPress={() => handleSelectLanguage(item.code)}
      >
        <Text style={[styles.label, { color: colors.text }, isSelected && { fontWeight: 'bold', color: colors.primary }]}>{item.name}</Text>
        {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>

        <TouchableOpacity style={styles.headerPressable} onPress={() => { router.back() }}>
          <Ionicons name="chevron-back" size={28} color={colors.navigatorColor} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('language.selectLanguage')}</Text>
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
  },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 16,
  },
});

export default LanguageScreen;
