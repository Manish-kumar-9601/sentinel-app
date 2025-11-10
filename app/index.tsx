import { StorageService } from '@/services/StorageService';
import { migrateOldData } from '@/utils/migration';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
// Import the app logo
const sentinelIcon = require('../assets/images/sentinel-icon.png');

/**
 * This is the initial splash screen for the application.
 * It handles the core logic of checking the user's authentication status
 * and redirecting them to the appropriate part of the app.
 * While checking, it displays the app logo and a loading indicator.
 */
const StartPage = () => {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const { colors } = useTheme();

    useEffect(() => {
        migrateOldData();
        console.log('user:', user, 'isLoading:', isLoading);
        // This effect runs when the authentication state is determined (isLoading becomes false).
        if (!isLoading) {
            if (user) {
                // If a user object exists, they are authenticated.
                // Redirect them to the main application stack.
                router.replace('/(app)');
            } else {
                StorageService.getGuestMode().then(isGuest => {
                    if (isGuest) {
                        router.replace('/(app)');
                    } else {
                        router.replace('/(auth)/login');
                    }
                });
            }
        }
    }, [isLoading, user, router]);

    // Render a branded loading screen while the auth check is in progress.
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Image source={sentinelIcon} style={styles.logo} />
            <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Initializing Sentinel...</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 40,
        resizeMode: 'contain',
    },
    spinner: {
        transform: [{ scale: 1.5 }],
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
    },
});

export default StartPage;

