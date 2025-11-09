import { SplashScreen, Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { ModalProvider } from '../context/ModalContext';
import { ThemeProvider } from '../context/ThemeContext';
import i18next, { loadSavedLanguage } from '../lib/i18n';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://c2af91a254ebb21127fe10552e953451@o4510333582245888.ingest.de.sentry.io/4510333583687760',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
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
    );
});