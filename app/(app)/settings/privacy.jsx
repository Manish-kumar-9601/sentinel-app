import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';

const privacyScreen = () =>
{
  return (
    <SafeAreaView>
      <View style={styles.header}>

        <TouchableOpacity style={styles.headerPressable} onPress={() => { router.back() }}>
          <Feather name="chevron-left" size={32} color="#007AFF" />
          <Text style={styles.headerTitle}>Privacy & Permission</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ padding: 20, fontSize: 16, color: '#666' }}>
        Privacy & Permission Settings will be available soon.
      </Text>
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
});

export default privacyScreen;