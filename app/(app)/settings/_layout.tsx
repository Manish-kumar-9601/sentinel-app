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
      <Stack.Screen
        name="language"
        options={{
          headerShown: true,
          title: 'Select Language'
        }}
      />
      <Stack.Screen
        name="myCircle"
        options={{
          headerShown: false,
          title: 'My Circle'
        }}
      />
      <Stack.Screen
        name="userInfo"
        options={{
          headerShown: false,
          title: 'User Information'
        }}
      />
    </Stack>
  );
}