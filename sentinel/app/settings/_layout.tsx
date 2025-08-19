import { Stack } from 'expo-router';
import React from 'react';

export default function SettingsLayout() {
  return (
    <Stack>
     
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Settings',
          headerBackTitle: 'Profile'
        }} 
      />
      
      {/* Other specific settings screens */}
      <Stack.Screen name="emergency-contacts" options={{ title: 'Emergency Contacts' }} />
      <Stack.Screen name="shake-and-voice" options={{ title: 'Shake & Voice Activation' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy & Security' }} />
    </Stack>
  );
}