import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF4500', // Sets the color for the active tab icon and label
        tabBarInactiveTintColor: '#A9A9A9', // Sets the color for inactive tabs
        tabBarStyle: {
          backgroundColor: '#FFFFFF', // Style the tab bar itself
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false, // The home screen uses its own custom header
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <FontAwesome5 name="map-marked-alt" color={color} size={size} />,
        }}
      />
         <Tabs.Screen
        name="myCircle" // This must match the filename `mycircle.jsx`
        options={{
          title: 'My Circle',
          headerShown: false, // Hide the header as our screen has its own
          tabBarIcon: ({ color }) => <Ionicons size={28} name="people-circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}