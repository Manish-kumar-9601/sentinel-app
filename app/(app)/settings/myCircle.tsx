import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhoneContactsModal from '../../../components/PhoneContactsModal';

// --- Configuration ---
const CONTACTS_STORAGE_KEY = 'emergency_contacts';

export default function MyCircleScreen() {
  const [contacts, setContacts] = useState([]);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const { t } = useTranslation();

  // --- Load contacts from storage when the screen opens ---
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const storedContacts = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
        if (storedContacts !== null) {
          setContacts(JSON.parse(storedContacts));
        }
      } catch (error) {
        console.error('Failed to load contacts.', error);
      }
    };
    loadContacts();
  }, []);

  // --- Save contacts to storage whenever the list changes ---
  useEffect(() => {
    const saveContacts = async () => {
      try {
        const jsonValue = JSON.stringify(contacts);
        await AsyncStorage.setItem(CONTACTS_STORAGE_KEY, jsonValue);
      } catch (error) {
        console.error('Failed to save contacts.', error);
      }
    };
    // Only save if contacts isn't the initial empty array
    if (contacts.length > 0) {
      saveContacts();
    }
  }, [contacts]);


  // --- Logic to Remove a Contact ---
  const handleRemoveContact = (contactToRemove) => {
    Alert.alert(
      t('myCircle.removeTitle'),
      t('myCircle.removeMessage', { name: contactToRemove.name }),
      [
        { text: t('myCircle.cancel'), style: 'cancel' },
        {
          text: t('myCircle.remove'),
          onPress: () => {
            setContacts(currentContacts =>
              currentContacts.filter(contact => contact.id !== contactToRemove.id)
            );
          },
          style: 'destructive',
        },
      ]
    );
  };

  // --- Logic to Add a Contact from the Phone Contacts Modal ---
  const handleSelectFromPhone = (selectedContact) => {
    // Check if contact already exists in the circle
    if (contacts.some(c => c.id === selectedContact.id)) {
      Alert.alert(t('myCircle.contactExists'), t('myCircle.contactExistsMessage', { name: selectedContact.name }));
    } else {
      setContacts(currentContacts => [...currentContacts, selectedContact]);
    }
  };

  // --- UI Component for each contact in the list ---
  const ContactItem = ({ item }) => (
    <View style={styles.contactItem}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
      </View>
      <TouchableOpacity onPress={() => handleRemoveContact(item)}>
        <Ionicons name="trash-bin" size={24} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerPressable} onPress={() => { router.back() }}>
          <Feather name="chevron-left" size={32} color="#007AFF" />
          <Text style={styles.headerTitle}>{t('myCircle.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsPickerVisible(true)}>
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addButtonText}>{t('myCircle.add')}</Text>
        </TouchableOpacity>
      </View>



      <FlatList
        data={contacts}
        renderItem={ContactItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('myCircle.emptyTitle')}</Text>
            <Text style={styles.emptySubtext}>{t('myCircle.emptySubtitle')}</Text>
          </View>
        }
      />

      <PhoneContactsModal
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        onSelectContact={handleSelectFromPhone}
      />
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    paddingTop: 30,
    flex: 1, backgroundColor: '#F7F8FA'
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
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#FF4500',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    alignItems: 'center',
  },
  addButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 5 },
  listContainer: { padding: 20 },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    boxShadow: '0 2px 5px rgba(0, 0, 0, 1)',

  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF4500',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 18, fontWeight: '500' },
  contactPhone: { fontSize: 14, color: '#666', marginTop: 2 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#777',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
