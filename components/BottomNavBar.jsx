import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, } from 'react-native';
import { Ionicons, Feather, AntDesign, MaterialIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useModal } from '../context/ModalContext';
// --- Configuration for Navigation Items ---
const NAV_ITEMS = [
  { name: 'Home', path: '/', icon: 'home', iconComponent: Ionicons },
  { name: 'Check Contact', path: '/checkContact', icon: 'people-circle-outline', iconComponent: Ionicons },
  { name: 'Explore', path: '/explores', icon: 'explore', iconComponent: MaterialIcons },
  { name: 'Fake Call', path: '/fakeIncomingCall', icon: 'phone-call', iconComponent: Feather },

];

const BottomNavBar = () =>
{
  const router = useRouter();
  const pathname = usePathname();
  const { openContactModal } = useModal(); // Get the function from context

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
      // closeContactModal()
    } else
    {
      router.push(item.path);
      // closeContactModal()
    }
  };

  return (
    < View style={styles.navBar}>
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
              color={isActive ? '#3186c3' : '#A9A9A9'}
            />
            <Text style={[styles.navText, { color: isActive ? '#3186c3' : '#A9A9A9' }]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    // position: 'absolute',
    // bottom: 10,
    // left: 0,
    // right: 0,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'white',
    borderTopWidth: 0,
    borderTopColor: '#e8e8e8',
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
