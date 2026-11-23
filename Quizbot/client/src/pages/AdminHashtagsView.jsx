import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Eye,
  EyeOff,
  FileJson,
  Flag,
  Globe,
  Loader2,
  Plus,
  Power,
  Save,
  Search,
  Shield,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import {
  ALL_OFFICIAL_TAXONOMY_JSON_PRESET,
  SSC_SUB_EXAM_PRESETS,
  UPSC_RRB_TAXONOMY_JSON_PRESET,
  extractLanguagesArray,
  extractSubExamsArray,
} from '../lib/sscTaxonomyPreset.js';
import { useAuth } from '../context/AuthContext.jsx';
import EditQuizModal from '../components/EditQuizModal.jsx';
import { formatHierarchyPath } from './CreateQuizView.jsx';

function parseCommaChips(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw.flatMap((s) => String(s || '').split(','))
    : String(raw).split(',');
  return Array.from(new Set(list.map((s) => s.trim()).filter(Boolean)));
}

export default function AdminHashtagsView({ onOpenCreatorProfile }) {
  const { user, isOfflinePreview } = useAuth();
  const [subTab, setSubTab] = useState('hashtags'); // 'creators' | 'hashtags' | 'escalations'

  // Hashtags / 5-Level Taxonomy + SubExams Array + Languages Array state
  const [groupedByExam, setGroupedByExam] = useState({});
  const [exams, setExams] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);

  const [examName, setExamName] = useState('SSC');
  const [subExamsList, setSubExamsList] = useState(['CGL', 'CHSL']);
  const [subExamDraft, setSubExamDraft] = useState('');
  const [languagesList, setLanguagesList] = useState(['English', 'Hindi']);
  const [languageDraft, setLanguageDraft] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subSubjectName, setSubSubjectName] = useState('');
  const [subTopicName, setSubTopicName] = useState('');
  const [tag, setTag] = useState('');
  const [syllabusScope, setSyllabusScope] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bulk JSON Import modal state
  const [showJsonImportModal, setShowJsonImportModal] = useState(false);
  const [jsonImportText, setJsonImportText] = useState('');
  const [importingJson, setImportingJson] = useState(false);
  const [seedingSsc, setSeedingSsc] = useState(false);
  const [adminExamFilter, setAdminExamFilter] = useState('ALL');

  // Inline Edit Tag state (admin can edit any existing tag's hierarchy, subExams[], & languages[])
  const [editingTagId, setEditingTagId] = useState(null);
  const [editTagForm, setEditTagForm] = useState({
    examName: '',
    subExams: '',
    languages: '',
    subjectName: '',
    subSubjectName: '',
    subTopicName: '',
    tag: '',
    syllabusScope: '',
  });
  const [savingTagEdit, setSavingTagEdit] = useState(false);

  // Per-topic new language input & delete confirmation state
  const [newLangByTag, setNewLangByTag] = useState({});
  const [confirmDeleteTagId, setConfirmDeleteTagId] = useState(null);

  const createFormRef = useRef(null);

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
      setExams(['SSC']);
      setGroupedByExam({
        SSC: [
          {
            _id: 'p1',
            examName: 'SSC',
            subExams: ['CGL', 'CHSL', 'CPO', 'MTS', 'GD'],
            subExamName: 'CGL, CHSL, CPO, MTS, GD',
            languages: ['English', 'Hindi'],
            subjectName: 'Quantitative Aptitude',
            subSubjectName: 'Arithmetic',
            subTopicName: 'Percentage',
            tag: 'SSC_QUANTITATIVE_APTITUDE_ARITHMETIC_PERCENTAGE',
            syllabusScope: 'Percentage, Profit & Loss, Ratio & Proportion',
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

  if (user?.role !== 'admin') {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F8FAFC] px-6 text-center text-sm text-slate-500">
        Admin access required.
      </div>
    );
  }

  function handleAddSubExamChip(rawVal) {
    const tokens = parseCommaChips(rawVal);
    if (tokens.length === 0) return;
    setSubExamsList((prev) => Array.from(new Set([...prev, ...tokens])));
    setSubExamDraft('');
  }

  function handleRemoveSubExamChip(chip) {
    setSubExamsList((prev) => prev.filter((item) => item !== chip));
  }

  function handleAddLanguageChip(rawVal) {
    const tokens = parseCommaChips(rawVal);
    if (tokens.length === 0) return;
    setLanguagesList((prev) => Array.from(new Set([...prev, ...tokens])));
    setLanguageDraft('');
  }

  function handleRemoveLanguageChip(chip) {
    setLanguagesList((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item !== chip);
    });
  }

  const suggestedTag = [
    examName,
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

    // Automatically merge any uncommitted comma-separated text in subExamDraft / languageDraft
    const finalSubExams = Array.from(
      new Set([...subExamsList, ...parseCommaChips(subExamDraft)])
    );
    const finalLanguages = Array.from(
      new Set([...languagesList, ...parseCommaChips(languageDraft)])
    );

    setSubExamsList(finalSubExams);
    setSubExamDraft('');
    if (finalLanguages.length > 0) {
      setLanguagesList(finalLanguages);
    }
    setLanguageDraft('');

    setSubmitting(true);
    try {
      const finalTag = (tag.trim() || suggestedTag)
        .replace(/^#+/, '')
        .toUpperCase();
      await apiRequest('/api/hashtags', {
        method: 'POST',
        body: {
          examName: examName.trim(),
          subExams: finalSubExams,
          languages: finalLanguages.length > 0 ? finalLanguages : ['English'],
          subjectName: subjectName.trim(),
          subSubjectName: subSubjectName.trim(),
          subTopicName: subTopicName.trim(),
          tag: finalTag,
          syllabusScope: syllabusScope.trim(),
        },
      });
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

  async function handleSeedOfficialSsc() {
    if (seedingSsc || isOfflinePreview) return;
    setError('');
    setSuccess('');
    setSeedingSsc(true);
    try {
      const data = await apiRequest('/api/hashtags/bulk-import', {
        method: 'POST',
        body: { useAllPresets: true },
      });
      setSuccess(
        `All official syllabi (SSC, Kerala PSC, UPSC & RRB) synced! Created ${data.createdCount} topics, updated ${data.updatedCount} topics (${data.totalProcessed} total).`
      );
      await loadHashtags();
    } catch (err) {
      setError(err.message || 'Failed to seed SSC syllabus');
    } finally {
      setSeedingSsc(false);
    }
  }

  async function handleBulkJsonImport(e) {
    e.preventDefault();
    if (!jsonImportText.trim() || importingJson) return;
    setError('');
    setSuccess('');

    let parsed;
    try {
      parsed = JSON.parse(jsonImportText.trim());
      if (!Array.isArray(parsed)) {
        setError('JSON must be an array of taxonomy objects ([ ... ]).');
        return;
      }
    } catch (parseErr) {
      setError(`Invalid JSON syntax: ${parseErr.message}`);
      return;
    }

    if (isOfflinePreview) {
      setError('Connect MongoDB & API server to import JSON taxonomy.');
      return;
    }

    setImportingJson(true);
    try {
      const data = await apiRequest('/api/hashtags/bulk-import', {
        method: 'POST',
        body: { taxonomy: parsed },
      });
      setShowJsonImportModal(false);
      setJsonImportText('');
      setSuccess(
        `Imported ${data.totalProcessed} topics! (${data.createdCount} created, ${data.updatedCount} updated)`
      );
      await loadHashtags();
    } catch (err) {
      setError(err.message || 'Failed to import taxonomy JSON');
    } finally {
      setImportingJson(false);
    }
  }

  function handleStartEditTag(item) {
    setError('');
    setSuccess('');
    setEditingTagId(item._id);
    setEditTagForm({
      examName: item.examName || '',
      subExams: extractSubExamsArray(item).join(', '),
      languages: extractLanguagesArray(item).join(', '),
      subjectName: item.subjectName || '',
      subSubjectName: item.subSubjectName || '',
      subTopicName: item.subTopicName || '',
      tag: item.tag || '',
      syllabusScope: item.syllabusScope || '',
    });
  }

  async function handleSaveTagEdit(e) {
    e.preventDefault();
    if (!editingTagId || savingTagEdit) return;
    setError('');
    setSuccess('');

    if (isOfflinePreview) {
      setError('Connect MongoDB & API server to edit exam topics.');
      return;
    }

    setSavingTagEdit(true);
    try {
      const data = await apiRequest(`/api/hashtags/${editingTagId}`, {
        method: 'PATCH',
        body: {
          examName: editTagForm.examName.trim(),
          subExams: parseCommaChips(editTagForm.subExams),
          languages: parseCommaChips(editTagForm.languages),
          subjectName: editTagForm.subjectName.trim(),
          subSubjectName: editTagForm.subSubjectName.trim(),
          subTopicName: editTagForm.subTopicName.trim(),
          tag: editTagForm.tag.trim(),
          syllabusScope: editTagForm.syllabusScope.trim(),
        },
      });
      setEditingTagId(null);
      setSuccess(`Updated #${data.hashtag.tag}`);
      await loadHashtags();
    } catch (err) {
      setError(err.message || 'Failed to update topic hashtag');
    } finally {
      setSavingTagEdit(false);
    }
  }

  function handleBranchFromTag(item, level) {
    const langs = extractLanguagesArray(item);
    const subExams = extractSubExamsArray(item);

    setExamName(item.examName || '');
    setLanguagesList(langs);
    setTag('');
    setSyllabusScope('');

    if (level === 'subExam') {
      setSubExamsList([]);
      setSubjectName('');
      setSubSubjectName('');
      setSubTopicName('');
    } else if (level === 'subject') {
      setSubExamsList(subExams);
      setSubjectName('');
      setSubSubjectName('');
      setSubTopicName('');
    } else if (level === 'subSubject') {
      setSubExamsList(subExams);
      setSubjectName(item.subjectName || '');
      setSubSubjectName('');
      setSubTopicName('');
    } else if (level === 'subTopic') {
      setSubExamsList(subExams);
      setSubjectName(item.subjectName || '');
      setSubSubjectName(item.subSubjectName || '');
      setSubTopicName('');
    }

    createFormRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
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
      const nextLangs = Array.from(
        new Set([...extractLanguagesArray(item), ...parseCommaChips(rawNewLang)])
      );
      await apiRequest(`/api/hashtags/${item._id}`, {
        method: 'PATCH',
        body: { languages: nextLangs },
      });
      setNewLangByTag((prev) => ({ ...prev, [item._id]: '' }));
      setSuccess(`Added language "${rawNewLang}" to #${item.tag}`);
      await loadHashtags();
    } catch (err) {
      setError(err.message || 'Failed to add language');
    }
  }

  async function handleRemoveLanguageFromTopic(item, langToRemove) {
    if (isOfflinePreview) return;
    setError('');
    setSuccess('');

    const currentLangs = extractLanguagesArray(item);
    const nextLangs = currentLangs.filter(
      (l) => l.toLowerCase() !== langToRemove.toLowerCase()
    );
    if (nextLangs.length === 0) {
      setError('At least one language must remain on the topic.');
      return;
    }

    try {
      await apiRequest(`/api/hashtags/${item._id}`, {
        method: 'PATCH',
        body: { languages: nextLangs },
      });
      setSuccess(`Removed language "${langToRemove}" from #${item.tag}`);
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
            Manage shared Sub-Exam syllabi, creators &amp; flagged quizzes.
          </p>
        </div>
      </div>

      {/* 3-Tab Switcher: Creators | Topics & Langs | Flags */}
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
          {/* Quick Seed / Bulk JSON Import Toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div>
              <p className="text-xs font-bold text-slate-900">
                Taxonomy Bulk Tools
              </p>
              <p className="text-[11px] text-slate-500">
                Seed SSC, Kerala PSC, UPSC &amp; RRB syllabi or paste custom JSON
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={seedingSsc}
                onClick={handleSeedOfficialSsc}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-500 active:scale-95 disabled:opacity-60"
              >
                {seedingSsc ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                <span>{seedingSsc ? 'Seeding...' : 'Seed All Exams'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setJsonImportText(
                    JSON.stringify(UPSC_RRB_TAXONOMY_JSON_PRESET, null, 2)
                  );
                  setShowJsonImportModal(true);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs hover:bg-slate-800 active:scale-95"
              >
                <FileJson className="h-3 w-3" />
                <span>Bulk JSON Import</span>
              </button>
            </div>
          </div>

          {/* 5-Level Exam Taxonomy + Multi-Chip SubExams[] + Languages[] Form */}
          <form
            ref={createFormRef}
            onSubmit={handleCreateHashtag}
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                Add Exam Topic (Shared Sub-Exams Array)
              </h2>
              {(examName || subExamsList.length > 0 || subjectName) && (
                <button
                  type="button"
                  onClick={() => {
                    setExamName('SSC');
                    setSubExamsList([]);
                    setSubExamDraft('');
                    setLanguagesList(['English', 'Hindi']);
                    setLanguageDraft('');
                    setSubjectName('');
                    setSubSubjectName('');
                    setSubTopicName('');
                    setTag('');
                    setSyllabusScope('');
                  }}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                >
                  Reset
                </button>
              )}
            </div>

            {/* 1. Exam */}
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                1. Exam *
              </label>
              <input
                type="text"
                required
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. SSC, PSC, UPSC"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>

            {/* 2. Sub Exams (Multi-Select Chips + Quick SSC Presets) */}
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
                <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  2. Sub Exams (Array of Chips — Shared Syllabus)
                </label>
                {subExamsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSubExamsList([])}
                    className="text-[10px] font-semibold text-slate-400 hover:text-rose-600"
                  >
                    Clear chips
                  </button>
                )}
              </div>

              {/* Preset Buttons (All SSC, CGL + CHSL + CPO, MTS + GD, etc.) */}
              <div className="mb-2 flex flex-wrap gap-1">
                {SSC_SUB_EXAM_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSubExamsList([...preset.subExams])}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-100 active:scale-95"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>

              {/* Active Sub-Exam Chips */}
              {subExamsList.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {subExamsList.map((se) => (
                    <span
                      key={se}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-white"
                    >
                      <span>{se}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubExamChip(se)}
                        className="rounded-full text-slate-300 hover:text-white"
                        aria-label={`Remove ${se}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Sub-Exam Chip Input (Splits on comma or Enter) */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={subExamDraft}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes(',')) {
                      handleAddSubExamChip(val);
                    } else {
                      setSubExamDraft(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && subExamDraft.trim()) {
                      e.preventDefault();
                      handleAddSubExamChip(subExamDraft);
                    }
                  }}
                  placeholder="Type sub-exams (e.g. CGL, CHSL, MTS) & press comma/Add"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleAddSubExamChip(subExamDraft)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Allowed Languages (Array of Chips) */}
            <div>
              <label className="mb-1 flex items-center gap-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                <Globe className="h-3 w-3" />
                <span>Allowed Languages (Array) *</span>
              </label>
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {languagesList.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800"
                  >
                    <span>{lang}</span>
                    {languagesList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLanguageChip(lang)}
                        className="text-emerald-600 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
                {['English', 'Hindi', 'Malayalam', 'Tamil'].map((presetLang) =>
                  !languagesList.includes(presetLang) ? (
                    <button
                      key={presetLang}
                      type="button"
                      onClick={() => handleAddLanguageChip(presetLang)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                    >
                      + {presetLang}
                    </button>
                  ) : null
                )}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={languageDraft}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes(',')) {
                      handleAddLanguageChip(val);
                    } else {
                      setLanguageDraft(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && languageDraft.trim()) {
                      e.preventDefault();
                      handleAddLanguageChip(languageDraft);
                    }
                  }}
                  placeholder="Add custom language..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleAddLanguageChip(languageDraft)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-200"
                >
                  Add
                </button>
              </div>
            </div>

            {/* 3. Subject & 4. Sub Subject */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="3. Subject * (e.g. General Awareness)"
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
              />
              <input
                type="text"
                value={subSubjectName}
                onChange={(e) => setSubSubjectName(e.target.value)}
                placeholder="4. Sub Subject (e.g. History)"
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>

            {/* 5. Sub Topic & Custom Tag */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={subTopicName}
                onChange={(e) => setSubTopicName(e.target.value)}
                placeholder="5. Sub Topic (e.g. Ancient India)"
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

          {/* Grouped Topics List */}
          {loadingTags ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
            </div>
          ) : exams.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No exam topics configured yet. Tap &ldquo;Seed SSC Syllabus&rdquo;
              above to load the structured SSC taxonomy.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Quick Exam Filter Pills for Admin Topic Browsing */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAdminExamFilter('ALL')}
                  className={`rounded-full border px-3 py-1 text-[11px] font-bold transition active:scale-95 ${
                    adminExamFilter === 'ALL'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  All Exams ({exams.reduce((sum, ex) => sum + (groupedByExam[ex]?.length || 0), 0)})
                </button>
                {exams.map((ex) => {
                  const active = adminExamFilter === ex;
                  return (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setAdminExamFilter(ex)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-bold transition active:scale-95 ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {ex} ({(groupedByExam[ex] || []).length})
                    </button>
                  );
                })}
              </div>

              {(adminExamFilter === 'ALL'
                ? exams
                : exams.filter((ex) => ex === adminExamFilter)
              ).map((exam) => (
                <div key={exam} className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      {exam} ({(groupedByExam[exam] || []).length} topics)
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setJsonImportText(
                            JSON.stringify(
                              UPSC_RRB_TAXONOMY_JSON_PRESET,
                              null,
                              2
                            )
                          );
                          setShowJsonImportModal(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                      >
                        <FileJson className="h-2.5 w-2.5" />
                        <span>Bulk JSON Import</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const first = groupedByExam[exam]?.[0];
                          if (first) handleBranchFromTag(first, 'subExam');
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                      >
                        <Plus className="h-2.5 w-2.5" />
                        <span>Add Sub Exam to {exam}</span>
                      </button>
                    </div>
                  </div>

                  {(groupedByExam[exam] || []).map((item) => {
                    const itemLangs = extractLanguagesArray(item);
                    const itemSubExams = extractSubExamsArray(item);
                    const isEditingThis = editingTagId === item._id;

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
                              {[
                                item.examName,
                                item.subjectName,
                                item.subSubjectName,
                                item.subTopicName,
                              ]
                                .filter(Boolean)
                                .join(' › ')}
                            </p>

                            {/* Deduplicated Individual Sub-Exam Chips */}
                            {itemSubExams.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                  Sub-Exams:
                                </span>
                                {itemSubExams.map((se) => (
                                  <span
                                    key={se}
                                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.2 text-[10px] font-bold text-slate-700"
                                  >
                                    {se}
                                  </span>
                                ))}
                              </div>
                            )}

                            {item.syllabusScope && (
                              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                                {item.syllabusScope}
                              </p>
                            )}
                          </div>

                          {/* Edit Tag + Active Toggle + Delete Tag Buttons */}
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                isEditingThis
                                  ? setEditingTagId(null)
                                  : handleStartEditTag(item)
                              }
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 active:scale-95"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>{isEditingThis ? 'Close' : 'Edit'}</span>
                            </button>

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

                        {/* Inline Tag Editor */}
                        {isEditingThis && (
                          <form
                            onSubmit={handleSaveTagEdit}
                            className="mt-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <p className="text-[11px] font-bold text-slate-800">
                              Edit Tag Hierarchy, Shared Sub-Exams &amp; Languages
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                required
                                value={editTagForm.examName}
                                onChange={(e) =>
                                  setEditTagForm((prev) => ({
                                    ...prev,
                                    examName: e.target.value,
                                  }))
                                }
                                placeholder="1. Exam *"
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                              />
                              <input
                                type="text"
                                value={editTagForm.subExams}
                                onChange={(e) =>
                                  setEditTagForm((prev) => ({
                                    ...prev,
                                    subExams: e.target.value,
                                  }))
                                }
                                placeholder="2. Sub Exams (e.g. CGL, CHSL, MTS)"
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                              />
                            </div>
                            <input
                              type="text"
                              required
                              value={editTagForm.languages}
                              onChange={(e) =>
                                setEditTagForm((prev) => ({
                                  ...prev,
                                  languages: e.target.value,
                                }))
                              }
                              placeholder="Languages (comma-separated, e.g. English, Hindi)"
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                required
                                value={editTagForm.subjectName}
                                onChange={(e) =>
                                  setEditTagForm((prev) => ({
                                    ...prev,
                                    subjectName: e.target.value,
                                  }))
                                }
                                placeholder="3. Subject *"
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                              />
                              <input
                                type="text"
                                value={editTagForm.subSubjectName}
                                onChange={(e) =>
                                  setEditTagForm((prev) => ({
                                    ...prev,
                                    subSubjectName: e.target.value,
                                  }))
                                }
                                placeholder="4. Sub Subject"
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={editTagForm.subTopicName}
                                onChange={(e) =>
                                  setEditTagForm((prev) => ({
                                    ...prev,
                                    subTopicName: e.target.value,
                                  }))
                                }
                                placeholder="5. Sub Topic"
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                              />
                              <input
                                type="text"
                                required
                                value={editTagForm.tag}
                                onChange={(e) =>
                                  setEditTagForm((prev) => ({
                                    ...prev,
                                    tag: e.target.value.toUpperCase(),
                                  }))
                                }
                                placeholder="Tag code"
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                              />
                            </div>
                            <input
                              type="text"
                              value={editTagForm.syllabusScope}
                              onChange={(e) =>
                                setEditTagForm((prev) => ({
                                  ...prev,
                                  syllabusScope: e.target.value,
                                }))
                              }
                              placeholder="Syllabus scope / notes"
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingTagId(null)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={savingTagEdit}
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                              >
                                <Save className="h-3 w-3" />
                                <span>
                                  {savingTagEdit ? 'Saving...' : 'Save Tag'}
                                </span>
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Quick Branch / Add More Under This Tag */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
                          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                            Add More:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleBranchFromTag(item, 'subExam')}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                          >
                            + Sub Exam
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBranchFromTag(item, 'subject')}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                          >
                            + Subject
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleBranchFromTag(item, 'subSubject')
                            }
                            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                          >
                            + Sub Subject
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleBranchFromTag(item, 'subTopic')
                            }
                            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                          >
                            + Sub Topic
                          </button>
                        </div>

                        {/* Add / Remove Languages for this Topic */}
                        <div className="mt-2 border-t border-slate-100 pt-2">
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

      {/* Bulk JSON Import Modal */}
      {showJsonImportModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 backdrop-blur-xs sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Bulk JSON Import"
        >
          <form
            onSubmit={handleBulkJsonImport}
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white px-4 pt-4 pb-6 shadow-xl sm:rounded-2xl sm:border"
          >
            <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Bulk JSON Taxonomy Import
                </h2>
                <p className="text-[11px] text-slate-500">
                  Paste structured exam/subExams/allowedLanguages/subSubjects JSON
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowJsonImportModal(false)}
                className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-[11px] font-bold text-slate-600">
                JSON Array Payload
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setJsonImportText(
                      JSON.stringify(UPSC_RRB_TAXONOMY_JSON_PRESET, null, 2)
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>UPSC + RRB</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setJsonImportText(
                      JSON.stringify(ALL_OFFICIAL_TAXONOMY_JSON_PRESET, null, 2)
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>All Exams</span>
                </button>
              </div>
            </div>

            <textarea
              rows={12}
              required
              value={jsonImportText}
              onChange={(e) => setJsonImportText(e.target.value)}
              placeholder="Paste JSON array here..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
            />

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setShowJsonImportModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={importingJson}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-60"
              >
                {importingJson ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileJson className="h-3.5 w-3.5" />
                )}
                <span>{importingJson ? 'Importing...' : 'Import JSON'}</span>
              </button>
            </div>
          </form>
        </div>
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
