import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  SafeAreaView, 
  ScrollView, 
  Alert,
  Switch,
  Dimensions 
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 ,MaterialIcons} from '@expo/vector-icons';

import { Link, Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userProfileImg from '../assets/images/user-profile-img.png';


// --- Enhanced User Data with Emergency Info ---
const user = {
  name: 'Alex Johnson',
  email: 'alex.johnson@gmail.com',
  phone: '+1 (555) 123-4567',
  emergencyId: 'SEN-2024-AJ789',
  bloodGroup: 'O+',
  medicalInfo: 'Diabetic, Allergic to Penicillin',
  avatar: userProfileImg,
  memberSince: '2024',
  sosCount: 3,
  lastActive: new Date(),
};

// --- Enhanced Menu Structure ---
const menuSections = [
  // {
  //   title: 'Emergency Settings',
  //   items: [
  //     // { 
  //     //   icon: 'users', 
  //     //   iconSet: 'Feather',
  //     //   label: 'Emergency Contacts', 
  //     //   href: '/contacts',
  //     //   subtitle: 'Manage your emergency circle',
  //     //   color: '#FF6B6B'
  //     // },
  //     { 
  //       icon: 'medical-bag', 
  //       iconSet: 'MaterialCommunity',
  //       label: 'Medical Information', 
  //       href: '/medical-info',
  //       subtitle: 'Medical conditions & allergies',
  //       color: '#4ECDC4'
  //     },
  //     { 
  //       icon: 'location', 
  //       iconSet: 'Ionicons',
  //       label: 'Location Preferences', 
  //       href: '/location-settings',
  //       subtitle: 'Precision & sharing settings',
  //       color: '#45B7D1'
  //     },
  //   ]
  // },
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
        href: '/privacy',
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

// --- Quick Actions ---
const quickActions = [
  {
    icon: 'test-tube',
    iconSet: 'MaterialCommunity',
    label: 'Test SOS',
    color: '#FF6B6B',
    action: 'testSOS'
  },
  {
    icon: 'share',
    iconSet: 'Feather',
    label: 'Share App',
    color: '#74B9FF',
    action: 'shareApp'
  },
  {
    icon: 'download',
    iconSet: 'Feather',
    label: 'Export Data',
    color: '#00B894',
    action: 'exportData'
  },
  {
    icon: 'activity',
    iconSet: 'Feather',
    label: 'Activity Log',
    color: '#E17055',
    action: 'viewActivity'
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

// --- Quick Action Component ---
const QuickActionButton = ({ icon, iconSet, label, color, onPress }) => {
  const getIconComponent = () => {
    switch (iconSet) {
      case 'MaterialCommunity': return MaterialCommunityIcons;
      case 'FontAwesome5': return FontAwesome5;
      default: return Feather;
    }
  };
  
  const IconComponent = getIconComponent();

  return (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
        <IconComponent name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

// --- Status Card Component ---
const StatusCard = ({ title, value, subtitle, icon, color }) => (
  <View style={styles.statusCard}>
    <View style={[styles.statusIcon, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View style={styles.statusContent}>
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusSubtitle}>{subtitle}</Text>
    </View>
  </View>
);

const ProfileScreen = () => {
  const router = useRouter();
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [locationSharing, setLocationSharing] = useState(true);

  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const storedEmergencyMode = await AsyncStorage.getItem('emergencyMode');
      const storedLocationSharing = await AsyncStorage.getItem('locationSharing');
      
      if (storedEmergencyMode !== null) {
        setEmergencyMode(JSON.parse(storedEmergencyMode));
      }
      if (storedLocationSharing !== null) {
        setLocationSharing(JSON.parse(storedLocationSharing));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleQuickAction = async (action) => {
    switch (action) {
      case 'testSOS':
        Alert.alert(
          'Test SOS',
          'This will send a test emergency alert to your contacts. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Test', onPress: () => console.log('Testing SOS...') }
          ]
        );
        break;
      case 'shareApp':
        // Implement share functionality
        console.log('Sharing app...');
        break;
      case 'exportData':
        Alert.alert('Export Data', 'Your emergency data will be exported to a secure file.');
        break;
      case 'viewActivity':
        router.push('/activity-log');
        break;
    }
  };

  const handleEmergencyModeToggle = async (value) => {
    setEmergencyMode(value);
    try {
      await AsyncStorage.setItem('emergencyMode', JSON.stringify(value));
      if (value) {
        Alert.alert(
          'Emergency Mode Enabled',
          'Your device is now in emergency mode. SOS features are prioritized and location tracking is enhanced.'
        );
      }
    } catch (error) {
      console.error('Error saving emergency mode:', error);
    }
  };

  const handleLocationSharingToggle = async (value) => {
    setLocationSharing(value);
    try {
      await AsyncStorage.setItem('locationSharing', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving location sharing preference:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#000',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/edit-profile')}
              style={styles.editButton}
            >
              <Feather name="edit-3" size={20} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Enhanced User Info Section */}
        <LinearGradient 
          colors={['#667eea', '#764ba2']} 
          style={styles.userInfoSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.avatarContainer}>
            <Image source={user.avatar} style={styles.avatar} />
            <View style={styles.onlineIndicator} />
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.userId}>ID: {user.emergencyId}</Text>
          
          {/* User Stats */}
          <View style={styles.userStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.sosCount}</Text>
              <Text style={styles.statLabel}>SOS Sent</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.memberSince}</Text>
              <Text style={styles.statLabel}>Member Since</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Active</Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Emergency Status Cards */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Emergency Status</Text>
          <View style={styles.statusGrid}>
            <StatusCard 
              title="Blood Group"
              value={user.bloodGroup}
              subtitle="Medical ID"
              icon="medical"
              color="#FF6B6B"
            />
            <StatusCard 
              title="Contacts"
              value="5"
              subtitle="Emergency"
              icon="people"
              color="#4ECDC4"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <QuickActionButton
                key={index}
                icon={action.icon}
                iconSet={action.iconSet}
                label={action.label}
                color={action.color}
                onPress={() => handleQuickAction(action.action)}
              />
            ))}
          </View>
        </View>

        {/* Emergency Toggles */}
{/*         
        <View style={styles.toggleSection}>
          <Text style={styles.sectionTitle}>Emergency Option</Text>
          <View style={styles.toggleContainer}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <View style={[styles.toggleIcon, { backgroundColor: '#FF6B6B15' }]}>
                  <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
                </View>
                <View>
                  <Text style={styles.toggleLabel}>Emergency Mode</Text>
                  <Text style={styles.toggleSubtitle}>Enhanced SOS features</Text>
                </View>
              </View>
              <Switch
                value={emergencyMode}
                onValueChange={handleEmergencyModeToggle}
                trackColor={{ false: '#E5E5EA', true: '#FF6B6B' }}
                thumbColor={emergencyMode ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
            
            <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
              <View style={styles.toggleInfo}>
                <View style={[styles.toggleIcon, { backgroundColor: '#45B7D115' }]}>
                  <Ionicons name="location" size={20} color="#45B7D1" />
                </View>
                <View>
                  <Text style={styles.toggleLabel}>Location Sharing</Text>
                  <Text style={styles.toggleSubtitle}>Share location in emergencies</Text>
                </View>
              </View>
              <Switch
                value={locationSharing}
                onValueChange={handleLocationSharingToggle}
                trackColor={{ false: '#E5E5EA', true: '#45B7D1' }}
                thumbColor={locationSharing ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>
          </View>
        </View> */}

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
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

        {/* Sign Out Button */}
        <View style={styles.signOutSection}>
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={() => Alert.alert('Sign Out', 'Are you sure you want to sign out?')}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Sentinel Emergency App</Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  editButton: {
    marginRight: 8,
    padding: 4,
  },
  userInfoSection: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    // borderBottomLeftRadius: 10,
    // borderBottomRightRadius: 10     
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
    marginBottom: 5,
  },
  userId: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 15,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    paddingHorizontal: 30,
    paddingVertical: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 15,
  },
  statusSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 25,
  },
  statusCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  statusContent: {
    flex: 1,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statusTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  toggleSection: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  toggleContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  toggleSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  menuSection: {
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    // paddingHorizontal:10,
    // gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    display: 'flex',
  },
  row: {
  
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  lastRow: {
    borderBottomWidth: 0,
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
    paddingHorizontal: 20,
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
  versionSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default ProfileScreen;