import   { createContext, useState, useEffect, useContext } from 'react';
import { useRouter } from 'expo-router';

const AuthContext = createContext(null);

export function useAuth ()
{
    return useContext(AuthContext);
}

export const AuthProvider = ({ children }) =>
{
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() =>
    {
        const checkSession = async () =>
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
                console.error('Failed to fetch session:', error);
                setUser(null);
            } finally
            {
                setIsLoading(false);
            }
        };
        checkSession();
    }, []);

    const login = async (email, password) =>
    {
        try
        {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (res.ok)
            {
                const data = await res.json();
                setUser(data.user);
                router.replace('/'); // Go to home screen after login
                return { success: true };
            }
            const errorData = await res.json();
            return { success: false, error: errorData.error || 'Login failed' };
        } catch (error)
        {
            return { success: false, error: 'An unexpected error occurred.' };
        }
    };

    const logout = async () =>
    {
        try
        {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error)
        {
            console.error("Logout failed:", error);
        } finally
        {
            setUser(null);
            router.replace('/login'); // Go to login screen after logout
        }
    };

    const authContextValue = {
        user,
        isLoading,
        login,
        logout,
        setUser
    };

    return (
        <AuthContext.Provider value={authContextValue}>
            {children}
        </AuthContext.Provider>
    );
};

