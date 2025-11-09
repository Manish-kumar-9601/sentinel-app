import BottomNavBar from '@/components/BottomNavBar';
import { Stack } from 'expo-router';
import React from 'react';

export default function AppLayout() {
    return (
        <>
            <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="profile" options={{ headerShown: false, }} />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
                {/* Add other screens in your main app here */}
                <Stack.Screen name="explores" options={{ headerShown: false }} />
                <Stack.Screen name="recorder" options={{ presentation: 'fullScreenModal', headerShown: false }} />
                <Stack.Screen name="audioRecorder" options={{ presentation: 'fullScreenModal', headerShown: false }} />

                <Stack.Screen name="webMap" options={{ title: 'Map' }} />
                <Stack.Screen name="guide" options={{
                    headerShown: false,
                }} />
                <Stack.Screen name="evidence" options={{
                    headerShown: false,
                }} />
                <Stack.Screen name="locationHistory" options={{
                    headerShown: false,
                }} />
                <Stack.Screen name="guide" options={{
                    headerShown: false,
                }} />
                <Stack.Screen name="fakeCall" options={{ presentation: 'fullScreenModal', headerShown: false }} />
                <Stack.Screen name="fakeIncomingCall" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            </Stack>
            <BottomNavBar />
        </>
    );
}

