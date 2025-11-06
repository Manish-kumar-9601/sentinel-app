import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import React, { useEffect, useState } from 'react';
import
{
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const PhoneContactsModal = ({ visible, onClose, onSelectContact }) =>
{
  const [phoneContacts, setPhoneContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { colors } = useTheme();

  // Load contacts from the phone when the modal becomes visible
  useEffect(() =>
  {
    if (visible)
    {
      loadPhoneContacts();
    }
  }, [visible]);

  // Filter contacts based on search query
  useEffect(() =>
  {
    if (searchQuery === '')
    {
      setFilteredContacts(phoneContacts);
    } else
    {
      const filtered = phoneContacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredContacts(filtered);
    }
  }, [searchQuery, phoneContacts]);

  const loadPhoneContacts = async () =>
  {
    setIsLoading(true);
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted')
    {
      Alert.alert('Permission denied', 'Permission to access contacts was denied.');
      setIsLoading(false);
      onClose(); // Close modal if permission is denied
      return;
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    });

    // Filter for contacts that have at least one phone number and sort them alphabetically
    const validContacts = data
      .filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    setPhoneContacts(validContacts);
    setFilteredContacts(validContacts);
    setIsLoading(false);
  };

  const handleSelect = (contact) =>
  {
    // Pass a formatted contact object back to the parent screen
    onSelectContact({
      id: contact.id,
      name: contact.name,
      phone: contact.phoneNumbers[0].number, // Use the first phone number
    });
    setSearchQuery('');
    onClose();
  };

  const ContactItem = ({ item }) => (
    <TouchableOpacity style={[styles.contactItem, { borderBottomColor: colors.border }]} onPress={() => handleSelect(item)}>
      <View style={[styles.avatar, { backgroundColor: colors.info }]}>
        <Text style={[styles.avatarText, { color: colors.textInverse }]}>{item.name.charAt(0)}</Text>
      </View>
      <View>
        <Text style={[styles.contactName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>{item.phoneNumbers[0].number}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Phone Contacts</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={30} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            placeholder="Search contacts..."
            placeholderTextColor={colors.inputPlaceholder}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={filteredContacts}
            renderItem={ContactItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No contacts found.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    margin: 20,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 40, fontSize: 16 },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    marginHorizontal: 20,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: { fontSize: 18, fontWeight: 'bold' },
  contactName: { fontSize: 16, fontWeight: '500' },
  contactPhone: { fontSize: 14, marginTop: 2 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16 },
});

export default PhoneContactsModal;