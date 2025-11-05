import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';

const CONTACTS_STORAGE_KEY = 'emergency_contacts';

const CheckContactScreen = () =>
{
    const router = useRouter();
    const { t } = useTranslation();
    const { colors } = useThemedStyles();
    const [contacts, setContacts] = useState([]);
    const [location, setLocation] = useState(null);

    // Load contacts and current location when the screen opens
    useEffect(() =>
    {
        const loadData = async () =>
        {
            // Load contacts
            try
            {
                const storedContacts = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
                if (storedContacts)
                {
                    setContacts(JSON.parse(storedContacts));
                }
            } catch (error)
            {
                console.error("Failed to load contacts for check-in", error);
            }

            // Get current location
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted')
            {
                const currentLocation = await Location.getCurrentPositionAsync({});
                setLocation(currentLocation);
            } else
            {
                Alert.alert(t('checkContact.permissionDenied'), t('checkContact.locationPermissionMessage'));
            }
        };
        loadData();
    }, []);

    const handleSelectContact = async (contact) =>
    {
        if (!location)
        {
            Alert.alert(t('checkContact.locationNotFound'), t('checkContact.noLocationMessage'));
            return;
        }

        const isSmsAvailable = await SMS.isAvailableAsync();
        if (isSmsAvailable)
        {
            const message = `${t('checkContact.checkInMessage')} ${t('checkContact.myLocation')}: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
            await SMS.sendSMSAsync([contact.phone], message);
            router.back(); // Go back after sending
        } else
        {
            Alert.alert(t('checkContact.error'), t('checkContact.smsUnavailable'));
        }
    };

    return (
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>{t('checkContact.selectContact')}</Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="close-circle" size={30} color={colors.textTertiary} />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={contacts}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={[styles.contactItem, { borderBottomColor: colors.border }]} onPress={() => handleSelectContact(item)}>
                            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                                <Text style={[styles.avatarText, { color: colors.textInverse }]}>{item.name.charAt(0)}</Text>
                            </View>
                            <View>
                                <Text style={[styles.contactName, { color: colors.text }]}>{item.name}</Text>
                                <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>{item.phone}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.text }]}>{t('checkContact.noContacts')}</Text>
                            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>{t('checkContact.addContactsMessage')}</Text>
                        </View>
                    }
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    modalContainer: { flex: 1, justifyContent: 'flex-end' },
    modalContent: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 22, fontWeight: 'bold' },
    contactItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
    avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { fontSize: 20, fontWeight: 'bold' },
    contactName: { fontSize: 18, fontWeight: '500' },
    contactPhone: { fontSize: 14, marginTop: 2 },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    }
});

export default CheckContactScreen;
