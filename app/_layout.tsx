import * as Sentry from '@sentry/react-native';
import { SplashScreen, Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { EmergencyContactsProvider } from '../context/EmergencyContactsContext';
import { LocationProvider } from '../context/LocationContext';
import { ModalProvider } from '../context/ModalContext';
import { ThemeProvider } from '../context/ThemeContext';
import { UserProvider } from '../context/UserContext';
import i18next, { loadSavedLanguage } from '../lib/i18n';

Sentry.init({
    dsn: 'https://c2af91a254ebb21127fe10552e953451@o4510333582245888.ingest.de.sentry.io/4510333583687760',
    sendDefaultPii: true,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
    integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
});

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default Sentry.wrap(function RootLayout() {
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
            <ThemeProvider>
                <AuthProvider>
                    <UserProvider>
                        <EmergencyContactsProvider>
                            <LocationProvider>
                                <I18nextProvider i18n={i18next}>
                                    <ModalProvider>
                                        <Stack>
                                            <Stack.Screen name="(app)" options={{ headerShown: false }} />
                                            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                                            <Stack.Screen name="index" options={{ headerShown: false }} />
                                        </Stack>
                                    </ModalProvider>
                                </I18nextProvider>
                            </LocationProvider>
                        </EmergencyContactsProvider>
                    </UserProvider>
                </AuthProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
});