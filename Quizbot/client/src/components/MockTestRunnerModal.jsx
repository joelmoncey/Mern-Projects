import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { MathText, QuizVisualBlock } from './QuizRichContent.jsx';

function formatTimer(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

export default function MockTestRunnerModal({
  mockTestId,
  onClose,
  onCompleted,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mockTest, setMockTest] = useState(null);
  const [questions, setQuestions] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState({}); // { [quizId]: 0..3 }
  const [markedMap, setMarkedMap] = useState({}); // { [quizId]: true }
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [startedAtMs, setStartedAtMs] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [result, setResult] = useState(null);
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'wrong' | 'right' | 'skipped'

  const autoSubmittedRef = useRef(false);

  const loadMockTest = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setAnswersMap({});
    setMarkedMap({});
    setCurrentIndex(0);
    setConfirmSubmit(false);
    setConfirmExit(false);
    autoSubmittedRef.current = false;

    try {
      const data = await apiRequest(`/api/mock-tests/${mockTestId}`);
      setMockTest(data.mockTest);
      setQuestions(data.questions || []);
      const durSec = (data.mockTest?.durationMinutes || 15) * 60;
      setSecondsLeft(durSec);
      setStartedAtMs(Date.now());
    } catch (err) {
      setError(err.message || 'Failed to load mock test');
    } finally {
      setLoading(false);
    }
  }, [mockTestId]);

  useEffect(() => {
    loadMockTest();
  }, [loadMockTest]);

  const submitNow = useCallback(async () => {
    if (submitting || result || !mockTest) return;
    setSubmitting(true);
    setConfirmSubmit(false);
    setError('');

    try {
      const elapsedSeconds = startedAtMs
        ? Math.round((Date.now() - startedAtMs) / 1000)
        : (mockTest.durationMinutes || 15) * 60 - secondsLeft;

      const payloadAnswers = Object.entries(answersMap).map(
        ([quizId, selectedIndex]) => ({
          quizId,
          selectedIndex,
        })
      );

      const data = await apiRequest(`/api/mock-tests/${mockTest._id}/submit`, {
        method: 'POST',
        body: {
          answers: payloadAnswers,
          timeSpentSeconds: Math.max(1, elapsedSeconds),
        },
      });

      setResult(data);
      onCompleted?.(data.seenQuestionHashes || [], data.userStats || null);
    } catch (err) {
      setError(err.message || 'Could not submit mock test');
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    result,
    mockTest,
    startedAtMs,
    secondsLeft,
    answersMap,
    onCompleted,
  ]);

  // Live 1-second countdown timer
  useEffect(() => {
    if (loading || result || !mockTest || questions.length === 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            setTimeout(() => submitNow(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, result, mockTest, questions.length, submitNow]);

  const currentQuestion = questions[currentIndex] || null;
  const answeredCount = Object.keys(answersMap).length;
  const markedCount = Object.values(markedMap).filter(Boolean).length;

  const filteredReview = useMemo(() => {
    const items = result?.review || [];
    if (reviewFilter === 'wrong') {
      return items.filter((r) => !r.isSkipped && !r.isCorrect);
    }
    if (reviewFilter === 'right') {
      return items.filter((r) => r.isCorrect);
    }
    if (reviewFilter === 'skipped') {
      return items.filter((r) => r.isSkipped);
    }
    return items;
  }, [result, reviewFilter]);

  function handleSelectOption(quizId, optIdx) {
    setAnswersMap((prev) => ({
      ...prev,
      [quizId]: optIdx,
    }));
  }

  function handleClearOption(quizId) {
    setAnswersMap((prev) => {
      const next = { ...prev };
      delete next[quizId];
      return next;
    });
  }

  function handleToggleMark(quizId) {
    setMarkedMap((prev) => ({
      ...prev,
      [quizId]: !prev[quizId],
    }));
  }

  const timerTone =
    secondsLeft <= 60
      ? 'border-rose-300 bg-rose-50 text-rose-700 animate-pulse'
      : secondsLeft <= 120
        ? 'border-amber-300 bg-amber-50 text-amber-800'
        : 'border-slate-200 bg-slate-100 text-slate-900';

  return (
    <div
      className="fixed inset-0 z-50 mx-auto flex h-dvh w-full max-w-md flex-col bg-[#F8FAFC]"
      role="dialog"
      aria-modal="true"
      aria-label="Timed Mock Test"
    >
      {/* Top Sticky Exam Bar */}
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3.5 py-2.5 shadow-2xs">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!result && questions.length > 0) {
                setConfirmExit(true);
              } else {
                onClose?.();
              }
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label="Close mock test"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-xs font-extrabold text-slate-900">
              {mockTest?.title || 'Mock Test'}
            </h2>
            {mockTest && (
              <p className="truncate text-[10px] font-semibold text-slate-500">
                {mockTest.examName} &middot; {mockTest.subjectName}
                {mockTest.negativeMarking > 0
                  ? ` · -${mockTest.negativeMarking}`
                  : ''}
              </p>
            )}
          </div>
        </div>

        {!result && !loading && questions.length > 0 && (
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-xs font-extrabold ${timerTone}`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTimer(secondsLeft)}</span>
            </span>
            <button
              type="button"
              onClick={() => setConfirmSubmit(true)}
              disabled={submitting}
              className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-extrabold text-white shadow-2xs hover:bg-emerald-500 active:scale-95 disabled:opacity-60"
            >
              Submit
            </button>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
            <p className="text-xs font-semibold">Preparing mock test...</p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
            <AlertCircle className="mx-auto mb-2 h-5 w-5 text-rose-600" />
            <p className="text-xs font-bold text-rose-800">{error}</p>
            <button
              type="button"
              onClick={loadMockTest}
              className="mt-3 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white"
            >
              Retry
            </button>
          </div>
        ) : result ? (
          /* SCORECARD + SOLUTION REVIEW VIEW */
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <Award className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">
                      Mock Test Complete!
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      Time taken: {formatTimer(result.summary.timeSpentSeconds)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-slate-900">
                    {result.summary.score}
                    <span className="text-xs font-bold text-slate-400">
                      /{result.summary.maxScore}
                    </span>
                  </p>
                  <p className="text-[10px] font-bold text-emerald-700">
                    {result.summary.accuracyPercent}% Accuracy
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 text-center">
                  <p className="text-base font-extrabold text-emerald-700">
                    {result.summary.correctCount}
                  </p>
                  <p className="text-[10px] font-bold text-emerald-800 uppercase">
                    Right
                  </p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-2.5 text-center">
                  <p className="text-base font-extrabold text-rose-700">
                    {result.summary.wrongCount}
                  </p>
                  <p className="text-[10px] font-bold text-rose-800 uppercase">
                    Wrong
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <p className="text-base font-extrabold text-slate-700">
                    {result.summary.skippedCount}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">
                    Skipped
                  </p>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={loadMockTest}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retake Test</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Filter Pills for Solution Review */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: `All (${result.review.length})` },
                { id: 'wrong', label: `Wrong (${result.summary.wrongCount})` },
                { id: 'right', label: `Right (${result.summary.correctCount})` },
                {
                  id: 'skipped',
                  label: `Skipped (${result.summary.skippedCount})`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setReviewFilter(tab.id)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                    reviewFilter === tab.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Question-by-Question Review */}
            <div className="flex flex-col gap-3">
              {filteredReview.map((item, idx) => (
                <div
                  key={item._id || idx}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-slate-500">
                      Q{result.review.indexOf(item) + 1}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                        item.isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.isSkipped
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.isCorrect
                        ? '✓ Right'
                        : item.isSkipped
                          ? 'Skipped'
                          : '✕ Wrong'}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-slate-900">
                    <MathText text={item.question} />
                  </p>
                  <QuizVisualBlock
                    visualType={item.visualType}
                    visualData={item.visualData}
                    compact
                  />

                  <div className="mt-2.5 flex flex-col gap-1.5">
                    {item.options.map((opt, oIdx) => {
                      const isRight = oIdx === item.correctIndex;
                      const isUserWrong =
                        !item.isSkipped &&
                        oIdx === item.selectedIndex &&
                        !isRight;
                      return (
                        <div
                          key={oIdx}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${
                            isRight
                              ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-950'
                              : isUserWrong
                                ? 'border-rose-400 bg-rose-50 font-semibold text-rose-950'
                                : 'border-slate-200/70 bg-slate-50/50 text-slate-500'
                          }`}
                        >
                          <span className="font-bold">
                            {String.fromCharCode(65 + oIdx)})
                          </span>
                          <span className="flex-1">
                            <MathText text={opt} />
                          </span>
                          {isRight && (
                            <span className="text-[10px] font-extrabold text-emerald-700">
                              ✓ RIGHT
                            </span>
                          )}
                          {isUserWrong && (
                            <span className="text-[10px] font-extrabold text-rose-700">
                              YOUR PICK
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {item.explanation && (
                    <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
                      <span className="font-bold text-slate-900">
                        Explanation:{' '}
                      </span>
                      <MathText text={item.explanation} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : currentQuestion ? (
          /* ACTIVE TIMED EXAM VIEW */
          <div className="flex flex-col gap-3">
            {/* Compact Question Number Palette */}
            <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xs">
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span>
                  Answered: <strong className="text-emerald-700">{answeredCount}/{questions.length}</strong>
                  {markedCount > 0 && (
                    <span className="ml-2 text-amber-700">
                      Marked: {markedCount}
                    </span>
                  )}
                </span>
                <span>Tap number to jump</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = answersMap[q._id] !== undefined;
                  const isMarked = Boolean(markedMap[q._id]);

                  let pillStyle =
                    'border-slate-200 bg-white text-slate-600 hover:bg-slate-50';
                  if (isCurrent) {
                    pillStyle =
                      'border-slate-900 bg-slate-900 text-white ring-2 ring-slate-900/20';
                  } else if (isMarked) {
                    pillStyle = 'border-amber-400 bg-amber-100 text-amber-900';
                  } else if (isAnswered) {
                    pillStyle =
                      'border-emerald-500 bg-emerald-100 text-emerald-900';
                  }

                  return (
                    <button
                      key={q._id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-extrabold transition ${pillStyle}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Question Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <div className="flex items-center gap-1.5">
                  {answersMap[currentQuestion._id] !== undefined && (
                    <button
                      type="button"
                      onClick={() => handleClearOption(currentQuestion._id)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleMark(currentQuestion._id)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition ${
                      markedMap[currentQuestion._id]
                        ? 'border-amber-400 bg-amber-100 text-amber-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Bookmark className="h-3 w-3" />
                    <span>
                      {markedMap[currentQuestion._id] ? 'Marked' : 'Review'}
                    </span>
                  </button>
                </div>
              </div>

              <h3 className="text-[16px] leading-snug font-bold text-slate-900">
                <MathText text={currentQuestion.question} />
              </h3>

              <QuizVisualBlock
                visualType={currentQuestion.visualType}
                visualData={currentQuestion.visualData}
              />
            </div>

            {/* 4 Selectable Options */}
            <div className="flex flex-col gap-2">
              {currentQuestion.options.map((opt, optIdx) => {
                const selected = answersMap[currentQuestion._id] === optIdx;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() =>
                      handleSelectOption(currentQuestion._id, optIdx)
                    }
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition active:scale-[0.99] ${
                      selected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-900 shadow-2xs hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                        selected
                          ? 'bg-white text-slate-900'
                          : 'border border-slate-200 bg-slate-100 text-slate-700'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1 leading-snug">
                      <MathText text={opt} />
                    </span>
                    {selected && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom Prev / Next Bar during active test */}
      {!loading && !result && questions.length > 0 && (
        <footer className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Prev</span>
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() =>
                setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
              }
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 active:scale-[0.99]"
            >
              <span>Save &amp; Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmSubmit(true)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-500 active:scale-[0.99]"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Finish &amp; Submit Test</span>
            </button>
          )}
        </footer>
      )}

      {/* Confirm Submit Overlay */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-5 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-extrabold text-slate-900">
              Submit Mock Test?
            </h3>
            <p className="mt-1.5 text-xs text-slate-600">
              You answered <strong>{answeredCount}</strong> of{' '}
              <strong>{questions.length}</strong> questions (
              {questions.length - answeredCount} unanswered). Time left:{' '}
              <strong>{formatTimer(secondsLeft)}</strong>.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmSubmit(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700"
              >
                Keep Solving
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={submitNow}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>{submitting ? 'Grading...' : 'Submit Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Exit Overlay */}
      {confirmExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-5 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-extrabold text-slate-900">
              Exit Mock Test?
            </h3>
            <p className="mt-1.5 text-xs text-slate-600">
              Your current progress won&apos;t be saved unless you submit.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmExit(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700"
              >
                Continue Test
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-extrabold text-white"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
