// ============================================================
// MJ's Superstars - Authentication Context
// Manages user auth state, login/logout, token refresh
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthAPI, TokenManager, UserAPI } from '../services/api';
import { socketService } from '../services/socket';

const AuthContext = createContext(null);

// Storage keys for local persistence
const STORAGE_KEYS = {
  USER_PROFILE: 'mj_user_profile',
  API_KEY: 'mj_api_key', // Legacy - for backward compatibility
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for existing tokens
        if (TokenManager.isAuthenticated()) {
          // Try to get user profile from server
          if (isOnline) {
            try {
              const response = await UserAPI.getProfile();
              setUser(response.user);
              setProfile(response.user);

              // Connect socket after successful auth
              socketService.connect();
            } catch (err) {
              // Token might be expired or invalid
              if (err.status === 401) {
                TokenManager.clearTokens();
                // Fall back to local storage profile
                const localProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
                if (localProfile) {
                  setProfile(JSON.parse(localProfile));
                }
              }
            }
          } else {
            // Offline - use local profile
            const localProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
            if (localProfile) {
              setProfile(JSON.parse(localProfile));
            }
          }
        } else {
          // No tokens - check for legacy local profile
          const localProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
          if (localProfile) {
            setProfile(JSON.parse(localProfile));
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for logout events from API (token expiry)
    const handleLogout = () => {
      setUser(null);
      setProfile(null);
      socketService.disconnect();
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [isOnline]);

  // Register a new user
  const register = useCallback(async (email, password, displayName) => {
    setLoading(true);
    setError(null);

    try {
      const response = await AuthAPI.register(email, password, displayName);
      setUser(response.user);
      setProfile(response.user);

      // Save profile locally for offline access
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(response.user));

      // Connect socket
      socketService.connect();

      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Login existing user
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await AuthAPI.login(email, password);
      setUser(response.user);
      setProfile(response.user);

      // Save profile locally for offline access
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(response.user));

      // Connect socket
      socketService.connect();

      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout user
  const logout = useCallback(async () => {
    try {
      if (isOnline && TokenManager.isAuthenticated()) {
        await AuthAPI.logout();
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      TokenManager.clearTokens();
      setUser(null);
      setProfile(null);
      socketService.disconnect();

      // Optionally clear local profile
      // localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    }
  }, [isOnline]);

  // Update user profile
  const updateProfile = useCallback(async (updates) => {
    setError(null);

    try {
      if (isOnline && TokenManager.isAuthenticated()) {
        const response = await UserAPI.updateProfile(updates);
        const updatedProfile = { ...profile, ...response.user };
        setUser(response.user);
        setProfile(updatedProfile);
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
        return response;
      } else {
        // Offline update - just update local
        const updatedProfile = { ...profile, ...updates };
        setProfile(updatedProfile);
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedProfile));

        // Queue for sync when online
        queueOfflineUpdate('profile', updates);

        return { user: updatedProfile };
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [isOnline, profile]);

  // Update communication style
  const updateCommunicationStyle = useCallback(async (style) => {
    try {
      if (isOnline && TokenManager.isAuthenticated()) {
        return await UserAPI.updateCommunicationStyle(style);
      } else {
        queueOfflineUpdate('communicationStyle', style);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [isOnline]);

  // Complete onboarding
  const completeOnboarding = useCallback(async (onboardingData) => {
    try {
      // Save profile locally regardless of online status
      const profileData = {
        name: onboardingData.name,
        age: onboardingData.age,
        pronouns: onboardingData.pronouns,
        location: onboardingData.location,
        struggles: onboardingData.struggles,
        communicationPref: onboardingData.communicationPref,
        interests: onboardingData.interests,
        onboardingComplete: true
      };

      setProfile(profileData);
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profileData));

      if (isOnline && TokenManager.isAuthenticated()) {
        return await UserAPI.completeOnboarding(onboardingData);
      } else {
        queueOfflineUpdate('onboarding', onboardingData);
      }

      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [isOnline]);

  // Set profile directly (for backward compatibility with existing code)
  const setProfileDirect = useCallback((profileData) => {
    setProfile(profileData);
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profileData));
  }, []);

  // Reset all user data
  const reset = useCallback(async () => {
    await logout();

    // Clear all MJ storage keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('mj_')) {
        localStorage.removeItem(key);
      }
    });

    setProfile(null);
    setUser(null);
  }, [logout]);

  // Queue offline updates for later sync
  const queueOfflineUpdate = (type, data) => {
    const queue = JSON.parse(localStorage.getItem('mj_offline_queue') || '[]');
    queue.push({
      type,
      data,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('mj_offline_queue', JSON.stringify(queue));
  };

  // Sync offline queue when online
  useEffect(() => {
    const syncOfflineQueue = async () => {
      if (!isOnline || !TokenManager.isAuthenticated()) return;

      const queue = JSON.parse(localStorage.getItem('mj_offline_queue') || '[]');
      if (queue.length === 0) return;

      const remainingQueue = [];

      for (const item of queue) {
        try {
          switch (item.type) {
            case 'profile':
              await UserAPI.updateProfile(item.data);
              break;
            case 'communicationStyle':
              await UserAPI.updateCommunicationStyle(item.data);
              break;
            case 'onboarding':
              await UserAPI.completeOnboarding(item.data);
              break;
            default:
              console.warn('Unknown offline update type:', item.type);
          }
        } catch (err) {
          console.error('Failed to sync offline update:', err);
          remainingQueue.push(item);
        }
      }

      localStorage.setItem('mj_offline_queue', JSON.stringify(remainingQueue));
    };

    if (isOnline) {
      syncOfflineQueue();
    }
  }, [isOnline]);

  const value = {
    user,
    profile,
    loading,
    error,
    isOnline,
    isAuthenticated: !!user || !!profile,
    register,
    login,
    logout,
    updateProfile,
    updateCommunicationStyle,
    completeOnboarding,
    setProfile: setProfileDirect,
    reset
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
