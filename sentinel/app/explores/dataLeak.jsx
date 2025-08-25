import  { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

const DataLeakScreen = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleCheck = async () => {
    if (email.trim() === '' || !email.includes('@')) {
      Alert.alert('Invalid Input', 'Please enter a valid email address.');
      return;
    }
    Keyboard.dismiss();
    setIsLoading(true);
    setResults(null);

    try {
      const response = await fetch(`/api/dataLeak?email=${encodeURIComponent(email.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        // Throw the specific error message from the backend
        throw new Error(data.error || 'An unknown error occurred.');
      }

      setResults(data);
console.log(results)
    } catch (error) {
      console.error('Data leak check failed:', error);
      // Display the specific error message to the user for better debugging
      Alert.alert('Scan Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderResultItem = ({ item }) =>{
    console.log(item)
    return (
    
    <View style={styles.resultItem}>
      <View style={styles.resultIconContainer}>
        <Feather name="alert-triangle" size={24} color="#D93025" />
      </View>
      <View style={styles.resultTextContainer}>
        <Text style={styles.resultTitle}>{item.source}</Text>
        <Text style={styles.resultDescription}>{item.password}</Text>
      </View>
    </View>
  );
  } 
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Data Leak Check', headerShown: true }} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark-outline" size={60} color="#FF4500" />
          <Text style={styles.title}>Data Leak Check</Text>
          <Text style={styles.subtitle}>
            See if your email has been compromised in a public data breach.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputRow}>
            <Feather name="mail" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="your.email@example.com"
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
              <Text style={styles.checkButtonText}>Scan Now</Text>
            )}
          </TouchableOpacity>
        </View>

        {results && (
          <View style={styles.resultsContainer}>
            {results.found && Array.isArray(results.results) && results.results.length > 0 ? (
              <>
                <Text style={styles.resultsHeader}>Breaches Found ({results.results.length})</Text>
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
                <Text style={styles.safeText}>No Breaches Found!</Text>
                <Text style={styles.safeSubtext}>Your email is not in any known public breaches.</Text>
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
  scrollContainer: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
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
    backgroundColor: '#FF4500',
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
  resultDescription: { fontSize: 14, color: '#666', marginTop: 4 },
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
