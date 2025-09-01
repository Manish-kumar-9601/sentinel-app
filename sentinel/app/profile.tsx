import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';

// --- Mock User Data ---
// In a real app, this would come from your authentication context or API
const user = {
  name: 'User ',
  email: 'User1234@gmail.com',
  avatar: 'https://placehold.co/100x100/FF4500/FFFFFF?text=NM', // Placeholder avatar
};

// --- Reusable Row Component ---
const ProfileRow = ({ icon, label, href }) => (
  <Link href={href} asChild>
    <TouchableOpacity style={styles.row}>
      <Feather name={icon} size={22} color="#4A4A4A" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={22} color="#C7C7CC" />
    </TouchableOpacity>
  </Link>
);

const ProfileScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      {/* --- Header --- */}
      
   <Stack.Screen 
        options={{ 
          title: 'Profile', 
          headerShown: true,
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#000',
        }} 
      />
      {/* --- User Info Section --- */}
      <View style={styles.userInfoSection}>
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      {/* --- Menu Section --- */}
      <View style={styles.menuWrapper}>
        <ProfileRow icon="settings" label="Settings" href="/settings" />
        <ProfileRow icon="shield" label="Privacy Policy" href="/privacy" />
        <ProfileRow icon="help-circle" label="Help & Support" href="/support" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  header: {
    padding: 10,
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfoSection: {
    paddingHorizontal: 30,
    paddingVertical: 0,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  userName: {
    marginTop: 15,
    fontSize: 22,
    fontWeight: 'bold',
  },
  userEmail: {
    marginTop: 5,
    fontSize: 16,
    color: '#666',
  },
  menuWrapper: {
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  rowLabel: {
    flex: 1,
    marginLeft: 20,
    fontSize: 16,
    color: '#333',
  },
});

export default ProfileScreen;
