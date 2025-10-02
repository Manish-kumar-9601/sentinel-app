import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';



const AuthContext = createContext({
    user: null,
    isLoading: true,
    setUser: () => { },
    logout: () => { },
    setGuest:() => {},
    
});

export const useAuth = () => useContext(AuthContext);
export const AuthProvider = ({ children }) =>
{
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() =>
    {
        const checkUserSession = async () =>
        {
            try
            {
                const res = await fetch('/api/auth/session');
                if (res.ok)
                {
                    const data = await res.json();
                    setUser(data.user);
                } else
                {
                    setUser(null);
                }
            } catch (error)
            {
                console.error('Session check failed:', error);
                setUser(null);
            } finally
            {
                setIsLoading(false);
            }
        };

        checkUserSession();
    }, []);

    const logout = async () =>
    {
        try
        {
            const res = await fetch('/api/auth/logout', {
                method: 'POST',
            });
            // Whether the API call succeeds or fails, we log the user out on the client
            setUser(null);
            if (!res.ok)
            {
                const data = await res.json();
                Alert.alert('Logout Issue', data.error || 'Could not clear session from server.');
            }
        } catch (error)
        {
            console.error('Logout error:', error);
            // Still log the user out on the client even if the server call fails
            setUser(null);
            Alert.alert('Error', 'An unexpected error occurred during logout.');
        }
    };

    const value = {
        user,
        setUser,
        logout,
        isLoading,

    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

