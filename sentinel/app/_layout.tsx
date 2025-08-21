 
import { AuthProvider } from '../context/auth'; // Adjust path if needed
import { ModalProvider, useModal } from '../context/ModalContext';
import { Stack } from "expo-router";
import React from 'react';
import { View } from 'react-native';
 
 
export default function RootLayout() {
    return (
        <AuthProvider>
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
                        title:'Back'
                         }} />

                    <Stack.Screen name="profile" options={{ headerShown: false,
                       
                          }} />

                    <Stack.Screen name="explore" options={{ headerShown: false,
                      
                          }} />

                    <Stack.Screen name="map" options={{ headerShown: false,
                        //  title: 'Sentinel'
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
           

        </AuthProvider>
    );
}
