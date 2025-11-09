import { STORAGE_KEYS } from '@/constants/storage';
import { useTheme } from '@/context/ThemeContext';
import { StorageService } from '@/services/storage';
import React, { useEffect, useState } from 'react';
import
  {
    Alert,
    Button,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
  } from 'react-native';

export const API_Storing = () =>
{
  // State to hold the API Key from the input field
  const [apiKeyInput, setApiKeyInput] = useState('');
  // State to display the currently stored API Key
  const [storedApiKey, setStoredApiKey] = useState('');
  // State for providing feedback to the user
  const [message, setMessage] = useState('');
  const [toggle, setToggle] = useState(false);
  const { colors } = useTheme();

  // useEffect hook to load the API Key from StorageService when the component mounts
  useEffect(() =>
  {
    const loadApiKey = async () =>
    {
      try
      {
        const apiKey = await StorageService.get(STORAGE_KEYS.API_KEY);
        if (apiKey !== null)
        {
          console.log('API Key loaded successfully!');
          setStoredApiKey(apiKey);
          setMessage('Loaded saved API Key from storage.');
        } else
        {
          console.log('No API Key found in storage.');
          setMessage('No API Key is currently stored.');
        }
      } catch (error)
      {
        console.error('Failed to load API Key from storage', error);
        Alert.alert('Error', 'Failed to load API Key from storage.');
      }
    };

    loadApiKey();
  }, []); // The empty dependency array ensures this runs only once on mount

  // Function to save the API Key to StorageService
  const saveApiKey = async () =>
  {
    if (apiKeyInput.trim().length != 50)
    {
      Alert.alert('Validation Error', 'API Key cannot be less than 50 letters.');
      return;
    }
    if (apiKeyInput.trim() === '')
    {
      Alert.alert('Validation Error', 'API Key cannot be empty.');
      return;
    }

    try
    {
      await StorageService.set(STORAGE_KEYS.API_KEY, apiKeyInput);
      console.log('API Key saved successfully!');
      setStoredApiKey(apiKeyInput); // Update the displayed stored API Key
      setMessage(`API Key has been saved!`);
      setApiKeyInput(''); // Clear the input field after saving
    } catch (error)
    {
      console.error('Failed to save API Key to storage', error);
      Alert.alert('Error', 'Failed to save the API Key.');
    }
  };

  // Function to clear the API Key from StorageService
  const clearApiKey = async () =>
  {
    try
    {
      await StorageService.delete(STORAGE_KEYS.API_KEY);
      console.log('API Key cleared successfully!');
      setStoredApiKey('');
      setMessage('API Key has been cleared from storage.');
    } catch (error)
    {
      console.error('Failed to clear API Key from storage', error);
      Alert.alert('Error', 'Failed to clear the API Key.');
    }
  };
  const onPressToggle = () =>
  {
    setToggle(!toggle);
  }
  return (
    <View style={{ flex: 1, }}>
      <TouchableOpacity style={[styles.buttonContainer, { backgroundColor: colors.info }]} onPress={onPressToggle}>
        <Text style={[styles.buttonText, { color: colors.textInverse }]}>Save API Key</Text>
      </TouchableOpacity>
      <View style={{
        display: toggle ? 'flex' : 'none', flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        padding: 20,
      }}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
            placeholder="Enter your API Key here"
            placeholderTextColor={colors.inputPlaceholder}
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity style={{
          borderRadius: 30,
          padding: 10,
          marginVertical: 0,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.info,
          boxShadow: '0 5px 8px rgba(0,0,0,0.2)',
        }} onPress={saveApiKey}>
          <Text style={[styles.buttonText, { color: colors.textInverse }]}>Save API Key to Device</Text>
        </TouchableOpacity>


        <View style={[styles.displayContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.subTitle, { color: colors.textSecondary }]}>Currently Stored API Key:</Text>
          <Text style={[styles.apiKeyText, { color: colors.info }]}>
            {storedApiKey ? storedApiKey : 'None'}
          </Text>
          <Text style={[styles.messageText, { color: colors.success }]}>{message}</Text>
        </View>

        {/* Add a button to clear the API Key for testing purposes */}
        {storedApiKey ? (
          <View style={styles.clearButton}>
            <Button

              title="Clear Stored API Key"
              onPress={clearApiKey}
              color={colors.error}
            />
          </View>
        ) : null}

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    width: '100%',
  },
  displayContainer: {
    marginTop: 40,
    alignItems: 'center',
    padding: 20,
    borderRadius: 8,
    width: '100%',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  subTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  apiKeyText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: 'monospace', // Use a monospaced font for API Keys
    textAlign: 'center',
  },
  messageText: {
    marginTop: 15,
    fontSize: 14,
    fontStyle: 'italic',
  },
  clearButton: {
    marginTop: 20,
  },
  buttonContainer: {
    marginHorizontal: 110,
    paddingVertical: 5,
    paddingHorizontal: 0,
    borderRadius: 30, // Makes it pill-shaped
    alignItems: 'center',
    justifyContent: 'flex-start',
    // Shadow for iOS
    boxShadow: '0 5px 5px rgba(0,0,0,0.1)',
    // Shadow for Android

  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  }

});
