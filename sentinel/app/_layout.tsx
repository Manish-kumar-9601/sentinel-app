import { ModalProvider, } from '../context/ModalContext';
import { Stack } from "expo-router";
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import i18next, { loadSavedLanguage } from '../lib/i18n'
import { I18nextProvider } from 'react-i18next';

export default function RootLayout() {
    const [isI18nLoaded, setI18nLoaded] = useState(false);

    useEffect(() => {
        const prepare = async () => {
            await loadSavedLanguage();
            setI18nLoaded(true);
        };
        prepare();
    }, []);

    // Don't render anything until the language has been set
    if (!isI18nLoaded) {
        return null;
    }
    return (
        <SafeAreaProvider>
            <I18nextProvider i18n={i18next}>

                <ModalProvider>
                    <Stack>
                        <Stack.Screen name="(auth)" options={{ headerShown: false, statusBarStyle: "dark" }} />
                        <Stack.Screen name="settings" options={{ title: "Settings", statusBarStyle: "dark", headerShown: false }} />
                        <Stack.Screen name="explores" options={{ title: "Explore Tools", statusBarStyle: "dark" }} />
                        <Stack.Screen name="index" options={{
                            headerShown: false, statusBarStyle: "dark"
                        }} />
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
