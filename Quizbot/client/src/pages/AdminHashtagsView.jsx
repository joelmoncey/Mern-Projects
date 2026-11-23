import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Eye,
  EyeOff,
  Flag,
  Globe,
  Loader2,
  Plus,
  Power,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import EditQuizModal from '../components/EditQuizModal.jsx';
import { formatHierarchyPath } from './CreateQuizView.jsx';

export default function AdminHashtagsView({ onOpenCreatorProfile }) {
  const { user, isOfflinePreview } = useAuth();
  const [subTab, setSubTab] = useState('creators'); // 'creators' | 'hashtags' | 'escalations'

  // Hashtags / 5-Level Taxonomy + Languages state
  const [groupedByExam, setGroupedByExam] = useState({});
  const [exams, setExams] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [examName, setExamName] = useState('');
  const [subExamName, setSubExamName] = useState('');
  const [languagesInput, setLanguagesInput] = useState('English');
  const [subjectName, setSubjectName] = useState('');
  const [subSubjectName, setSubSubjectName] = useState('');
  const [subTopicName, setSubTopicName] = useState('');
  const [tag, setTag] = useState('');
  const [syllabusScope, setSyllabusScope] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Per-topic new language input & delete confirmation state
  const [newLangByTag, setNewLangByTag] = useState({});
  const [confirmDeleteTagId, setConfirmDeleteTagId] = useState(null);

  // Escalations state
  const [escalations, setEscalations] = useState([]);
  const [loadingEscalations, setLoadingEscalations] = useState(true);

  // Creators state
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [approveIdentifier, setApproveIdentifier] = useState('');
  const [approving, setApproving] = useState(false);

  const [editingQuiz, setEditingQuiz] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadHashtags = useCallback(async () => {
    if (isOfflinePreview) {
      setExams(['UPSC', 'SSC']);
      setGroupedByExam({
        UPSC: [
          {
            _id: 'p1',
            examName: 'UPSC',
            subExamName: 'CSE Prelims',
            languages: ['English', 'Hindi'],
            subjectName: 'History',
            subSubjectName: 'Ancient India',
            subTopicName: 'Indus Valley',
            tag: 'UPSC_CSE_HISTORY_ANCIENT_IVC',
            syllabusScope: 'Ancient, Medieval & Modern Indian History',
            isActive: true,
            quizCount: 14,
          },
        ],
      });
      setLoadingTags(false);
      return;
    }

    setLoadingTags(true);
    try {
      const data = await apiRequest('/api/hashtags?includeInactive=true');
      setExams(data.exams || []);
      setGroupedByExam(data.groupedByExam || {});
    } catch (err) {
      setError(err.message || 'Failed to load topics');
    } finally {
      setLoadingTags(false);
    }
  }, [isOfflinePreview]);

  const loadEscalations = useCallback(async () => {
    if (isOfflinePreview) {
      setEscalations([]);
      setLoadingEscalations(false);
      return;
    }

    setLoadingEscalations(true);
    try {
      const data = await apiRequest('/api/quizzes/escalations');
      setEscalations(data.quizzes || []);
    } catch (err) {
      setError(err.message || 'Failed to load escalated quizzes');
    } finally {
      setLoadingEscalations(false);
    }
  }, [isOfflinePreview]);

  const loadUsers = useCallback(
    async (query = '') => {
      if (isOfflinePreview) {
        setUsersList([
          {
            _id: 'u1',
            telegramId: '123456789',
            firstName: 'Dev Aspirant',
            username: 'dev_aspirant',
            role: 'admin',
            canCreateQuiz: true,
            totalSolved: 24,
          },
        ]);
        setLoadingUsers(false);
        return;
      }

      setLoadingUsers(true);
      try {
        const qs = query.trim()
          ? `?q=${encodeURIComponent(query.trim())}`
          : '';
        const data = await apiRequest(`/api/users/admin/list${qs}`);
        setUsersList(data.users || []);
      } catch (err) {
        setError(err.message || 'Failed to load users list');
      } finally {
        setLoadingUsers(false);
      }
    },
    [isOfflinePreview]
  );

  useEffect(() => {
    loadHashtags();
    loadEscalations();
    loadUsers();
  }, [loadHashtags, loadEscalations, loadUsers]);

  // Auto-populate languagesInput when admin types an existing Exam / Sub Exam
  useEffect(() => {
    const cleanExam = examName.trim();
    if (!cleanExam || !groupedByExam[cleanExam]) return;
    const cleanSub = subExamName.trim().toLowerCase();
    const match = groupedByExam[cleanExam].find(
      (item) => (item.subExamName || '').trim().toLowerCase() === cleanSub
    );
    if (match && Array.isArray(match.languages) && match.languages.length > 0) {
      setLanguagesInput(match.languages.join(', '));
    }
  }, [examName, subExamName, groupedByExam]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F8FAFC] px-6 text-center text-sm text-slate-500">
        Admin access required.
      </div>
    );
  }

  const suggestedTag = [
    examName,
    subExamName,
    subjectName,
    subSubjectName,
    subTopicName,
  ]
    .map((part) =>
      String(part || '')
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toUpperCase()
    )
    .filter(Boolean)
    .join('_');

  async function handleCreateHashtag(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isOfflinePreview) {
      setError('Connect MongoDB & API server to persist new exam topics.');
      return;
    }

    setSubmitting(true);
    try {
      const finalTag = (tag.trim() || suggestedTag)
        .replace(/^#+/, '')
        .toUpperCase();
      await apiRequest('/api/hashtags', {
        method: 'POST',
        body: {
          examName: examName.trim(),
          subExamName: subExamName.trim(),
          languages: languagesInput,
          subjectName: subjectName.trim(),
          subSubjectName: subSubjectName.trim(),
          subTopicName: subTopicName.trim(),
          tag: finalTag,
          syllabusScope: syllabusScope.trim(),
        },
      });
      setSubjectName('');
      setSubSubjectName('');
      setSubTopicName('');
      setTag('');
      setSyllabusScope('');
      setSuccess(`Created #${finalTag}`);
      await loadHashtags();
    } catch (err) {
      setError(err.message || 'Failed to create topic hashtag');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(item) {
    if (isOfflinePreview) return;
    setError('');
    try {
      await apiRequest(`/api/hashtags/${item._id}`, {
        method: 'PATCH',
        body: { isActive: !item.isActive },
      });
      await loadHashtags();
    } catch (err) {
      setError(err.message || 'Failed to toggle hashtag status');
    }
  }

  async function handleAddLanguageToTopic(item) {
    const rawNewLang = (newLangByTag[item._id] || '').trim();
    if (!rawNewLang || isOfflinePreview) return;
    setError('');
    setSuccess('');

    try {
      await apiRequest('/api/hashtags/exam-languages', {
        method: 'PATCH',
        body: {
          examName: item.examName,
          subExamName: item.subExamName || '',
          action: 'add',
          language: rawNewLang,
        },
      });
      setNewLangByTag((prev) => ({ ...prev, [item._id]: '' }));
      setSuccess(
        `Added language "${rawNewLang}" to ${item.examName}${
          item.subExamName ? ` › ${item.subExamName}` : ''
        }`
      );
      await loadHashtags();
    } catch (err) {
      setError(err.message || 'Failed to add language');
    }
  }

  async function handleRemoveLanguageFromTopic(item, langToRemove) {
    if (isOfflinePreview) return;
    setError('');
    setSuccess('');

    try {
      await apiRequest('/api/hashtags/exam-languages', {
        method: 'PATCH',
        body: {
          examName: item.examName,
          subExamName: item.subExamName || '',
          action: 'remove',
          language: langToRemove,
        },
      });
      setSuccess(
        `Removed language "${langToRemove}" from ${item.examName}${
          item.subExamName ? ` › ${item.subExamName}` : ''
        }`
      );
      await loadHashtags();
    } catch (err) {
      setError(err.message || 'Failed to remove language');
    }
  }

  async function handleDeleteHashtag(tagId) {
    if (isOfflinePreview) return;
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/api/hashtags/${tagId}`, {
        method: 'DELETE',
      });
      setConfirmDeleteTagId(null);
      setSuccess('Deleted topic hashtag.');
      await loadHashtags();
    } catch (err) {
      setError(err.message || 'Failed to delete topic hashtag');
    }
  }

  async function handleToggleVisibility(quiz) {
    if (isOfflinePreview) return;
    setError('');
    try {
      await apiRequest(`/api/quizzes/${quiz._id}/visibility`, {
        method: 'PATCH',
        body: { isHidden: !quiz.isHidden },
      });
      await loadEscalations();
    } catch (err) {
      setError(err.message || 'Failed to update quiz visibility');
    }
  }

  async function handleDeleteQuizAdmin(quizId) {
    if (isOfflinePreview) return;
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/api/quizzes/${quizId}`, { method: 'DELETE' });
      setEscalations((prev) => prev.filter((q) => q._id !== quizId));
      setSuccess('Quiz deleted.');
    } catch (err) {
      setError(err.message || 'Failed to delete quiz');
    }
  }

  async function handleApproveByIdentifier(e) {
    e.preventDefault();
    if (!approveIdentifier.trim() || approving) return;
    setError('');
    setSuccess('');

    if (isOfflinePreview) {
      setError('Connect MongoDB & API server to approve creators.');
      return;
    }

    setApproving(true);
    try {
      const data = await apiRequest('/api/users/admin/approve-creator', {
        method: 'POST',
        body: { identifier: approveIdentifier.trim() },
      });
      setApproveIdentifier('');
      setSuccess(
        `Approved creator: ${data.user.firstName} (${
          data.user.username ? `@${data.user.username}` : data.user.telegramId
        })`
      );
      await loadUsers(searchQuery);
    } catch (err) {
      setError(err.message || 'Failed to approve creator');
    } finally {
      setApproving(false);
    }
  }

  async function handleToggleCreatorAccess(u) {
    if (isOfflinePreview || u.role === 'admin') return;
    setError('');
    setSuccess('');
    try {
      const nextVal = !u.canCreateQuiz;
      await apiRequest(`/api/users/${u._id}/creator-access`, {
        method: 'PATCH',
        body: { canCreateQuiz: nextVal },
      });
      setUsersList((prev) =>
        prev.map((item) =>
          item._id === u._id ? { ...item, canCreateQuiz: nextVal } : item
        )
      );
      setSuccess(
        `${nextVal ? 'Approved' : 'Revoked'} creator access for ${u.firstName}`
      );
    } catch (err) {
      setError(err.message || 'Failed to update creator access');
    }
  }

  return (
    <div className="h-dvh overflow-y-auto bg-[#F8FAFC] px-4 pt-5 pb-24">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
        <Shield className="h-5 w-5 text-slate-900" />
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Admin Console
          </h1>
          <p className="text-xs text-slate-500">
            Tap any creator to open their profile and edit or delete their quizzes.
          </p>
        </div>
      </div>

      {/* 3-Tab Switcher: Creators | Topics | Flags */}
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setSubTab('creators')}
          className={`rounded-lg py-1.5 text-xs font-bold transition ${
            subTab === 'creators'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Creators ({usersList.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('hashtags')}
          className={`rounded-lg py-1.5 text-xs font-bold transition ${
            subTab === 'hashtags'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Topics &amp; Langs
        </button>
        <button
          type="button"
          onClick={() => setSubTab('escalations')}
          className={`rounded-lg py-1.5 text-xs font-bold transition ${
            subTab === 'escalations'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Flags ({escalations.length})
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {subTab === 'creators' ? (
        <>
          {/* Quick Approve by Telegram ID or @username */}
          <form
            onSubmit={handleApproveByIdentifier}
            className="mb-4 flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
          >
            <h2 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Quick-Approve Creator by Telegram ID or @Username
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={approveIdentifier}
                onChange={(e) => setApproveIdentifier(e.target.value)}
                placeholder="@username or numeric Telegram ID"
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
              />
              <button
                type="submit"
                disabled={approving}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-60"
              >
                {approving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                <span>Approve</span>
              </button>
            </div>
          </form>

          {/* Search & Open Creator Profile to Edit/Delete their Quizzes */}
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                loadUsers(val);
              }}
              placeholder="Search creators or users..."
              className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 outline-none"
            />
          </div>

          {loadingUsers ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
            </div>
          ) : usersList.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No matching users found.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {usersList.map((u) => {
                const isAdminUser = u.role === 'admin';
                return (
                  <div
                    key={u._id}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenCreatorProfile?.(u._id, 'admin')}
                      className="group flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-xs font-bold text-slate-900 group-hover:underline">
                            {u.firstName}
                          </span>
                          {isAdminUser ? (
                            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                              Admin
                            </span>
                          ) : u.canCreateQuiz ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">
                              Approved Creator
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 uppercase">
                              Solver Only
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                          {u.username ? `@${u.username} · ` : ''}ID: {u.telegramId}{' '}
                          &middot;{' '}
                          <span className="font-semibold text-slate-700">
                            Open profile &amp; manage quizzes
                          </span>
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-900" />
                    </button>

                    {!isAdminUser && (
                      <button
                        type="button"
                        onClick={() => handleToggleCreatorAccess(u)}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-bold transition active:scale-95 ${
                          u.canCreateQuiz
                            ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'border-emerald-600 bg-emerald-600 text-white shadow-2xs hover:bg-emerald-500'
                        }`}
                      >
                        <UserCheck className="h-3 w-3" />
                        <span>{u.canCreateQuiz ? 'Revoke' : 'Approve'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : subTab === 'escalations' ? (
        loadingEscalations ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
          </div>
        ) : escalations.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xs">
            <p className="text-xs font-bold text-slate-900">
              Escalations queue is clear
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Quizzes flagged ≥ 3 times (awaiting creator edit) or escalated
              after 24h / 6 flags appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {escalations.map((quiz) => (
              <div
                key={quiz._id}
                className={`rounded-2xl border bg-white p-3.5 shadow-2xs ${
                  quiz.escalatedToAdmin
                    ? 'border-rose-300 ring-1 ring-rose-500/15'
                    : 'border-slate-200'
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                      #{quiz.hashtag?.tag || quiz.examName}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 uppercase">
                      <Flag className="h-2.5 w-2.5" />
                      {quiz.flagCount} flags
                    </span>
                  </div>
                </div>

                <p className="text-xs leading-snug font-semibold text-slate-900">
                  {quiz.question}
                </p>

                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  Creator: @{quiz.creator?.username || quiz.creator?.firstName || 'user'}{' '}
                  &middot; Right Answer:{' '}
                  <span className="font-bold text-emerald-700">
                    {String.fromCharCode(65 + (quiz.correctIndex || 0))}
                  </span>
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingQuiz(quiz)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white shadow-2xs hover:bg-slate-800"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit &amp; Resolve</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(quiz)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {quiz.isHidden ? (
                      <>
                        <Eye className="h-3 w-3" />
                        <span>Unhide</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3" />
                        <span>Hide</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuizAdmin(quiz._id)}
                    className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"
                    title="Delete quiz"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          {/* 5-Level Exam Taxonomy + Languages Form */}
          <form
            onSubmit={handleCreateHashtag}
            className="mb-6 flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
          >
            <h2 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Add Exam Topic &amp; Allowed Languages
            </h2>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="1. Exam * (e.g. PSC, SSC)"
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
              />
              <input
                type="text"
                value={subExamName}
                onChange={(e) => setSubExamName(e.target.value)}
                placeholder="2. Sub Exam (e.g. LDC Prelims)"
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>

            {/* Allowed Languages for this Exam / Sub Exam */}
            <div>
              <label className="mb-1 flex items-center gap-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                <Globe className="h-3 w-3" />
                <span>Allowed Languages (comma-separated) *</span>
              </label>
              <input
                type="text"
                required
                value={languagesInput}
                onChange={(e) => setLanguagesInput(e.target.value)}
                placeholder="e.g. English, Malayalam, Hindi"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="3. Subject * (e.g. History)"
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
              />
              <input
                type="text"
                value={subSubjectName}
                onChange={(e) => setSubSubjectName(e.target.value)}
                placeholder="4. Sub Subject (e.g. Kerala)"
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={subTopicName}
                onChange={(e) => setSubTopicName(e.target.value)}
                placeholder="5. Sub Topic (e.g. Renaissance)"
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
              />
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value.toUpperCase())}
                placeholder={
                  suggestedTag
                    ? `Tag: #${suggestedTag}`
                    : 'Custom Tag (auto if blank)'
                }
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>

            <textarea
              rows={2}
              value={syllabusScope}
              onChange={(e) => setSyllabusScope(e.target.value)}
              placeholder="Syllabus scope / notes (optional)"
              className="resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
            />

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>{submitting ? 'Adding...' : 'Add Exam Topic'}</span>
            </button>
          </form>

          {/* Grouped Topics List with Language Add/Remove & Tag Delete */}
          {loadingTags ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
            </div>
          ) : exams.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No exam topics configured yet.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {exams.map((exam) => (
                <div key={exam} className="flex flex-col gap-2">
                  <h3 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                    {exam}
                  </h3>

                  {(groupedByExam[exam] || []).map((item) => {
                    const itemLangs =
                      Array.isArray(item.languages) && item.languages.length > 0
                        ? item.languages
                        : ['English'];

                    return (
                      <div
                        key={item._id}
                        className={`rounded-2xl border bg-white p-3.5 shadow-2xs ${
                          item.isActive
                            ? 'border-slate-200'
                            : 'border-slate-200/70 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                                #{item.tag}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                {item.quizCount || 0} quizzes
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-bold text-slate-900">
                              {formatHierarchyPath(item)}
                            </p>
                            {item.syllabusScope && (
                              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                                {item.syllabusScope}
                              </p>
                            )}
                          </div>

                          {/* Active Toggle + Delete Tag Button */}
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(item)}
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition active:scale-95 ${
                                item.isActive
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-slate-100 text-slate-500'
                              }`}
                            >
                              <Power className="h-3 w-3" />
                              <span>{item.isActive ? 'Active' : 'Off'}</span>
                            </button>

                            {confirmDeleteTagId === item._id ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteHashtag(item._id)}
                                className="rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-rose-500"
                              >
                                Confirm
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteTagId(item._id)}
                                title="Delete hashtag"
                                aria-label="Delete hashtag"
                                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Add / Remove Languages for this Exam & Sub Exam */}
                        <div className="mt-3 border-t border-slate-100 pt-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                              <Globe className="h-3 w-3" />
                              Languages:
                            </span>
                            {itemLangs.map((lang) => (
                              <span
                                key={lang}
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-800"
                              >
                                <span>{lang}</span>
                                {itemLangs.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveLanguageFromTopic(item, lang)
                                    }
                                    title={`Remove ${lang}`}
                                    className="rounded-full text-slate-400 hover:text-rose-600"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </span>
                            ))}

                            <div className="ml-auto flex items-center gap-1">
                              <input
                                type="text"
                                value={newLangByTag[item._id] || ''}
                                onChange={(e) =>
                                  setNewLangByTag((prev) => ({
                                    ...prev,
                                    [item._id]: e.target.value,
                                  }))
                                }
                                placeholder="+ Add language"
                                className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddLanguageToTopic(item)}
                                className="rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-bold text-white hover:bg-slate-800"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
            loadEscalations();
          }}
        />
      )}
    </div>
  );
}
