import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Clock,
  Coffee,
  Flame,
  Loader2,
  Play,
  RefreshCw,
  SlidersHorizontal,
  Timer,
  Trash2,
  Users,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import {
  extractLanguagesArray,
  extractSubExamsArray,
} from '../lib/sscTaxonomyPreset.js';
import {
  loadTodaySeenHashes,
  recordTodaySeenHashes,
} from '../lib/dailySeenCache.js';
import { getDeepLinkedQuizId } from '../lib/telegram.js';
import { useAuth } from '../context/AuthContext.jsx';
import QuizCard from '../components/QuizCard.jsx';
import ExamTopicPickerModal from '../components/ExamTopicPickerModal.jsx';
import MockTestRunnerModal from '../components/MockTestRunnerModal.jsx';

const OFFLINE_SAMPLE_QUIZZES = [
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
      examName: 'UPSC',
      subExamName: 'CSE Prelims',
      subjectName: 'History',
      subSubjectName: 'Ancient India',
      subTopicName: 'Indus Valley Civilization',
      syllabusScope:
        'Indus Valley Civilization, Vedic Age, Mauryan & Gupta Empires.',
    },
    creator: { _id: 'c1', firstName: 'Aarav', username: 'civil_prep' },
    question:
      'Which Indus Valley Civilization site is famous for its tidal dockyard structure?',
    options: ['Harappa', 'Mohenjo-daro', 'Lothal', 'Kalibangan'],
    _previewCorrectIndex: 2,
    _previewExplanation:
      'Lothal in Gujarat featured an engineered tidal dockyard linked to the Sabarmati river system.',
    likesCount: 42,
    isLiked: false,
    isFollowingCreator: false,
    attemptsCount: 128,
    correctCount: 96,
  },
  {
    _id: 'preview-2',
    examName: 'SSC',
    subExamName: 'CGL Tier 1',
    subjectName: 'English',
    subSubjectName: 'Vocabulary',
    subTopicName: 'Synonyms',
    hashtag: {
      _id: 'tag-ssc-eng',
      tag: 'SSC_CGL_ENGLISH_VOCAB_SYNONYMS',
      examName: 'SSC',
      subExamName: 'CGL Tier 1',
      subjectName: 'English',
      subSubjectName: 'Vocabulary',
      subTopicName: 'Synonyms',
      syllabusScope:
        'Reading Comprehension, Idioms & Phrases, Synonyms & Antonyms.',
    },
    creator: { _id: 'c2', firstName: 'Meera', username: 'ssc_daily' },
    question: 'Choose the most appropriate synonym of the word "EPHEMERAL":',
    options: ['Permanent', 'Short-lived', 'Abundant', 'Obscure'],
    _previewCorrectIndex: 1,
    _previewExplanation:
      '"Ephemeral" means lasting for a very short time, making "Short-lived" the closest synonym.',
    likesCount: 65,
    isLiked: false,
    isFollowingCreator: false,
    attemptsCount: 210,
    correctCount: 184,
  },
];

