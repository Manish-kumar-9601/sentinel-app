import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles } from '../../../hooks/useThemedStyles';

const privacyScreen = () =>
{
  const { t } = useTranslation();
  const { colors, styles: globalStyles } = useThemedStyles();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 6,
      paddingHorizontal: 20,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 10,
    },
    headerPressable: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    comingSoon: {
      padding: 20,
      fontSize: 16,
      color: colors.textSecondary,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>

        <TouchableOpacity style={styles.headerPressable} onPress={() => { router.back() }}>
          <Ionicons name="chevron-back" size={28} color={colors.navigatorColor} />
          <Text style={styles.headerTitle}>{t('privacy.title')}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.comingSoon}>
        {t('privacy.comingSoon')}
      </Text>
    </SafeAreaView>
  )
}

export default privacyScreen;