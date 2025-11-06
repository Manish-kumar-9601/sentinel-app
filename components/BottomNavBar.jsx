import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { useModal } from '../context/ModalContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { createGlobalStyles, useTheme } from '@/styles';

// --- Configuration for Navigation Items ---
const NAV_ITEMS = [
  { name: 'home', path: '/', icon: 'home', iconComponent: Ionicons },
  { name: 'checkContact', path: '/checkContact', icon: 'people-circle-outline', iconComponent: Ionicons },
  { name: 'explore', path: '/explores', icon: 'explore', iconComponent: MaterialIcons },
  { name: 'fakeCall', path: '/fakeIncomingCall', icon: 'phone-call', iconComponent: Feather },

];

const BottomNavBar = () =>
{
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { openContactModal } = useModal(); // Get the function from context
  const { colors } = useTheme();
  console.log("path name", pathname)
  const hideOnPaths = pathname === '/fakeIncomingCall' ? true : false;
  const handlePress = (item) =>
  {
    if (item.path === '/checkContact')
    {
      openContactModal()
      console.log('check Contact')
      // Open the modal instead of navigating
    } else if (item.path === '/fakeIncomingCall')
    {
      router.push(item.path);
    } else
    {
      router.push(item.path);
    }
  };

  return (

    <View style={[styles.navBar, { backgroundColor: colors.card, borderTopColor: colors.border, display: hideOnPaths ? 'none' : 'flex' }]}>
      {NAV_ITEMS.map((item) =>
      {
        const isActive = pathname === item.path;
        const IconComponent = item.iconComponent;
        return (
          <TouchableOpacity
            key={item.name}
            style={styles.navItem}
            onPress={() => handlePress(item)}
          >
            <IconComponent
              name={item.icon}
              size={28}
              color={isActive ? colors.navigatorColor : colors.textTertiary}
            />
            <Text style={[styles.navText, { color: isActive ? colors.navigatorColor : colors.textTertiary }]}>
              {t(`home.${item.name}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 25,
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default BottomNavBar;
