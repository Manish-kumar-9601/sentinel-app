import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SMS from 'expo-sms';
import * as Location from 'expo-location';
import { useModal } from '@/context/ModalContext';

const CONTACTS_STORAGE_KEY = 'emergency_contacts';

const ContactListModal = ({ visible, onClose }) =>
{ 
  const [contacts, setContacts] = useState([]);
  const [location, setLocation] = useState(null);
  const [modalVisible,setModalVisible]=useState(false)
   
  useEffect(() =>
  {
      if(visible){
    setModalVisible(true)
  }else{
    setModalVisible(false)
  }
    if (!visible)
    {
      const loadData = async () =>
      {
        try
        {
          const storedContacts = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
          if (storedContacts) setContacts(JSON.parse(storedContacts));

          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted')
          {
            const currentLocation = await Location.getCurrentPositionAsync({});
            setLocation(currentLocation);
          } else
          {
            Alert.alert("Permission Denied", "Location access is needed.");
          }
        } catch (error)
        {
          console.error("Failed to load data for modal", error);
        }
      };
      loadData();
    }
  }, [visible]);

  const handleSelectContact = async (contact) =>
  {
    if (!location)
    {
      Alert.alert('Location Not Found', 'Cannot send check-in without your location.');
      return;
    }
    const isSmsAvailable = await SMS.isAvailableAsync();
    if (isSmsAvailable)
    {
      const message = `Check-in: I'm here and safe. My location is: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
      await SMS.sendSMSAsync([contact.phone], message);
      onClose(); // Close the modal
    } else
    {
      Alert.alert('Error', 'SMS is not available on this device.');
    }
  };
// console.log('modal vi',modalVisible)
 
  return (
    <Modal animationType="slide" transparent={true } visible={modalVisible } onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Select a Contact</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={30} color="#ccc" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.contactItem} onPress={() => handleSelectContact(item)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone}>{item.phone}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No contacts found.</Text>
                <Text style={styles.emptySubtext}>Add contacts in "My Circle".</Text>
              </View>
            }
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '60%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold' },
  contactItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  contactName: { fontSize: 18, fontWeight: '500' },
  contactPhone: { fontSize: 14, color: '#666', marginTop: 2 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  emptySubtext: { fontSize: 14, color: '#777', marginTop: 8, textAlign: 'center' }
});

export default ContactListModal;
