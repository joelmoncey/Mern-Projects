import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flame, Loader2, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { getDeepLinkedQuizId } from '../lib/telegram.js';
import { useAuth } from '../context/AuthContext.jsx';
import QuizCard from '../components/QuizCard.jsx';
import ExamTopicPickerModal from '../components/ExamTopicPickerModal.jsx';

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
}) {
  const { user, isOfflinePreview, updateUserStats } = useAuth();
  const [exams, setExams] = useState([]);
  const [groupedByExam, setGroupedByExam] = useState({});
  const [examsLoaded, setExamsLoaded] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);

  const [feedTab, setFeedTab] = useState('forYou');
  const [quizzes, setQuizzes] = useState([]);
  const [seenHashes, setSeenHashes] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

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

        // If user has no saved exam yet and exams exist, prompt initial picker or set default
        if (examList.length > 0 && !examFilter?.examName) {
          const firstExam = examList[0];
          const firstTag = grouped[firstExam]?.[0];
          const firstSubject = firstTag?.subjectName || '';
          const firstLang = firstTag?.languages?.[0] || 'English';
          onUpdateExamFilter?.({
            examName: firstExam,
            subExamName: '',
            language: firstLang,
            subjectName: firstSubject,
            subSubjectName: '',
            subTopicName: '',
            hashtagId: '',
            tag: '',
            label: `${[firstExam, firstSubject].filter(Boolean).join(' › ')} (${firstLang})`,
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
  const activeLanguage = examFilter?.language || '';
  const activeSubject = examFilter?.subjectName || '';

  // Subjects available under the currently active exam for quick 1-tap switching
  const subjectsForActiveExam = useMemo(() => {
    const tags = groupedByExam[activeExam] || [];
    return Array.from(
      new Set(tags.map((t) => (t.subjectName || '').trim()).filter(Boolean))
    );
  }, [groupedByExam, activeExam]);

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
        if (examFilter?.subExamName) {
          params.set('subExamName', examFilter.subExamName);
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
        if (examFilter?.hashtagId) {
          params.set('hashtag', examFilter.hashtagId);
        }
        if (reset && initialDeepLinkRef.current) {
          params.set('prioritizeQuizId', initialDeepLinkRef.current);
          initialDeepLinkRef.current = null;
        }
        if (!reset && currentSeen.length > 0) {
          params.set('seenHashes', currentSeen.join(','));
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
      examFilter?.subSubjectName,
      examFilter?.hashtagId,
      exams.length,
      feedTab,
      isOfflinePreview,
    ]
  );

  useEffect(() => {
    if (!examsLoaded) return;
    setSeenHashes([]);
    fetchBatch({ reset: true, currentSeen: [] });
  }, [examsLoaded, fetchBatch]);

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
    const lang = activeLanguage || 'English';
    onUpdateExamFilter?.({
      examName: activeExam,
      subExamName: '',
      language: lang,
      subjectName: subj,
      subSubjectName: '',
      subTopicName: '',
      hashtagId: '',
      tag: '',
      label: `${[activeExam, subj].filter(Boolean).join(' › ')} (${lang})`,
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
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setFeedTab('forYou')}
              className={`relative pb-1 text-sm font-bold tracking-tight transition ${
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
              className={`relative pb-1 text-sm font-bold tracking-tight transition ${
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
          </div>

          <div className="flex items-center gap-1.5">
            {user && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                <Flame className="h-3 w-3 fill-amber-500 text-amber-500" />
                {user.streakCount || 0}
              </span>
            )}

            {/* Active Exam & Subject Pill + Edit Button */}
            {exams.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPickerModal(true)}
                className="inline-flex max-w-[195px] items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white shadow-2xs transition hover:bg-slate-800 active:scale-95"
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

        {/* Quick Subject Switcher Pills inside the Selected Exam */}
        {subjectsForActiveExam.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-slate-800 uppercase">
              {activeExam}
            </span>
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

      {/* Feed Body */}
      {loading ? (
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
              ? 'No quizzes from creators you follow in this topic yet'
              : `No quizzes in ${activeFilterSummary} yet`}
          </p>
          <p className="text-xs text-slate-500">
            Tap &ldquo;Edit Exam &amp; Subject&rdquo; to switch to another exam or
            subject, or publish the first question for this topic.
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
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
    </div>
  );
}
