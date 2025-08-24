import { ModalProvider, } from '../context/ModalContext';
import { Stack } from "expo-router";
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
export default function RootLayout() {
    return (
          <SafeAreaProvider>

        <ModalProvider>
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
                <Stack.Screen name="myCircle" options={{
                    headerShown: true,
                    title: 'Back'
                }} />

                <Stack.Screen name="profile" options={{
                    headerShown: false,
                    title: 'Profile'
                }} />

                <Stack.Screen name="explore" options={{
                    headerShown: false,
                    
                }} />

                <Stack.Screen name="map" options={{
                    headerShown: false,
                    
                }} />
                <Stack.Screen name="guide" options={{
                    headerShown: false,
                    
                }} />
                <Stack.Screen name="fakeCall" options={{
                    presentation: 'fullScreenModal',
                    headerShown: false
                }} />
                <Stack.Screen name="fakeIncomingCall" options={{
                    presentation: 'fullScreenModal',
                    headerShown: false
                }} />
            </Stack>
        </ModalProvider>
                    </SafeAreaProvider>


    );
}
