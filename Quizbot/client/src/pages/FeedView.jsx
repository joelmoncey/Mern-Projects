import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, Loader2, RefreshCw } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { getDeepLinkedQuizId } from '../lib/telegram.js';
import { useAuth } from '../context/AuthContext.jsx';
import QuizCard from '../components/QuizCard.jsx';

const OFFLINE_SAMPLE_QUIZZES = [
  {
    _id: 'preview-1',
    examName: 'UPSC',
    subjectName: 'History',
    hashtag: {
      _id: 'tag-upsc-hist',
      tag: 'UPSC_HISTORY',
      examName: 'UPSC',
      subjectName: 'History',
      syllabusScope:
        'Indus Valley Civilization, Vedic Age, Mauryan & Gupta Empires, Modern Indian Freedom Struggle.',
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
    examName: 'SSC CGL',
    subjectName: 'English',
    hashtag: {
      _id: 'tag-ssc-eng',
      tag: 'SSC_ENGLISH',
      examName: 'SSC CGL',
      subjectName: 'English',
      syllabusScope:
        'Reading Comprehension, Idioms & Phrases, One-Word Substitution, Error Spotting, Synonyms & Antonyms.',
    },
    creator: { _id: 'c2', firstName: 'Meera', username: 'ssc_daily' },
    question:
      'Choose the most appropriate synonym of the word "EPHEMERAL":',
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

export default function FeedView({ onOpenCreate, onOpenCreatorProfile }) {
  const { user, isOfflinePreview, updateUserStats } = useAuth();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('ALL');
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
      setExams(['UPSC', 'SSC CGL']);
      return;
    }

    let cancelled = false;
    apiRequest('/api/hashtags')
      .then((data) => {
        if (!cancelled) {
          setExams(data.exams || []);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isOfflinePreview]);

  const fetchBatch = useCallback(
    async ({ reset = false, currentSeen = [] } = {}) => {
      if (isOfflinePreview) {
        const filtered =
          selectedExam === 'ALL'
            ? OFFLINE_SAMPLE_QUIZZES
            : OFFLINE_SAMPLE_QUIZZES.filter((q) => q.examName === selectedExam);
        setQuizzes(filtered);
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
        if (selectedExam !== 'ALL') {
          params.set('examName', selectedExam);
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
    [selectedExam, feedTab, isOfflinePreview]
  );

  useEffect(() => {
    setSeenHashes([]);
    fetchBatch({ reset: true, currentSeen: [] });
  }, [fetchBatch]);

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

  return (
    <div className="relative h-dvh w-full bg-[#F8FAFC]">
      {/* Translucent White Top Header */}
      <header className="fixed inset-x-0 top-0 z-20 mx-auto max-w-md border-b border-slate-200 bg-white/95 px-4 pt-3 pb-2.5 shadow-2xs backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
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

          <div className="flex items-center gap-2">
            {user && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                <Flame className="h-3 w-3 fill-amber-500 text-amber-500" />
                {user.streakCount || 0}
              </span>
            )}
            {isOfflinePreview && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-slate-600 uppercase">
                Preview
              </span>
            )}
          </div>
        </div>

        {/* Modern Exam Selector Pills */}
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {['ALL', ...exams].map((exam) => {
            const active = selectedExam === exam;
            return (
              <button
                key={exam}
                type="button"
                onClick={() => setSelectedExam(exam)}
                className={`shrink-0 rounded-full border px-3.5 py-1 text-[11px] font-bold tracking-wide uppercase transition active:scale-95 ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {exam === 'ALL' ? 'All Exams' : exam}
              </button>
            );
          })}
        </div>
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
              ? 'No quizzes from creators you follow yet'
              : 'No quizzes found for this filter'}
          </p>
          <p className="text-xs text-slate-500">
            {feedTab === 'following'
              ? 'Switch to For You and follow creators whose questions help your prep.'
              : 'Be the first to publish a syllabus-aligned question.'}
          </p>
          <button
            type="button"
            onClick={() =>
              feedTab === 'following'
                ? setFeedTab('forYou')
                : onOpenCreate?.()
            }
            className="mt-1 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-95"
          >
            {feedTab === 'following' ? 'Explore For You' : 'Create a Quiz'}
          </button>
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
    </div>
  );
}