export default function FeedView({
  examFilter,
  onUpdateExamFilter,
  onOpenCreate,
  onOpenCreatorProfile,
  onOpenChaiModal,
}) {
  const { user, isOfflinePreview, updateUserStats } = useAuth();
  const [exams, setExams] = useState([]);
  const [groupedByExam, setGroupedByExam] = useState({});
  const [examsLoaded, setExamsLoaded] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);

  const [feedTab, setFeedTab] = useState('forYou'); // 'forYou' | 'following' | 'mocks'
  const [quizzes, setQuizzes] = useState([]);
  const [seenHashes, setSeenHashes] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Timed Mock Tests tab state
  const [mockTests, setMockTests] = useState([]);
  const [loadingMocks, setLoadingMocks] = useState(false);
  const [mocksError, setMocksError] = useState('');
  const [activeMockTestId, setActiveMockTestId] = useState(null);

  const sentinelRef = useRef(null);
  const initialDeepLinkRef = useRef(getDeepLinkedQuizId());

  useEffect(() => {
    if (isOfflinePreview) {
      const demoExams = ['UPSC', 'SSC'];
      const demoGrouped = {
        UPSC: [OFFLINE_SAMPLE_QUIZZES[0].hashtag],
        SSC: [OFFLINE_SAMPLE_QUIZZES[1].hashtag],
      };
      setExams(demoExams);
      setGroupedByExam(demoGrouped);
      setExamsLoaded(true);
      return;
    }

    let cancelled = false;
    apiRequest('/api/hashtags')
      .then((data) => {
        if (cancelled) return;
        const examList = data.exams || [];
        const grouped = data.groupedByExam || {};
        setExams(examList);
        setGroupedByExam(grouped);

        // If user has no saved exam yet and exams exist, default to all subjects & languages in the first exam
        if (examList.length > 0 && !examFilter?.examName) {
          const firstExam = examList[0];
          const examTags = grouped[firstExam] || [];
          const allLangs = Array.from(
            new Set(
              examTags.flatMap((t) =>
                Array.isArray(t.languages) && t.languages.length > 0
                  ? t.languages
                  : ['English']
              )
            )
          );
          const langs = allLangs.length > 0 ? allLangs : ['English'];
          onUpdateExamFilter?.({
            examName: firstExam,
            subExamName: '',
            languages: langs,
            language: langs.join(','),
            subjectName: '',
            subSubjectName: '',
            subTopicName: '',
            hashtagId: '',
            tag: '',
            label: `${firstExam} › All Subjects (${langs.join(' + ')})`,
          });
          setShowPickerModal(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setExamsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isOfflinePreview]);

  const activeExam = examFilter?.examName || exams[0] || '';
  const activeLanguage =
    Array.isArray(examFilter?.languages) && examFilter.languages.length > 0
      ? examFilter.languages.join(',')
      : examFilter?.language || '';
  const activeSubject = examFilter?.subjectName || '';

  // Subjects available under the currently active exam + subExam + language for quick 1-tap switching
  const subjectsForActiveExam = useMemo(() => {
    const tags = groupedByExam[activeExam] || [];
    const activeLangList = activeLanguage
      ? activeLanguage
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : [];
    const activeSubExamList = Array.isArray(examFilter?.subExams)
      ? examFilter.subExams
          .map((s) => String(s || '').trim().toLowerCase())
          .filter(Boolean)
      : examFilter?.subExamName
        ? examFilter.subExamName
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : [];

    const filtered = tags.filter((t) => {
      if (activeLangList.length > 0) {
        const tagLangs = extractLanguagesArray(t).map((l) => l.toLowerCase());
        if (!tagLangs.some((l) => activeLangList.includes(l))) return false;
      }
      if (activeSubExamList.length > 0) {
        const tagSubExams = extractSubExamsArray(t).map((s) => s.toLowerCase());
        if (
          tagSubExams.length > 0 &&
          !tagSubExams.some((s) => activeSubExamList.includes(s))
        ) {
          return false;
        }
      }
      return true;
    });

    return Array.from(
      new Set(filtered.map((t) => (t.subjectName || '').trim()).filter(Boolean))
    );
  }, [
    groupedByExam,
    activeExam,
    activeLanguage,
    examFilter?.subExams,
    examFilter?.subExamName,
  ]);

  const fetchBatch = useCallback(
    async ({ reset = false, currentSeen = [] } = {}) => {
      if (!examsLoaded) return;

      if (isOfflinePreview) {
        const filtered = activeExam
          ? OFFLINE_SAMPLE_QUIZZES.filter(
              (q) =>
                q.examName === activeExam &&
                (!activeSubject || q.subjectName === activeSubject)
            )
          : OFFLINE_SAMPLE_QUIZZES;
        setQuizzes(filtered);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (!activeExam && exams.length === 0) {
        setQuizzes([]);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (reset) {
        setLoading(true);
        setError('');
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams();
        params.set('limit', '12');
        params.set('tab', feedTab);
        if (activeExam) {
          params.set('examName', activeExam);
        }
        const activeSubExams =
          Array.isArray(examFilter?.subExams) && examFilter.subExams.length > 0
            ? examFilter.subExams.join(',')
            : examFilter?.subExamName || '';
        if (activeSubExams) {
          params.set('subExams', activeSubExams);
          params.set('subExamName', activeSubExams);
        }
        if (activeLanguage) {
          params.set('language', activeLanguage);
        }
        if (activeSubject) {
          params.set('subjectName', activeSubject);
        }
        if (examFilter?.subSubjectName) {
          params.set('subSubjectName', examFilter.subSubjectName);
        }
        if (examFilter?.subTopicName) {
          params.set('subTopicName', examFilter.subTopicName);
        }
        if (examFilter?.hashtagId) {
          params.set('hashtag', examFilter.hashtagId);
        }
        if (reset && initialDeepLinkRef.current) {
          params.set('prioritizeQuizId', initialDeepLinkRef.current);
          initialDeepLinkRef.current = null;
        }
        // Always include today's daily seen hashes so zero questions repeat in the same day's scroll
        const dailySeen = loadTodaySeenHashes();
        const combinedSeen = Array.from(
          new Set([...dailySeen, ...(currentSeen || [])])
        ).slice(-250);
        if (combinedSeen.length > 0) {
          params.set('seenHashes', combinedSeen.join(','));
        }

        const data = await apiRequest(`/api/quizzes/feed?${params.toString()}`);

        setQuizzes((prev) =>
          reset ? data.quizzes || [] : [...prev, ...(data.quizzes || [])]
        );
        setSeenHashes(data.nextSeenHashes || []);
        setHasMore(Boolean(data.hasMore));
      } catch (err) {
        setError(err.message || 'Failed to load quiz feed');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      examsLoaded,
      activeExam,
      activeLanguage,
      activeSubject,
      examFilter?.subExamName,
      examFilter?.subExams,
      examFilter?.subSubjectName,
      examFilter?.subTopicName,
      examFilter?.hashtagId,
      exams.length,
      feedTab,
      isOfflinePreview,
    ]
  );

  const fetchMockTests = useCallback(async () => {
    if (!examsLoaded) return;
    if (isOfflinePreview) {
      setMockTests([]);
      setLoadingMocks(false);
      return;
    }

    setLoadingMocks(true);
    setMocksError('');
    try {
      const params = new URLSearchParams();
      if (activeExam) params.set('examName', activeExam);
      const activeSubExams =
        Array.isArray(examFilter?.subExams) && examFilter.subExams.length > 0
          ? examFilter.subExams.join(',')
          : examFilter?.subExamName || '';
      if (activeSubExams) params.set('subExams', activeSubExams);
      if (activeLanguage) params.set('language', activeLanguage);
      if (activeSubject) params.set('subjectName', activeSubject);
      if (examFilter?.subSubjectName) {
        params.set('subSubjectName', examFilter.subSubjectName);
      }
      if (examFilter?.subTopicName) {
        params.set('subTopicName', examFilter.subTopicName);
      }
      if (examFilter?.hashtagId) {
        params.set('hashtag', examFilter.hashtagId);
      }

      const data = await apiRequest(`/api/mock-tests?${params.toString()}`);
      setMockTests(data.mockTests || []);
    } catch (err) {
      setMocksError(err.message || 'Failed to load mock tests');
    } finally {
      setLoadingMocks(false);
    }
  }, [
    examsLoaded,
    isOfflinePreview,
    activeExam,
    activeLanguage,
    activeSubject,
    examFilter?.subExams,
    examFilter?.subExamName,
    examFilter?.subSubjectName,
    examFilter?.subTopicName,
    examFilter?.hashtagId,
  ]);

  useEffect(() => {
    if (!examsLoaded) return;
    if (feedTab === 'mocks') {
      fetchMockTests();
      return;
    }
    setSeenHashes([]);
    fetchBatch({ reset: true, currentSeen: [] });
  }, [examsLoaded, feedTab, fetchBatch, fetchMockTests]);

  async function handleDeleteMockTest(mockId) {
    try {
      await apiRequest(`/api/mock-tests/${mockId}`, { method: 'DELETE' });
      setMockTests((prev) => prev.filter((m) => m._id !== mockId));
    } catch (err) {
      setMocksError(err.message || 'Could not delete mock test');
    }
  }

  const handleQuizViewedToday = useCallback((questionHash) => {
    if (questionHash) {
      recordTodaySeenHashes([questionHash]);
    }
  }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading || loadingMore || isOfflinePreview) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchBatch({ reset: false, currentSeen: seenHashes });
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, isOfflinePreview, seenHashes, fetchBatch]);

  function handleFollowChanged(creatorId, isFollowing) {
    setQuizzes((prev) =>
      prev.map((q) => {
        const cid = q.creator?._id || q.creator;
        return String(cid) === String(creatorId)
          ? { ...q, isFollowingCreator: isFollowing }
          : q;
      })
    );
  }

  function handleQuickSwitchSubject(subj) {
    const langs =
      Array.isArray(examFilter?.languages) && examFilter.languages.length > 0
        ? examFilter.languages
        : activeLanguage
          ? activeLanguage.split(',')
          : ['English'];
    const subExams =
      Array.isArray(examFilter?.subExams) && examFilter.subExams.length > 0
        ? examFilter.subExams
        : examFilter?.subExamName
          ? examFilter.subExamName
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
    const isAll = !subj || subj === 'ALL';
    const subExamPart = subExams.length > 0 ? ` › ${subExams.join(' + ')}` : '';
    onUpdateExamFilter?.({
      examName: activeExam,
      subExams,
      subExamName: subExams.join(', '),
      languages: langs,
      language: langs.join(','),
      subjectName: isAll ? '' : subj,
      subSubjectName: '',
      subTopicName: '',
      hashtagId: '',
      tag: '',
      label: `${activeExam}${subExamPart} › ${isAll ? 'All Subjects' : subj} (${langs.join(' + ')})`,
    });
  }

  const activeFilterSummary =
    examFilter?.label ||
    [activeExam, activeSubject].filter(Boolean).join(' › ') ||
    'Select Exam & Subject';

  return (
    <div className="relative h-dvh w-full bg-[#F8FAFC]">
      {/* Translucent White Top Header with Exam/Subject Filter + "Edit" Button */}
      <header className="fixed inset-x-0 top-0 z-20 mx-auto max-w-md border-b border-slate-200 bg-white/95 px-4 pt-2.5 pb-2.5 shadow-2xs backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFeedTab('forYou')}
              className={`relative pb-1 text-xs font-bold tracking-tight transition ${
                feedTab === 'forYou'
                  ? 'text-slate-900'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              For You
              {feedTab === 'forYou' && (
                <span className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-slate-900" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setFeedTab('following')}
              className={`relative pb-1 text-xs font-bold tracking-tight transition ${
                feedTab === 'following'
                  ? 'text-slate-900'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Following
              {feedTab === 'following' && (
                <span className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-slate-900" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setFeedTab('mocks')}
              className={`relative inline-flex items-center gap-1 pb-1 text-xs font-bold tracking-tight transition ${
                feedTab === 'mocks'
                  ? 'text-indigo-700'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Timer className="h-3 w-3" />
              <span>Mocks</span>
              {feedTab === 'mocks' && (
                <span className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-indigo-600" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenChaiModal && (
              <button
                type="button"
                onClick={onOpenChaiModal}
                title="Buy Quiz-Gram a Chai (1 Star = ₹2)"
                aria-label="Buy Quiz-Gram a Chai"
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-900 shadow-2xs transition hover:border-amber-400 hover:bg-amber-100 active:scale-95"
              >
                <Coffee className="h-3 w-3 text-amber-600" />
                <span>Chai</span>
              </button>
            )}

            {user && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                <Flame className="h-3 w-3 fill-amber-500 text-amber-500" />
                {user.streakCount || 0}
              </span>
            )}

            {/* Active Exam & Subject Pill + Edit Button */}
            {exams.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPickerModal(true)}
                className="inline-flex max-w-[165px] items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition hover:bg-slate-800 active:scale-95"
                title="Change Exam & Subject"
              >
                <SlidersHorizontal className="h-3 w-3 shrink-0" />
                <span className="truncate">{activeFilterSummary}</span>
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[9px] uppercase">
                  Edit
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Subject Switcher Pills inside the Selected Exam (All Subjects + Individual Subjects) */}
        {subjectsForActiveExam.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-slate-800 uppercase">
              {activeExam}
            </span>
            <button
              type="button"
              onClick={() => handleQuickSwitchSubject('ALL')}
              className={`shrink-0 rounded-full border px-3 py-0.5 text-[11px] font-bold transition active:scale-95 ${
                !activeSubject
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              All Subjects
            </button>
            {subjectsForActiveExam.map((subj) => {
              const active = activeSubject === subj;
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => handleQuickSwitchSubject(subj)}
                  className={`shrink-0 rounded-full border px-3 py-0.5 text-[11px] font-bold transition active:scale-95 ${
                    active
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {subj}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Feed / Mock Tests Body */}
      {feedTab === 'mocks' ? (
        <div className="h-dvh overflow-y-auto px-4 pt-24 pb-24">
          {loadingMocks ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-slate-900" />
              <p className="text-xs font-medium">Loading timed mock tests...</p>
            </div>
          ) : mocksError ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
              <p className="text-xs font-semibold text-rose-700">{mocksError}</p>
              <button
                type="button"
                onClick={fetchMockTests}
                className="mt-2.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white"
              >
                Retry
              </button>
            </div>
          ) : mockTests.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xs">
              <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                <Timer className="h-5 w-5" />
              </div>
              <p className="text-sm font-extrabold text-slate-900">
                No Mock Tests in {activeFilterSummary} yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Switch Exam/Subject filter above or upload a timed .txt Mock Test from the Create tab.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {exams.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPickerModal(true)}
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-slate-800"
                  >
                    Change Exam Filter
                  </button>
                )}
                {(user?.role === 'admin' || user?.canCreateQuiz) && (
                  <button
                    type="button"
                    onClick={() => onOpenCreate?.()}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
                  >
                    + Upload Mock Test (.txt)
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-0.5">
                <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Timed Mock Tests ({mockTests.length})
                </p>
                <span className="text-[10px] font-semibold text-slate-400">
                  Newest first
                </span>
              </div>

              {mockTests.map((mock) => (
                <div
                  key={mock._id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-slate-300"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
                        #{mock.hashtag?.tag || mock.examName}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-800">
                        <Clock className="h-2.5 w-2.5" />
                        {mock.durationMinutes} min
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {mock.questionCount} Qs
                      </span>
                      {mock.negativeMarking > 0 && (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          -{mock.negativeMarking}
                        </span>
                      )}
                      {mock.language && (
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {mock.language}
                        </span>
                      )}
                    </div>

                    {mock.canManage && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMockTest(mock._id)}
                        title="Delete mock test"
                        className="rounded-full border border-slate-200 p-1.5 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900">
                    {mock.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    {[
                      mock.examName,
                      mock.subjectName,
                      mock.subSubjectName,
                      mock.subTopicName,
                    ]
                      .filter(Boolean)
                      .join(' › ')}
                  </p>
                  {mock.description && (
                    <p className="mt-1.5 text-xs text-slate-600">
                      {mock.description}
                    </p>
                  )}

                  {mock.myStats && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                      <Award className="h-3.5 w-3.5 text-emerald-600" />
                      <span>
                        Best Score: {mock.myStats.bestScore}/{mock.myStats.maxScore} (
                        {mock.myStats.bestScorePercent}%) · {mock.myStats.attemptsByMe}{' '}
                        {mock.myStats.attemptsByMe === 1 ? 'try' : 'tries'}
                      </span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        mock.creator?._id &&
                        onOpenCreatorProfile?.(mock.creator._id)
                      }
                      className="flex items-center gap-2 text-left text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                    >
                      <span>
                        by @{mock.creator?.username || mock.creator?.firstName || 'creator'}
                      </span>
                      <span>&middot;</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Users className="h-3 w-3" />
                        {mock.attemptsCount || 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveMockTestId(mock._id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-indigo-600 active:scale-95"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>{mock.myStats ? 'Retake Mock' : 'Start Mock'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="flex h-dvh flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-slate-900" />
          <p className="text-xs font-medium">Loading quiz feed...</p>
        </div>
      ) : error ? (
        <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button
            type="button"
            onClick={() => fetchBatch({ reset: true, currentSeen: [] })}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="flex h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
          <p className="text-base font-bold text-slate-900">
            {feedTab === 'following'
              ? 'No unseen quizzes from creators you follow today'
              : `You're all caught up on ${activeFilterSummary} for today!`}
          </p>
          <p className="text-xs text-slate-500">
            New questions appear here automatically first. Previous questions return tomorrow for revision — or practice a timed Mock Test right now!
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setFeedTab('mocks')}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 active:scale-95"
            >
              <Timer className="h-3.5 w-3.5" />
              <span>Take a Mock Test</span>
            </button>
            {exams.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPickerModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-95"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Edit Exam &amp; Subject</span>
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                feedTab === 'following'
                  ? setFeedTab('forYou')
                  : onOpenCreate?.()
              }
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              {feedTab === 'following' ? 'Explore For You' : 'Create a Quiz'}
            </button>
          </div>
        </div>
      ) : (
        <div className="quiz-feed-scroll">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz._id}
              quiz={quiz}
              isOfflinePreview={isOfflinePreview}
              onStatsUpdated={updateUserStats}
              onFollowChanged={handleFollowChanged}
              onOpenCreatorProfile={onOpenCreatorProfile}
              onViewed={handleQuizViewedToday}
            />
          ))}

          <div
            ref={sentinelRef}
            className="flex items-center justify-center py-8 pb-24 text-xs text-slate-500"
          >
            {loadingMore ? (
              <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more...
              </span>
            ) : hasMore ? (
              <button
                type="button"
                onClick={() =>
                  fetchBatch({ reset: false, currentSeen: seenHashes })
                }
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 font-semibold text-slate-800 shadow-2xs hover:bg-slate-50"
              >
                Load more quizzes
              </button>
            ) : (
              <span className="font-medium">You&apos;re all caught up</span>
            )}
          </div>
        </div>
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
      {activeMockTestId && (
        <MockTestRunnerModal
          mockTestId={activeMockTestId}
          onClose={() => setActiveMockTestId(null)}
          onCompleted={(seenHashesFromMock, nextUserStats) => {
            if (seenHashesFromMock?.length) {
              recordTodaySeenHashes(seenHashesFromMock);
            }
            if (nextUserStats) {
              updateUserStats?.(nextUserStats);
            }
            fetchMockTests();
          }}
        />
      )}
    </div>
  );
}
