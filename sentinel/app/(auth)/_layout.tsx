import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack>
      {/* The main login screen */}
      <Stack.Screen name="login" options={{ headerShown: false }} />
      
      {/* The multi-step onboarding flow */}
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}