import { SplashScreen, Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import i18next, { loadSavedLanguage } from '../lib/i18n';
import { AuthProvider } from '../context/AuthContext';
import { ModalProvider } from '../context/ModalContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [isAppReady, setAppReady] = useState(false);

    useEffect(() => {
        const prepareApp = async () => {
            try {
                // Load the user's saved language preference
                await loadSavedLanguage();
            } catch (e) {
                console.warn("Error preparing app:", e);
            } finally {
                // Tell the application to render
                setAppReady(true);
            }
        };
        prepareApp();
    }, []);

    const onLayoutRootView = useCallback(async () => {
        if (isAppReady) {
            // This hides the splash screen once the app is ready
            await SplashScreen.hideAsync();
        }
    }, [isAppReady]);

    if (!isAppReady) {
        return null;
    }

    return (
        <SafeAreaProvider onLayout={onLayoutRootView}>
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
        </SafeAreaProvider>
    );
}

