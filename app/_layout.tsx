import { SplashScreen, Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from '../components/ErrorBoundary';
import { AuthProvider } from '../context/AuthContext';
import { ModalProvider } from '../context/ModalContext';
import { ThemeProvider } from '../context/ThemeContext';
import i18next, { loadSavedLanguage } from '../lib/i18n';
import { initializeStore } from '../store';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [isAppReady, setAppReady] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);

    useEffect(() => {
        const prepareApp = async () => {
            try {
                console.log('🚀 [RootLayout] Starting app preparation...');

                // Initialize global store (loads persisted state)
                // CRITICAL: This must complete BEFORE rendering any screens
                await initializeStore();
                console.log('✅ [RootLayout] Global store initialized');

                // Load the user's saved language preference
                await loadSavedLanguage();
                console.log('✅ [RootLayout] Language loaded');

                console.log('✅ [RootLayout] App preparation complete');
            } catch (e) {
                console.error("❌ [RootLayout] Error preparing app:", e);
                setInitError(e instanceof Error ? e.message : 'Unknown error');
            } finally {
                // Tell the application to render
                setAppReady(true);
            }
        };
        prepareApp();
    }, []);

    const onLayoutRootView = useCallback(async () => {
        if (isAppReady) {
            console.log('🎨 [RootLayout] Hiding splash screen');
            // This hides the splash screen once the app is ready
            await SplashScreen.hideAsync();
        }
    }, [isAppReady]);

    if (!isAppReady) {
        // Show loading indicator while initializing
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Initializing app...</Text>
            </View>
        );
    }

    if (initError) {
        // Show error screen if initialization failed
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ff3b30', marginBottom: 8 }}>Initialization Error</Text>
                <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>{initError}</Text>
            </View>
        );
    }

    return (
        <ErrorBoundary>
            <SafeAreaProvider onLayout={onLayoutRootView}>
                <ThemeProvider>
                    <AuthProvider>
                        <I18nextProvider i18n={i18next}>
                            <ModalProvider>
                                {/* This Stack navigator defines the two main areas of your app:
                                  - The (app) group for authenticated users.
                                  - The (auth) group for login/registration.
                                  The root index.tsx file will handle redirecting between them.
                                */}
                                <Stack>
                                    <Stack.Screen name="(app)" options={{ headerShown: false }} />
                                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                                    <Stack.Screen name="index" options={{ headerShown: false }} />
                                </Stack>
                            </ModalProvider>
                        </I18nextProvider>
                    </AuthProvider>
                </ThemeProvider>
            </SafeAreaProvider>
        </ErrorBoundary>
    );
}

