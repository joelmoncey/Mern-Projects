import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiRequest, setAuthToken } from '../lib/api.js';
import { getTelegramInitData } from '../lib/telegram.js';

const AuthContext = createContext(null);

const DEV_FALLBACK_USER = {
  telegramId: '123456789',
  firstName: 'Dev Aspirant',
  username: 'dev_aspirant',
  photoUrl: '',
};

const OFFLINE_MOCK_USER = {
  _id: 'offline-dev-user',
  telegramId: DEV_FALLBACK_USER.telegramId,
  firstName: DEV_FALLBACK_USER.firstName,
  username: DEV_FALLBACK_USER.username,
  photoUrl: '',
  role: 'admin',
  followersCount: 12,
  followingCount: 4,
  following: [],
  streakCount: 3,
  totalSolved: 24,
  correctSolved: 19,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('loading'); // 'telegram' | 'dev' | 'offline-preview'
  const [error, setError] = useState(null);

  const authenticate = useCallback(async () => {
    setLoading(true);
    setError(null);

    const initData = getTelegramInitData();

    try {
      const payload = initData
        ? { initData }
        : { devUser: DEV_FALLBACK_USER };

      const data = await apiRequest('/api/auth/telegram', {
        method: 'POST',
        body: payload,
      });

      setAuthToken(data.token);
      setToken(data.token);
      setUser(data.user);
      setAuthMode(initData ? 'telegram' : 'dev');
    } catch (err) {
      // In local browser preview when MongoDB/API is not running yet,
      // fall back to a mock admin user so every view can be inspected cleanly.
      if (!initData) {
        setAuthToken(null);
        setToken(null);
        setUser(OFFLINE_MOCK_USER);
        setAuthMode('offline-preview');
        setError(err.message || 'API offline — running in local preview mode');
      } else {
        setError(err.message || 'Telegram authentication failed');
        setAuthMode('error');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  const updateUserStats = useCallback((userStats) => {
    if (!userStats) return;
    setUser((prev) =>
      prev
        ? {
            ...prev,
            streakCount: userStats.streakCount ?? prev.streakCount,
            totalSolved: userStats.totalSolved ?? prev.totalSolved,
            correctSolved: userStats.correctSolved ?? prev.correctSolved,
          }
        : prev
    );
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authMode,
        error,
        isOfflinePreview: authMode === 'offline-preview',
        reauthenticate: authenticate,
        updateUserStats,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
