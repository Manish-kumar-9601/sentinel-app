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
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const BATCH_SAVE_DELAY = 1000; // 1 second delay for batch saving

const ContactListModal = ({ visible, onClose }) => {
  const [contacts, setContacts] = useState([]);
  const [location, setLocation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isPhonePickerVisible, setIsPhonePickerVisible] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingSave, setPendingSave] = useState(false);
  
  // Refs for debouncing and batch operations
  const saveTimeoutRef = useRef(null);
  const syncTimeoutRef = useRef(null);
  const pendingContactsRef = useRef([]);
  const mountedRef = useRef(true); // Track if component is mounted

  // Load contacts when component mounts - FIXED: Always load regardless of visible prop
  useEffect(() => {
    console.log('ContactListModal mounted, loading contacts...');
    loadContacts();
    loadLastSyncTime();
    
    // Cleanup function
    return () => {
      mountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - run only on mount

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      loadLocation();
      // Auto-sync if needed (debounced)
      debouncedAutoSync();
    } else {
      setModalVisible(false);
      setIsManageMode(false);
      // Save any pending changes before closing
      if (pendingContactsRef.current.length > 0) {
        saveContactsImmediately(pendingContactsRef.current);
      }
    }
  }, [visible]);

  // Load last sync time from storage
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

  // FIXED: Improved contact loading with better error handling and logging
  const loadContacts = async () => {
    console.log('Starting to load contacts from storage...');
    try {
      setIsLoading(true);
      
      // Get data from AsyncStorage
      const storedContacts = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
      console.log('Raw stored contacts data:', storedContacts ? 'Found data' : 'No data found');
      
      if (storedContacts && mountedRef.current) {
        try {
          const parsedContacts = JSON.parse(storedContacts);
          console.log('Parsed contacts:', parsedContacts.length, 'contacts found');
          
          // Validate that it's an array
          if (Array.isArray(parsedContacts)) {
            setContacts(parsedContacts);
            pendingContactsRef.current = parsedContacts;
            console.log(`Successfully loaded ${parsedContacts.length} contacts from storage`);
          } else {
            console.warn('Stored contacts is not an array, resetting to empty');
            setContacts([]);
            pendingContactsRef.current = [];
          }
        } catch (parseError) {
          console.error('Failed to parse stored contacts JSON:', parseError);
          setContacts([]);
          pendingContactsRef.current = [];
        }
      } else {
        console.log('No contacts found in storage or component unmounted');
        if (mountedRef.current) {
          setContacts([]);
          pendingContactsRef.current = [];
        }
      }
    } catch (error) {
      console.error("Failed to load contacts from storage", error);
      if (mountedRef.current) {
        setContacts([]);
        pendingContactsRef.current = [];
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Debounced auto-sync
  const debouncedAutoSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        checkAndAutoSync();
      }
    }, 500);
  }, []);

  // Check if auto-sync is needed
  const checkAndAutoSync = async () => {
    if (!mountedRef.current) return;
    
    try {
      const lastSync = await AsyncStorage.getItem('contacts_last_sync');
      if (lastSync) {
        const timeSinceSync = Date.now() - new Date(lastSync).getTime();
        if (timeSinceSync > SYNC_INTERVAL) {
          console.log('Auto-syncing contacts...');
          await syncWithDatabase();
        }
      } else {
        // First time, sync immediately but silently
        await syncWithDatabase(true);
      }
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  };

  // Optimized sync with database
  const syncWithDatabase = async (silent = false) => {
    if (isSyncing || !mountedRef.current) return; // Prevent multiple simultaneous syncs
    
    try {
      if (!silent) setIsSyncing(true);
      
      // Fetch latest user info including contacts from API
      const response = await fetch('/api/user-info', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok && mountedRef.current) {
        const data = await response.json();
        const serverContacts = data.emergencyContacts || [];
        
        // Merge server contacts with any local pending changes
        const mergedContacts = mergeContacts(contacts, serverContacts);
        
        // Update state and storage without triggering another sync
        await saveContactsToStorage(mergedContacts);
        if (mountedRef.current) {
          setContacts(mergedContacts);
          pendingContactsRef.current = mergedContacts;
        }
        
        // Update sync timestamp
        const now = new Date().toISOString();
        await AsyncStorage.setItem('contacts_last_sync', now);
        if (mountedRef.current) {
          setLastSyncTime(new Date(now));
        }
        
        console.log(`Contacts synced successfully (${mergedContacts.length} contacts)`);
      } else {
        console.log('Failed to sync contacts:', response.status);
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      if (!silent && mountedRef.current) setIsSyncing(false);
    }
  };

  // Merge contacts intelligently
  const mergeContacts = (localContacts, serverContacts) => {
    const merged = [...serverContacts]; // Start with server as source of truth
    
    // Add local contacts that don't exist on server
    localContacts.forEach(localContact => {
      const existsOnServer = serverContacts.some(
        serverContact => serverContact.id === localContact.id || 
                        serverContact.phone === localContact.phone
      );
      
      if (!existsOnServer && localContact.name && localContact.phone) {
        merged.push({
          ...localContact,
          synced: false // Mark as needing sync
        });
      }
    });
    
    return merged.map(contact => ({
      ...contact,
      synced: serverContacts.some(sc => sc.id === contact.id) // Mark as synced if from server
    }));
  };

  // Load location (cached)
  const loadLocation = useCallback(async () => {
    if (location || !mountedRef.current) return; // Use cached location
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted' && mountedRef.current) {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced, // Faster, less accurate
        });
        if (mountedRef.current) {
          setLocation(currentLocation);
        }
      } else {
        Alert.alert("Permission Denied", "Location access is needed for check-in messages.");
      }
    } catch (error) {
      console.error("Failed to get location", error);
    }
  }, [location]);

  // FIXED: Improved save to storage with validation
  const saveContactsToStorage = async (contactsToSave) => {
    if (!Array.isArray(contactsToSave)) {
      console.error('Invalid contacts data for saving:', contactsToSave);
      return false;
    }
    
    try {
      const jsonValue = JSON.stringify(contactsToSave);
      await AsyncStorage.setItem(CONTACTS_STORAGE_KEY, jsonValue);
      console.log(`Saved ${contactsToSave.length} contacts to storage`);
      
      // Verify the save worked
      const verification = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
      if (verification) {
        console.log('Storage save verified successfully');
        return true;
      } else {
        console.error('Storage save verification failed');
        return false;
      }
    } catch (error) {
      console.error('Failed to save contacts to storage:', error);
      return false;
    }
  };

  // Batch save contacts with debouncing
  const batchSaveContacts = useCallback((contactsToSave) => {
    if (!mountedRef.current) return;
    
    pendingContactsRef.current = contactsToSave;
    setPendingSave(true);
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for batch save
    saveTimeoutRef.current = setTimeout(async () => {
      if (mountedRef.current) {
        await saveContactsImmediately(contactsToSave);
        setPendingSave(false);
      }
    }, BATCH_SAVE_DELAY);
  }, []);

  // Immediate save (for critical operations)
  const saveContactsImmediately = async (contactsToSave) => {
    if (!mountedRef.current) return false;
    
    try {
      // Save to storage first (fast)
      const saveSuccess = await saveContactsToStorage(contactsToSave);
      if (!saveSuccess) {
        console.error('Failed to save to local storage');
        return false;
      }
      
      // Sync to database in background (slow)
      syncContactsToDatabase(contactsToSave);
      
      return true;
    } catch (error) {
      console.error('Failed to save contacts immediately:', error);
      return false;
    }
  };

  // Background sync to database (non-blocking)
  const syncContactsToDatabase = async (contactsToSync) => {
    if (!mountedRef.current) return;
    
    try {
      // Get current user info first
      const userInfoResponse = await fetch('/api/user-info', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get current user info');
      }

      const currentData = await userInfoResponse.json();
      
      // Prepare the sync payload
      const payload = {
        userInfo: currentData.userInfo,
        medicalInfo: currentData.medicalInfo,
        emergencyContacts: contactsToSync.map(contact => ({
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          relationship: contact.relationship || '',
          createdAt: contact.createdAt || new Date().toISOString()
        }))
      };

      const response = await fetch('/api/user-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok && mountedRef.current) {
        console.log('Contacts synced to database successfully');
        
        // Update sync status in state
        const syncedContacts = contactsToSync.map(contact => ({
          ...contact,
          synced: true
        }));
        setContacts(syncedContacts);
        
        // Update sync time
        const now = new Date().toISOString();
        await AsyncStorage.setItem('contacts_last_sync', now);
        if (mountedRef.current) {
          setLastSyncTime(new Date(now));
        }
      } else {
        console.error('Failed to sync contacts to database');
      }
    } catch (error) {
      console.error('Database sync error:', error);
      
      // Mark contacts as unsynced
      if (mountedRef.current) {
        const unsyncedContacts = contactsToSync.map(contact => ({
          ...contact,
          synced: false
        }));
        setContacts(unsyncedContacts);
      }
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
        // Simple success feedback without annoying popup
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
          onPress: () => {
            const updatedContacts = contacts.filter(contact => contact.id !== contactToRemove.id);
            setContacts(updatedContacts);
            batchSaveContacts(updatedContacts);
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleAddFromPhone = (selectedContact) => {
    // Check if contact already exists
    if (contacts.some(c => c.phone === selectedContact.phone)) {
      Alert.alert("Already Added", `${selectedContact.name} is already in your contacts.`);
      return;
    }

    // Create new contact with proper structure
    const newContact = {
      id: selectedContact.id || generateUniqueId(),
      name: selectedContact.name,
      phone: selectedContact.phone,
      relationship: selectedContact.relationship || '',
      createdAt: new Date().toISOString(),
      synced: false // Mark as not synced yet
    };

    const updatedContacts = [...contacts, newContact];
    setContacts(updatedContacts);
    batchSaveContacts(updatedContacts);
    
    // Simple success feedback
    console.log(`${selectedContact.name} added to contacts`);
  };

  // Generate unique ID for new contacts
  const generateUniqueId = () => {
    return 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const toggleManageMode = () => {
    setIsManageMode(!isManageMode);
  };

  const handleManualSync = async () => {
    await syncWithDatabase();
  };

  // FIXED: Add debug function to test storage
  const debugStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
      console.log('=== DEBUG STORAGE ===');
      console.log('Raw stored data:', stored);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('Parsed data:', parsed);
        console.log('Is array:', Array.isArray(parsed));
        console.log('Length:', parsed.length);
      }
      console.log('Current contacts state:', contacts);
      console.log('=== END DEBUG ===');
    } catch (error) {
      console.error('Debug storage error:', error);
    }
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
                {/* Debug button - remove in production */}
                <TouchableOpacity 
                  style={styles.headerButton} 
                  onPress={debugStorage}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bug" size={18} color="#666" />
                </TouchableOpacity>
                
                {/* Sync button */}
                <TouchableOpacity 
                  style={[styles.headerButton, isSyncing && styles.syncingButton]} 
                  onPress={handleManualSync}
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

            {/* Status bar */}
            <View style={styles.statusBar}>
              <View style={styles.statusLeft}>
                <Text style={styles.contactCount}>
                  {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
                </Text>
                {pendingSave && (
                  <Text style={styles.savingText}>Saving...</Text>
                )}
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
  savingText: {
    fontSize: 12,
    color: '#FF9500',
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