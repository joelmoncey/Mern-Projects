import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  Flag,
  Loader2,
  Plus,
  Power,
  Shield,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import EditQuizModal from '../components/EditQuizModal.jsx';

export default function AdminHashtagsView() {
  const { user, isOfflinePreview } = useAuth();
  const [subTab, setSubTab] = useState('escalations'); // 'escalations' | 'hashtags'

  // Hashtags state
  const [groupedByExam, setGroupedByExam] = useState({});
  const [exams, setExams] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [examName, setExamName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [tag, setTag] = useState('');
  const [syllabusScope, setSyllabusScope] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Escalations state
  const [escalations, setEscalations] = useState([]);
  const [loadingEscalations, setLoadingEscalations] = useState(true);
  const [editingQuiz, setEditingQuiz] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadHashtags = useCallback(async () => {
    if (isOfflinePreview) {
      setExams(['UPSC', 'SSC CGL']);
      setGroupedByExam({
        UPSC: [
          {
            _id: 'p1',
            examName: 'UPSC',
            subjectName: 'History',
            tag: 'UPSC_HISTORY',
            syllabusScope: 'Ancient, Medieval & Modern Indian History',
            isActive: true,
            quizCount: 14,
          },
        ],
        'SSC CGL': [
          {
            _id: 'p2',
            examName: 'SSC CGL',
            subjectName: 'English',
            tag: 'SSC_ENGLISH',
            syllabusScope: 'Comprehension, Idioms, Synonyms & Error Spotting',
            isActive: true,
            quizCount: 9,
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
      setError(err.message || 'Failed to load hashtags');
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

  useEffect(() => {
    loadHashtags();
    loadEscalations();
  }, [loadHashtags, loadEscalations]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F8FAFC] px-6 text-center text-sm text-slate-500">
        Admin access required.
      </div>
    );
  }

  async function handleCreateHashtag(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isOfflinePreview) {
      setError('Connect MongoDB & API server to persist new hashtags.');
      return;
    }

    setSubmitting(true);
    try {
      const normalizedTag = tag.trim().replace(/^#+/, '').toUpperCase();
      await apiRequest('/api/hashtags', {
        method: 'POST',
        body: {
          examName: examName.trim(),
          subjectName: subjectName.trim(),
          tag: normalizedTag,
          syllabusScope: syllabusScope.trim(),
        },
      });
      setExamName('');
      setSubjectName('');
      setTag('');
      setSyllabusScope('');
      setSuccess(`Created #${normalizedTag}`);
      await loadHashtags();
    } catch (err) {
      setError(err.message || 'Failed to create hashtag');
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

  return (
    <div className="h-dvh overflow-y-auto bg-[#F8FAFC] px-4 pt-5 pb-24">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
        <Shield className="h-5 w-5 text-slate-900" />
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Admin Console
          </h1>
          <p className="text-xs text-slate-500">
            Review escalated flagged quizzes &amp; manage exam hashtags.
          </p>
        </div>
      </div>

      {/* Sub-tab switcher */}
      <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setSubTab('escalations')}
          className={`rounded-lg py-1.5 text-xs font-bold transition ${
            subTab === 'escalations'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Escalations ({escalations.length})
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
          Exam Hashtags
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

      {subTab === 'escalations' ? (
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
                    {quiz.escalatedToAdmin ? (
                      <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
                        Escalated
                      </span>
                    ) : (
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                        Awaiting Creator
                      </span>
                    )}
                    {quiz.isHidden && (
                      <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                        Hidden
                      </span>
                    )}
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

                {Array.isArray(quiz.flags) && quiz.flags.length > 0 && (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    {quiz.flags.slice(0, 3).map((f, idx) => (
                      <div key={idx} className="truncate">
                        &bull; {f.reason || 'Flagged as wrong'}
                      </div>
                    ))}
                  </div>
                )}

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
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          {/* Create Hashtag Form */}
          <form
            onSubmit={handleCreateHashtag}
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
          >
            <h2 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Add Official Subject Hashtag
            </h2>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="Exam (e.g. SSC CGL)"
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
              />
              <input
                type="text"
                required
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Subject (e.g. English)"
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>

            <input
              type="text"
              required
              value={tag}
              onChange={(e) => setTag(e.target.value.toUpperCase())}
              placeholder="Tag code without # (e.g. SSC_ENGLISH)"
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
            />

            <textarea
              rows={2}
              value={syllabusScope}
              onChange={(e) => setSyllabusScope(e.target.value)}
              placeholder="Syllabus scope (topics covered under this exam + subject)"
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
              <span>{submitting ? 'Adding...' : 'Add Hashtag'}</span>
            </button>
          </form>

          {/* Grouped Hashtags List */}
          {loadingTags ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
            </div>
          ) : exams.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No hashtags configured yet.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {exams.map((exam) => (
                <div key={exam} className="flex flex-col gap-2">
                  <h3 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                    {exam}
                  </h3>

                  {(groupedByExam[exam] || []).map((item) => (
                    <div
                      key={item._id}
                      className={`flex items-start justify-between gap-3 rounded-2xl border bg-white p-3.5 shadow-2xs ${
                        item.isActive
                          ? 'border-slate-200'
                          : 'border-slate-200/70 opacity-60'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                            #{item.tag}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {item.subjectName}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {item.quizCount || 0} quizzes
                          </span>
                        </div>
                        {item.syllabusScope && (
                          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
                            {item.syllabusScope}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold transition active:scale-95 ${
                          item.isActive
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Power className="h-3 w-3" />
                        <span>{item.isActive ? 'Active' : 'Off'}</span>
                      </button>
                    </div>
                  ))}
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
