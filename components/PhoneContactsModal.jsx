import React, { useState, useEffect } from 'react';
import
  {
    Modal,
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
  } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';

const PhoneContactsModal = ({ visible, onClose, onSelectContact }) =>
{
  const [phoneContacts, setPhoneContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (contact.phoneNumbers?.[0]?.number || '').includes(searchQuery)
      );
      setFilteredContacts(filtered);
    }
  }, [searchQuery, phoneContacts]);

  const loadPhoneContacts = async () =>
  {
    try
    {
      setIsLoading(true);
      console.log('Requesting contacts permission...');

      const { status } = await Contacts.requestPermissionsAsync();

      if (status !== 'granted')
      {
        Alert.alert(
          'Permission Denied',
          'Permission to access contacts was denied. Please enable it in Settings.',
          [{ text: 'OK', onPress: onClose }]
        );
        setIsLoading(false);
        return;
      }

      console.log('Fetching contacts...');
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });

      // Filter for contacts that have at least one phone number
      const validContacts = data
        .filter(c =>
        {
          const hasPhoneNumber = c.phoneNumbers && c.phoneNumbers.length > 0;
          const hasName = c.name && c.name.trim();
          return hasPhoneNumber && hasName;
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(contact => ({
          id: contact.id,
          name: contact.name || 'Unknown',
          phoneNumbers: contact.phoneNumbers || [],
        }));

      console.log(`Loaded ${validContacts.length} valid contacts`);
      setPhoneContacts(validContacts);
      setFilteredContacts(validContacts);
    } catch (error)
    {
      console.error('Error loading contacts:', error);
      Alert.alert(
        'Error',
        'Failed to load contacts. Please try again.',
        [{ text: 'OK', onPress: onClose }]
      );
    } finally
    {
      setIsLoading(false);
    }
  };

  const handleSelectContact = (contact) =>
  {
    try
    {
      if (!contact.phoneNumbers || contact.phoneNumbers.length === 0)
      {
        Alert.alert('Error', 'This contact has no phone number.');
        return;
      }

      // Get the first phone number
      const phoneNumber = contact.phoneNumbers[0].number;

      if (!phoneNumber)
      {
        Alert.alert('Error', 'Could not extract phone number.');
        return;
      }

      // Pass formatted contact back to parent
      const formattedContact = {
        id: contact.id,
        name: contact.name,
        phone: phoneNumber,
        relationship: '',
      };

      console.log('Selected contact:', formattedContact);

      onSelectContact(formattedContact);

      // Reset search and close
      setSearchQuery('');
      onClose();
    } catch (error)
    {
      console.error('Error selecting contact:', error);
      Alert.alert('Error', 'Failed to select contact. Please try again.');
    }
  };

  const ContactItem = ({ item }) =>
  {
    const phoneNumber = item.phoneNumbers?.[0]?.number || 'No number';

    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handleSelectContact(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.name?.charAt(0) || 'U').toUpperCase()}
          </Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name || 'Unknown'}</Text>
          <Text style={styles.contactPhone}>{phoneNumber}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      presentationStyle="formSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Phone Contacts</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={30} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Search Box */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            placeholder="Search contacts..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Contact Count */}
        {!isLoading && (
          <View style={styles.countBar}>
            <Text style={styles.countText}>
              {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Loading Indicator */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredContacts}
            renderItem={({ item }) => <ContactItem item={item} />}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>
                  {phoneContacts.length === 0 ? 'No contacts found' : 'No matching contacts'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {phoneContacts.length === 0
                    ? 'Enable contacts permission to see your phone contacts'
                    : 'Try searching with different keywords'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    height: 44,
  },
  searchIcon: {
    marginRight: 10,
    marginLeft: 4,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#333',
  },
  countBar: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  countText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 13,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default PhoneContactsModal;