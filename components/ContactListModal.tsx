// components/ContactListModal.tsx
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
import * as SMS from 'expo-sms';
import * as Location from 'expo-location';
import PhoneContactsModal from './PhoneContactsModal';
import {
CacheManager,
NetworkManager,
OfflineQueueManager,
SYNC_CONFIG
} from '@/utils/syncManager';
import { useAuth } from '@/context/AuthContext';
import Constants from 'expo-constants';

interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
  createdAt?: string;
  synced?: boolean;
}

interface ContactListModalProps {
  visible: boolean;
  onClose: () => void;
  refreshAppState?: () => void;
}

const ContactListModal: React.FC<ContactListModalProps> = ({
  visible,
  onClose,
  refreshAppState
}) => {
  const { token } = useAuth();

  // State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [location, setLocation] = useState<any>(null);
  const [isPhonePickerVisible, setIsPhonePickerVisible] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // Refs
  const mountedRef = useRef(true);
  const syncTimeoutRef = useRef<number | undefined>(undefined);
  const locationCacheRef = useRef<any>(null);

  // Initialize
  useEffect(() => {
    mountedRef.current = true;
    loadContacts();
    loadLastSyncTime();

    // Setup network listener
    const unsubscribe = NetworkManager.getInstance().subscribe(online => {
      console.log(`📡 Network changed: ${online ? 'ONLINE' : 'OFFLINE'}`);
      setIsOnline(online);

      // Auto-sync when coming online with changes
      if (online && hasLocalChanges) {
        console.log('🔄 Came online with changes, syncing...');
        debouncedSync();
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      loadCachedLocation();
      checkSyncNeeded();
    }
  }, [visible]);

  /**
   * Load contacts from cache with fallback
   */
  const loadContacts = async () => {
    console.log('📥 Loading contacts...');
    setIsLoading(true);

    try {
      // Try cache first
      const cached = await CacheManager.get<Contact[]>(
        SYNC_CONFIG.KEYS.CONTACTS,
        SYNC_CONFIG.EXPIRY.CONTACTS
      );

      if (cached && mountedRef.current) {
        console.log(`✅ Loaded ${cached.data.length} contacts from cache`);
        setContacts(cached.data);
        setHasLocalChanges(!cached.metadata.synced);
      } else if (isOnline) {
        // Fetch from server if cache miss and online
        await fetchContactsFromServer();
      } else {
        // Offline with no cache
        console.log('⚠️ Offline with no cached contacts');
        setContacts([]);
      }
    } catch (error) {
      console.error('❌ Failed to load contacts:', error);
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch contacts from server
   */
  const fetchContactsFromServer = async () => {
    if (!token) return;

    try {
      const apiUrl = Constants.expoConfig?.extra?.apiUrl;
      if (!apiUrl) return;

      console.log('🌐 Fetching contacts from server...');

      const response = await fetch(`${apiUrl}/api/user-info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok && mountedRef.current) {
        const data = await response.json();
        const serverContacts: Contact[] = (data.emergencyContacts || []).map((c: any) => ({
          ...c,
          synced: true,
        }));

        await saveContactsToCache(serverContacts, true);
        setContacts(serverContacts);
        setLastSyncTime(new Date());
        console.log(`✅ Fetched ${serverContacts.length} contacts from server`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch contacts from server:', error);
    }
  };

  /**
   * Save contacts to cache
   */
  const saveContactsToCache = async (
    contactsToSave: Contact[],
    synced: boolean = false
  ): Promise<boolean> => {
    try {
      await CacheManager.set(SYNC_CONFIG.KEYS.CONTACTS, contactsToSave, synced);
      setHasLocalChanges(!synced);
      console.log(`💾 Saved ${contactsToSave.length} contacts to cache (synced: ${synced})`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save contacts to cache:', error);
      return false;
    }
  };

  /**
   * Sync contacts to server
   */
  const syncContactsToServer = async (): Promise<boolean> => {
    if (!hasLocalChanges || !isOnline || !token) {
      return false;
    }

    setIsSyncing(true);

    try {
      console.log('🔄 Syncing contacts to server...');

      const apiUrl = Constants.expoConfig?.extra?.apiUrl;
      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      // Get current user info to preserve other data
      const userInfoResponse = await fetch(`${apiUrl}/api/user-info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get current user info');
      }

      const currentData = await userInfoResponse.json();

      // Prepare sync payload
      const payload = {
        userInfo: currentData.userInfo,
        medicalInfo: currentData.medicalInfo,
        emergencyContacts: contacts.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          relationship: c.relationship || '',
          createdAt: c.createdAt || new Date().toISOString(),
        })),
        lastUpdated: new Date().toISOString(),
      };

      const response = await fetch(`${apiUrl}/api/user-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: HTTP ${response.status}`);
      }

      // Mark all contacts as synced
      const syncedContacts = contacts.map(c => ({ ...c, synced: true }));
      await saveContactsToCache(syncedContacts, true);
      setContacts(syncedContacts);
      setLastSyncTime(new Date());

      console.log('✅ Contacts synced to server successfully');
      return true;

    } catch (error: any) {
      console.error('❌ Failed to sync contacts:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Debounced sync
   */
  const debouncedSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && hasLocalChanges && isOnline) {
        syncContactsToServer();
      }
    }, 2000);
  }, [hasLocalChanges, isOnline]);

  /**
   * Check if sync is needed
   */
  const checkSyncNeeded = async () => {
    const lastSync = await loadLastSyncTime();
    if (!lastSync) {
      await syncContactsToServer();
      return;
    }

    const timeSinceSync = Date.now() - lastSync.getTime();
    if (timeSinceSync > SYNC_CONFIG.EXPIRY.CONTACTS) {
      console.log('⏰ Sync needed based on time');
      await syncContactsToServer();
    }
  };

  /**
   * Load last sync time
   */
  const loadLastSyncTime = async (): Promise<Date | null> => {
    try {
      const stored = await CacheManager.get<string>(SYNC_CONFIG.KEYS.LAST_SYNC);
      if (stored && mountedRef.current) {
        const date = new Date(stored.data);
        setLastSyncTime(date);
        return date;
      }
    } catch (error) {
      console.error('Failed to load last sync time:', error);
    }
    return null;
  };

  /**
   * Load cached location with expiry check
   */
  const loadCachedLocation = async () => {
    if (locationCacheRef.current) {
      console.log('📍 Using in-memory cached location');
      setLocation(locationCacheRef.current);
      return;
    }

    try {
      const cached = await CacheManager.get<any>(
        SYNC_CONFIG.KEYS.LOCATION,
        SYNC_CONFIG.EXPIRY.LOCATION
      );

      if (cached && mountedRef.current) {
        console.log('📍 Using cached location');
        locationCacheRef.current = cached.data;
        setLocation(cached.data);
        return;
      }
    } catch (error) {
      console.error('Failed to load cached location:', error);
    }

    // Fetch fresh location
    await fetchLocation();
  };

  /**
   * Fetch current location
   */
  const fetchLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission denied');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (mountedRef.current) {
        locationCacheRef.current = currentLocation;
        setLocation(currentLocation);

        // Cache location
        await CacheManager.set(SYNC_CONFIG.KEYS.LOCATION, currentLocation, true);
        console.log('📍 Location fetched and cached');
      }
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  /**
   * Handle adding contact from phone
   */
  const handleAddFromPhone = async (selectedContact: Contact) => {
    if (contacts.some(c => c.phone === selectedContact.phone)) {
      Alert.alert('Already Added', `${selectedContact.name} is already in your contacts.`);
      return;
    }

    const newContact: Contact = {
      id: selectedContact.id || generateUniqueId(),
      name: selectedContact.name,
      phone: selectedContact.phone,
      relationship: selectedContact.relationship || '',
      createdAt: new Date().toISOString(),
      synced: false,
    };

    const updatedContacts = [...contacts, newContact];
    setContacts(updatedContacts);
    await saveContactsToCache(updatedContacts, false);

    // Queue for sync if offline
    if (!isOnline && token) {
      await OfflineQueueManager.getInstance().add({
        type: 'CREATE',
        entity: 'CONTACTS',
        data: { contact: newContact },
        token,
      });
    } else {
      debouncedSync();
    }

    console.log(`➕ Added contact: ${newContact.name}`);
  };

  /**
   * Handle removing contact
   */
  const handleRemoveContact = (contactToRemove: Contact) => {
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
            await saveContactsToCache(updatedContacts, false);

            // Queue for sync if offline
            if (!isOnline && token) {
              await OfflineQueueManager.getInstance().add({
                type: 'DELETE',
                entity: 'CONTACTS',
                data: { contactId: contactToRemove.id },
                token,
              });
            } else {
              debouncedSync();
            }

            console.log(`🗑️ Removed contact: ${contactToRemove.name}`);
          },
          style: 'destructive',
        },
      ]
    );
  };

  /**
   * Handle selecting contact for check-in
   */
  const handleSelectContact = async (contact: Contact) => {
    if (isManageMode) return;

    if (!location) {
      Alert.alert('Location Not Found', 'Cannot send check-in without your location.');
      return;
    }

    const isSmsAvailable = await SMS.isAvailableAsync();
    if (!isSmsAvailable) {
      Alert.alert('Error', 'SMS is not available on this device.');
      return;
    }

    try {
      const message = `Check-in: I'm here and safe. My location is: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
      await SMS.sendSMSAsync([contact.phone], message);
      console.log(`✅ Check-in sent to ${contact.name}`);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to send SMS. Please try again.');
    }
  };

  /**
   * Manual sync trigger
   */
  const handleManualSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline');
      return;
    }

    const success = await syncContactsToServer();
    if (success) {
      Alert.alert('Success', 'Contacts synced successfully');
      refreshAppState?.();
    } else {
      Alert.alert('Failed', 'Could not sync contacts. Please try again.');
    }
  };

  /**
   * Generate unique ID
   */
  const generateUniqueId = (): string => {
    return `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Contact item renderer
   */
  const ContactItem = ({ item }: { item: Contact }) => (
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
        visible={visible}
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>
                {isManageMode ? 'Manage Contacts' : 'Emergency Contacts'}
              </Text>
              <View style={styles.headerButtons}>
                {/* Sync button */}
                <TouchableOpacity
                  style={[styles.headerButton, isSyncing && styles.syncingButton]}
                  onPress={handleManualSync}
                  disabled={isSyncing || !isOnline}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isSyncing ? 'sync' : 'cloud'}
                    size={18}
                    color={isSyncing ? '#007AFF' : isOnline ? '#666' : '#ccc'}
                  />
                </TouchableOpacity>

                {/* Manage mode toggle */}
                {contacts.length > 0 && (
                  <TouchableOpacity
                    style={[styles.headerButton, isManageMode && styles.headerButtonActive]}
                    onPress={() => setIsManageMode(!isManageMode)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isManageMode ? 'checkmark' : 'settings'}
                      size={18}
                      color={isManageMode ? '#fff' : '#666'}
                    />
                  </TouchableOpacity>
                )}

                {/* Close button */}
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
                {hasLocalChanges && (
                  <View style={styles.unsyncedIndicator}>
                    <Ionicons name="cloud-offline" size={14} color="#FF9500" />
                    <Text style={styles.unsyncedText}>Unsynced</Text>
                  </View>
                )}
              </View>

              {!isOnline && (
                <View style={styles.offlineBadge}>
                  <Text style={styles.offlineText}>Offline</Text>
                </View>
              )}

              {lastSyncTime && isOnline && (
                <Text style={styles.syncText}>
                  Synced {lastSyncTime.toLocaleTimeString()}
                </Text>
              )}
            </View>

            {/* Add contact button */}
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

            {/* Contacts list */}
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
                    <Ionicons name="people-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>No emergency contacts</Text>
                    <Text style={styles.emptySubtext}>
                      {isManageMode
                        ? 'Add contacts from your phone to get started'
                        : 'Switch to manage mode to add contacts'}
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

            {/* Footer */}
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

// Styles
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonActive: {
    backgroundColor: '#007AFF',
  },
  syncingButton: {
    backgroundColor: '#E3F2FD',
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
  unsyncedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unsyncedText: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '500',
  },
  offlineBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
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
    fontWeight: '600',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
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
    color: '#333',
  },
  unsyncedBadge: {
    marginLeft: 6,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 1,
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
    paddingTop: 40,
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
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  addFirstContactButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
  },
  addFirstContactButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ContactListModal;