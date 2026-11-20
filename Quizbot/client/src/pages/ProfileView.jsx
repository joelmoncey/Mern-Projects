import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Check,
  Edit3,
  Flag,
  Flame,
  Heart,
  Loader2,
  Shield,
  Target,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import EditQuizModal from '../components/EditQuizModal.jsx';

function ProfileQuizItem({
  quiz,
  canManage,
  isOfflinePreview,
  onEdit,
  onDelete,
  onStatsUpdated,
}) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [attemptResult, setAttemptResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAnswered = attemptResult !== null;
  const tagLabel =
    quiz.hashtag?.tag ||
    `${quiz.examName || 'EXAM'}_${quiz.subjectName || 'SUBJECT'}`.toUpperCase();

  async function handleSelectOption(idx) {
    if (isAnswered || submitting) return;
    setSelectedIdx(idx);
    setSubmitting(true);

    try {
      if (isOfflinePreview) {
        const rightIdx =
          typeof quiz.correctIndex === 'number' ? quiz.correctIndex : 0;
        setAttemptResult({
          isCorrect: idx === rightIdx,
          correctIndex: rightIdx,
          explanation: quiz.explanation || '',
        });
        return;
      }

      const data = await apiRequest(`/api/quizzes/${quiz._id}/attempt`, {
        method: 'POST',
        body: { selectedIndex: idx },
      });
      setAttemptResult(data);
      if (data.userStats && onStatsUpdated) {
        onStatsUpdated(data.userStats, quiz._id, data.attemptsCount);
      }
    } catch {
      setSelectedIdx(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete(quiz._id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-2xs ${
        quiz.needsCreatorEdit
          ? 'border-rose-300 ring-1 ring-rose-500/15'
          : 'border-slate-200'
      }`}
    >
      {/* Top Row: Tag + Flags + Owner/Admin Edit/Delete */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
            #{tagLabel}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {quiz.examName} &bull; {quiz.subjectName}
          </span>
          {quiz.needsCreatorEdit && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 uppercase">
              <Flag className="h-2.5 w-2.5" />
              Needs Fix ({quiz.flagCount})
            </span>
          )}
        </div>

        {canManage && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(quiz)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95"
            >
              <Edit3 className="h-3 w-3" />
              <span>Edit</span>
            </button>

            {confirmDelete ? (
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-rose-500"
              >
                <span>{deleting ? '...' : 'Confirm'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete quiz"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Question */}
      <p className="mb-3 text-sm leading-snug font-bold text-slate-900">
        {quiz.question}
      </p>

      {/* Interactive Options with vibrant Green (✓ RIGHT) & Red (✕ WRONG) */}
      <div className="flex flex-col gap-1.5">
        {(quiz.options || []).map((opt, idx) => {
          const isCorrectOption =
            isAnswered && idx === attemptResult.correctIndex;
          const isWrongSelected =
            isAnswered &&
            idx === selectedIdx &&
            idx !== attemptResult.correctIndex;

          let btnClasses =
            'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-white active:scale-[0.99]';
          let badgeClasses = 'border border-slate-200 bg-white text-slate-700';

          if (isCorrectOption) {
            btnClasses =
              'border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/20';
            badgeClasses = 'bg-emerald-600 text-white';
          } else if (isWrongSelected) {
            btnClasses =
              'border-rose-500 bg-rose-50 text-rose-950 ring-1 ring-rose-500/20';
            badgeClasses = 'bg-rose-600 text-white';
          } else if (isAnswered) {
            btnClasses = 'border-slate-200/60 bg-slate-50/40 text-slate-400';
            badgeClasses = 'border border-slate-200 bg-slate-100 text-slate-400';
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={isAnswered || submitting}
              onClick={() => handleSelectOption(idx)}
              className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${btnClasses}`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${badgeClasses}`}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span
                className={`flex-1 ${
                  isCorrectOption ? 'font-bold' : isWrongSelected ? 'font-semibold' : ''
                }`}
              >
                {opt}
              </span>
              {isCorrectOption && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                  Right
                </span>
              )}
              {isWrongSelected && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                  <X className="h-2.5 w-2.5 stroke-[3]" />
                  Wrong
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isAnswered && attemptResult.explanation && (
        <div
          className={`mt-2.5 rounded-xl border p-2.5 text-xs ${
            attemptResult.isCorrect
              ? 'border-emerald-200 bg-emerald-50/90 text-emerald-950'
              : 'border-rose-200 bg-rose-50/90 text-rose-950'
          }`}
        >
          <span className="font-bold">
            {attemptResult.isCorrect ? '✓ Right: ' : '✕ Explanation: '}
          </span>
          {attemptResult.explanation}
        </div>
      )}

      {/* Footer stats */}
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-500">
        <span>{quiz.attemptsCount || 0} attempts</span>
        <span className="inline-flex items-center gap-1">
          <Heart className="h-3 w-3 text-rose-500" />
          {quiz.likesCount || 0} likes
        </span>
      </div>
    </div>
  );
}

export default function ProfileView({
  targetUserId = null,
  onBack = null,
  onOpenAdmin = null,
}) {
  const { user, isOfflinePreview, updateUserStats } = useAuth();
  const [profile, setProfile] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [followBusy, setFollowBusy] = useState(false);

  const loadProfile = useCallback(async () => {
    if (isOfflinePreview) {
      const totalSolved = user?.totalSolved || 24;
      const correctSolved = user?.correctSolved || 19;
      setProfile({
        _id: targetUserId || user?._id || 'offline-dev-user',
        firstName: user?.firstName || 'Dev Aspirant',
        username: user?.username || 'dev_aspirant',
        role: user?.role || 'admin',
        totalSolved,
        correctSolved,
        accuracy: Math.round((correctSolved / totalSolved) * 100),
        streakCount: user?.streakCount || 3,
        followersCount: 12,
        followingCount: 4,
        isFollowing: false,
        isOwnProfile: !targetUserId || targetUserId === user?._id,
        canManageQuizzes: true,
        quizzesCount: 1,
      });
      setQuizzes([
        {
          _id: 'preview-1',
          examName: 'UPSC',
          subjectName: 'History',
          hashtag: { tag: 'UPSC_HISTORY' },
          question:
            'Which Indus Valley Civilization site is famous for its tidal dockyard structure?',
          options: ['Harappa', 'Mohenjo-daro', 'Lothal', 'Kalibangan'],
          correctIndex: 2,
          explanation:
            'Lothal in Gujarat featured an engineered tidal dockyard linked to the Sabarmati river system.',
          attemptsCount: 128,
          likesCount: 42,
        },
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const endpoint = targetUserId
        ? `/api/users/${targetUserId}/profile`
        : '/api/users/me';
      const data = await apiRequest(endpoint);
      setProfile(data.profile);
      setQuizzes(data.quizzes || []);
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [targetUserId, isOfflinePreview]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function handleProfileQuizAttempted(userStats, quizId, nextAttemptsCount) {
    updateUserStats(userStats);
    if (quizId && typeof nextAttemptsCount === 'number') {
      setQuizzes((prev) =>
        prev.map((q) =>
          q._id === quizId ? { ...q, attemptsCount: nextAttemptsCount } : q
        )
      );
    }
    setProfile((prev) => {
      if (!prev || !prev.isOwnProfile || !userStats) return prev;
      const totalSolved = userStats.totalSolved ?? prev.totalSolved;
      const correctSolved = userStats.correctSolved ?? prev.correctSolved;
      const accuracy =
        totalSolved > 0 ? Math.round((correctSolved / totalSolved) * 100) : 0;
      return {
        ...prev,
        totalSolved,
        correctSolved,
        accuracy,
        streakCount: userStats.streakCount ?? prev.streakCount,
      };
    });
  }

  async function handleToggleFollow() {
    if (!profile || profile.isOwnProfile || followBusy) return;

    if (isOfflinePreview) {
      setProfile((prev) => ({
        ...prev,
        isFollowing: !prev.isFollowing,
        followersCount: prev.isFollowing
          ? Math.max(0, prev.followersCount - 1)
          : prev.followersCount + 1,
      }));
      return;
    }

    setFollowBusy(true);
    try {
      const data = await apiRequest(`/api/users/${profile._id}/follow`, {
        method: 'POST',
      });
      setProfile((prev) => ({
        ...prev,
        isFollowing: data.following,
        followersCount: data.followersCount,
      }));
    } catch (err) {
      setError(err.message || 'Could not update follow');
    } finally {
      setFollowBusy(false);
    }
  }

  async function handleDeleteQuiz(quizId) {
    if (isOfflinePreview) {
      setQuizzes((prev) => prev.filter((q) => q._id !== quizId));
      return;
    }

    await apiRequest(`/api/quizzes/${quizId}`, { method: 'DELETE' });
    setQuizzes((prev) => prev.filter((q) => q._id !== quizId));
    setProfile((prev) =>
      prev
        ? { ...prev, quizzesCount: Math.max(0, (prev.quizzesCount || 1) - 1) }
        : prev
    );
  }

  const initial = (
    profile?.firstName ||
    profile?.username ||
    'A'
  )
    .charAt(0)
    .toUpperCase();

  return (
    <div className="h-dvh overflow-y-auto bg-[#F8FAFC] px-4 pt-5 pb-24">
      {/* Top Bar */}
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-1.5 text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              {profile?.isOwnProfile === false ? 'Creator Profile' : 'My Profile'}
            </h1>
            <p className="text-xs text-slate-500">
              Performance stats &amp; published quizzes
            </p>
          </div>
        </div>

        {user?.role === 'admin' && onOpenAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 active:scale-95"
          >
            <Shield className="h-3.5 w-3.5 text-slate-900" />
            <span>Admin Console</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
        </div>
      ) : !profile ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
          Profile unavailable.
        </div>
      ) : (
        <>
          {/* Profile Summary Card */}
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 text-base font-bold text-white shadow-xs">
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="truncate text-base font-bold text-slate-900">
                      {profile.firstName}
                    </h2>
                    {profile.role === 'admin' && (
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs font-medium text-slate-500">
                    @{profile.username || 'aspirant'}
                  </p>
                </div>
              </div>

              {!profile.isOwnProfile && (
                <button
                  type="button"
                  disabled={followBusy}
                  onClick={handleToggleFollow}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition active:scale-95 ${
                    profile.isFollowing
                      ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      : 'bg-slate-900 text-white shadow-xs hover:bg-slate-800'
                  }`}
                >
                  {profile.isFollowing ? (
                    <>
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* 4-Card Stats Grid */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-xs font-bold text-slate-900">
                  <Award className="h-3.5 w-3.5 text-slate-700" />
                  <span>{profile.totalSolved}</span>
                </div>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                  Solved
                </p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-700">
                  <Target className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{profile.accuracy}%</span>
                </div>
                <p className="mt-0.5 text-[10px] font-semibold text-emerald-700/80">
                  Accuracy
                </p>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-xs font-bold text-amber-700">
                  <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  <span>{profile.streakCount}d</span>
                </div>
                <p className="mt-0.5 text-[10px] font-semibold text-amber-700/80">
                  Streak
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-xs font-bold text-slate-900">
                  <Users className="h-3.5 w-3.5 text-slate-700" />
                  <span>{profile.followersCount}</span>
                </div>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                  Followers
                </p>
              </div>
            </div>
          </div>

          {/* Creator's Published Quizzes */}
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Published Quizzes ({quizzes.length})
            </h3>
            <span className="text-[11px] font-medium text-slate-400">
              {profile.followingCount} following
            </span>
          </div>

          {quizzes.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 shadow-2xs">
              No quizzes published yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {quizzes.map((quiz) => (
                <ProfileQuizItem
                  key={quiz._id}
                  quiz={quiz}
                  canManage={Boolean(profile.canManageQuizzes)}
                  isOfflinePreview={isOfflinePreview}
                  onEdit={setEditingQuiz}
                  onDelete={handleDeleteQuiz}
                  onStatsUpdated={handleProfileQuizAttempted}
                />
              ))}
            </div>
          )}
        </>
      )}

      {editingQuiz && (
        <EditQuizModal
          quiz={editingQuiz}
          onClose={() => setEditingQuiz(null)}
          onSaved={() => {
            loadProfile();
          }}
        />
      )}
    </div>
  );
}
