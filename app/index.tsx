import React, {useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Image, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

// Import the app logo
import sentinelIcon from '../assets/images/sentinel-icon.png';

/**
 * This is the initial splash screen for the application.
 * It handles the core logic of checking the user's authentication status
 * and redirecting them to the appropriate part of the app.
 * While checking, it displays the app logo and a loading indicator.
 */
const StartPage = () => {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // This effect runs when the authentication state is determined (isLoading becomes false).
        if (!isLoading) {
            if (!user) {
                // If a user object exists, they are authenticated.
                // Redirect them to the main application stack.
                router.replace('/(app)');
            } else {
                // If there is no user, they are not authenticated.
                // Redirect them to the login screen within the auth stack.
                router.replace('/(auth)/register');
            }
        }
    }, [isLoading, user, router]);

    // Render a branded loading screen while the auth check is in progress.
    return (
        <View style={styles.container}>
            <Image source={sentinelIcon} style={styles.logo} />
            <ActivityIndicator size="large" color="#FF4500" style={styles.spinner} />
            <Text style={styles.loadingText}>Initializing Sentinel...</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF', // A clean white background
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 40,
        resizeMode: 'contain',
    },
    spinner: {
        transform: [{ scale: 1.5 }], // Make the spinner slightly larger
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
        color: '#6c757d', // A subtle gray color for the text
    },
});

export default StartPage;

