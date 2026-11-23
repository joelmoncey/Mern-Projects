import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Lock,
  MessageCircle,
  Send,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { openAdminContactLink } from '../lib/telegram.js';
import { useAuth } from '../context/AuthContext.jsx';

export function formatHierarchyPath(item) {
  if (!item) return '';
  const h = item.hashtag && typeof item.hashtag === 'object' ? item.hashtag : item;
  return [
    item.examName || h.examName,
    item.subExamName || h.subExamName,
    item.subjectName || h.subjectName,
    item.subSubjectName || h.subSubjectName,
    item.subTopicName || h.subTopicName,
  ]
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .join(' › ');
}

export default function CreateQuizView({ onCreated, onBackToFeed }) {
  const { user, isOfflinePreview } = useAuth();
  const canCreate = user?.role === 'admin' || Boolean(user?.canCreateQuiz);

  const [groupedByExam, setGroupedByExam] = useState({});
  const [exams, setExams] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);

  // 5-level hierarchy selection state
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubExam, setSelectedSubExam] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [selectedSubSubject, setSelectedSubSubject] = useState('ALL');
  const [selectedHashtagId, setSelectedHashtagId] = useState('');

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  // Default to null so creator MUST explicitly choose the right option (A, B, C, or D)
  const [correctIndex, setCorrectIndex] = useState(null);
  const [explanation, setExplanation] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!canCreate) {
      setLoadingTags(false);
      return;
    }

    let cancelled = false;

    if (isOfflinePreview) {
      const sample = {
        UPSC: [
          {
            _id: 'preview-upsc-hist',
            examName: 'UPSC',
            subExamName: 'CSE Prelims',
            subjectName: 'History',
            subSubjectName: 'Ancient India',
            subTopicName: 'Indus Valley Civilization',
            tag: 'UPSC_CSE_HISTORY_ANCIENT_IVC',
            syllabusScope:
              'Town planning, dockyards, seals, and major Harappan sites.',
          },
        ],
        SSC: [
          {
            _id: 'preview-ssc-eng',
            examName: 'SSC',
            subExamName: 'CGL Tier 1',
            subjectName: 'English',
            subSubjectName: 'Vocabulary',
            subTopicName: 'Synonyms & Antonyms',
            tag: 'SSC_CGL_ENGLISH_VOCAB_SYNONYMS',
            syllabusScope: 'High-frequency synonyms, antonyms, and contextual usage.',
          },
        ],
      };
      setGroupedByExam(sample);
      setExams(['UPSC', 'SSC']);
      setSelectedExam('UPSC');
      setSelectedHashtagId('preview-upsc-hist');
      setLoadingTags(false);
      return;
    }

    apiRequest('/api/hashtags')
      .then((data) => {
        if (cancelled) return;
        const examList = data.exams || [];
        const grouped = data.groupedByExam || {};
        setExams(examList);
        setGroupedByExam(grouped);
        if (examList.length > 0) {
          const firstExam = examList[0];
          setSelectedExam(firstExam);
          const firstTag = grouped[firstExam]?.[0];
          if (firstTag) setSelectedHashtagId(firstTag._id);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load official exam topics');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTags(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canCreate, isOfflinePreview]);

  const examTags = useMemo(
    () => groupedByExam[selectedExam] || [],
    [groupedByExam, selectedExam]
  );

  const subExamChoices = useMemo(() => {
    const vals = Array.from(
      new Set(examTags.map((t) => (t.subExamName || '').trim()).filter(Boolean))
    );
    return vals;
  }, [examTags]);

  const filteredBySubExam = useMemo(() => {
    if (selectedSubExam === 'ALL') return examTags;
    return examTags.filter(
      (t) => (t.subExamName || '').trim() === selectedSubExam
    );
  }, [examTags, selectedSubExam]);

  const subjectChoices = useMemo(() => {
    return Array.from(
      new Set(
        filteredBySubExam
          .map((t) => (t.subjectName || '').trim())
          .filter(Boolean)
      )
    );
  }, [filteredBySubExam]);

  const filteredBySubject = useMemo(() => {
    if (selectedSubject === 'ALL') return filteredBySubExam;
    return filteredBySubExam.filter(
      (t) => (t.subjectName || '').trim() === selectedSubject
    );
  }, [filteredBySubExam, selectedSubject]);

  const subSubjectChoices = useMemo(() => {
    return Array.from(
      new Set(
        filteredBySubject
          .map((t) => (t.subSubjectName || '').trim())
          .filter(Boolean)
      )
    );
  }, [filteredBySubject]);

  const filteredTopicTags = useMemo(() => {
    if (selectedSubSubject === 'ALL') return filteredBySubject;
    return filteredBySubject.filter(
      (t) => (t.subSubjectName || '').trim() === selectedSubSubject
    );
  }, [filteredBySubject, selectedSubSubject]);

  // Keep selectedHashtagId synchronized with filteredTopicTags
  useEffect(() => {
    if (
      filteredTopicTags.length > 0 &&
      !filteredTopicTags.some((t) => t._id === selectedHashtagId)
    ) {
      setSelectedHashtagId(filteredTopicTags[0]._id);
    }
  }, [filteredTopicTags, selectedHashtagId]);

  const activeHashtag = useMemo(
    () => examTags.find((t) => t._id === selectedHashtagId) || null,
    [examTags, selectedHashtagId]
  );

  if (!canCreate) {
    return (
      <div className="flex h-dvh flex-col justify-center bg-[#F8FAFC] px-5 pb-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-base font-bold tracking-tight text-slate-900">
            Creator Approval Required
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            To keep exam questions accurate and high-quality, only{' '}
            <span className="font-semibold text-slate-800">
              admin-approved creators
            </span>{' '}
            can publish quizzes. You can continue scrolling the feed, solving
            quizzes, liking, following creators, and competing on the weekly
            leaderboard.
          </p>

          {user?.telegramId && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              Your Telegram ID:{' '}
              <span className="font-mono font-bold text-slate-900">
                {user.telegramId}
              </span>
              {user.username ? ` (@${user.username})` : ''}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={openAdminContactLink}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Contact Admin for Creator Access</span>
            </button>

            {onBackToFeed && (
              <button
                type="button"
                onClick={onBackToFeed}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to Quiz Feed
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  function handleExamChange(nextExam) {
    setSelectedExam(nextExam);
    setSelectedSubExam('ALL');
    setSelectedSubject('ALL');
    setSelectedSubSubject('ALL');
    const firstTag = groupedByExam[nextExam]?.[0];
    setSelectedHashtagId(firstTag ? firstTag._id : '');
  }

  function handleOptionChange(idx, value) {
    setOptions((prev) => prev.map((opt, i) => (i === idx ? value : opt)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!selectedHashtagId) {
      setError('Please select an official exam topic.');
      return;
    }
    if (!question.trim()) {
      setError('Please enter your quiz question.');
      return;
    }
    if (options.some((opt) => !opt.trim())) {
      setError('Please fill in all 4 answer options (A, B, C, and D).');
      return;
    }
    if (
      correctIndex === null ||
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex > 3
    ) {
      setError(
        'Please select which option (A, B, C, or D) is the RIGHT answer before publishing.'
      );
      return;
    }

    if (isOfflinePreview) {
      setError('Backend/MongoDB is offline (Preview mode).');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/api/quizzes', {
        method: 'POST',
        body: {
          hashtagId: selectedHashtagId,
          question: question.trim(),
          options: options.map((o) => o.trim()),
          correctIndex: Number(correctIndex),
          explanation: explanation.trim(),
        },
      });

      setQuestion('');
      setOptions(['', '', '', '']);
      setCorrectIndex(null);
      setExplanation('');
      setSuccessMessage('Quiz published to the feed!');
      if (onCreated) onCreated();
    } catch (err) {
      setError(err.message || 'Could not publish quiz');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-dvh overflow-y-auto bg-[#F8FAFC] px-4 pt-5 pb-24">
      <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Create Quiz
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Select Exam &rsaquo; Sub Exam &rsaquo; Subject &rsaquo; Sub Subject &rsaquo; Sub Topic
          </p>
        </div>

        <button
          type="button"
          onClick={openAdminContactLink}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95"
        >
          <MessageCircle className="h-3.5 w-3.5 text-slate-900" />
          <span>Contact Admin</span>
        </button>
      </div>

      {loadingTags ? (
        <div className="flex items-center justify-center py-16 text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : exams.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500 shadow-2xs">
          No active exam topics exist yet. Add official Exam &rsaquo; Sub Exam &rsaquo; Subject &rsaquo; Sub Subject &rsaquo; Sub Topic entries in the Admin Console first.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-medium text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 5-Level Hierarchy Card */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            {/* Level 1: Exam */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                1. Exam
              </label>
              <div className="flex flex-wrap gap-1.5">
                {exams.map((exam) => {
                  const active = exam === selectedExam;
                  return (
                    <button
                      key={exam}
                      type="button"
                      onClick={() => handleExamChange(exam)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-wide uppercase transition active:scale-95 ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {exam}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Level 2 & 3: Sub Exam & Subject */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  2. Sub Exam
                </label>
                <select
                  value={selectedSubExam}
                  onChange={(e) => {
                    setSelectedSubExam(e.target.value);
                    setSelectedSubject('ALL');
                    setSelectedSubSubject('ALL');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                >
                  <option value="ALL">All Sub Exams</option>
                  {subExamChoices.map((se) => (
                    <option key={se} value={se}>
                      {se}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  3. Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setSelectedSubSubject('ALL');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                >
                  <option value="ALL">All Subjects</option>
                  {subjectChoices.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Level 4 & 5: Sub Subject & Final Sub Topic / Hashtag */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  4. Sub Subject
                </label>
                <select
                  value={selectedSubSubject}
                  onChange={(e) => setSelectedSubSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                >
                  <option value="ALL">All Sub Subjects</option>
                  {subSubjectChoices.map((ss) => (
                    <option key={ss} value={ss}>
                      {ss}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="hashtag-select"
                  className="mb-1 block text-[10px] font-bold tracking-wider text-slate-500 uppercase"
                >
                  5. Sub Topic / Tag
                </label>
                <select
                  id="hashtag-select"
                  value={selectedHashtagId}
                  onChange={(e) => setSelectedHashtagId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                >
                  {filteredTopicTags.map((tag) => (
                    <option key={tag._id} value={tag._id}>
                      {tag.subTopicName || tag.subSubjectName || tag.subjectName} (#{tag.tag})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Hierarchy Breadcrumb Preview */}
            {activeHashtag && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-1 font-semibold text-slate-800">
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                    #{activeHashtag.tag}
                  </span>
                  <ChevronRight className="h-3 w-3 text-slate-400" />
                  <span>{formatHierarchyPath(activeHashtag)}</span>
                </div>
                {activeHashtag.syllabusScope && (
                  <p className="mt-1 flex items-start gap-1.5 text-[11px] text-slate-600">
                    <BookOpen className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                    <span>{activeHashtag.syllabusScope}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Question Input */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="quiz-question"
                className="text-[11px] font-bold tracking-wider text-slate-500 uppercase"
              >
                Question
              </label>
              <span className="text-[11px] font-medium text-slate-400">
                {question.length}/300
              </span>
            </div>
            <textarea
              id="quiz-question"
              rows={3}
              maxLength={300}
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Write a crisp, exam-level question..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 outline-none focus:border-slate-900"
            />
          </div>

          {/* 4 Answer Options with Explicit "Set Right" Button on Each Option */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                Options &amp; Right Answer
              </label>
              <span
                className={`text-[11px] font-bold ${
                  correctIndex !== null ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {correctIndex !== null
                  ? `✓ Right Answer: Option ${String.fromCharCode(65 + correctIndex)}`
                  : 'Select right answer below'}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {options.map((opt, idx) => {
                const isCorrect = correctIndex === idx;
                const letter = String.fromCharCode(65 + idx);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectIndex(idx)}
                      title={`Mark Option ${letter} as right answer`}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-bold transition active:scale-95 ${
                        isCorrect
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {letter}
                    </button>
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Enter Option ${letter}`}
                      className={`flex-1 rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 outline-none ${
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-50/40 font-semibold focus:border-emerald-600'
                          : 'border-slate-200 focus:border-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setCorrectIndex(idx)}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-xl border px-2.5 py-2 text-[11px] font-bold transition active:scale-95 ${
                        isCorrect
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <Check className="h-3 w-3 stroke-[3]" />
                          <span>Right</span>
                        </>
                      ) : (
                        <span>Set Right</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Dedicated 4-Button Right Answer Selector Bar */}
            <div className="mt-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
              <p className="mb-1.5 text-[11px] font-bold text-slate-600">
                Confirm Right Answer Option:
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 1, 2, 3].map((idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const active = correctIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCorrectIndex(idx)}
                      className={`rounded-lg border py-2 text-xs font-bold transition active:scale-95 ${
                        active
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {active ? `✓ Option ${letter}` : `Option ${letter}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="quiz-explanation"
                className="text-[11px] font-bold tracking-wider text-slate-500 uppercase"
              >
                Explanation (optional)
              </label>
              <span className="text-[11px] font-medium text-slate-400">
                {explanation.length}/400
              </span>
            </div>
            <textarea
              id="quiz-explanation"
              rows={3}
              maxLength={400}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why the answer is right..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 outline-none focus:border-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>{submitting ? 'Publishing...' : 'Publish Quiz'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
