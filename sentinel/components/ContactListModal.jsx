import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SMS from 'expo-sms';
import * as Location from 'expo-location';
import PhoneContactsModal from './PhoneContactsModal'; // Assuming you have this component

const CONTACTS_STORAGE_KEY = 'emergency_contacts';

const ContactListModal = ({ visible, onClose }) => {
  const [contacts, setContacts] = useState([]);
  const [location, setLocation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isPhonePickerVisible, setIsPhonePickerVisible] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      loadData();
    } else {
      setModalVisible(false);
      setIsManageMode(false); // Reset manage mode when modal closes
    }
  }, [visible]);

  const loadData = async () => {
    try {
      // Load contacts
      const storedContacts = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      }

      // Get location permission and current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      } else {
        Alert.alert("Permission Denied", "Location access is needed for check-in messages.");
      }
    } catch (error) {
      console.error("Failed to load data for modal", error);
    }
  };

  // Save contacts to storage whenever the list changes
  useEffect(() => {
    const saveContacts = async () => {
      try {
        const jsonValue = JSON.stringify(contacts);
        await AsyncStorage.setItem(CONTACTS_STORAGE_KEY, jsonValue);
      } catch (error) {
        console.error('Failed to save contacts.', error);
      }
    };
    
    if (contacts.length >= 0) { // Save even empty array to clear storage
      saveContacts();
    }
  }, [contacts]);

  const handleSelectContact = async (contact) => {
    if (isManageMode) return; // Don't send SMS in manage mode

    if (!location) {
      Alert.alert('Location Not Found', 'Cannot send check-in without your location.');
      return;
    }

    const isSmsAvailable = await SMS.isAvailableAsync();
    if (isSmsAvailable) {
      const message = `Check-in: I'm here and safe. My location is: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
      
      try {
        await SMS.sendSMSAsync([contact.phone], message);
        Alert.alert('Success', `Check-in message sent to ${contact.name}`);
        onClose(); // Close the modal
      } catch (error) {
        Alert.alert('Error', 'Failed to send SMS. Please try again.');
      }
    } else {
      Alert.alert('Error', 'SMS is not available on this device.');
    }
  };

  const handleRemoveContact = (contactToRemove) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${contactToRemove.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
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

  const handleAddFromPhone = (selectedContact) => {
    // Check if contact already exists
    if (contacts.some(c => c.id === selectedContact.id)) {
      Alert.alert("Contact Exists", `${selectedContact.name} is already in your circle.`);
    } else {
      setContacts(currentContacts => [...currentContacts, selectedContact]);
      Alert.alert("Success", `${selectedContact.name} has been added to your circle.`);
    }
  };

  const toggleManageMode = () => {
    setIsManageMode(!isManageMode);
  };

  const ContactItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.contactItem} 
      onPress={() => handleSelectContact(item)}
      disabled={isManageMode}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
      </View>
      {isManageMode && (
        <TouchableOpacity onPress={() => handleRemoveContact(item)}>
          <Ionicons name="trash-bin" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      )}
      {!isManageMode && (
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <Modal 
        animationType="slide" 
        transparent={true} 
        visible={modalVisible} 
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {isManageMode ? 'Manage Contacts' : 'Select a Contact'}
              </Text>
              <View style={styles.headerButtons}>
                {contacts.length > 0 && (
                  <TouchableOpacity 
                    style={[styles.headerButton, isManageMode && styles.headerButtonActive]} 
                    onPress={toggleManageMode}
                  >
                    <Ionicons 
                      name={isManageMode ? "checkmark" : "settings"} 
                      size={20} 
                      color={isManageMode ? "#fff" : "#666"} 
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close-circle" size={30} color="#ccc" />
                </TouchableOpacity>
              </View>
            </View>

            {isManageMode && (
              <TouchableOpacity 
                style={styles.addContactButton} 
                onPress={() => setIsPhonePickerVisible(true)}
              >
                <Ionicons name="add" size={20} color="#FF4500" />
                <Text style={styles.addContactText}>Add New Contact</Text>
              </TouchableOpacity>
            )}

            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ContactItem item={item} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={64} color="#ccc" style={styles.emptyIcon} />
                  <Text style={styles.emptyText}>No contacts found.</Text>
                  <Text style={styles.emptySubtext}>
                    {isManageMode 
                      ? "Tap 'Add New Contact' to get started." 
                      : "Add contacts by switching to manage mode."}
                  </Text>
                  {!isManageMode && (
                    <TouchableOpacity 
                      style={styles.addFirstContactButton} 
                      onPress={() => setIsManageMode(true)}
                    >
                      <Text style={styles.addFirstContactButtonText}>Manage Contacts</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />

            {!isManageMode && contacts.length > 0 && (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Tap a contact to send a check-in message with your location
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      <PhoneContactsModal
        visible={isPhonePickerVisible}
        onClose={() => setIsPhonePickerVisible(false)}
        onSelectContact={handleAddFromPhone}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: { 
    flex: 1, 
    justifyContent: 'flex-end', 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
  modalContent: { 
    backgroundColor: 'white', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    padding: 20, 
    height: '70%' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold',
    flex: 1
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerButtonActive: {
    backgroundColor: '#FF4500'
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed'
  },
  addContactText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#FF4500',
    fontWeight: '500'
  },
  contactItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#FF4500', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  avatarText: { 
    color: 'white', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  contactInfo: {
    flex: 1
  },
  contactName: { 
    fontSize: 18, 
    fontWeight: '500' 
  },
  contactPhone: { 
    fontSize: 14, 
    color: '#666', 
    marginTop: 2 
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 50 
  },
  emptyIcon: {
    marginBottom: 20
  },
  emptyText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  emptySubtext: { 
    fontSize: 14, 
    color: '#777', 
    marginTop: 8, 
    textAlign: 'center',
    paddingHorizontal: 20
  },
  addFirstContactButton: {
    marginTop: 20,
    backgroundColor: '#FF4500',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
  },
  addFirstContactButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  footer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});

export default ContactListModal;