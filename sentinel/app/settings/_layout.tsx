import { Stack } from 'expo-router';
import React from 'react';
import '../../lib/i18n'
export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false 
        }} 
      />
  
      <Stack.Screen name="shake-and-voice" options={{ title: 'Shake & Voice Activation'
        , headerShown: false, }} />
      
      
      <Stack.Screen 
        name="language" 
        options={{ 
          headerShown: true, 
          title: 'Select Language' 
        }} 
      />
    </Stack>
  );
}