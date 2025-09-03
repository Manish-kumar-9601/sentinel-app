import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import i18n from '../../lib/i18n';

// --- Reusable UI Component for a feature card ---
const FeatureCard = ({ icon, title, description, href, comingSoon = false }) => {
  const content = (
   
    <TouchableOpacity
      style={[styles.card, comingSoon && styles.comingSoonCard]}
      onPress={comingSoon ? () => Alert.alert("Coming Soon!", "This feature is under development.") : undefined}
      disabled={comingSoon}
    >
      <View style={styles.iconContainer}>
        <Feather name={icon} size={28} color="#3186c3" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
    </TouchableOpacity>
     

  );

  return href ?<>
   <Link style={styles.card} href={`/explores${href}`} asChild > 
   {content}</Link>
    </>
     : content;
};

export default  function ExploreScreen () {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* <View style={styles.header}>
          <Text style={styles.headerTitle}>Explore Tools</Text>
        </View> */}

        {/* --- Data Leak Check Card --- */}
        <View style={{marginTop:30}}>

        <FeatureCard
          icon="shield"
          title="Data Leak Check"
          description="See if your email has been compromised in a data breach."
          href="/dataLeak" // Links directly to the settings screen
          />
          </View>

        {/* --- Placeholder for Safe Route Planning --- */}
        {/* <FeatureCard
          icon="map"
          title="Safe Route Planning"
          description="Find the safest route to your destination based on real-time data."
          comingSoon={true}
        /> */}
        
        {/* --- Placeholder for Community Reporting --- */}
        <FeatureCard
          icon="message-square"
          title="Community Reports"
          description="View and report safety incidents in your area."
          comingSoon={true}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 26,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  card: {
    marginTop: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  comingSoonCard: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e6f8ffff',
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
    color: '#000',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6e6e73',
    marginTop: 4,
  },
});

 
