<<<<<<< HEAD
import type { EmergencyContact } from '@/services/StorageService';
import { StorageService } from '@/services/StorageService';
=======
import { useEmergencyContacts } from '@/context/EmergencyContactsContext';
>>>>>>> 8496b3f7aefa1e42e06318f68c1f526fcd481795
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
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
import { useThemedStyles } from '../../../hooks/useThemedStyles';

export default function MyCircleScreen() {
<<<<<<< HEAD
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
=======
  // Use global emergency contacts context
  const { contacts, loading, addContact, deleteContact } = useEmergencyContacts();
>>>>>>> 8496b3f7aefa1e42e06318f68c1f526fcd481795
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const { t } = useTranslation();
  const { colors } = useThemedStyles();

<<<<<<< HEAD
  // --- Load contacts from storage when the screen opens ---
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const storedContacts = await StorageService.getEmergencyContacts();
        setContacts(storedContacts);
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
        await StorageService.setEmergencyContacts(contacts);
      } catch (error) {
        console.error('Failed to save contacts.', error);
      }
    };
    // Only save if contacts isn't the initial empty array
    if (contacts.length > 0) {
      saveContacts();
    }
  }, [contacts]);


=======
>>>>>>> 8496b3f7aefa1e42e06318f68c1f526fcd481795
  // --- Logic to Remove a Contact ---
  const handleRemoveContact = async (contactToRemove: any) => {
    Alert.alert(
      t('myCircle.removeTitle'),
      t('myCircle.removeMessage', { name: contactToRemove.name }),
      [
        { text: t('myCircle.cancel'), style: 'cancel' },
        {
          text: t('myCircle.remove'),
          onPress: async () => {
            try {
              await deleteContact(contactToRemove.id);
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
    // Check if contact already exists in the circle
    if (contacts.some(c => c.id === selectedContact.id)) {
      Alert.alert(t('myCircle.contactExists'), t('myCircle.contactExistsMessage', { name: selectedContact.name }));
    } else {
      try {
        await addContact({
          name: selectedContact.name,
          phone: selectedContact.phone,
          relationship: selectedContact.relationship || ''
        });
      } catch (error) {
        console.error('Failed to add contact:', error);
        Alert.alert(t('myCircle.error'), t('myCircle.addError'));
      }
    }
  };

  // --- UI Component for each contact in the list ---
  const ContactItem = ({ item }: { item: any }) => (
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
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerPressable} onPress={() => { router.back() }}>
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
