import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Check,
  Edit3,
  Flag,
  Flame,
  Heart,
  Layers,
  Loader2,
  MessageCircle,
  Play,
  Shield,
  SlidersHorizontal,
  Target,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { openAdminContactLink } from '../lib/telegram.js';
import { useAuth } from '../context/AuthContext.jsx';
import EditQuizModal from '../components/EditQuizModal.jsx';
import ExamTopicPickerModal from '../components/ExamTopicPickerModal.jsx';
import QuizCard from '../components/QuizCard.jsx';
import { formatHierarchyPath } from './CreateQuizView.jsx';

function getTopicKey(quiz) {
  const tagId = quiz.hashtag?._id || quiz.hashtag?.tag || quiz.hashtag;
  if (tagId) return String(tagId);
  return `${quiz.examName || 'EXAM'}_${quiz.subjectName || 'SUBJECT'}`;
}

function getTopicMeta(quiz) {
  const key = getTopicKey(quiz);
  const tag =
    quiz.hashtag?.tag ||
    `${quiz.examName || 'EXAM'}_${quiz.subjectName || 'SUBJECT'}`.toUpperCase();
  const hierarchy =
    formatHierarchyPath(quiz) || `${quiz.examName} › ${quiz.subjectName}`;
  return {
    key,
    tag,
    hierarchy,
    examName: quiz.examName || quiz.hashtag?.examName || '',
    subExamName: quiz.subExamName || quiz.hashtag?.subExamName || '',
    subjectName: quiz.subjectName || quiz.hashtag?.subjectName || '',
    subSubjectName: quiz.subSubjectName || quiz.hashtag?.subSubjectName || '',
    subTopicName: quiz.subTopicName || quiz.hashtag?.subTopicName || '',
    hashtagId: quiz.hashtag?._id || '',
  };
}

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
  const hierarchyLabel =
    formatHierarchyPath(quiz) || `${quiz.examName} › ${quiz.subjectName}`;

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
      {/* Top Row: Tag + Hierarchy + Owner/Admin Edit/Delete */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
            #{tagLabel}
          </span>
          {quiz.language && (
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
              {quiz.language}
            </span>
          )}
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {hierarchyLabel}
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
                  isCorrectOption
                    ? 'font-bold'
                    : isWrongSelected
                      ? 'font-semibold'
                      : ''
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
  examFilter = null,
  onUpdateExamFilter = null,
  onBack = null,
  onOpenAdmin = null,
}) {
  const { user, isOfflinePreview, updateUserStats, updateUserProfile } =
    useAuth();
  const [profile, setProfile] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedTopicKey, setSelectedTopicKey] = useState('');
  const [fullScreenScrollMode, setFullScreenScrollMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [followBusy, setFollowBusy] = useState(false);

  // Custom creator username editor state (not taken from Telegram)
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameSuccess, setUsernameSuccess] = useState('');

  const [exams, setExams] = useState([]);
  const [groupedByExam, setGroupedByExam] = useState({});
  const [showPickerModal, setShowPickerModal] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isOfflinePreview) return;
    let cancelled = false;
    apiRequest('/api/hashtags')
      .then((data) => {
        if (!cancelled) {
          setExams(data.exams || []);
          setGroupedByExam(data.groupedByExam || {});
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOfflinePreview]);

  const loadProfile = useCallback(async () => {
    if (isOfflinePreview) {
      const totalSolved = user?.totalSolved || 24;
      const correctSolved = user?.correctSolved || 19;
      setProfile({
        _id: targetUserId || user?._id || 'offline-dev-user',
        firstName: user?.firstName || 'Dev Aspirant',
        username: user?.username || 'dev_aspirant',
        role: user?.role || 'admin',
        canCreateQuiz: true,
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
          subExamName: 'CSE Prelims',
          subjectName: 'History',
          subSubjectName: 'Ancient India',
          subTopicName: 'Indus Valley Civilization',
          hashtag: {
            _id: 'tag-upsc-hist',
            tag: 'UPSC_CSE_HISTORY_ANCIENT_IVC',
          },
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

  // Build single-topic buckets from this creator's quizzes
  const topics = useMemo(() => {
    const map = new Map();
    for (const q of quizzes) {
      const meta = getTopicMeta(q);
      if (!map.has(meta.key)) {
        map.set(meta.key, { ...meta, count: 0 });
      }
      map.get(meta.key).count += 1;
    }
    return Array.from(map.values());
  }, [quizzes]);

  // Automatically sync selectedTopicKey with the user's global examFilter from the first page
  useEffect(() => {
    if (topics.length === 0) return;

    // 1. Exact hashtag/tag match with examFilter
    if (examFilter?.hashtagId) {
      const byId = topics.find(
        (t) =>
          String(t.key) === String(examFilter.hashtagId) ||
          String(t.hashtagId) === String(examFilter.hashtagId)
      );
      if (byId) {
        setSelectedTopicKey(byId.key);
        return;
      }
    }

    // 2. Match by examName + subjectName from examFilter
    if (examFilter?.examName && examFilter?.subjectName) {
      const byExamAndSubj = topics.find(
        (t) =>
          t.examName.toLowerCase() === examFilter.examName.toLowerCase() &&
          t.subjectName.toLowerCase() === examFilter.subjectName.toLowerCase()
      );
      if (byExamAndSubj) {
        setSelectedTopicKey(byExamAndSubj.key);
        return;
      }
    }

    // 3. Match by examName from examFilter
    if (examFilter?.examName) {
      const byExam = topics.find(
        (t) => t.examName.toLowerCase() === examFilter.examName.toLowerCase()
      );
      if (byExam) {
        setSelectedTopicKey(byExam.key);
        return;
      }
    }

    // 4. Fallback to first available topic if current key isn't in topics
    if (!topics.some((t) => t.key === selectedTopicKey)) {
      setSelectedTopicKey(topics[0].key);
    }
  }, [
    topics,
    examFilter?.hashtagId,
    examFilter?.examName,
    examFilter?.subjectName,
  ]);

  const activeTopic = useMemo(
    () => topics.find((t) => t.key === selectedTopicKey) || topics[0] || null,
    [topics, selectedTopicKey]
  );

  const selectedTopicQuizzes = useMemo(() => {
    if (!activeTopic) return [];
    const byTopic = quizzes.filter((q) => getTopicKey(q) === activeTopic.key);
    if (examFilter?.language) {
      const byLang = byTopic.filter(
        (q) =>
          (q.language || 'English').toLowerCase() ===
          examFilter.language.toLowerCase()
      );
      if (byLang.length > 0) return byLang;
    }
    return byTopic;
  }, [quizzes, activeTopic, examFilter?.language]);

  function handleSelectTopic(topic) {
    setSelectedTopicKey(topic.key);
    // Keep the user's global exam/subject selection synced when they pick a topic here
    onUpdateExamFilter?.({
      examName: topic.examName,
      subExamName: topic.subExamName || '',
      subjectName: topic.subjectName,
      subSubjectName: topic.subSubjectName || '',
      subTopicName: topic.subTopicName || '',
      hashtagId: topic.hashtagId || '',
      tag: topic.tag || '',
      label: topic.hierarchy,
    });
  }

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

  async function handleOpenEditQuiz(quiz) {
    if (isOfflinePreview || typeof quiz.correctIndex === 'number') {
      setEditingQuiz(quiz);
      return;
    }
    try {
      const data = await apiRequest(`/api/quizzes/${quiz._id}`);
      setEditingQuiz(data.quiz);
    } catch {
      setEditingQuiz(quiz);
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

  function handleStartEditUsername() {
    setError('');
    setUsernameSuccess('');
    setUsernameInput(profile?.username || '');
    setEditingUsername(true);
  }

  async function handleSaveUsername(e) {
    e.preventDefault();
    const clean = usernameInput.trim().replace(/^@+/, '');
    if (!clean) {
      setError('Please enter a custom creator username.');
      return;
    }

    setError('');
    setUsernameSuccess('');

    if (isOfflinePreview) {
      setProfile((prev) => (prev ? { ...prev, username: clean } : prev));
      updateUserProfile?.({ username: clean });
      setEditingUsername(false);
      setUsernameSuccess(`Creator username set to @${clean}`);
      return;
    }

    setSavingUsername(true);
    try {
      const data = await apiRequest('/api/users/me/username', {
        method: 'PATCH',
        body: { username: clean },
      });
      setProfile((prev) =>
        prev ? { ...prev, username: data.username } : prev
      );
      updateUserProfile?.({ username: data.username });
      setEditingUsername(false);
      setUsernameSuccess(`Creator username updated to @${data.username}`);
    } catch (err) {
      setError(err.message || 'Could not update creator username');
    } finally {
      setSavingUsername(false);
    }
  }

  const initial = (
    profile?.firstName ||
    profile?.username ||
    'A'
  )
    .charAt(0)
    .toUpperCase();

  // Can manage (Edit/Delete) quizzes on this profile:
  // Either it's the user's own profile, OR the viewer is an admin inspecting this Creator Profile
  const canManageQuizzesHere = Boolean(profile?.canManageQuizzes || isAdmin);

  // Full-Screen Vertical Snap-Scroll Mode for the Selected Topic on Creator's Profile
  if (fullScreenScrollMode && activeTopic) {
    return (
      <div className="relative h-dvh w-full bg-[#F8FAFC]">
        <header className="fixed inset-x-0 top-0 z-30 mx-auto flex max-w-md items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 shadow-2xs backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setFullScreenScrollMode(false)}
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-1.5 text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95"
              aria-label="Back to creator profile"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-900">
                @{profile?.username || profile?.firstName} &middot; #{activeTopic.tag}
              </p>
              <p className="truncate text-[10px] font-medium text-slate-500">
                {activeTopic.hierarchy} ({selectedTopicQuizzes.length} quizzes)
              </p>
            </div>
          </div>
        </header>

        <div className="quiz-feed-scroll">
          {selectedTopicQuizzes.map((quiz) => (
            <QuizCard
              key={quiz._id}
              quiz={quiz}
              isOfflinePreview={isOfflinePreview}
              onStatsUpdated={updateUserStats}
            />
          ))}
        </div>
      </div>
    );
  }

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
              {canManageQuizzesHere
                ? 'Select a topic to view, edit, or delete quizzes'
                : 'Select one topic below to scroll quizzes'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openAdminContactLink}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95"
          >
            <MessageCircle className="h-3.5 w-3.5 text-slate-900" />
            <span>Contact Admin</span>
          </button>

          {isAdmin && onOpenAdmin && profile?.isOwnProfile && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 active:scale-95"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Admin Console</span>
            </button>
          )}
        </div>
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
                    {profile.role === 'admin' ? (
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                        Admin
                      </span>
                    ) : profile.canCreateQuiz ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                        Approved Creator
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-xs font-semibold text-slate-600">
                      {profile.username
                        ? `@${profile.username}`
                        : 'No creator username set'}
                    </p>
                    {profile.isOwnProfile && !editingUsername && (
                      <button
                        type="button"
                        onClick={handleStartEditUsername}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 active:scale-95"
                      >
                        <Edit3 className="h-2.5 w-2.5" />
                        <span>
                          {profile.username
                            ? 'Edit Username'
                            : 'Create Username'}
                        </span>
                      </button>
                    )}
                  </div>
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

            {/* Inline Custom Creator Username Editor (not from Telegram) */}
            {profile.isOwnProfile && editingUsername && (
              <form
                onSubmit={handleSaveUsername}
                className="mt-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <label className="text-[11px] font-bold text-slate-700">
                  Custom Creator Username (3–24 chars, independent of Telegram)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 focus-within:border-slate-900">
                    <span className="mr-1 text-xs font-bold text-slate-400">
                      @
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={24}
                      value={usernameInput}
                      onChange={(e) =>
                        setUsernameInput(e.target.value.replace(/^@+/, ''))
                      }
                      placeholder="your_creator_name"
                      className="w-full bg-transparent text-xs font-semibold text-slate-900 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingUsername}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 disabled:opacity-60"
                  >
                    {savingUsername ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUsername(false)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {usernameSuccess && (
              <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                ✓ {usernameSuccess}
              </div>
            )}

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

          {/* Single-Topic Selector (Pre-selected from user's Exam & Subject filter) + Scroll Section */}
          {quizzes.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 shadow-2xs">
              No quizzes published yet.
            </div>
          ) : (
            <>
              <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                    <Layers className="h-3.5 w-3.5 text-slate-700" />
                    Selected Topic ({topics.length})
                  </span>

                  <div className="flex items-center gap-1.5">
                    {exams.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowPickerModal(true)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 active:scale-95"
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                        <span>Edit Exam / Subject</span>
                      </button>
                    )}

                    {selectedTopicQuizzes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFullScreenScrollMode(true)}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-slate-800 active:scale-95"
                      >
                        <Play className="h-3 w-3 fill-white" />
                        <span>Scroll Topic ({selectedTopicQuizzes.length})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Single-Topic Selector Chips (Strictly 1 topic active at a time) */}
                <div className="flex flex-wrap gap-1.5">
                  {topics.map((topic) => {
                    const active = activeTopic?.key === topic.key;
                    return (
                      <button
                        key={topic.key}
                        type="button"
                        onClick={() => handleSelectTopic(topic)}
                        className={`rounded-xl border px-3 py-1.5 text-left text-xs font-bold transition active:scale-95 ${
                          active
                            ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <span>{topic.hierarchy}</span>
                        <span
                          className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                            active
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200/80 text-slate-600'
                          }`}
                        >
                          {topic.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {selectedTopicQuizzes.map((quiz) => (
                  <ProfileQuizItem
                    key={quiz._id}
                    quiz={quiz}
                    canManage={canManageQuizzesHere}
                    isOfflinePreview={isOfflinePreview}
                    onEdit={handleOpenEditQuiz}
                    onDelete={handleDeleteQuiz}
                    onStatsUpdated={handleProfileQuizAttempted}
                  />
                ))}
              </div>
            </>
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

      {showPickerModal && exams.length > 0 && (
        <ExamTopicPickerModal
          exams={exams}
          groupedByExam={groupedByExam}
          currentFilter={examFilter}
          onClose={() => setShowPickerModal(false)}
          onApply={(nextFilter) => {
            onUpdateExamFilter?.(nextFilter);
            setShowPickerModal(false);
          }}
        />
      )}
    </div>
  );
}
