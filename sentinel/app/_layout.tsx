import { AuthProvider } from '../context/auth'; // Adjust path if needed
import { Stack } from "expo-router";
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function RootLayout() {
  return (
    <AuthProvider>

            <Stack>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="settings" options={{ title: "Settings" }} />

                <Stack.Screen name="index" options={{ headerShown: true, title: 'Sentinel' }} />

                <Stack.Screen name="myCircle" options={{ headerShown: true, title: 'Sentinel' }} />

                <Stack.Screen name="profile" options={{ headerShown: true, title: 'Sentinel' }} />

                <Stack.Screen name="explore" options={{ headerShown: true, title: 'Sentinel' }} />
                
                <Stack.Screen name="map" options={{ headerShown: true, title: 'Sentinel' }} />

            </Stack>
        </AuthProvider>
    );
}
