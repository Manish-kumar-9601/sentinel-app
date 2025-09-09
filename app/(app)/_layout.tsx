import { Stack } from 'expo-router';
import React from 'react';

export default function AppLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ title: 'Profile' }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            {/* Add other screens in your main app here */}
            <Stack.Screen name="explores" options={{ title: "Explore Tools" }} />
            <Stack.Screen name="recorder" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="audioRecorder" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="map" options={{ headerShown: false }} />
            <Stack.Screen name="webMap" options={{ title: 'Map' }} />
            <Stack.Screen name="guide" options={{ title: 'Emergency Guide' }} />
            <Stack.Screen name="fakeCall" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="fakeIncomingCall" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        </Stack>
    );
}

