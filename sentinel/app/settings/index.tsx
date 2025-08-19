import React, {useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
// import { useAuth } from '@/context/auth'; // Assuming your auth context is here

// --- Configuration ---
const FAKE_CALLER_NAME_KEY = 'fake_caller_name';
const FAKE_CALLER_NUMBER_KEY = 'fake_caller_number';
const FAKE_CALL_RINGTONE_KEY = 'fake_call_ringtone_uri';

// --- Reusable UI Component for a settings link ---
const SettingsLinkRow = ({ href, icon, label, description, onPress }) => {
    const content = (
        <TouchableOpacity style={styles.row} onPress={onPress}>
            <View style={styles.iconContainer}>
                <Ionicons name={icon} size={24} color="#666" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.label}>{label}</Text>
                {description && <Text style={styles.description} numberOfLines={1}>{description}</Text>}
            </View>
            <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={22} color="#C7C7CC" />
            </View>
        </TouchableOpacity>
    );

    return href ? <Link href={href} asChild>{content}</Link> : content;
};


export default function SettingsScreen() {
    // const { signOut } = useAuth(); // Uncomment when auth context is ready
    const router = useRouter();
    const [fakeCallerName, setFakeCallerName] = useState('');
    const [fakeCallerNumber, setFakeCallerNumber] = useState('');
    const [ringtoneName, setRingtoneName] = useState('Default');

    // --- Load saved settings ---
    useEffect(() => {
        const loadSettings = async () => {
            const storedName = await AsyncStorage.getItem(FAKE_CALLER_NAME_KEY);
            if (storedName) setFakeCallerName(storedName);

            const storedNumber = await AsyncStorage.getItem(FAKE_CALLER_NUMBER_KEY);
            if (storedNumber) setFakeCallerNumber(storedNumber);

            const storedRingtoneUri = await AsyncStorage.getItem(FAKE_CALL_RINGTONE_KEY);
            if (storedRingtoneUri) {
                const fileInfo = await FileSystem.getInfoAsync(storedRingtoneUri);
                if (fileInfo.exists) {
                    const originalName = storedRingtoneUri.split('/').pop().replace(/%20/g, ' ').replace('custom_ringtone_', '');
                    setRingtoneName(originalName);
                }
            }
        };
        loadSettings();
    }, []);

    // --- Handlers ---
    const handleSaveSettings = async () => {
        try {
            await AsyncStorage.setItem(FAKE_CALLER_NAME_KEY, fakeCallerName.trim());
            await AsyncStorage.setItem(FAKE_CALLER_NUMBER_KEY, fakeCallerNumber.trim());
            Alert.alert('Saved!', 'Fake call settings have been updated.');
            Keyboard.dismiss();
        } catch (error) {
            console.error('Failed to save settings.', error);
            Alert.alert('Error', 'Could not save your settings.');
        }
    };
    
    const handleSetRingtone = async () => { /* ... (remains the same) ... */ };
    const handleSignOut = () => { /* ... (remains the same) ... */ };

    return (
        <ScrollView style={styles.container}>
            {/* ... (Account Section) ... */}

            {/* --- Features Section --- */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Features</Text>
                <View style={styles.card}>
                    {/* Fake Caller Name Input */}
                    <View style={styles.inputRow}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="person-circle-outline" size={24} color="#666" />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.label}>Fake Caller Name</Text>
                            <TextInput
                                placeholder="e.g., Mom, Dad, Office"
                                style={styles.input}
                                value={fakeCallerName}
                                onChangeText={setFakeCallerName}
                            />
                        </View>
                    </View>
                    {/* Fake Caller Number Input */}
                    <View style={styles.inputRow}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="call-outline" size={24} color="#666" />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.label}>Fake Caller Number</Text>
                            <TextInput
                                placeholder="+91 98765 43210"
                                style={styles.input}
                                value={fakeCallerNumber}
                                onChangeText={setFakeCallerNumber}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>
                     <SettingsLinkRow
                        onPress={handleSetRingtone}
                        icon="musical-notes-outline"
                        label="Fake Call Ringtone"
                        description={ringtoneName}
                    />
                    {/* Save Button */}
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
                        <Text style={styles.saveButtonText}>Save Fake Call Settings</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ... (Security and Sign Out sections) ... */}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    section: { marginTop: 20, marginHorizontal: 16 },
    sectionTitle: {
        fontSize: 14, fontWeight: '600', color: '#6D6D72',
        textTransform: 'uppercase', marginBottom: 8, paddingLeft: 16,
    },
    card: { backgroundColor: 'white', borderRadius: 10, overflow: 'hidden' },
    row: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
        paddingVertical: 12, backgroundColor: 'white',
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EFEFF4',
    },
    iconContainer: { width: 30, alignItems: 'center' },
    textContainer: { flex: 1, paddingHorizontal: 12 },
    label: { fontSize: 16, color: '#000' },
    description: { fontSize: 13, color: '#6e6e73', marginTop: 2 },
    chevronContainer: { justifyContent: 'center', alignItems: 'flex-end' },
    logoutButton: {
        backgroundColor: 'white', borderRadius: 10, margin: 16,
        marginTop: 30, padding: 14, alignItems: 'center',
    },
    logoutButtonText: { color: '#FF3B30', fontSize: 16, fontWeight: '600' },
    inputRow: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
        paddingVertical: 8, backgroundColor: 'white', borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#EFEFF4',
    },
    input: {marginVertical:1,  height: 40, fontSize: 16, color: '#333', flex: 1 },
    saveButton: {
        backgroundColor: '#007AFF',
        padding: 14,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
