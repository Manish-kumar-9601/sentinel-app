import { AuthProvider } from '../context/auth'; // Adjust path if needed
import { Stack } from "expo-router";
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';


export default function RootLayout() {
    return (
        <AuthProvider>
            <SafeAreaProvider style={{ marginTop: 10 }}>

                <Stack>
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="settings" options={{ title: "Settings" }} />

                    <Stack.Screen name="index" options={{

                        headerShown: false

                    }} />
                    <Stack.Screen
                        name="recorder"
                        options={{
                            headerShown: false,
                            presentation: 'fullScreenModal'
                        }}
                    />
                    <Stack.Screen name="myCircle" options={{ headerShown: true, title: 'Sentinel' }} />

                    <Stack.Screen name="profile" options={{ headerShown: true, title: 'Sentinel' }} />

                    <Stack.Screen name="explore" options={{ headerShown: true, title: 'Sentinel' }} />

                    <Stack.Screen name="map" options={{ headerShown: true, title: 'Sentinel' }} />
                    <Stack.Screen name="fakeCall" options={{
                        presentation: 'fullScreenModal',
                        headerShown: false
                    }} />

                </Stack>
            </SafeAreaProvider>

        </AuthProvider>
    );
}
