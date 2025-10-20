import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SMS from 'expo-sms';
import * as Location from 'expo-location';
import PhoneContactsModal from './PhoneContactsModal';

const CONTACTS_STORAGE_KEY = 'emergency_contacts';

const ContactListModal = ({ visible, onClose, refreshAppState }) => {
  const [contacts, setContacts] = useState([]);
  const [location, setLocation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isPhonePickerVisible, setIsPhonePickerVisible] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      loadContacts();
      loadLocation();
      loadLastSyncTime();
      syncWithDatabase();
    } else {
      setModalVisible(false);
      setIsManageMode(false);
    }
  }, [visible]);

  const loadLastSyncTime = async () => {
    try {
      const lastSync = await AsyncStorage.getItem('contacts_last_sync');
      if (lastSync && mountedRef.current) {
        setLastSyncTime(new Date(lastSync));
      }
    } catch (error) {
      console.error('Failed to load last sync time:', error);
    }
  };

  const loadContacts = async () => {
    console.log('Loading contacts from storage...');
    try {
      setIsLoading(true);
      
      const storedContacts = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
      console.log('Stored contacts:', storedContacts);
      
      if (storedContacts && mountedRef.current) {
        try {
          const parsedContacts = JSON.parse(storedContacts);
          if (Array.isArray(parsedContacts)) {
            setContacts(parsedContacts);
            console.log(`Loaded ${parsedContacts.length} contacts`);
          } else {
            setContacts([]);
          }
        } catch (parseError) {
          console.error('Failed to parse contacts:', parseError);
          setContacts([]);
        }
      } else {
        if (mountedRef.current) {
          setContacts([]);
        }
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
      if (mountedRef.current) {
        setContacts([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const loadLocation = useCallback(async () => {
    if (location || !mountedRef.current) return;
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted' && mountedRef.current) {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (mountedRef.current) {
          setLocation(currentLocation);
        }
      }
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  }, [location]);

  const saveContactsToStorage = async (contactsToSave) => {
    if (!Array.isArray(contactsToSave)) {
      console.error('Invalid contacts data:', contactsToSave);
      return false;
    }
    
    try {
      const jsonValue = JSON.stringify(contactsToSave);
      await AsyncStorage.setItem(CONTACTS_STORAGE_KEY, jsonValue);
      console.log(`Saved ${contactsToSave.length} contacts to storage`);
      return true;
    } catch (error) {
      console.error('Failed to save contacts to storage:', error);
      return false;
    }
  };

  const syncWithDatabase = async () => {
    if (!mountedRef.current || isSyncing) return;
    
    try {
      setIsSyncing(true);
      setSyncError(null);
      console.log('Starting database sync...');

      // Fetch current user info from API
      const response = await fetch('/api/userInfo/get-user-info+api', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched user info:', data);

      if (!mountedRef.current) return;

      const serverContacts = data.emergencyContacts || [];
      
      // Merge server contacts with local storage
      const mergedContacts = mergeContacts(contacts, serverContacts);
      
      if (mountedRef.current) {
        setContacts(mergedContacts);
        await saveContactsToStorage(mergedContacts);
        
        // Update sync time
        const now = new Date().toISOString();
        await AsyncStorage.setItem('contacts_last_sync', now);
        setLastSyncTime(new Date(now));
        
        console.log(`Database sync completed (${mergedContacts.length} contacts)`);
      }
    } catch (error) {
      console.error('Database sync error:', error);
      if (mountedRef.current) {
        setSyncError('Failed to sync contacts with database');
      }
    } finally {
      if (mountedRef.current) {
        setIsSyncing(false);
      }
    }
  };

  const mergeContacts = (localContacts, serverContacts) => {
    const merged = [...serverContacts];
    
    localContacts.forEach(localContact => {
      const existsOnServer = serverContacts.some(
        sc => sc.id === localContact.id || 
              sc.phone === localContact.phone
      );
      
      if (!existsOnServer && localContact.name && localContact.phone) {
        merged.push({
          ...localContact,
          synced: false,
        });
      }
    });
    
    return merged.map(contact => ({
      ...contact,
      synced: serverContacts.some(sc => sc.id === contact.id),
    }));
  };

  const pushContactsToDatabase = async (contactsToSync) => {
    try {
      console.log('Pushing contacts to database:', contactsToSync);
      
      // First get current user info
      const getResponse = await fetch('/api/userInfo/get-user-info+api', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!getResponse.ok) {
        throw new Error('Failed to fetch current user info');
      }

      const currentData = await getResponse.json();
      console.log('Current data from server:', currentData);

      // Prepare payload with all current data
      const payload = {
        userInfo: {
          name: currentData.userInfo?.name || '',
          email: currentData.userInfo?.email || '',
          phone: currentData.userInfo?.phone || '',
        },
        medicalInfo: {
          bloodGroup: currentData.medicalInfo?.bloodGroup || '',
          allergies: currentData.medicalInfo?.allergies || '',
          medications: currentData.medicalInfo?.medications || '',
          emergencyContactName: currentData.medicalInfo?.emergencyContactName || '',
          emergencyContactPhone: currentData.medicalInfo?.emergencyContactPhone || '',
        },
        emergencyContacts: contactsToSync.map(contact => ({
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          relationship: contact.relationship || '',
          createdAt: contact.createdAt || new Date().toISOString(),
        })),
      };

      console.log('Payload to send:', JSON.stringify(payload, null, 2));

      const postResponse = await fetch('/api/userInfo/post-user-info+api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!postResponse.ok) {
        const errorData = await postResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `API Error: ${postResponse.status}`);
      }

      const result = await postResponse.json();
      console.log('Database push successful:', result);

      if (mountedRef.current) {
        // Mark all as synced
        const syncedContacts = contactsToSync.map(c => ({ ...c, synced: true }));
        setContacts(syncedContacts);
        await saveContactsToStorage(syncedContacts);
        
        // Update sync time
        const now = new Date().toISOString();
        await AsyncStorage.setItem('contacts_last_sync', now);
        setLastSyncTime(new Date(now));
        
        setSyncError(null);
      }

      return true;
    } catch (error) {
      console.error('Push to database error:', error);
      if (mountedRef.current) {
        setSyncError(error.message);
        Alert.alert('Sync Error', error.message);
      }
      return false;
    }
  };

  const handleSelectContact = async (contact) => {
    if (isManageMode) return;

    if (!location) {
      Alert.alert('Location Not Found', 'Cannot send check-in without your location.');
      return;
    }

    const isSmsAvailable = await SMS.isAvailableAsync();
    if (isSmsAvailable) {
      const message = `Check-in: I'm here and safe. My location is: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
      
      try {
        await SMS.sendSMSAsync([contact.phone], message);
        console.log(`Check-in sent to ${contact.name}`);
        onClose();
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
      `Remove ${contactToRemove.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: async () => {
            const updatedContacts = contacts.filter(c => c.id !== contactToRemove.id);
            setContacts(updatedContacts);
            await saveContactsToStorage(updatedContacts);
            await pushContactsToDatabase(updatedContacts);
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleAddFromPhone = async (selectedContact) => {
    if (contacts.some(c => c.phone === selectedContact.phone)) {
      Alert.alert("Already Added", `${selectedContact.name} is already in your contacts.`);
      return;
    }

    const newContact = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: selectedContact.name,
      phone: selectedContact.phone,
      relationship: selectedContact.relationship || '',
      createdAt: new Date().toISOString(),
      synced: false,
    };

    const updatedContacts = [...contacts, newContact];
    setContacts(updatedContacts);
    await saveContactsToStorage(updatedContacts);
    
    // Push to database immediately
    await pushContactsToDatabase(updatedContacts);
    console.log(`${selectedContact.name} added and synced to database`);
  };

  const toggleManageMode = () => {
    setIsManageMode(!isManageMode);
  };

  const ContactItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.contactItem} 
      onPress={() => handleSelectContact(item)}
      disabled={isManageMode}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <Text style={styles.contactName}>{item.name}</Text>
          {!item.synced && (
            <View style={styles.unsyncedBadge}>
              <Ionicons name="cloud-offline" size={12} color="#FF9500" />
            </View>
          )}
        </View>
        <Text style={styles.contactPhone}>{item.phone}</Text>
        {item.relationship && (
          <Text style={styles.contactRelationship}>{item.relationship}</Text>
        )}
      </View>
      {isManageMode && (
        <TouchableOpacity 
          onPress={() => handleRemoveContact(item)}
          style={styles.removeButton}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-bin" size={20} color="#FF6B6B" />
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
        animationType="fade" 
        transparent={true} 
        visible={modalVisible} 
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {isManageMode ? 'Manage Contacts' : 'Emergency Contacts'}
              </Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity 
                  style={[styles.headerButton, isSyncing && styles.syncingButton]} 
                  onPress={syncWithDatabase}
                  disabled={isSyncing}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={isSyncing ? "sync" : "cloud"} 
                    size={18} 
                    color={isSyncing ? "#007AFF" : "#666"} 
                  />
                </TouchableOpacity>
                
                {contacts.length > 0 && (
                  <TouchableOpacity 
                    style={[styles.headerButton, isManageMode && styles.headerButtonActive]} 
                    onPress={toggleManageMode}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={isManageMode ? "checkmark" : "settings"} 
                      size={18} 
                      color={isManageMode ? "#fff" : "#666"} 
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={28} color="#ccc" />
                </TouchableOpacity>
              </View>
            </View>

            {syncError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                <Text style={styles.errorText}>{syncError}</Text>
              </View>
            )}

            <View style={styles.statusBar}>
              <View style={styles.statusLeft}>
                <Text style={styles.contactCount}>
                  {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
                </Text>
              </View>
              
              {lastSyncTime && (
                <Text style={styles.syncText}>
                  Synced {lastSyncTime.toLocaleTimeString()}
                </Text>
              )}
            </View>

            {isManageMode && (
              <TouchableOpacity 
                style={styles.addContactButton} 
                onPress={() => setIsPhonePickerVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={24} color="#007AFF" />
                <Text style={styles.addContactText}>Add Emergency Contact</Text>
              </TouchableOpacity>
            )}

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading contacts...</Text>
              </View>
            ) : (
              <FlatList
                data={contacts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ContactItem item={item} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={64} color="#ccc" style={styles.emptyIcon} />
                    <Text style={styles.emptyText}>No emergency contacts</Text>
                    <Text style={styles.emptySubtext}>
                      {isManageMode 
                        ? "Add contacts from your phone to get started" 
                        : "Switch to manage mode to add contacts"}
                    </Text>
                    {!isManageMode && (
                      <TouchableOpacity 
                        style={styles.addFirstContactButton} 
                        onPress={() => setIsManageMode(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.addFirstContactButtonText}>Add Contacts</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                }
              />
            )}

            {!isManageMode && contacts.length > 0 && (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Tap a contact to send your location
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
    height: '75%' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold',
    flex: 1,
    color: '#333'
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerButtonActive: {
    backgroundColor: '#007AFF'
  },
  syncingButton: {
    backgroundColor: '#E3F2FD'
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#FF3B30',
    fontSize: 13,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 12,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactCount: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  syncText: {
    fontSize: 12,
    color: '#666',
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  addContactText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600'
  },
  contactItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 4,
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0' 
  },
  avatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#007AFF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  avatarText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  contactInfo: {
    flex: 1
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactName: { 
    fontSize: 16, 
    fontWeight: '600',
    flex: 1,
    color: '#333'
  },
  unsyncedBadge: {
    marginLeft: 6,
  },
  contactPhone: { 
    fontSize: 14, 
    color: '#666', 
    marginTop: 1 
  },
  contactRelationship: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  removeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
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
    paddingTop: 40
  },
  emptyIcon: {
    marginBottom: 16
  },
  emptyText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333',
    marginBottom: 8
  },
  emptySubtext: { 
    fontSize: 14, 
    color: '#666', 
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20
  },
  addFirstContactButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22
  },
  addFirstContactButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});

export default ContactListModal;