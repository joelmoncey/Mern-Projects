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

function AppShell() {
  const { user, loading, authMode, error, isOfflinePreview, reauthenticate } =
    useAuth();
  const [activeTab, setActiveTab] = useState('feed');
  const [viewingCreatorId, setViewingCreatorId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

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
    setActiveTab(nextTab);
  }

  function handleOpenCreatorProfile(creatorId) {
    if (!creatorId) return;
    if (user && String(creatorId) === String(user._id)) {
      setViewingCreatorId(null);
      setActiveTab('profile');
      return;
    }
    setViewingCreatorId(String(creatorId));
  }

  return (
    <main className="relative mx-auto h-dvh w-full max-w-md overflow-hidden bg-[#F8FAFC] shadow-sm">
      {viewingCreatorId ? (
        <ProfileView
          targetUserId={viewingCreatorId}
          onBack={() => setViewingCreatorId(null)}
          onOpenAdmin={
            isAdmin
              ? () => {
                  setViewingCreatorId(null);
                  setActiveTab('admin');
                }
              : null
          }
        />
      ) : (
        <>
          {currentTab === 'feed' && (
            <FeedView
              onOpenCreate={() => handleChangeTab('create')}
              onOpenCreatorProfile={handleOpenCreatorProfile}
            />
          )}
          {currentTab === 'create' && (
            <CreateQuizView onCreated={() => handleChangeTab('feed')} />
          )}
          {currentTab === 'alerts' && (
            <NotificationsView
              onUnreadChanged={setUnreadCount}
              onOpenAdmin={isAdmin ? () => handleChangeTab('admin') : undefined}
            />
          )}
          {currentTab === 'leaderboard' && (
            <LeaderboardView onOpenCreatorProfile={handleOpenCreatorProfile} />
          )}
          {currentTab === 'profile' && (
            <ProfileView
              targetUserId={null}
              onOpenAdmin={isAdmin ? () => handleChangeTab('admin') : null}
            />
          )}
          {currentTab === 'admin' && isAdmin && <AdminHashtagsView />}
        </>
      )}

      <BottomNav
        activeTab={viewingCreatorId ? 'profile' : currentTab}
        onChangeTab={handleChangeTab}
        unreadCount={unreadCount}
      />
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
