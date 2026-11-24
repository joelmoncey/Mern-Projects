import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileText,
  Layers,
  Loader2,
  Lock,
  MessageCircle,
  Send,
  Sparkles,
  Timer,
  Upload,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import {
  BULK_QUIZ_TEMPLATE,
  parseBulkQuizzesText,
} from '../lib/bulkQuizParser.js';
import { extractSubExamsArray } from '../lib/sscTaxonomyPreset.js';
import { openAdminContactLink } from '../lib/telegram.js';
import { useAuth } from '../context/AuthContext.jsx';
import { MathText, QuizVisualBlock } from '../components/QuizRichContent.jsx';

export function formatHierarchyPath(item) {
  if (!item) return '';
  const h =
    item.hashtag && typeof item.hashtag === 'object' ? item.hashtag : item;
  const subExams = extractSubExamsArray(item.subExams?.length ? item : h);
  let subExamLabel = '';
  if (subExams.length > 0 && subExams.length <= 2) {
    subExamLabel = subExams.join(', ');
  } else if (subExams.length > 2) {
    subExamLabel = `${subExams.slice(0, 2).join(', ')} +${subExams.length - 2}`;
  }
  return [
    item.examName || h.examName,
    subExamLabel,
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

  // Mode toggle: 'single' (One by One) | 'bulk' (Bulk .txt) | 'mock' (Timed Mock Test .txt)
  const [createMode, setCreateMode] = useState('single');

  const [groupedByExam, setGroupedByExam] = useState({});
  const [exams, setExams] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);

  // 5-level hierarchy + language selection state (shared by Single & Bulk modes)
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubExam, setSelectedSubExam] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [selectedSubSubject, setSelectedSubSubject] = useState('ALL');
  const [selectedHashtagId, setSelectedHashtagId] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // Single Quiz state
  const [question, setQuestion] = useState('');
  const [visualType, setVisualType] = useState('none');
  const [visualData, setVisualData] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(null);
  const [explanation, setExplanation] = useState('');

  // Bulk & Mock Test (.txt) state
  const [bulkText, setBulkText] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const fileInputRef = useRef(null);

  // Mock Test specific settings
  const [mockTitle, setMockTitle] = useState('');
  const [mockDurationMinutes, setMockDurationMinutes] = useState(15);
  const [mockNegativeMarking, setMockNegativeMarking] = useState(0);
  const [mockDescription, setMockDescription] = useState('');

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
            languages: ['English', 'Hindi'],
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
            languages: ['English', 'Hindi'],
            subjectName: 'English',
            subSubjectName: 'Vocabulary',
            subTopicName: 'Synonyms & Antonyms',
            tag: 'SSC_CGL_ENGLISH_VOCAB_SYNONYMS',
            syllabusScope:
              'High-frequency synonyms, antonyms, and contextual usage.',
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
    return Array.from(
      new Set(examTags.flatMap((t) => extractSubExamsArray(t)))
    );
  }, [examTags]);

  const filteredBySubExam = useMemo(() => {
    if (selectedSubExam === 'ALL') return examTags;
    return examTags.filter((t) => {
      const subs = extractSubExamsArray(t);
      return subs.length === 0 || subs.includes(selectedSubExam);
    });
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

  const availableLanguages = useMemo(() => {
    if (
      activeHashtag &&
      Array.isArray(activeHashtag.languages) &&
      activeHashtag.languages.length > 0
    ) {
      return activeHashtag.languages;
    }
    return ['English'];
  }, [activeHashtag]);

  useEffect(() => {
    if (
      availableLanguages.length > 0 &&
      !availableLanguages.includes(selectedLanguage)
    ) {
      setSelectedLanguage(availableLanguages[0]);
    }
  }, [availableLanguages, selectedLanguage]);

  // Live bulk parser preview
  const bulkParsed = useMemo(
    () => parseBulkQuizzesText(bulkText),
    [bulkText]
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

  async function handleCopyBulkTemplate() {
    try {
      await navigator.clipboard.writeText(BULK_QUIZ_TEMPLATE);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
    } catch {
      setBulkText(BULK_QUIZ_TEMPLATE);
    }
  }

  function handleDownloadSampleTxt() {
    try {
      const blob = new Blob([BULK_QUIZ_TEMPLATE], {
        type: 'text/plain;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'quiz-gram-bulk-template.txt';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setBulkText(BULK_QUIZ_TEMPLATE);
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      setBulkText((prev) => (prev.trim() ? `${prev}\n\n${content}` : content));
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleSingleSubmit(e) {
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
          language: selectedLanguage,
          question: question.trim(),
          visualType: visualData.trim() ? visualType : 'none',
          visualData: visualType === 'none' ? '' : visualData.trim(),
          options: options.map((o) => o.trim()),
          correctIndex: Number(correctIndex),
          explanation: explanation.trim(),
        },
      });

      setQuestion('');
      setVisualType('none');
      setVisualData('');
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

  async function handleBulkSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const isMockMode = createMode === 'mock';

    if (!selectedHashtagId) {
      setError('Please select an official exam topic first.');
      return;
    }
    if (isMockMode) {
      if (!mockTitle.trim() || mockTitle.trim().length < 3) {
        setError('Please enter a Mock Test Title (at least 3 characters).');
        return;
      }
      const mins = Number(mockDurationMinutes);
      if (!Number.isInteger(mins) || mins < 1 || mins > 240) {
        setError('Please set a valid timer between 1 and 240 minutes.');
        return;
      }
    }
    if (bulkParsed.quizzes.length === 0) {
      setError(
        bulkParsed.errors[0]?.reason ||
          'Upload a .txt file or paste at least 1 valid quiz before publishing.'
      );
      return;
    }
    if (bulkParsed.errors.length > 0) {
      setError(
        `Please fix the ${bulkParsed.errors.length} format error(s) highlighted below before publishing.`
      );
      return;
    }

    if (isOfflinePreview) {
      setError('Backend/MongoDB is offline (Preview mode).');
      return;
    }

    setSubmitting(true);
    try {
      if (isMockMode) {
        const data = await apiRequest('/api/mock-tests', {
          method: 'POST',
          body: {
            hashtagId: selectedHashtagId,
            language: selectedLanguage,
            title: mockTitle.trim(),
            description: mockDescription.trim(),
            durationMinutes: Number(mockDurationMinutes),
            negativeMarking: Number(mockNegativeMarking) || 0,
            quizzes: bulkParsed.quizzes,
          },
        });
        setBulkText('');
        setMockTitle('');
        setMockDescription('');
        const reusedNote =
          data.reusedQuestionsCount > 0
            ? `, ${data.reusedQuestionsCount} reused from your bank`
            : '';
        setSuccessMessage(
          `Mock Test "${data.mockTest?.title}" published (${data.questionCount} Qs, ${data.mockTest?.durationMinutes} min timer · ${data.newFeedQuizzesCount} new added to Feed${reusedNote})!`
        );
      } else {
        const data = await apiRequest('/api/quizzes/bulk', {
          method: 'POST',
          body: {
            hashtagId: selectedHashtagId,
            language: selectedLanguage,
            quizzes: bulkParsed.quizzes,
          },
        });

        setBulkText('');
        const dupNote =
          data.skippedDuplicatesCount > 0
            ? ` (${data.skippedDuplicatesCount} duplicate(s) skipped)`
            : '';
        setSuccessMessage(
          `Published ${data.createdCount} quiz(zes) to the feed!${dupNote}`
        );
      }
    } catch (err) {
      setError(
        err.message ||
          (isMockMode
            ? 'Could not publish mock test'
            : 'Could not publish bulk quizzes')
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-dvh overflow-y-auto bg-[#F8FAFC] px-4 pt-5 pb-24">
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Create Quiz
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Add questions one-by-one or in bulk using the structured format
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

      {/* Mode Switcher: One by One | Bulk (.txt) | Mock Test (.txt) */}
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => {
            setCreateMode('single');
            setError('');
            setSuccessMessage('');
          }}
          className={`inline-flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold transition ${
            createMode === 'single'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>One by One</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setCreateMode('bulk');
            setError('');
            setSuccessMessage('');
          }}
          className={`inline-flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold transition ${
            createMode === 'bulk'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Bulk (.txt)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setCreateMode('mock');
            setError('');
            setSuccessMessage('');
          }}
          className={`inline-flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold transition ${
            createMode === 'mock'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Timer className="h-3.5 w-3.5" />
          <span>Mock Test</span>
        </button>
      </div>

      {loadingTags ? (
        <div className="flex items-center justify-center py-16 text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : exams.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500 shadow-2xs">
          No active exam topics exist yet. Add official Exam &rsaquo; Sub Exam
          &rsaquo; Subject &rsaquo; Sub Subject &rsaquo; Sub Topic entries in
          the Admin Console first.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {error && (
            <div
              role="alert"
              className="flex min-w-0 items-start gap-2 overflow-hidden rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-medium text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Shared 5-Level Hierarchy & Language Card */}
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

            {/* Allowed Language / Medium Selector for this Exam & Sub Exam */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                6. Question Language / Medium
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableLanguages.map((lang) => {
                  const active = selectedLanguage === lang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSelectedLanguage(lang)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition active:scale-95 ${
                        active
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                      }`}
                    >
                      {active && <Check className="h-3 w-3 stroke-[3]" />}
                      <span>{lang}</span>
                    </button>
                  );
                })}
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
                  <span>
                    {formatHierarchyPath(activeHashtag)} ({selectedLanguage})
                  </span>
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

          {createMode === 'single' ? (
            /* MODE 1: ONE BY ONE (SINGLE QUIZ) FORM */
            <form onSubmit={handleSingleSubmit} className="flex flex-col gap-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="quiz-question"
                    className="text-[11px] font-bold tracking-wider text-slate-500 uppercase"
                  >
                    Question (supports $...$ Maths)
                  </label>
                  <span className="text-[11px] font-medium text-slate-400">
                    {question.length}/3000
                  </span>
                </div>
                <textarea
                  id="quiz-question"
                  rows={4}
                  maxLength={3000}
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Write a crisp exam question... Use $x^2 + 1$ for maths equations."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 outline-none focus:border-slate-900"
                />
                {question.includes('$') && (
                  <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900">
                    <span className="mr-1.5 text-[10px] font-bold text-slate-400 uppercase">
                      Math Preview:
                    </span>
                    <MathText text={question} />
                  </div>
                )}
              </div>

              {/* Optional Visual Block (Box / Table / SVG Drawing / Image URL) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                    Box / Table / Drawing (Optional)
                  </label>
                  <select
                    value={visualType}
                    onChange={(e) => {
                      const next = e.target.value;
                      setVisualType(next);
                      if (next === 'none') setVisualData('');
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:border-slate-900"
                  >
                    <option value="none">No Visual</option>
                    <option value="box">Missing-Number Box (|)</option>
                    <option value="table">Match / Data Table (|)</option>
                    <option value="svg">SVG Drawing (&lt;svg&gt;)</option>
                    <option value="image">Image URL (https://)</option>
                  </select>
                </div>

                {visualType !== 'none' && (
                  <>
                    <textarea
                      rows={3}
                      value={visualData}
                      onChange={(e) => setVisualData(e.target.value)}
                      placeholder={
                        visualType === 'box'
                          ? '4 | 9 | 2\n3 | 5 | 7\n8 | 1 | ?'
                          : visualType === 'table'
                            ? 'List-I | List-II\nHarappa | Ravi\nLothal | Bhogava'
                            : visualType === 'svg'
                              ? '<svg viewBox="0 0 180 120"><polygon points="90,18 30,104 150,104" fill="none" stroke="#0f172a" stroke-width="2"/></svg>'
                              : 'https://example.com/diagram.png'
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
                    />
                    {visualData.trim() && (
                      <QuizVisualBlock
                        visualType={visualType}
                        visualData={visualData}
                        compact
                      />
                    )}
                  </>
                )}
              </div>

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

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="quiz-explanation"
                    className="text-[11px] font-bold tracking-wider text-slate-500 uppercase"
                  >
                    Explanation (optional)
                  </label>
                  <span className="text-[11px] font-medium text-slate-400">
                    {explanation.length}/2000
                  </span>
                </div>
                <textarea
                  id="quiz-explanation"
                  rows={3}
                  maxLength={2000}
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
          ) : (
            /* MODE 2 & 3: BULK (.txt) OR TIMED MOCK TEST (.txt) */
            <form onSubmit={handleBulkSubmit} className="flex flex-col gap-3.5">
              {/* Mock Test Settings Card (shown only in Mock Test mode) */}
              {createMode === 'mock' && (
                <div className="flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-indigo-900 uppercase">
                      <Timer className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Timed Mock Test Details</span>
                    </span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                      Up to 200 Qs
                    </span>
                  </div>

                  <div>
                    <label
                      htmlFor="mock-title"
                      className="mb-1 block text-[10px] font-bold tracking-wider text-slate-500 uppercase"
                    >
                      Mock Test Title *
                    </label>
                    <input
                      id="mock-title"
                      type="text"
                      required
                      maxLength={120}
                      value={mockTitle}
                      onChange={(e) => setMockTitle(e.target.value)}
                      placeholder="e.g. SSC CGL Full Quant Mock #1"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
                    />
                  </div>

                  {/* Timer Picker */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label
                        htmlFor="mock-timer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase"
                      >
                        <Clock className="h-3 w-3" />
                        <span>Timer Duration (Minutes) *</span>
                      </label>
                      <span className="text-[11px] font-extrabold text-indigo-700">
                        {mockDurationMinutes} min
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[5, 10, 15, 30, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setMockDurationMinutes(mins)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition active:scale-95 ${
                            Number(mockDurationMinutes) === mins
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                      <input
                        id="mock-timer"
                        type="number"
                        min={1}
                        max={240}
                        required
                        value={mockDurationMinutes}
                        onChange={(e) =>
                          setMockDurationMinutes(
                            Math.max(1, Math.min(240, Number(e.target.value) || 1))
                          )
                        }
                        className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-1 text-center text-xs font-bold text-slate-900 outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>

                  {/* Negative Marking Selector */}
                  <div>
                    <label className="mb-1 block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      Negative Marking per Wrong Answer
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: 'None (0)', val: 0 },
                        { label: '-0.25', val: 0.25 },
                        { label: '-0.33', val: 0.33 },
                        { label: '-0.50', val: 0.5 },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setMockNegativeMarking(opt.val)}
                          className={`rounded-lg border py-1.5 text-[11px] font-bold transition active:scale-95 ${
                            Number(mockNegativeMarking) === opt.val
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="text"
                    maxLength={300}
                    value={mockDescription}
                    onChange={(e) => setMockDescription(e.target.value)}
                    placeholder="Short instructions or syllabus note (optional)..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
                  />

                  <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-900">
                    ✓ Multiple mock tests allowed per tag &middot; Reused questions across your tests are linked automatically &middot; New questions also publish to the Feed!
                  </p>
                </div>
              )}

              {/* Format Guide Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                    Bulk Format Specification
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBulkText(BULK_QUIZ_TEMPLATE)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 active:scale-95"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Load Sample</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyBulkTemplate}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 active:scale-95"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copiedTemplate ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSampleTxt}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 active:scale-95"
                    >
                      <Download className="h-3 w-3" />
                      <span>Sample .txt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800 active:scale-95"
                    >
                      <Upload className="h-3 w-3" />
                      <span>Upload .txt</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Rich .txt Tags Cheat Sheet */}
                <div className="mb-2 flex flex-wrap gap-1 text-[10px] font-bold">
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-indigo-700">
                    $x^2$ Maths (KaTeX)
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">
                    BOX: 4 | 9 | ?
                  </span>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-sky-800">
                    TABLE: Col1 | Col2
                  </span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800">
                    SVG: &lt;svg&gt;...&lt;/svg&gt;
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-700">
                    IMG: https://...
                  </span>
                </div>

                <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] leading-relaxed text-slate-700">
{`Q: Find $x^2 + \\frac{1}{x^2}$ or missing number (?):
BOX:
4 | 9 | 2
3 | 5 | 7
8 | 1 | ?
A) $6$
B) $9$
C) $4$
D) $5$
ANS: A
EXP: Every row sums to 15. (Also supports TABLE:, SVG:, IMG:)`}
                </pre>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Separate multiple questions with a blank line (up to 100 quizzes per .txt batch). Tap &ldquo;Load Sample&rdquo; to preview Maths, Box, SVG Drawing &amp; Table together!
                </p>
              </div>

              {/* Bulk Paste Textarea */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="bulk-quiz-input"
                    className="text-[11px] font-bold tracking-wider text-slate-500 uppercase"
                  >
                    Paste Bulk Questions
                  </label>
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <span className="text-emerald-700">
                      ✓ {bulkParsed.quizzes.length} valid
                    </span>
                    {bulkParsed.errors.length > 0 && (
                      <span className="text-rose-600">
                        ✕ {bulkParsed.errors.length} error(s)
                      </span>
                    )}
                  </div>
                </div>

                <textarea
                  id="bulk-quiz-input"
                  rows={10}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`Paste your questions using the format:\n\nQ: Question 1?\nA) Option A\nB) Option B\nC) Option C\nD) Option D\nANS: B\nEXP: Explanation...`}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-xs leading-relaxed text-slate-900 shadow-2xs placeholder:text-slate-400 outline-none focus:border-slate-900"
                />
              </div>

              {/* Format Errors List */}
              {bulkParsed.errors.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                  <p className="mb-1.5 font-bold text-rose-800">
                    Fix these blocks before publishing:
                  </p>
                  <ul className="space-y-1 text-[11px]">
                    {bulkParsed.errors.map((err, i) => (
                      <li key={i}>
                        <strong>Block #{err.blockNumber}:</strong> {err.reason}
                        {err.snippet ? ` ("${err.snippet}")` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Live Parsed Preview Cards */}
              {bulkParsed.quizzes.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <p className="mb-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                    Preview ({bulkParsed.quizzes.length} Quizzes Ready)
                  </p>
                  <div className="flex max-h-80 flex-col gap-2.5 overflow-y-auto pr-1">
                    {bulkParsed.quizzes.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs"
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-900">
                            #{idx + 1}. <MathText text={item.question} />
                          </span>
                          <div className="flex shrink-0 items-center gap-1">
                            {item.visualType && item.visualType !== 'none' && (
                              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold text-slate-600 uppercase">
                                {item.visualType}
                              </span>
                            )}
                            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              ✓ ANS: {String.fromCharCode(65 + item.correctIndex)}
                            </span>
                          </div>
                        </div>
                        <QuizVisualBlock
                          visualType={item.visualType}
                          visualData={item.visualData}
                          compact
                        />
                        <div className="mt-1.5 grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                          {item.options.map((opt, oIdx) => (
                            <span
                              key={oIdx}
                              className={
                                oIdx === item.correctIndex
                                  ? 'font-bold text-emerald-700'
                                  : 'truncate'
                              }
                            >
                              {String.fromCharCode(65 + oIdx)}){' '}
                              <MathText text={opt} />
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  bulkParsed.quizzes.length === 0 ||
                  bulkParsed.errors.length > 0
                }
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>
                  {submitting
                    ? createMode === 'mock'
                      ? 'Publishing Mock Test...'
                      : 'Publishing Batch...'
                    : createMode === 'mock'
                      ? `Publish Mock Test (${bulkParsed.quizzes.length || 0} Qs · ${mockDurationMinutes}m)`
                      : `Publish ${bulkParsed.quizzes.length || ''} Quizzes in Bulk`}
                </span>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
