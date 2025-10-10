import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import userProfileImg from '../../assets/images/user-profile-img.png';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

// ... (Menu Structure, Quick Actions, etc. remain the same)
// --- Enhanced Menu Structure ---
const menuSections = (isLoggedIn) => [
  ...(isLoggedIn ? [{
    title: 'User & Medical Information',
    items: [
      {
        icon: 'user',
        iconSet: 'Feather',
        label: 'User Information',
        href: '/settings/userInfo',
        subtitle: 'Update your personal and medical info',
        color: '#FF6B6B'
      },
    ]
  }] : []),
  {
    title: 'App Settings',
    items: [
      {
        icon: 'settings',
        iconSet: 'Feather',
        label: 'General Settings',
        href: '/settings',
        subtitle: 'App preferences & notifications',
        color: '#96CEB4'
      },
      {
        icon: 'privacy-tip',
        iconSet: 'MaterialIcons',
        label: 'Privacy & Security',
        href: '/settings/privacy',
        subtitle: 'Data protection & permissions',
        color: '#f9d769ff'
      },
      {
        icon: 'bell',
        iconSet: 'Feather',
        label: 'Notifications',
        href: '/notifications',
        subtitle: 'Alert preferences',
        color: '#DDA0DD'
      },
    ]
  },
  {
    title: 'Support & Info',
    items: [
      {
        icon: 'help-circle',
        iconSet: 'Feather',
        label: 'Help & Support',
        href: '/support',
        subtitle: 'FAQ, guides & contact support',
        color: '#74B9FF'
      },
      {
        icon: 'info',
        iconSet: 'Feather',
        label: 'About Sentinel',
        href: '/about',
        subtitle: 'Version info & credits',
        color: '#A29BFE'
      },
      {
        icon: 'star',
        iconSet: 'Feather',
        label: 'Rate App',
        href: '/rate',
        subtitle: 'Share your experience',
        color: '#fdc458ff'
      },
    ]
  }
];

// --- Enhanced Profile Row Component ---
const ProfileRow = ({ icon, iconSet, label, href, subtitle, color, isLast = false }) => {
  const getIconComponent = () => {
    switch (iconSet) {
      case 'MaterialCommunity': return MaterialCommunityIcons;
      case 'Ionicons': return Ionicons;
      case 'FontAwesome5': return FontAwesome5;
      case 'MaterialIcons': return MaterialIcons;
      default: return Feather;
    }
  };

  const IconComponent = getIconComponent();

  return (
    <Link href={href} asChild>
      <TouchableOpacity style={styles.row}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <IconComponent name={icon} size={20} color={color} />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#C7C7CC" style={{ opacity: 0.6 }} />
      </TouchableOpacity>
    </Link>
  );
};


const ProfileScreen = () => {
  const router = useRouter();
  const { user, logout } = useAuth();

  console.log('at info scree',user )
  const handleSignOut = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout }
    ]);
  };

  return (
    // <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {user ? (
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.userInfoSection}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.avatarContainer}>
              <Image source={userProfileImg} style={styles.avatar} />
              <View style={styles.onlineIndicator} />
            </View>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.guestContainer}>
            <Ionicons name="person-circle-outline" size={80} color="#007AFF" />
            <Text style={styles.guestTitle}>You are a Guest</Text>
            <Text style={styles.guestSubtitle}>
              Log in to save your medical info and sync your emergency contacts.
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.loginButtonText}>Log In or Sign Up</Text>
            </TouchableOpacity>
          </View>
        )}

        {menuSections(!!user).map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuContainer}>
              {section.items.map((item, index) => (
                <ProfileRow
                  key={index}
                  icon={item.icon}
                  iconSet={item.iconSet}
                  label={item.label}
                  href={item.href}
                  subtitle={item.subtitle}
                  color={item.color}
                  isLast={index === section.items.length - 1}
                />
              ))}
            </View>
          </View>
        ))}

        {user && (
          <View style={styles.signOutSection}>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
        
      </ScrollView>
    // </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#262626ff',
  },
  guestContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 15,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
  },
  guestSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfoSection: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00C851',
    borderWidth: 3,
    borderColor: 'white',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 15,
    paddingHorizontal: 16
  },
  menuSection: {
    paddingTop: 25,
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  rowSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  signOutSection: {
    marginBottom:40,
    padding: 16,
    paddingTop: 25,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 10,
  },
});

export default ProfileScreen;
