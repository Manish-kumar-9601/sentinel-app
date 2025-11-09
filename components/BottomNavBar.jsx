import { fontSize, layout, useTheme } from '@/styles';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { useModal } from '../context/ModalContext';

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
    <View style={[
      layout.rowCenter,
      {
        height: 60,
        justifyContent: 'space-around',
        paddingBottom: 25,
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        display: hideOnPaths ? 'none' : 'flex'
      }
    ]}>
      {NAV_ITEMS.map((item) =>
      {
        const isActive = pathname === item.path;
        const IconComponent = item.iconComponent;
        return (
          <TouchableOpacity
            key={item.name}
            style={{ alignItems: 'center' }}
            onPress={() => handlePress(item)}
          >
            <IconComponent
              name={item.icon}
              size={28}
              color={isActive ? colors.navigatorColor : colors.textTertiary}
            />
            <Text style={{
              fontSize: fontSize.sm,
              marginTop: 2,
              color: isActive ? colors.navigatorColor : colors.textTertiary
            }}>
              {t(`home.${item.name}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default BottomNavBar;
