import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/context/auth'; // Assuming your auth context is here

// --- Reusable UI Component for a settings link ---
const SettingsLinkRow = ({ href, icon, label, description }) => (
    <Link href={href} asChild>
        <TouchableOpacity style={styles.row}>
            <View style={styles.iconContainer}>
                <Ionicons name={icon} size={24} color="#666" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.label}>{label}</Text>
                {description && <Text style={styles.description}>{description}</Text>}
            </View>
            <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={22} color="#C7C7CC" />
            </View>
        </TouchableOpacity>
    </Link>
);

export default function SettingsScreen() {
    const { signOut } = useAuth();
    const router = useRouter();

    const handleSignOut = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Log Out", 
                    style: "destructive", 
                    onPress: () => {
                        signOut();
                        // Redirect to the login screen after signing out
                        router.replace('/(auth)/login'); 
                    } 
                }
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            {/* --- Account Section --- */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.card}>
                    <SettingsLinkRow
                        href="/settings/emergency-contacts"
                        icon="people-outline"
                        label="Emergency Contacts"
                        description="Manage your trusted contacts"
                    />
                </View>
            </View>

            {/* --- Features Section --- */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Alert Triggers</Text>
                <View style={styles.card}>
                    <SettingsLinkRow
                        href="/settings/shake-and-voice"
                        icon="phone-portrait-outline"
                        label="Shake & Voice Activation"
                        description="Configure hands-free alerts"
                    />
                </View>
            </View>

            {/* --- Security Section --- */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Security</Text>
                <View style={styles.card}>
                    <SettingsLinkRow
                        href="/settings/privacy"
                        icon="shield-checkmark-outline"
                        label="Privacy & Security"
                        description="Manage your data and privacy"
                    />
                </View>
            </View>

            {/* --- Sign Out Button --- */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
                <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    section: {
        marginTop: 20,
        marginHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6D6D72',
        textTransform: 'uppercase',
        marginBottom: 8,
        paddingLeft: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 10,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#EFEFF4',
    },
    iconContainer: {
        width: 30,
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        paddingHorizontal: 12,
    },
    label: {
        fontSize: 16,
        color: '#000',
    },
    description: {
        fontSize: 13,
        color: '#6e6e73',
        marginTop: 2,
    },
    chevronContainer: {
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    logoutButton: {
        backgroundColor: 'white',
        borderRadius: 10,
        margin: 16,
        marginTop: 30,
        padding: 14,
        alignItems: 'center',
    },
    logoutButtonText: {
        color: '#FF3B30', // A standard red color for destructive actions
        fontSize: 16,
        fontWeight: '600',
    },
});
