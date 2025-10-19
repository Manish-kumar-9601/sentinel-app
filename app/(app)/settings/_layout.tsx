import { Stack } from 'expo-router';
import React from 'react';
import '../../../lib/i18n'
import { SafeAreaProvider } from 'react-native-safe-area-context';
export default function RootLayout() {
  return (
    <SafeAreaProvider>

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
            headerShown: false,
            title: 'Select Language'
          }}
        />
        <Stack.Screen
          name="myCircle"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="userInfo"
          options={{
            headerShown: false,

          }}
        />
        <Stack.Screen
          name="privacy"
          options={{
            headerShown: false,

          }}
        />
      </Stack>
    </SafeAreaProvider>

  );
}