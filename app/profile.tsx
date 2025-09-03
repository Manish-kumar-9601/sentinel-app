import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';
import userProfileImg from '../assets/images/user-profile-img.png';

// --- Mock User Data ---
const user = {
  name: 'User',
  email: 'User1234@gmail.com',
  avatar: userProfileImg,
};

// --- REFACTOR: Menu items defined in an array for cleaner rendering ---
const menuItems = [
  { icon: 'settings', label: 'Settings', href: '/settings' },
  { icon: 'shield', label: 'Privacy Policy', href: '/privacy' },
  { icon: 'help-circle', label: 'Help & Support', href: '/support' },
];

// --- Reusable Row Component (No changes needed here) ---
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
      <Stack.Screen
        options={{
          title: 'Profile',
          headerShown: true,
          headerShadowVisible: false, // Cleaner look without a shadow
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#000',
        }}
      />
      {/* --- User Info Section --- */}
      <View style={styles.userInfoSection}>
        <Image source={user.avatar} style={styles.avatar} />
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      {/* --- Menu Section --- */}
      <View style={styles.menuWrapper}>
        {/* --- REFACTOR: Dynamically render rows from the array --- */}
        {menuItems.map((item) => (
          <ProfileRow key={item.label} icon={item.icon} label={item.label} href={item.href} />
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2', // Changed for consistency
  },
  userInfoSection: {
    paddingHorizontal: 0,
    paddingBottom: 20, 
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 0, 
    borderBottomColor: '#929292ff',
  },
  avatar: {
    marginTop: 0,
    width: 100,
    height: 100,
    borderRadius: 70,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  userName: {
    marginTop: 15,
    fontSize: 22,
    fontWeight: 'bold',
  },
  userEmail: {
    marginTop: 5,
    fontSize: 16,
    color: '#6c6c6c',
  },
  menuWrapper: {
    marginTop: 0,  
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowLabel: {
    flex: 1,
    marginLeft: 20,
    fontSize: 16,
    color: '#333',
  },
});

export default ProfileScreen;