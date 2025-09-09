import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function AppLayout() {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    React.useEffect(() => {
        if (isLoading) return;

        const inAppGroup = segments[0] === '(app)';

        if (!user && inAppGroup) {
            router.replace('/login');
        }
    }, [user, isLoading, segments, router]);

    if (isLoading || !user) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Stack>
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
            <Stack.Screen name="webMap" options={{
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
    );
}

