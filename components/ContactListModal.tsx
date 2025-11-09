// components/ContactListModal.tsx
import { useAuth } from '@/context/AuthContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useContacts } from '@/store';
import {
  NetworkManager
} from '@/utils/syncManager';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import PhoneContactsModal from './PhoneContactsModal';

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
  const { colors } = useThemedStyles();

  // 🎯 GLOBAL STORE HOOK - replaces local cache management
  const {
    contacts,
    loading: isLoading,
    error: contactsError,
    addContact,
    removeContact,
    loadContacts,
  } = useContacts();

  // Local state
  const [location, setLocation] = useState<any>(null);
  const [isPhonePickerVisible, setIsPhonePickerVisible] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Refs
  const mountedRef = useRef(true);
  const locationCacheRef = useRef<any>(null);

  // Initialize
  useEffect(() => {
    mountedRef.current = true;

    // Load contacts from global store
    loadContacts();

    // Setup network listener
    const unsubscribe = NetworkManager.getInstance().subscribe(online => {
      console.log(`📡 [ContactListModal] Network changed: ${online ? 'ONLINE' : 'OFFLINE'}`);
      setIsOnline(online);
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [loadContacts]);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      fetchLocation();
    }
  }, [visible]);

  /**
   * Fetch current location
   */
  const fetchLocation = async () => {
    // Use cached location if available and recent
    if (locationCacheRef.current) {
      console.log('📍 [ContactListModal] Using cached location');
      setLocation(locationCacheRef.current);
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[ContactListModal] Location permission denied');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (mountedRef.current) {
        locationCacheRef.current = currentLocation;
        setLocation(currentLocation);
        console.log('📍 [ContactListModal] Location fetched');
      }
    } catch (error) {
      console.error('[ContactListModal] Failed to get location:', error);
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

    try {
      // 🎯 Use global store to add contact
      await addContact(newContact);
      console.log(`➕ [ContactListModal] Added contact: ${newContact.name}`);
    } catch (error) {
      console.error('[ContactListModal] Failed to add contact:', error);
      Alert.alert('Error', 'Failed to add contact. Please try again.');
    }
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
            try {
              // 🎯 Use global store to remove contact
              await removeContact(contactToRemove.id);
              console.log(`🗑️ [ContactListModal] Removed contact: ${contactToRemove.name}`);
            } catch (error) {
              console.error('[ContactListModal] Failed to remove contact:', error);
              Alert.alert('Error', 'Failed to remove contact. Please try again.');
            }
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
   * Manual sync trigger - delegates to global store
   */
  const handleManualSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline');
      return;
    }

    try {
      // Reload contacts from store (which will sync if needed)
      await loadContacts();
      Alert.alert('Success', 'Contacts synced successfully');
      refreshAppState?.();
    } catch (error) {
      console.error('[ContactListModal] Sync failed:', error);
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
          <Text style={[styles.contactName, { color: colors.text }]}>{item.name}</Text>
          {!item.synced && (
            <View style={styles.unsyncedBadge}>
              <Ionicons name="cloud-offline" size={12} color={colors.warning} />
            </View>
          )}
        </View>
        <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>{item.phone}</Text>
        {item.relationship && (
          <Text style={[styles.contactRelationship, { color: colors.textSecondary }]}>{item.relationship}</Text>
        )}
      </View>
      {isManageMode && (
        <TouchableOpacity
          onPress={() => handleRemoveContact(item)}
          style={styles.removeButton}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-bin" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}
      {!isManageMode && (
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
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
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                {isManageMode ? 'Manage Contacts' : 'Emergency Contacts'}
              </Text>
              <View style={styles.headerButtons}>
                {/* Sync button */}
                <TouchableOpacity
                  style={[styles.headerButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={handleManualSync}
                  disabled={isLoading || !isOnline}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="cloud"
                    size={18}
                    color={isOnline ? colors.textSecondary : colors.textTertiary}
                  />
                </TouchableOpacity>

                {/* Manage mode toggle */}
                {contacts.length > 0 && (
                  <TouchableOpacity
                    style={[styles.headerButton, { backgroundColor: colors.backgroundSecondary }, isManageMode && [styles.headerButtonActive, { backgroundColor: colors.info }]]}
                    onPress={() => setIsManageMode(!isManageMode)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isManageMode ? 'checkmark' : 'settings'}
                      size={18}
                      color={isManageMode ? colors.textInverse : colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}

                {/* Close button */}
                <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={28} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Status bar */}
            <View style={styles.statusBar}>
              <View style={styles.statusLeft}>
                <Text style={[styles.contactCount, { color: colors.textSecondary }]}>
                  {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {!isOnline && (
                <View style={styles.offlineBadge}>
                  <Text style={styles.offlineText}>Offline</Text>
                </View>
              )}
            </View>

            {/* Add contact button */}
            {isManageMode && (
              <TouchableOpacity
                style={styles.addContactButton}
                onPress={() => setIsPhonePickerVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={24} color={colors.info} />
                <Text style={[styles.addContactText, { color: colors.info }]}>Add Emergency Contact</Text>
              </TouchableOpacity>
            )}

            {/* Contacts list */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.info} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading contacts...</Text>
              </View>
            ) : (
              <FlatList
                data={contacts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ContactItem item={item} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={64} color={colors.textTertiary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No emergency contacts</Text>
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
  },
  modalContent: {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonActive: {
  },
  syncingButton: {
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    fontWeight: '500',
  },
  unsyncedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unsyncedText: {
    fontSize: 11,
    fontWeight: '500',
  },
  offlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  syncText: {
    fontSize: 12,
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  addContactText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
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
  },
  unsyncedBadge: {
    marginLeft: 6,
  },
  contactPhone: {
    fontSize: 14,
    marginTop: 1,
  },
  contactRelationship: {
    fontSize: 12,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  addFirstContactButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
  },
  addFirstContactButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ContactListModal;