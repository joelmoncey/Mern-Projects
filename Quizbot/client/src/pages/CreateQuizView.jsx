import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Loader2,
  Lock,
  MessageCircle,
  Send,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { openAdminContactLink } from '../lib/telegram.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function CreateQuizView({ onCreated, onBackToFeed }) {
  const { user, isOfflinePreview } = useAuth();
  const canCreate =
    user?.role === 'admin' || Boolean(user?.canCreateQuiz);

  const [groupedByExam, setGroupedByExam] = useState({});
  const [exams, setExams] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);

  const [selectedExam, setSelectedExam] = useState('');
  const [selectedHashtagId, setSelectedHashtagId] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
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
            subjectName: 'History',
            tag: 'UPSC_HISTORY',
            syllabusScope:
              'Ancient, Medieval, and Modern Indian History & Freedom Struggle.',
          },
        ],
        'SSC CGL': [
          {
            _id: 'preview-ssc-eng',
            examName: 'SSC CGL',
            subjectName: 'English',
            tag: 'SSC_ENGLISH',
            syllabusScope:
              'Reading Comprehension, Idioms, Error Spotting, Synonyms & Antonyms.',
          },
        ],
      };
      setGroupedByExam(sample);
      setExams(['UPSC', 'SSC CGL']);
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
          setError(err.message || 'Failed to load official hashtags');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTags(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canCreate, isOfflinePreview]);

  const subjectTags = useMemo(
    () => groupedByExam[selectedExam] || [],
    [groupedByExam, selectedExam]
  );

  const activeHashtag = useMemo(
    () => subjectTags.find((t) => t._id === selectedHashtagId) || null,
    [subjectTags, selectedHashtagId]
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
      setError('Please select an official exam subject hashtag.');
      return;
    }
    if (!question.trim()) {
      setError('Please enter your quiz question.');
      return;
    }
    if (options.some((opt) => !opt.trim())) {
      setError('Please fill in all 4 answer options.');
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
          correctIndex,
          explanation: explanation.trim(),
        },
      });

      setQuestion('');
      setOptions(['', '', '', '']);
      setCorrectIndex(0);
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
            Select an official exam hashtag and craft a syllabus-aligned MCQ.
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
          No active exam hashtags exist yet. Add official exam subjects in the
          Admin tab first.
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

          {/* Exam Selector */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Exam
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
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {exam}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Official Subject Hashtag Selector */}
          <div>
            <label
              htmlFor="hashtag-select"
              className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase"
            >
              Official Subject Hashtag
            </label>
            <select
              id="hashtag-select"
              value={selectedHashtagId}
              onChange={(e) => setSelectedHashtagId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-2xs outline-none focus:border-slate-900"
            >
              {subjectTags.map((tag) => (
                <option key={tag._id} value={tag._id}>
                  #{tag.tag} — {tag.subjectName}
                </option>
              ))}
            </select>

            {activeHashtag?.syllabusScope && (
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs leading-relaxed text-slate-700 shadow-2xs">
                <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                <div>
                  <span className="font-bold text-slate-900">
                    Syllabus Scope:{' '}
                  </span>
                  {activeHashtag.syllabusScope}
                </div>
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

          {/* 4 Answer Options */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Options (tap letter to mark right answer)
            </label>
            <div className="flex flex-col gap-2">
              {options.map((opt, idx) => {
                const isCorrect = correctIndex === idx;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectIndex(idx)}
                      title="Mark as right option"
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-bold transition active:scale-95 ${
                        isCorrect
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </button>
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className={`flex-1 rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 outline-none ${
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-50/30 focus:border-emerald-600'
                          : 'border-slate-200 focus:border-slate-900'
                      }`}
                    />
                  </div>
                );
              })}
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
