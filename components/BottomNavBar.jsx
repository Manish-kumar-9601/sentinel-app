import { createGlobalStyles, fontSize, layout, useTheme } from '@/styles';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { useModal } from '../context/ModalContext';
import { useState } from 'react';

// --- Configuration for Navigation Items ---
const NAV_ITEMS = [
  { name: 'home', path: '/', icon: 'home', iconComponent: Ionicons },
  { name: 'checkContact', path: '/checkContact', icon: 'people-circle-outline', iconComponent: Ionicons },
  { name: 'explore', path: '/explores', icon: 'explore', iconComponent: MaterialIcons },
  { name: 'fakeCall', path: '/fakeIncomingCall', icon: 'phone-call', iconComponent: Feather },

];

export default function BottomNavBar ()
{
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { openContactModal } = useModal(); // Get the function from context
  const { colors } = useTheme();
  const [hideBottomNav, setHideBottomNav] = useState(false);
  console.log("path name", pathname)
  const hideOnPaths = pathname === '/fakeIncomingCall' || pathname === '/fakeCall' ? true : false;
  const handlePress = (item) =>
  {
    if (item.path === '/checkContact')
    {
      openContactModal()
      console.log('check Contact')
    } else if (hideOnPaths)
    {
      console.log(hideOnPaths)
      router.push(item.path);
      
    } else
    {
      console.log("path name", pathname)
      router.push(item.path);
    }
  };

  return (


    <View style={[
      layout.rowCenter,
      {
        height: 60,
        justifyContent: 'space-around',
        paddingTop: 8,
        paddingBottom: 25,
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        display: 'flex'
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


