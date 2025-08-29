import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  View, 
  TextInput, 
  Button, 
  StyleSheet, 
  Text, 
  StatusBar,
  Alert, 
  TouchableOpacity
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define a key for storing the API Key.
const API_KEY_STORAGE_KEY = '@api_key';

export const API_Storing= () => {
  // State to hold the API Key from the input field
  const [apiKeyInput, setApiKeyInput] = useState('');
  // State to display the currently stored API Key
  const [storedApiKey, setStoredApiKey] = useState('');
  // State for providing feedback to the user
  const [message, setMessage] = useState('');
  const [toggle, setToggle] = useState(false);
    
  // useEffect hook to load the API Key from AsyncStorage when the component mounts
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const apiKey = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
        if (apiKey !== null) {
          console.log('API Key loaded successfully!');
          setStoredApiKey(apiKey);
          setMessage('Loaded saved API Key from storage.');
        } else {
          console.log('No API Key found in storage.');
          setMessage('No API Key is currently stored.');
        }
      } catch (error) {
        console.error('Failed to load API Key from storage', error);
        Alert.alert('Error', 'Failed to load API Key from storage.');
      }
    };

    loadApiKey();
  }, []); // The empty dependency array ensures this runs only once on mount

  // Function to save the API Key to AsyncStorage
  const saveApiKey = async () => {
    if (apiKeyInput.trim() === '') {
      Alert.alert('Validation Error', 'API Key cannot be empty.');
      return;
    }

    try {
      await AsyncStorage.setItem(API_KEY_STORAGE_KEY, apiKeyInput);
      console.log('API Key saved successfully!');
      setStoredApiKey(apiKeyInput); // Update the displayed stored API Key
      setMessage(`API Key has been saved!`);
      setApiKeyInput(''); // Clear the input field after saving
    } catch (error) {
      console.error('Failed to save API Key to storage', error);
      Alert.alert('Error', 'Failed to save the API Key.');
    }
  };

  // Function to clear the API Key from AsyncStorage
  const clearApiKey = async () => {
    try {
        await AsyncStorage.removeItem(API_KEY_STORAGE_KEY);
        console.log('API Key cleared successfully!');
        setStoredApiKey('');
        setMessage('API Key has been cleared from storage.');
    } catch (error) {
        console.error('Failed to clear API Key from storage', error);
        Alert.alert('Error', 'Failed to clear the API Key.');
    }
  };
const onPressToggle = () => {
setToggle(!toggle);
}
  return (
    <View style={{ flex: 1,  }}>
  <TouchableOpacity style={styles.buttonContainer} onPress={onPressToggle}>
    <Text style={styles.buttonText}>Save API Key</Text>
  </TouchableOpacity>
  <View style={{ display: toggle ? 'flex' : 'none',  flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f8',
    padding: 20,}}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter your API Key here"
          value={apiKeyInput}
          onChangeText={setApiKeyInput}
          autoCapitalize="none"
        />
      </View>

  <TouchableOpacity style={{borderRadius: 30, 
  padding:10,
    marginVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a89ffff', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    // Shadow for Android
    elevation: 5,}} onPress={saveApiKey}>
    <Text style={styles.buttonText}>Save API Key to Device</Text>
  </TouchableOpacity>
      

      <View style={styles.displayContainer}>
        <Text style={styles.subTitle}>Currently Stored API Key:</Text>
        <Text style={styles.apiKeyText}>
          {storedApiKey ? storedApiKey : 'None'}
        </Text>
        <Text style={styles.messageText}>{message}</Text>
      </View>
      
      {/* Add a button to clear the API Key for testing purposes */}
      {storedApiKey ? (
        <View style={styles.clearButton}>
            <Button 
            
                title="Clear Stored API Key"
                onPress={clearApiKey}
                color="#FF3B30"
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
    backgroundColor: '#f4f4f8',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontSize: 16,
    width: '100%',
  },
  displayContainer: {
    marginTop: 40,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '100%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
  },
  apiKeyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#007AFF',
    fontFamily: 'monospace', // Use a monospaced font for API Keys
    textAlign: 'center',
  },
  messageText: {
    marginTop: 15,
    fontSize: 14,
    color: 'green',
    fontStyle: 'italic',
  },
  clearButton: {
      marginTop: 20,
  }, 
  buttonContainer: {
    backgroundColor: '#007AFF', // A nice blue
    marginHorizontal: 110,
    paddingVertical: 5,
    paddingHorizontal: 0,
    borderRadius: 30, // Makes it pill-shaped
    alignItems: 'center',
    justifyContent: 'flex-start',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    // Shadow for Android
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
  
});
