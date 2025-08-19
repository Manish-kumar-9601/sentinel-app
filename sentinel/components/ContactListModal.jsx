import React from 'react';
import { Modal, View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ContactListModal = ({ visible, onClose, onSelectContact, contacts = [] }) => {
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Select a Contact</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={30} color="#ccc" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.contactItem} onPress={() => onSelectContact(item)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone}>{item.phone}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No contacts found.</Text>
                <Text style={styles.emptySubtext}>Please add contacts in your "My Circle" screen.</Text>
              </View>
            }
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
    modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '60%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 22, fontWeight: 'bold' },
    contactItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    contactName: { fontSize: 18, fontWeight: '500' },
    contactPhone: { fontSize: 14, color: '#666', marginTop: 2 },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333'
    },
    emptySubtext: {
        fontSize: 14,
        color: '#777',
        marginTop: 8,
        textAlign: 'center',
    }
});

export default ContactListModal;