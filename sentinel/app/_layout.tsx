
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
                await loadSavedLanguage();
            } catch (e) {
                console.warn(e);
            } finally {
                setAppReady(true);
            }
        };
        prepareApp();
    }, []);

    useEffect(() => {
        const configureAudio = async () => {
            console.log("Configuring global audio mode for background recording...");
            // ✅ 2. Use the new setAudioModeAsync function with updated properties
            await setAudioModeAsync({
                allowsRecording: true,
                interruptionMode: 'doNotMix', // ✅ Correct: Use the string literal
                interruptionModeAndroid: 'doNotMix', // ✅ Correct: Use the string literal
            });
            console.log("Audio mode configured.");
        };

        configureAudio();
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
        // ✅ 4. Add the onLayout prop to your root view
        <SafeAreaProvider onLayout={onLayoutRootView}>
            <I18nextProvider i18n={i18next}>
                <ModalProvider>
                    <Stack>
                        {/* Your Stack.Screen definitions remain the same */}
                        <Stack.Screen name="settings" options={{ title: "Settings", statusBarStyle: "dark", headerShown: false }} />
                        <Stack.Screen name="explores" options={{ title: "Explore Tools", statusBarStyle: "dark" }} />
                        <Stack.Screen name="index" options={{ headerShown: false, statusBarStyle: "dark" }} />
                        <Stack.Screen
                            name="recorder"
                            options={{
                                headerShown: false,
                                presentation: 'fullScreenModal'
                            }}
                        />
                        <Stack.Screen
                            name="audioRecorder"
                            options={{
                                headerShown: false,
                                presentation: 'fullScreenModal'
                            }}
                        />
                        <Stack.Screen name="myCircle" options={{
                            headerShown: true,
                            title: 'Back', statusBarStyle: "dark"
                        }} />
                        <Stack.Screen name="profile" options={{
                            headerShown: false,
                            title: 'Profile', statusBarStyle: "dark"
                        }} />
                        <Stack.Screen name="map" options={{
                            headerShown: false, statusBarStyle: "dark"
                        }} />
                        <Stack.Screen name="guide" options={{
                            headerShown: false, statusBarStyle: "dark"
                        }} />
                        <Stack.Screen name="fakeCall" options={{
                            presentation: 'fullScreenModal',
                            headerShown: false, statusBarStyle: "dark"
                        }} />
                        <Stack.Screen name="fakeIncomingCall" options={{
                            presentation: 'fullScreenModal',
                            headerShown: false, statusBarStyle: "dark"
                        }} />
                    </Stack>
                </ModalProvider>
            </I18nextProvider>
        </SafeAreaProvider>
    );
}