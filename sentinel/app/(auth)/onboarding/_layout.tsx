import { Stack } from 'expo-router';
import React from 'react';

/**
 * This layout manages the multi-step onboarding process.
 * It uses a Stack navigator to guide the user through each step sequentially.
 * The header is hidden to create a more immersive, custom onboarding experience.
 */
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Step 1: Requesting necessary permissions.
          Corresponds to the file: app/(auth)/onboarding/1_permissions.tsx */}
      <Stack.Screen name="permissions" />

      {/* Step 2: Setting up emergency contacts.
          Corresponds to the file: app/(auth)/onboarding/2_contacts.tsx */}
      <Stack.Screen name="contacts" />
      
      {/* You can add more steps here as needed, for example:
      <Stack.Screen name="3_tutorial" /> 
      */}
    </Stack>
  );
}
