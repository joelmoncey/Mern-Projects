import { useState } from 'react';
import { AlertCircle, Check, Flag, Loader2, Save, X } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { MathText, QuizVisualBlock } from './QuizRichContent.jsx';

export default function EditQuizModal({ quiz, onClose, onSaved }) {
  const [question, setQuestion] = useState(quiz.question || '');
  const [visualType, setVisualType] = useState(quiz.visualType || 'none');
  const [visualData, setVisualData] = useState(quiz.visualData || '');
  const [options, setOptions] = useState(
    Array.isArray(quiz.options) && quiz.options.length === 4
      ? [...quiz.options]
      : ['', '', '', '']
  );
  const [correctIndex, setCorrectIndex] = useState(
    typeof quiz.correctIndex === 'number' ? quiz.correctIndex : 0
  );
  const [explanation, setExplanation] = useState(quiz.explanation || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const flags = Array.isArray(quiz.flags) ? quiz.flags : [];

  function handleOptionChange(idx, value) {
    setOptions((prev) => prev.map((opt, i) => (i === idx ? value : opt)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!question.trim()) {
      setError('Question text is required.');
      return;
    }
    if (options.some((opt) => !opt.trim())) {
      setError('All 4 options are required.');
      return;
    }

    setSaving(true);
    try {
      const data = await apiRequest(`/api/quizzes/${quiz._id}`, {
        method: 'PATCH',
        body: {
          question: question.trim(),
          visualType: visualData.trim() ? visualType : 'none',
          visualData: visualType === 'none' ? '' : visualData.trim(),
          options: options.map((opt) => opt.trim()),
          correctIndex: Number(correctIndex),
          explanation: explanation.trim(),
        },
      });
      onSaved?.(data.quiz);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to update quiz');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Edit Quiz"
    >
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white px-4 pt-4 pb-6 shadow-xl sm:rounded-2xl sm:border">
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">
              Edit &amp; Resolve Quiz
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              #{quiz.hashtag?.tag || `${quiz.examName}_${quiz.subjectName}`} &middot; Saving clears active flags &amp; escalations.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Flag reasons summary */}
        {flags.length > 0 && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/70 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-rose-700 uppercase">
              <Flag className="h-3.5 w-3.5" />
              <span>User Flags ({flags.length})</span>
            </div>
            <ul className="space-y-1 text-xs text-rose-900">
              {flags.slice(0, 6).map((f, idx) => (
                <li key={idx} className="truncate">
                  &bull; {f.reason || 'Flagged as wrong / mistaken'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Question (supports $...$ Maths)
              </label>
              <span className="text-[11px] text-slate-400">
                {question.length}/600
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={600}
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
            />
          </div>

          {/* Optional Visual Attachment (Box / Table / SVG / Image) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold text-slate-600 uppercase">
                Visual / Box / Drawing (optional)
              </label>
              <select
                value={visualType}
                onChange={(e) => setVisualType(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-800 outline-none"
              >
                <option value="none">None</option>
                <option value="box">Grid Box (|)</option>
                <option value="table">Table (|)</option>
                <option value="svg">SVG Drawing</option>
                <option value="image">Image URL</option>
              </select>
            </div>
            {visualType !== 'none' && (
              <>
                <textarea
                  rows={3}
                  value={visualData}
                  onChange={(e) => setVisualData(e.target.value)}
                  placeholder={
                    visualType === 'svg'
                      ? '<svg viewBox="0 0 180 120">...</svg>'
                      : visualType === 'image'
                        ? 'https://example.com/diagram.png'
                        : '4 | 9 | 2\n3 | 5 | 7\n8 | 1 | ?'
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-[11px] text-slate-900 outline-none focus:border-slate-900"
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
            {question.includes('$') && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900">
                <span className="mr-1.5 text-[10px] font-bold text-slate-400 uppercase">
                  Preview:
                </span>
                <MathText text={question} />
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Options &amp; Right Answer
              </label>
              <span className="text-[11px] font-bold text-emerald-700">
                ✓ Right: Option {String.fromCharCode(65 + correctIndex)}
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
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold transition active:scale-95 ${
                        isCorrect
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {letter}
                    </button>
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      className={`flex-1 rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 outline-none ${
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-50/30 font-semibold'
                          : 'border-slate-200 focus:border-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setCorrectIndex(idx)}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition active:scale-95 ${
                        isCorrect
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
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

            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((idx) => {
                const letter = String.fromCharCode(65 + idx);
                const active = correctIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCorrectIndex(idx)}
                    className={`rounded-lg border py-1.5 text-xs font-bold transition active:scale-95 ${
                      active
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {active ? `✓ Option ${letter}` : `Option ${letter}`}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Explanation
              </label>
              <span className="text-[11px] text-slate-400">
                {explanation.length}/800
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={800}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
            />
          </div>

          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
