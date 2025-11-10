/**
 * My Circle Screen - MIGRATED TO GLOBAL STORE
 * 
 * Emergency contacts management using centralized Zustand store.
 * This version eliminates local state and manual storage operations.
 * 
 * Benefits:
 * - ✅ Automatic persistence
 * - ✅ Real-time sync across screens
 * - ✅ Offline support with queue
 * - ✅ Type-safe operations
 * - ✅ Less boilerplate code
 */

import type { EmergencyContact } from '@/services/StorageService';
import { useContacts } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhoneContactsModal from '../../../components/PhoneContactsModal';
import { useThemedStyles } from '../../../hooks/useThemedStyles';

// ✅ Define fixed item height for FlatList optimization
const ITEM_HEIGHT = 80; // Height of each contact item

export default function MyCircleScreen() {
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const { t } = useTranslation();
  const { colors } = useThemedStyles();

  // 🎯 GLOBAL STORE HOOK - replaces local state & useEffect
  const {
    contacts,
    loading: contactsLoading,
    error: contactsError,
    addContact,
    removeContact,
    loadContacts,
  } = useContacts();

  // Load contacts on mount (store handles caching)
  useEffect(() => {
    loadContacts();
  }, []);

  // Show error if loading fails
  useEffect(() => {
    if (contactsError) {
      Alert.alert(t('myCircle.error'), contactsError);
    }
  }, [contactsError, t]);

  // --- Logic to Remove a Contact ---
  const handleRemoveContact = async (contactToRemove: EmergencyContact) => {
    Alert.alert(
      t('myCircle.removeTitle'),
      t('myCircle.removeMessage', { name: contactToRemove.name }),
      [
        { text: t('myCircle.cancel'), style: 'cancel' },
        {
          text: t('myCircle.remove'),
          onPress: async () => {
            try {
              // 🚀 Single call - store handles persistence + sync
              await removeContact(contactToRemove.id);

              Alert.alert(
                t('myCircle.success'),
                t('myCircle.removeSuccess', { name: contactToRemove.name })
              );
            } catch (error) {
              console.error('Failed to remove contact:', error);
              Alert.alert(t('myCircle.error'), t('myCircle.removeError'));
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  // --- Logic to Add a Contact from the Phone Contacts Modal ---
  const handleSelectFromPhone = async (selectedContact: any) => {
    // Check if contact already exists
    if (contacts.some(c => c.id === selectedContact.id)) {
      Alert.alert(
        t('myCircle.contactExists'),
        t('myCircle.contactExistsMessage', { name: selectedContact.name })
      );
      return;
    }

    try {
      // Create new contact object
      const newContact: EmergencyContact = {
        id: selectedContact.id || Date.now().toString(),
        name: selectedContact.name,
        phone: selectedContact.phone,
      };

      // 🚀 Single call - store handles persistence + sync
      await addContact(newContact);

      // Close modal on success
      setIsPickerVisible(false);

      Alert.alert(
        t('myCircle.success'),
        t('myCircle.addSuccess', { name: selectedContact.name })
      );
    } catch (error) {
      console.error('Failed to add contact:', error);
      Alert.alert(t('myCircle.error'), t('myCircle.addError'));
    }
  };

  // ✅ Memoized contact item component - prevents re-renders
  const ContactItem = useCallback(({ item }: { item: EmergencyContact }) => (
    <View style={styles.contactItem}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
      </View>
      <TouchableOpacity onPress={() => handleRemoveContact(item)}>
        <Ionicons name="trash-bin" size={24} color={colors.error} />
      </TouchableOpacity>
    </View>
  ), [colors.error, handleRemoveContact]); // Dependencies

  // ✅ Memoized render function
  const renderItem = useCallback(({ item }: { item: EmergencyContact }) => (
    <ContactItem item={item} />
  ), [ContactItem]);

  // ✅ Memoized key extractor
  const keyExtractor = useCallback((item: EmergencyContact) => item.id, []);

  // ✅ Memoized getItemLayout for better scrolling performance
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const styles = StyleSheet.create({
    container: {
      paddingTop: 30,
      flex: 1,
      backgroundColor: colors.backgroundSecondary
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 6,
      paddingHorizontal: 20,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
      color: colors.text,
    },
    addButton: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 4,
      borderRadius: 20,
      alignItems: 'center',
    },
    addButtonText: {
      color: colors.textInverse,
      fontWeight: 'bold',
      marginLeft: 5
    },
    listContainer: { padding: 20 },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 15,
      borderRadius: 10,
      marginBottom: 15,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 3,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    avatarText: {
      color: colors.textInverse,
      fontSize: 20,
      fontWeight: 'bold'
    },
    contactInfo: { flex: 1 },
    contactName: {
      fontSize: 18,
      fontWeight: '500',
      color: colors.text
    },
    contactPhone: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 100,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 10,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  // Show loading spinner while fetching
  if (contactsLoading && contacts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerPressable} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.navigatorColor} />
            <Text style={styles.headerTitle}>{t('myCircle.title')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptySubtext, { marginTop: 20 }]}>
            {t('myCircle.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerPressable} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.navigatorColor} />
          <Text style={styles.headerTitle}>{t('myCircle.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsPickerVisible(true)}>
          <Ionicons name="add" size={24} color={colors.textInverse} />
          <Text style={styles.addButtonText}>{t('myCircle.add')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={contacts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContainer}
        // ✅ FlatList performance optimizations
        initialNumToRender={10} // Render first 10 items immediately
        maxToRenderPerBatch={5} // Render 5 items per batch
        windowSize={10} // Keep 10 screens worth of items in memory
        removeClippedSubviews={true} // Remove off-screen views (Android optimization)
        updateCellsBatchingPeriod={50} // Batch updates for smoother scrolling
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
}
