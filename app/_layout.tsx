import { AuthProvider } from '../context/AuthContext';
import { ModalProvider } from '../context/ModalContext';
import { Stack } from "expo-router";
import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import i18next, { loadSavedLanguage } from '../lib/i18n';
import { I18nextProvider } from 'react-i18next';
import * as SplashScreen from 'expo-splash-screen';
import { setAudioModeAsync } from 'expo-audio';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [isAppReady, setAppReady] = useState(false);

    useEffect(() => {
        const prepareApp = async () => {
            try {
                // Set up audio mode for the entire app
                await setAudioModeAsync({
                    allowsRecording: true,
                    interruptionMode: 'doNotMix',
                    interruptionModeAndroid: 'doNotMix',
                });
                // Load saved language for internationalization
                await loadSavedLanguage();
            } catch (e) {
                console.warn(e);
            } finally {
                setAppReady(true);
            }
        };
        prepareApp();
    }, []);

    const onLayoutRootView = useCallback(async () => {
        if (isAppReady) {
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
                        <Stack>
                            <Stack.Screen name="(app)" options={{ headerShown: false }} />
                            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                        </Stack>
                    </ModalProvider>
                </I18nextProvider>
            </AuthProvider>
        </SafeAreaProvider>
    );
}

