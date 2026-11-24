import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { apiRequest } from './lib/api.js';
import BottomNav from './components/BottomNav.jsx';
import FeedView from './pages/FeedView.jsx';
import CreateQuizView from './pages/CreateQuizView.jsx';
import NotificationsView from './pages/NotificationsView.jsx';
import LeaderboardView from './pages/LeaderboardView.jsx';
import ProfileView from './pages/ProfileView.jsx';
import AdminHashtagsView from './pages/AdminHashtagsView.jsx';
import BuyMeAChaiModal from './components/BuyMeAChaiModal.jsx';

const EXAM_FILTER_STORAGE_KEY = 'quiz_gram_exam_filter_v1';

function loadSavedExamFilter() {
  try {
    const raw = localStorage.getItem(EXAM_FILTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function AppShell() {
  const { user, loading, authMode, error, isOfflinePreview, reauthenticate } =
    useAuth();
  const [activeTab, setActiveTab] = useState('feed');
  const [viewingCreatorId, setViewingCreatorId] = useState(null);
  const [creatorBackTab, setCreatorBackTab] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [examFilter, setExamFilter] = useState(() => loadSavedExamFilter());
  const [showChaiModal, setShowChaiModal] = useState(false);

  function handleUpdateExamFilter(nextFilter) {
    setExamFilter(nextFilter);
    try {
      if (nextFilter) {
        localStorage.setItem(
          EXAM_FILTER_STORAGE_KEY,
          JSON.stringify(nextFilter)
        );
      } else {
        localStorage.removeItem(EXAM_FILTER_STORAGE_KEY);
      }
    } catch {
      // Ignore storage quota errors
    }
  }

  useEffect(() => {
    if (!user || isOfflinePreview) return;
    let cancelled = false;
    apiRequest('/api/notifications')
      .then((data) => {
        if (!cancelled) setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, isOfflinePreview, activeTab]);

  if (loading) {
    return (
      <main className="mx-auto flex h-dvh max-w-md flex-col items-center justify-center gap-3 bg-[#F8FAFC] text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-slate-900" />
        <p className="text-xs font-semibold tracking-wide">
          Signing in to Quiz-Gram...
        </p>
      </main>
    );
  }

  if (authMode === 'error') {
    return (
      <main className="mx-auto flex h-dvh max-w-md flex-col items-center justify-center gap-3 bg-[#F8FAFC] px-6 text-center">
        <p className="text-sm font-bold text-slate-900">Authentication Failed</p>
        <p className="text-xs text-slate-500">{error}</p>
        <button
          type="button"
          onClick={reauthenticate}
          className="rounded-full bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
        >
          Try Again
        </button>
      </main>
    );
  }

  const isAdmin = user?.role === 'admin';
  const currentTab = activeTab === 'admin' && !isAdmin ? 'feed' : activeTab;

  function handleChangeTab(nextTab) {
    setViewingCreatorId(null);
    setCreatorBackTab(null);
    setActiveTab(nextTab);
  }

  function handleOpenCreatorProfile(creatorId, sourceTab = null) {
    if (!creatorId) return;
    // When admin clicks a creator inside Admin Console, always open that creator's profile
    // with a Back button returning directly to the Admin Console
    if (sourceTab === 'admin') {
      setCreatorBackTab('admin');
      setViewingCreatorId(String(creatorId));
      return;
    }
    if (user && String(creatorId) === String(user._id)) {
      setViewingCreatorId(null);
      setCreatorBackTab(null);
      setActiveTab('profile');
      return;
    }
    setCreatorBackTab(currentTab);
    setViewingCreatorId(String(creatorId));
  }

  return (
    <main className="relative mx-auto h-dvh w-full max-w-md overflow-hidden bg-[#F8FAFC] shadow-sm">
      {viewingCreatorId ? (
        <ProfileView
          targetUserId={viewingCreatorId}
          examFilter={examFilter}
          onUpdateExamFilter={handleUpdateExamFilter}
          onBack={() => {
            const backTarget = creatorBackTab;
            setViewingCreatorId(null);
            setCreatorBackTab(null);
            if (backTarget) {
              setActiveTab(backTarget);
            }
          }}
          onOpenAdmin={
            isAdmin
              ? () => {
                  setViewingCreatorId(null);
                  setCreatorBackTab(null);
                  setActiveTab('admin');
                }
              : null
          }
        />
      ) : (
        <>
          {currentTab === 'feed' && (
            <FeedView
              examFilter={examFilter}
              onUpdateExamFilter={handleUpdateExamFilter}
              onOpenCreate={() => handleChangeTab('create')}
              onOpenCreatorProfile={handleOpenCreatorProfile}
              onOpenChaiModal={() => setShowChaiModal(true)}
            />
          )}
          {currentTab === 'create' && (
            <CreateQuizView
              onCreated={() => handleChangeTab('feed')}
              onBackToFeed={() => handleChangeTab('feed')}
            />
          )}
          {currentTab === 'alerts' && (
            <NotificationsView
              onUnreadChanged={setUnreadCount}
              onOpenAdmin={isAdmin ? () => handleChangeTab('admin') : undefined}
            />
          )}
          {currentTab === 'leaderboard' && (
            <LeaderboardView
              onOpenCreatorProfile={handleOpenCreatorProfile}
              onOpenChaiModal={() => setShowChaiModal(true)}
            />
          )}
          {currentTab === 'profile' && (
            <ProfileView
              targetUserId={null}
              examFilter={examFilter}
              onUpdateExamFilter={handleUpdateExamFilter}
              onOpenAdmin={isAdmin ? () => handleChangeTab('admin') : null}
              onOpenChaiModal={() => setShowChaiModal(true)}
            />
          )}
          {currentTab === 'admin' && isAdmin && (
            <AdminHashtagsView
              onOpenCreatorProfile={handleOpenCreatorProfile}
            />
          )}
        </>
      )}

      <BottomNav
        activeTab={
          viewingCreatorId ? creatorBackTab || 'profile' : currentTab
        }
        onChangeTab={handleChangeTab}
        unreadCount={unreadCount}
      />

      {showChaiModal && (
        <BuyMeAChaiModal onClose={() => setShowChaiModal(false)} />
      )}
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
