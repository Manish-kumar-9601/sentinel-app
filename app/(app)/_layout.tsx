import { Stack } from 'expo-router';
import React from 'react';
import BottomNavBar from '@/components/BottomNavBar';
import { usePathname } from 'expo-router';

export default function AppLayout() {
    const pathname = usePathname();
    const hideOnPaths = ['/recorder', '/audioRecorder', '/fakeCall', '/fakeIncomingCall'].some(path => pathname.startsWith(path));
    return (
        <>
            <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="profile" options={{ headerShown: false, }} />
                <Stack.Screen name="settings" options={{ headerShown: false }} />

                <Stack.Screen name="explores" options={{ headerShown: false }} />
                <Stack.Screen name="recorder" options={{ presentation: 'fullScreenModal', headerShown: false }} />
                <Stack.Screen name="audioRecorder" options={{ presentation: 'fullScreenModal', headerShown: false }} />

                <Stack.Screen name="webMap" options={{ title: 'Map' }} />
                <Stack.Screen name="guide" options={{
                    headerShown: false,
                }} />

                <Stack.Screen name="fakeCall" options={{ presentation: 'fullScreenModal', headerShown: false }} />
                <Stack.Screen name="fakeIncomingCall" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            </Stack>
            {!hideOnPaths &&
            <BottomNavBar />}
        </>
    );
}

