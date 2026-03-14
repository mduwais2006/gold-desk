import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const [isLocked, setIsLocked] = useState(() => {
        const lastActive = localStorage.getItem('lastActive');
        if (lastActive) {
            // Lock if inactive for more than 30 minutes (1800000 ms)
            return (Date.now() - parseInt(lastActive, 10)) > 1800000;
        }
        return false;
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Track activity to update lastActive
        const updateActivity = () => {
            localStorage.setItem('lastActive', Date.now().toString());
        };

        // If the user is logged in and not locked, register activity
        if (user && !isLocked) {
            updateActivity();
            const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
            events.forEach(e => window.addEventListener(e, updateActivity));

            // Set up a timer to auto-lock the session if they sit inactive for 30 minutes
            const interval = setInterval(() => {
                const last = localStorage.getItem('lastActive');
                if (last && (Date.now() - parseInt(last, 10)) > 1800000) {
                    setIsLocked(true);
                }
            }, 60000); // Check every minute

            return () => {
                events.forEach(e => window.removeEventListener(e, updateActivity));
                clearInterval(interval);
            };
        }
    }, [user, isLocked]);

    const login = async (loginIdentifier, password) => {
        // We set lastActive upon explicit login
        localStorage.setItem('lastActive', Date.now().toString());
        const { data } = await api.post('/auth/login', { loginIdentifier, password });
        return data; // Returns OTP sent message and loginIdentifier
    };

    const unlock = async (password) => {
        if (!user) return;
        const loginIdentifier = user.phone || user.email;
        const { data } = await api.post('/auth/login', { loginIdentifier, password, isUnlock: true });
        
        // Success means password matched
        setIsLocked(false);
        localStorage.setItem('lastActive', Date.now().toString());
        
        // Refresh token if needed
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        return data;
    };

    const verifyOtp = async (loginIdentifier, otp, firebaseToken = null) => {
        const { data } = await api.post('/auth/verify-otp', { loginIdentifier, otp, firebaseToken });
        const now = Date.now().toString();
        localStorage.setItem('user', JSON.stringify(data));
        localStorage.setItem('lastActive', now);
        setUser(data);
        setIsLocked(false);
        return data;
    };

    const register = async (userData) => {
        const { data } = await api.post('/auth/register', userData);
        // Note: You may want to auto login or redirect to login based on flow
        return data;
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('lastActive');
        setUser(null);
        setIsLocked(false);
    };

    const value = {
        user,
        setUser,
        login,
        unlock,
        isLocked,
        verifyOtp,
        register,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
