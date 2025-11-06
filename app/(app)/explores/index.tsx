import { Feather, Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/styles';

// --- Reusable UI Component for a feature card ---
const FeatureCard = ({ icon, title, description, href, comingSoon = false }) => {
  const { colors } = useTheme();

  const content = (

    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }, comingSoon && styles.comingSoonCard]}
      onPress={comingSoon ? () => Alert.alert("Coming Soon!", "This feature is under development.") : undefined}
      disabled={comingSoon}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.infoLight }]}>
        <Feather name={icon} size={28} color={colors.blueLight } />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
    </TouchableOpacity>


  );

  return href ? <>
    <Link style={styles.card} href={`/explores${href}`} asChild >
      {content}</Link>
  </>
    : content;
};

export default function ExploreScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>

          <TouchableOpacity style={styles.headerPressable} onPress={() => { router.back() }}>
            <Ionicons name="chevron-back" size={28} color={colors.navigatorColor} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Explore</Text>
          </TouchableOpacity>


        </View>

        {/* --- Data Leak Check Card --- */}
        <View style={{ marginTop: 30 }}>

          <FeatureCard
            icon="shield"
            title="Data Leak Check"
            description="See if your email has been compromised in a data breach."
            href="/dataLeak"
          />
        </View>



        {/* --- Placeholder for Community Reporting --- */}
        <FeatureCard
          icon="message-square"
          title="Community Reports"
          description="View and report safety incidents in your area."
          comingSoon={true}
          href={''}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 26,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 20,
    borderBottomWidth: 1,

  },
  headerPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  card: {
    marginTop: 0,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0 3px 8px rgba(0,0,0,1)',

  },
  comingSoonCard: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 14,
    marginTop: 4,
  },
});


