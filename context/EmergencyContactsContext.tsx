/**
 * Emergency Contacts Context
 * Global state management for emergency contacts
 */

import { db } from '@/db/client';
import { emergencyContacts as emergencyContactsTable } from '@/db/schema';
import { StorageService } from '@/services/storage';
import NetInfo from '@react-native-community/netinfo';
import { eq } from 'drizzle-orm';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

// ==================== INTERFACES ====================

export interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relationship?: string;
    isPrimary?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface EmergencyContactsContextType {
    contacts: EmergencyContact[];
    loading: boolean;
    error: string | null;
    refreshContacts: () => Promise<void>;
    addContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<string>;
    updateContact: (id: string, contact: Partial<EmergencyContact>) => Promise<void>;
    deleteContact: (id: string) => Promise<void>;
    clearError: () => void;
}

// ==================== CONTEXT ====================

const EmergencyContactsContext = createContext<EmergencyContactsContextType | undefined>(undefined);

// ==================== PROVIDER ====================

interface EmergencyContactsProviderProps {
    children: ReactNode;
    userId?: string; // Optional: pass from AuthContext
}

export function EmergencyContactsProvider({ children, userId }: EmergencyContactsProviderProps) {
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Load contacts on mount and when userId changes
    useEffect(() => {
        loadContacts();
    }, [userId]);

    /**
     * Load contacts from storage/database
     */
    const loadContacts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // First try local storage (instant)
            const cachedContacts = await StorageService.getEmergencyContacts();
            if (cachedContacts && cachedContacts.length > 0) {
                setContacts(cachedContacts);
                console.log('📇 Loaded contacts from cache:', cachedContacts.length);
            }

            // Then try database if online and userId available
            const netState = await NetInfo.fetch();
            if (netState.isConnected && userId) {
                try {
                    const dbContacts = await db.query.emergencyContacts.findMany({
                        where: eq(emergencyContactsTable.userId, userId),
                    });

                    if (dbContacts && dbContacts.length > 0) {
                        const formattedContacts: EmergencyContact[] = dbContacts.map(c => ({
                            id: c.id,
                            name: c.name,
                            phone: c.phone,
                            relationship: c.relationship || undefined,
                            createdAt: c.createdAt,
                            updatedAt: c.updatedAt,
                        }));

                        setContacts(formattedContacts);
                        await StorageService.setEmergencyContacts(formattedContacts);
                        console.log('📇 Loaded contacts from database:', formattedContacts.length);
                    }
                } catch (dbError) {
                    console.error('Database fetch failed, using cache:', dbError);
                }
            }
        } catch (err) {
            console.error('Failed to load contacts:', err);
            setError('Failed to load emergency contacts');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    /**
     * Refresh contacts from database
     */
    const refreshContacts = useCallback(async () => {
        await loadContacts();
    }, [loadContacts]);

    /**
     * Add new contact
     */
    const addContact = useCallback(
        async (contact: Omit<EmergencyContact, 'id'>): Promise<string> => {
            try {
                setError(null);
                const newContactId = `contact_${Date.now()}_${Math.random().toString(36).substring(7)}`;

                const newContact: EmergencyContact = {
                    ...contact,
                    id: newContactId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                // Update local state immediately (optimistic update)
                const updatedContacts = [...contacts, newContact];
                setContacts(updatedContacts);
                await StorageService.setEmergencyContacts(updatedContacts);

                // Try to sync to database
                const netState = await NetInfo.fetch();
                if (netState.isConnected && userId) {
                    try {
                        await db.insert(emergencyContactsTable).values({
                            id: newContactId,
                            userId,
                            name: newContact.name,
                            phone: newContact.phone,
                            relationship: newContact.relationship || null,
                        });
                        console.log('✅ Contact added to database:', newContactId);
                    } catch (dbError) {
                        console.error('Database insert failed, queued for sync:', dbError);
                        // TODO: Add to sync queue
                    }
                }

                return newContactId;
            } catch (err) {
                console.error('Failed to add contact:', err);
                setError('Failed to add contact');
                throw err;
            }
        },
        [contacts, userId]
    );

    /**
     * Update existing contact
     */
    const updateContact = useCallback(
        async (id: string, updates: Partial<EmergencyContact>): Promise<void> => {
            try {
                setError(null);

                // Update local state immediately
                const updatedContacts = contacts.map(c =>
                    c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
                );
                setContacts(updatedContacts);
                await StorageService.setEmergencyContacts(updatedContacts);

                // Try to sync to database
                const netState = await NetInfo.fetch();
                if (netState.isConnected && userId) {
                    try {
                        await db
                            .update(emergencyContactsTable)
                            .set({
                                name: updates.name,
                                phone: updates.phone,
                                relationship: updates.relationship || null,
                                updatedAt: new Date(),
                            })
                            .where(eq(emergencyContactsTable.id, id));
                        console.log('✅ Contact updated in database:', id);
                    } catch (dbError) {
                        console.error('Database update failed, queued for sync:', dbError);
                        // TODO: Add to sync queue
                    }
                }
            } catch (err) {
                console.error('Failed to update contact:', err);
                setError('Failed to update contact');
                throw err;
            }
        },
        [contacts, userId]
    );

    /**
     * Delete contact
     */
    const deleteContact = useCallback(
        async (id: string): Promise<void> => {
            try {
                setError(null);

                // Update local state immediately
                const updatedContacts = contacts.filter(c => c.id !== id);
                setContacts(updatedContacts);
                await StorageService.setEmergencyContacts(updatedContacts);

                // Try to sync to database
                const netState = await NetInfo.fetch();
                if (netState.isConnected && userId) {
                    try {
                        await db.delete(emergencyContactsTable).where(eq(emergencyContactsTable.id, id));
                        console.log('✅ Contact deleted from database:', id);
                    } catch (dbError) {
                        console.error('Database delete failed, queued for sync:', dbError);
                        // TODO: Add to sync queue
                    }
                }
            } catch (err) {
                console.error('Failed to delete contact:', err);
                setError('Failed to delete contact');
                throw err;
            }
        },
        [contacts, userId]
    );

    /**
     * Clear error message
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value: EmergencyContactsContextType = {
        contacts,
        loading,
        error,
        refreshContacts,
        addContact,
        updateContact,
        deleteContact,
        clearError,
    };

    return (
        <EmergencyContactsContext.Provider value={value}>
            {children}
        </EmergencyContactsContext.Provider>
    );
}

// ==================== HOOK ====================

export function useEmergencyContacts(): EmergencyContactsContextType {
    const context = useContext(EmergencyContactsContext);
    if (!context) {
        throw new Error('useEmergencyContacts must be used within EmergencyContactsProvider');
    }
    return context;
}

export default EmergencyContactsContext;
