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
  canCreateQuiz: true,
  followersCount: 12,
  followingCount: 4,
  following: [],
  streakCount: 3,
  totalSolved: 24,
  correctSolved: 19,
};

const GUIDE_STORAGE_KEY = 'quiz_gram_welcome_guide_v1';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function checkLocalGuideFallback(userObj) {
  try {
    const raw = localStorage.getItem(GUIDE_STORAGE_KEY);
    const now = Date.now();
    if (!raw) {
      return { open: true, reason: 'new_user' };
    }
    const parsed = JSON.parse(raw);
    const lastShownMs = Number(parsed?.lastShownAt) || 0;
    const lastActiveMs = userObj?.lastActiveDate
      ? new Date(userObj.lastActiveDate).getTime()
      : Number(parsed?.lastQuizAt) || lastShownMs;

    if (
      now - lastActiveMs >= ONE_WEEK_MS &&
      now - lastShownMs >= ONE_WEEK_MS
    ) {
      return { open: true, reason: 'weekly_comeback' };
    }
  } catch {
    // Ignore storage errors
  }
  return { open: false, reason: 'new_user' };
}

function persistLocalGuideShown(userObj) {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(GUIDE_STORAGE_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      GUIDE_STORAGE_KEY,
      JSON.stringify({
        ...prev,
        lastShownAt: now,
        lastQuizAt: userObj?.lastActiveDate
          ? new Date(userObj.lastActiveDate).getTime()
          : prev.lastQuizAt || now,
      })
    );
  } catch {
    // Ignore
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('loading'); // 'telegram' | 'dev' | 'offline-preview'
  const [error, setError] = useState(null);
  const [welcomeGuide, setWelcomeGuide] = useState({
    open: false,
    reason: 'new_user',
  });

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

      if (data.showWelcomeGuide) {
        persistLocalGuideShown(data.user);
        setWelcomeGuide({
          open: true,
          reason: data.welcomeGuideReason || 'new_user',
        });
      } else {
        const fallback = checkLocalGuideFallback(data.user);
        if (fallback.open) {
          persistLocalGuideShown(data.user);
          setWelcomeGuide(fallback);
        }
      }
    } catch (err) {
      // In local browser preview when MongoDB/API is not running yet,
      // fall back to a mock admin user so every view can be inspected cleanly.
      if (!initData) {
        setAuthToken(null);
        setToken(null);
        setUser(OFFLINE_MOCK_USER);
        setAuthMode('offline-preview');
        setError(err.message || 'API offline — running in local preview mode');
        const fallback = checkLocalGuideFallback(OFFLINE_MOCK_USER);
        if (fallback.open) {
          persistLocalGuideShown(OFFLINE_MOCK_USER);
          setWelcomeGuide(fallback);
        }
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

  // Auto-recover if the phone regains internet while stuck on an error state
  useEffect(() => {
    if (authMode !== 'error') return;
    const handleOnline = () => {
      authenticate();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [authMode, authenticate]);

  const updateUserStats = useCallback((userStats) => {
    if (!userStats) return;
    try {
      const raw = localStorage.getItem(GUIDE_STORAGE_KEY);
      const prev = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        GUIDE_STORAGE_KEY,
        JSON.stringify({ ...prev, lastQuizAt: Date.now() })
      );
    } catch {
      // Ignore
    }
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

  const openWelcomeGuide = useCallback((reason = 'manual') => {
    setWelcomeGuide({ open: true, reason });
  }, []);

  const dismissWelcomeGuide = useCallback(() => {
    setWelcomeGuide((prev) => ({ ...prev, open: false }));
  }, []);

  const updateUserProfile = useCallback((partial) => {
    if (!partial) return;
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
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
        updateUserProfile,
        welcomeGuide,
        openWelcomeGuide,
        dismissWelcomeGuide,
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
