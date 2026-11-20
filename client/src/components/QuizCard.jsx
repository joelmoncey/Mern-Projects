import { useState } from 'react';
import {
  BookOpen,
  Check,
  Flag,
  Heart,
  Share2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { shareQuizViaTelegram } from '../lib/telegram.js';

const FLAG_REASONS = [
  'Wrong answer key',
  'Typo or ambiguous wording',
  'Outdated facts',
  'Out of syllabus',
];

export default function QuizCard({
  quiz,
  isOfflinePreview,
  onStatsUpdated,
  onFollowChanged,
  onOpenCreatorProfile,
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [attemptResult, setAttemptResult] = useState(null);
  const [showSyllabus, setShowSyllabus] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const [liked, setLiked] = useState(Boolean(quiz.isLiked));
  const [likesCount, setLikesCount] = useState(quiz.likesCount || 0);
  const [following, setFollowing] = useState(Boolean(quiz.isFollowingCreator));

  const [flagged, setFlagged] = useState(Boolean(quiz.isFlaggedByMe));
  const [flagCount, setFlagCount] = useState(quiz.flagCount || 0);
  const [showFlagSheet, setShowFlagSheet] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [submittingFlag, setSubmittingFlag] = useState(false);

  const [toast, setToast] = useState('');

  const isAnswered = attemptResult !== null;
  const tagLabel =
    quiz.hashtag?.tag ||
    `${quiz.examName || 'EXAM'}_${quiz.subjectName || 'SUBJECT'}`.toUpperCase();
  const syllabusScope = quiz.hashtag?.syllabusScope || '';
  const creatorId = quiz.creator?._id || quiz.creator;
  const creatorHandle = quiz.creator?.username
    ? `@${quiz.creator.username}`
    : quiz.creator?.firstName || '@aspirant';
  const creatorInitial = (
    quiz.creator?.firstName ||
    quiz.creator?.username ||
    'A'
  )
    .charAt(0)
    .toUpperCase();

  function flashToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  }

  async function handleSelectOption(idx) {
    if (isAnswered || submittingAttempt) return;
    setSelectedIndex(idx);
    setSubmittingAttempt(true);

    try {
      if (isOfflinePreview) {
        const correctIdx =
          typeof quiz._previewCorrectIndex === 'number'
            ? quiz._previewCorrectIndex
            : 0;
        setAttemptResult({
          isCorrect: idx === correctIdx,
          correctIndex: correctIdx,
          explanation:
            quiz._previewExplanation ||
            'Connect MongoDB to record attempts and view explanations.',
          attemptsCount: (quiz.attemptsCount || 0) + 1,
          correctCount: (quiz.correctCount || 0) + (idx === correctIdx ? 1 : 0),
        });
        setShowExplanation(true);
        return;
      }

      const data = await apiRequest(`/api/quizzes/${quiz._id}/attempt`, {
        method: 'POST',
        body: { selectedIndex: idx },
      });

      setAttemptResult(data);
      setShowExplanation(true);
      if (data.userStats && onStatsUpdated) {
        onStatsUpdated(data.userStats);
      }
    } catch (err) {
      setSelectedIndex(null);
      flashToast(err.message || 'Could not submit answer');
    } finally {
      setSubmittingAttempt(false);
    }
  }

  async function handleLike() {
    if (isOfflinePreview) {
      setLiked((prev) => !prev);
      setLikesCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
      return;
    }

    try {
      const data = await apiRequest(`/api/quizzes/${quiz._id}/like`, {
        method: 'POST',
      });
      setLiked(data.liked);
      setLikesCount(data.likesCount);
    } catch (err) {
      flashToast(err.message || 'Could not update like');
    }
  }

  async function handleFollow() {
    if (!creatorId) return;

    if (quiz.isOwnQuiz || isOfflinePreview) {
      setFollowing((prev) => !prev);
      return;
    }

    try {
      const data = await apiRequest(`/api/users/${creatorId}/follow`, {
        method: 'POST',
      });
      setFollowing(data.following);
      if (onFollowChanged) {
        onFollowChanged(creatorId, data.following);
      }
    } catch (err) {
      flashToast(err.message || 'Could not update follow');
    }
  }

  async function handleShare() {
    const mode = await shareQuizViaTelegram(quiz);
    if (mode === 'copied') {
      flashToast('Quiz link copied to clipboard');
    }
  }

  async function handleSubmitFlag(e) {
    e.preventDefault();
    if (flagged || submittingFlag) return;

    if (isOfflinePreview) {
      setFlagged(true);
      setFlagCount((c) => c + 1);
      setShowFlagSheet(false);
      flashToast('Flagged for creator review (preview)');
      return;
    }

    setSubmittingFlag(true);
    try {
      const data = await apiRequest(`/api/quizzes/${quiz._id}/flag`, {
        method: 'POST',
        body: { reason: flagReason.trim() },
      });
      setFlagged(true);
      setFlagCount(data.flagCount);
      setShowFlagSheet(false);
      setFlagReason('');
      if (data.escalatedToAdmin) {
        flashToast('Flagged & escalated to admins');
      } else if (data.needsCreatorEdit) {
        flashToast('Flagged · Creator notified to review');
      } else {
        flashToast('Flagged as potentially wrong');
      }
    } catch (err) {
      if (err.status === 409) {
        setFlagged(true);
        setShowFlagSheet(false);
      }
      flashToast(err.message || 'Could not flag quiz');
    } finally {
      setSubmittingFlag(false);
    }
  }

  const accuracyPct =
    attemptResult && attemptResult.attemptsCount > 0
      ? Math.round(
          (attemptResult.correctCount / attemptResult.attemptsCount) * 100
        )
      : null;

  return (
    <section className="quiz-feed-card relative flex w-full flex-col justify-between bg-[#F8FAFC] px-4 pt-24 pb-20">
      {/* Toast pill */}
      {toast && (
        <div className="pointer-events-none absolute top-24 left-1/2 z-30 -translate-x-1/2 rounded-full border border-slate-200 bg-slate-900 px-4 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-md">
          {toast}
        </div>
      )}

      {/* Top Metadata Bar: Hashtag + Exam Pill + Syllabus Toggle */}
      <div className="flex flex-col gap-2 pr-12">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold tracking-wide text-white uppercase shadow-xs">
            #{tagLabel}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-2xs">
            {quiz.examName} &bull; {quiz.subjectName}
          </span>
          {quiz.editCount > 0 && (
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-slate-600 uppercase">
              Edited
            </span>
          )}
          {syllabusScope && (
            <button
              type="button"
              onClick={() => setShowSyllabus((prev) => !prev)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
                showSyllabus
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-100'
              }`}
            >
              <BookOpen className="h-3 w-3" />
              <span>Syllabus</span>
            </button>
          )}
        </div>

        {showSyllabus && syllabusScope && (
          <div className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs leading-relaxed text-slate-700 shadow-sm">
            <div>
              <span className="mb-0.5 block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Syllabus Scope
              </span>
              {syllabusScope}
            </div>
            <button
              type="button"
              onClick={() => setShowSyllabus(false)}
              className="shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close syllabus scope"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Question + 4 Option Cards (with right padding for the Instagram vertical rail) */}
      <div className="my-auto flex flex-col gap-3.5 py-2 pr-14">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <h2 className="text-[18px] leading-snug font-bold tracking-tight text-slate-900">
            {quiz.question}
          </h2>
        </div>

        <div className="flex flex-col gap-2.5">
          {quiz.options.map((option, idx) => {
            const isCorrectOption =
              isAnswered && idx === attemptResult.correctIndex;
            const isWrongSelected =
              isAnswered &&
              idx === selectedIndex &&
              idx !== attemptResult.correctIndex;

            let cardClasses =
              'border-slate-200 bg-white text-slate-900 shadow-xs hover:border-slate-300 hover:bg-slate-50/80 active:scale-[0.99]';
            let letterClasses =
              'border border-slate-200 bg-slate-100 text-slate-700';

            if (isCorrectOption) {
              cardClasses =
                'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm ring-1 ring-emerald-500/20';
              letterClasses = 'bg-emerald-600 text-white shadow-2xs';
            } else if (isWrongSelected) {
              cardClasses =
                'border-rose-500 bg-rose-50 text-rose-950 shadow-sm ring-1 ring-rose-500/20';
              letterClasses = 'bg-rose-600 text-white shadow-2xs';
            } else if (isAnswered) {
              cardClasses =
                'border-slate-200/70 bg-white/60 text-slate-400 opacity-75';
              letterClasses = 'border border-slate-200 bg-slate-100 text-slate-400';
            }

            return (
              <button
                key={`${quiz._id}-opt-${idx}`}
                type="button"
                disabled={isAnswered || submittingAttempt}
                onClick={() => handleSelectOption(idx)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition ${cardClasses}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${letterClasses}`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span
                  className={`flex-1 leading-snug ${
                    isCorrectOption
                      ? 'font-bold text-emerald-950'
                      : isWrongSelected
                        ? 'font-semibold text-rose-950'
                        : ''
                  }`}
                >
                  {option}
                </span>
                {isCorrectOption && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase shadow-2xs">
                    <Check className="h-3 w-3 stroke-[3]" />
                    Right
                  </span>
                )}
                {isWrongSelected && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase shadow-2xs">
                    <X className="h-3 w-3 stroke-[3]" />
                    Wrong
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Matching Green / Red Explanation Box */}
        {isAnswered && showExplanation && (
          <div
            className={`rounded-xl border p-3.5 text-xs leading-relaxed shadow-xs ${
              attemptResult.isCorrect
                ? 'border-emerald-200 bg-emerald-50/90 text-emerald-950'
                : 'border-rose-200 bg-rose-50/90 text-rose-950'
            }`}
          >
            <div
              className={`mb-1.5 flex items-center justify-between border-b pb-1.5 ${
                attemptResult.isCorrect
                  ? 'border-emerald-200/80'
                  : 'border-rose-200/80'
              }`}
            >
              <span
                className={`inline-flex items-center gap-1 font-bold tracking-wider uppercase ${
                  attemptResult.isCorrect ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {attemptResult.isCorrect ? '✓ Right Answer' : '✕ Wrong Answer'}
              </span>
              {accuracyPct !== null && (
                <span className="text-[11px] font-semibold opacity-80">
                  {accuracyPct}% accuracy ({attemptResult.attemptsCount})
                </span>
              )}
            </div>
            <p className="font-medium">
              {attemptResult.explanation ||
                'No explanation provided by the creator.'}
            </p>
          </div>
        )}
      </div>

      {/* Right-Side Vertical Action Rail (Instagram Reels / Shorts Style) */}
      <aside
        aria-label="Quiz actions"
        className=" absolute right-3 bottom-24 z-10 flex flex-col items-center gap-3.5"
      >
        {/* Like Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={handleLike}
            aria-label="Like quiz"
            className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition active:scale-95 ${
              liked
                ? 'border-rose-200 bg-rose-50 text-rose-600'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Heart
              className={`h-5 w-5 ${
                liked ? 'fill-rose-500 text-rose-500' : ''
              }`}
            />
          </button>
          <span className="text-[11px] font-semibold text-slate-600">
            {likesCount}
          </span>
        </div>

        {/* Share Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share quiz via Telegram"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <span className="text-[11px] font-semibold text-slate-600">
            Share
          </span>
        </div>

        {/* Flag Wrong Answer Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => !flagged && setShowFlagSheet(true)}
            disabled={flagged}
            title={flagged ? 'Already flagged' : 'Flag Wrong Answer'}
            aria-label="Flag wrong answer"
            className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition active:scale-95 ${
              flagged
                ? 'border-rose-200 bg-rose-50 text-rose-600'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Flag className={`h-5 w-5 ${flagged ? 'fill-rose-500/20' : ''}`} />
          </button>
          <span
            className={`text-[11px] font-semibold ${
              flagged ? 'text-rose-600' : 'text-slate-600'
            }`}
          >
            {flagged ? 'Flagged' : 'Flag'}
          </span>
        </div>
      </aside>

      {/* Bottom-Left Creator + Follow Bar (Instagram Reels Style) */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-200/80 pt-3 pr-14">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => creatorId && onOpenCreatorProfile?.(creatorId)}
            aria-label={`View ${creatorHandle} profile`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95"
          >
            {creatorInitial}
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => creatorId && onOpenCreatorProfile?.(creatorId)}
                className="truncate text-xs font-bold text-slate-900 hover:underline"
              >
                {creatorHandle}
              </button>
              {creatorId && (
                <button
                  type="button"
                  onClick={handleFollow}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold transition active:scale-95 ${
                    following
                      ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      : 'bg-slate-900 text-white shadow-xs hover:bg-slate-800'
                  }`}
                >
                  {following ? (
                    <>
                      <UserCheck className="h-3 w-3" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3 w-3" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500">
              {quiz.attemptsCount || 0} attempts
              {flagCount > 0 ? ` · ${flagCount} flags` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Flag Wrong Answer Bottom Sheet */}
      {showFlagSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Flag wrong answer"
        >
          <form
            onSubmit={handleSubmitFlag}
            className="w-full max-w-md rounded-t-2xl border-t border-slate-200 bg-white px-4 pt-4 pb-6 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Flag Wrong Answer
                </h3>
                <p className="text-[11px] text-slate-500">
                  3 flags notify the creator to fix; unedited quizzes escalate to admins.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFlagSheet(false)}
                className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {FLAG_REASONS.map((preset) => {
                const selected = flagReason === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFlagReason(preset)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition active:scale-95 ${
                      selected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              maxLength={200}
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Optional note (e.g. Option B is actually correct)..."
              className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFlagSheet(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingFlag}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-500 disabled:opacity-60"
              >
                {submittingFlag ? 'Submitting...' : 'Submit Flag'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
