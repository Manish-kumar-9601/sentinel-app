import { useEffect, useState } from 'react';
import
{
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import sentinel_detect_icon from '../../..//assets/images/heroIcon.png';
const API_KEY_STORAGE_KEY = '@api_key';
const DataLeakScreen = () =>
{
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [apiKey, setApiKey] = useState(null);

  useEffect(() =>
  {
    // Define an async function inside the effect
    const loadApiKey = async () =>
    {
      const apiKey = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
      if (apiKey !== null)
      {
        setApiKey(apiKey);
        console.log('api key in data leak', apiKey);
      }
    };

    // Call the function
    loadApiKey();

  }, []);

  const handleCheck = async () =>
  {
    if (email.trim() === '' || !email.includes('@'))
    {
      Alert.alert(t('dataLeak.invalidInput'), t('dataLeak.enterValidEmail'));
      return;
    }
    Keyboard.dismiss();
    setIsLoading(true);
    setResults(null);
    console.log(encodeURIComponent(email.trim()))
    try
    {
      const env = process.env.NODE_ENV
      console.log('Environment at Auth context:', env);
      const apiUrl = env === 'production' ? Constants.expoConfig?.extra?.apiUrl : '';
      console.log("apiUrl at Auth context", apiUrl)
      if (!apiUrl && env === 'production')
      {
        throw new Error('API URL not configured');
      }


      const response = await fetch(`${apiUrl}/api/dataLeak?email=${encodeURIComponent(email.trim())}&apiKey=${encodeURIComponent(apiKey)}`);
      const data = await response.json();

      if (!response.ok)
      {
        throw new Error(data.error || 'An unknown error occurred.');
      }
      setResults(data);
      console.log(results)
    } catch (error)
    {
      console.error('Data leak check failed:', error);

      Alert.alert(t('dataLeak.scanFailed'), error.message);
    } finally
    {
      setIsLoading(false);
    }
  };
  const renderResultItem = ({ item }) =>
  {
    console.log('renderResult', item)
    return (
      <View style={styles.resultItem}>
        <View style={styles.resultIconContainer}>
          <Feather name="alert-triangle" size={24} color="#D93025" />
        </View>
        <View style={styles.resultTextContainer}>
          <Text style={styles.resultTitle}>{t('dataLeak.source')}:{item.source}</Text>
          <Text style={styles.resultDescription}>{t('dataLeak.email')}:{item.email}</Text>
          {item.details && (
            <Text style={styles.resultDescription}>{t('dataLeak.leakedPassword')}: {item.details}</Text>
          )}
        </View>
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>

        <TouchableOpacity style={styles.headerPressable} onPress={() => { router.back() }}>
          <Feather name="chevron-left" size={32} color="#007AFF" />
          <Text style={styles.headerTitle}>{t('dataLeak.dataCheck')}</Text>
        </TouchableOpacity>


      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Image
            style={styles.heroIconImage}
            source={sentinel_detect_icon}
            placeholder={'sentinel-detect-icon'}
            contentFit="contain"
            transition={1}
          />
          <Text style={styles.title}>{t('dataLeak.title')}</Text>
          <Text style={styles.subtitle}>
            {t('dataLeak.subtitle')}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputRow}>
            <Feather name="mail" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('dataLeak.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity style={styles.checkButton} onPress={handleCheck} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.checkButtonText}>{t('dataLeak.scanNow')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {results && (
          <View style={styles.resultsContainer}>
            {results.found && Array.isArray(results.results) && results.results.length > 0 ? (
              <>
                <Text style={styles.resultsHeader}>{t('dataLeak.breachesFound')} ({results.results.length})</Text>
                <View style={styles.card}>
                  <FlatList
                    data={results.results}
                    renderItem={renderResultItem}
                    keyExtractor={(item, index) => index.toString()}
                    scrollEnabled={false}
                  />
                </View>
              </>
            ) : (
              <View style={styles.safeContainer}>
                <Feather name="check-circle" size={40} color="#006422" />
                <Text style={styles.safeText}>{t('dataLeak.noBreaches')}</Text>
                <Text style={styles.safeSubtext}>{t('dataLeak.emailSafe')}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scrollContainer: { padding: 5 },
  heroIconImage: {
    width: 80,
    height: 80,
    borderRadius: 100,
    marginBottom: 0,
    alignSelf: 'center',
    elevation: 5,

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
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 16, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  checkButton: {
    backgroundColor: '#3186c3',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  checkButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  resultsContainer: { marginTop: 30 },
  resultsHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, paddingHorizontal: 10 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EFEFF4',
  },
  resultIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFEBEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTextContainer: { flex: 1, marginLeft: 15 },
  resultTitle: { fontSize: 16, fontWeight: 'bold' },
  resultDescription: { fontSize: 15, color: '#2e2e2eff', marginTop: 4 },
  safeContainer: {
    backgroundColor: '#E5F9ED',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  safeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#006422',
    marginTop: 10,
  },
  safeSubtext: {
    fontSize: 14,
    color: '#006422',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default DataLeakScreen;
