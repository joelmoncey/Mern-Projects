import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { parseBulkQuizzesText } from '../lib/bulkQuizParser.js';
import { extractLanguagesArray } from '../lib/sscTaxonomyPreset.js';
import { MathText, QuizVisualBlock } from './QuizRichContent.jsx';

export default function EditMockTestModal({ mockTestId, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Metadata fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [negativeMarking, setNegativeMarking] = useState(0);
  const [hashtagId, setHashtagId] = useState('');
  const [language, setLanguage] = useState('English');

  // Official tags list so creator can also re-assign exam tag/language if desired
  const [allTags, setAllTags] = useState([]);

  // Editable ordered questions array
  const [questions, setQuestions] = useState([]);
  const [expandedIdx, setExpandedIdx] = useState(0);

  // Append from .txt drawer
  const [showAppendTxt, setShowAppendTxt] = useState(false);
  const [appendTxt, setAppendTxt] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([
      apiRequest(`/api/mock-tests/${mockTestId}/manage`),
      apiRequest('/api/hashtags').catch(() => ({ hashtags: [] })),
    ])
      .then(([mockData, tagsData]) => {
        if (cancelled) return;
        const mt = mockData.mockTest || {};
        setTitle(mt.title || '');
        setDescription(mt.description || '');
        setDurationMinutes(mt.durationMinutes || 15);
        setNegativeMarking(mt.negativeMarking || 0);
        setHashtagId(String(mt.hashtagId || mt.hashtag?._id || ''));
        setLanguage(mt.language || 'English');
        setQuestions(
          (mockData.questions || []).map((q) => ({
            _id: q._id,
            question: q.question || '',
            visualType: q.visualType || 'none',
            visualData: q.visualData || '',
            options:
              Array.isArray(q.options) && q.options.length === 4
                ? [...q.options]
                : ['', '', '', ''],
            correctIndex:
              typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            explanation: q.explanation || '',
          }))
        );
        setAllTags(tagsData.hashtags || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load mock test for editing');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mockTestId]);

  const activeTagDoc = useMemo(
    () => allTags.find((t) => String(t._id) === String(hashtagId)) || null,
    [allTags, hashtagId]
  );

  const availableLanguages = useMemo(() => {
    if (!activeTagDoc) return [language || 'English'];
    const langs = extractLanguagesArray(activeTagDoc);
    return langs.length > 0 ? langs : ['English'];
  }, [activeTagDoc, language]);

  useEffect(() => {
    if (
      availableLanguages.length > 0 &&
      !availableLanguages.includes(language)
    ) {
      setLanguage(availableLanguages[0]);
    }
  }, [availableLanguages, language]);

  const appendParsed = useMemo(
    () => parseBulkQuizzesText(appendTxt),
    [appendTxt]
  );

  function updateQuestion(idx, patch) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q))
    );
  }

  function updateQuestionOption(qIdx, optIdx, value) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const nextOpts = [...q.options];
        nextOpts[optIdx] = value;
        return { ...q, options: nextOpts };
      })
    );
  }

  function moveQuestion(idx, direction) {
    const target = idx + direction;
    if (target < 0 || target >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setExpandedIdx(target);
  }

  function removeQuestion(idx) {
    if (questions.length <= 1) {
      setError('A mock test must contain at least 1 question.');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    setExpandedIdx((prev) => (prev === idx ? -1 : prev > idx ? prev - 1 : prev));
  }

  function addBlankQuestion() {
    if (questions.length >= 200) {
      setError('Maximum 200 questions per mock test.');
      return;
    }
    const nextIdx = questions.length;
    setQuestions((prev) => [
      ...prev,
      {
        question: '',
        visualType: 'none',
        visualData: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: '',
      },
    ]);
    setExpandedIdx(nextIdx);
  }

  function handleAppendFromTxt() {
    if (appendParsed.quizzes.length === 0) return;
    const spaceLeft = Math.max(0, 200 - questions.length);
    const toAdd = appendParsed.quizzes.slice(0, spaceLeft).map((q) => ({
      question: q.question,
      visualType: q.visualType || 'none',
      visualData: q.visualData || '',
      options: [...q.options],
      correctIndex: q.correctIndex,
      explanation: q.explanation || '',
    }));
    setQuestions((prev) => [...prev, ...toAdd]);
    setAppendTxt('');
    setShowAppendTxt(false);
  }

  function handleUploadAppendFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      setAppendTxt((prev) => (prev.trim() ? `${prev}\n\n${content}` : content));
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');

    if (!title.trim() || title.trim().length < 3) {
      setError('Mock test title must be at least 3 characters.');
      return;
    }
    if (questions.length === 0) {
      setError('Add at least 1 question before saving.');
      return;
    }

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      if (!q.question.trim()) {
        setExpandedIdx(i);
        setError(`Question #${i + 1} text is required.`);
        return;
      }
      if (q.options.some((o) => !String(o || '').trim())) {
        setExpandedIdx(i);
        setError(`Question #${i + 1}: Please fill in all 4 options (A–D).`);
        return;
      }
    }

    setSaving(true);
    try {
      const data = await apiRequest(`/api/mock-tests/${mockTestId}`, {
        method: 'PATCH',
        body: {
          title: title.trim(),
          description: description.trim(),
          durationMinutes: Number(durationMinutes),
          negativeMarking: Number(negativeMarking) || 0,
          ...(hashtagId ? { hashtagId } : {}),
          language,
          questions: questions.map((q) => ({
            ...(q._id ? { _id: q._id } : {}),
            question: q.question.trim(),
            visualType: q.visualData?.trim() ? q.visualType : 'none',
            visualData: q.visualType === 'none' ? '' : (q.visualData || '').trim(),
            options: q.options.map((o) => String(o).trim()),
            correctIndex: Number(q.correctIndex),
            explanation: (q.explanation || '').trim(),
          })),
        },
      });
      onSaved?.(data.mockTest);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to save mock test changes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 mx-auto flex h-dvh w-full max-w-md flex-col bg-[#F8FAFC]"
      role="dialog"
      aria-modal="true"
      aria-label="Edit Mock Test"
    >
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 shadow-2xs">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-extrabold text-slate-900">
            Edit Mock Test
          </h2>
          <p className="text-[11px] text-slate-500">
            Edit title, timer, tag &amp; all {questions.length} question(s)
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Close mock test editor"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Body */}
      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-slate-900" />
          <p className="text-xs font-medium">Loading mock test questions...</p>
        </div>
      ) : (
        <form
          onSubmit={handleSave}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24">
            {error && (
              <div
                role="alert"
                className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Mock Test Settings */}
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <p className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                1. Mock Test Settings
              </p>

              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                    <Clock className="h-3 w-3" />
                    Timer (Min) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={240}
                    required
                    value={durationMinutes}
                    onChange={(e) =>
                      setDurationMinutes(
                        Math.max(1, Math.min(240, Number(e.target.value) || 1))
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase">
                    Negative Marking
                  </label>
                  <select
                    value={negativeMarking}
                    onChange={(e) => setNegativeMarking(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  >
                    <option value={0}>None (0)</option>
                    <option value={0.25}>-0.25</option>
                    <option value={0.33}>-0.33</option>
                    <option value={0.5}>-0.50</option>
                  </select>
                </div>
              </div>

              {allTags.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase">
                      Exam Tag
                    </label>
                    <select
                      value={hashtagId}
                      onChange={(e) => setHashtagId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    >
                      {allTags.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.examName} › {t.subjectName}
                          {t.subTopicName ? ` › ${t.subTopicName}` : ''} (#
                          {t.tag})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase">
                      Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    >
                      {availableLanguages.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instructions or notes..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>
            </div>

            {/* Section 2: Questions Header + Add Controls */}
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                2. Questions ({questions.length})
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAppendTxt((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-800 hover:bg-indigo-100"
                >
                  <Upload className="h-3 w-3" />
                  <span>+ Append .txt</span>
                </button>
                <button
                  type="button"
                  onClick={addBlankQuestion}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Q</span>
                </button>
              </div>
            </div>

            {/* Optional Append from .txt Drawer */}
            {showAppendTxt && (
              <div className="mb-3 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-900">
                    Append Questions from .txt ({appendParsed.quizzes.length} valid)
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-800 shadow-2xs"
                  >
                    <Upload className="h-3 w-3" />
                    Choose .txt
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.json"
                    onChange={handleUploadAppendFile}
                    className="hidden"
                  />
                </div>
                <textarea
                  rows={5}
                  value={appendTxt}
                  onChange={(e) => setAppendTxt(e.target.value)}
                  placeholder="Paste Q: / A) / B) / C) / D) / ANS: / EXP: blocks to append..."
                  className="w-full rounded-xl border border-indigo-200 bg-white p-2.5 font-mono text-[11px] text-slate-900 outline-none focus:border-slate-900"
                />
                {appendParsed.errors.length > 0 && (
                  <p className="mt-1 text-[10px] font-semibold text-rose-700">
                    {appendParsed.errors[0].reason}
                  </p>
                )}
                <div className="mt-2 flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAppendTxt(false);
                      setAppendTxt('');
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={
                      appendParsed.quizzes.length === 0 ||
                      appendParsed.errors.length > 0
                    }
                    onClick={handleAppendFromTxt}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                  >
                    Append {appendParsed.quizzes.length} Question(s)
                  </button>
                </div>
              </div>
            )}

            {/* Accordion List of All Questions */}
            <div className="flex flex-col gap-2">
              {questions.map((q, idx) => {
                const isOpen = expandedIdx === idx;
                return (
                  <div
                    key={q._id || `new-${idx}`}
                    className="rounded-2xl border border-slate-200 bg-white shadow-2xs"
                  >
                    {/* Compact Question Row Header */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => setExpandedIdx(isOpen ? -1 : idx)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-extrabold text-white">
                          {idx + 1}
                        </span>
                        <span className="truncate text-xs font-bold text-slate-900">
                          {q.question.trim() || '(New blank question)'}
                        </span>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          ✓ {String.fromCharCode(65 + q.correctIndex)}
                        </span>
                      </button>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveQuestion(idx, -1)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                          title="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === questions.length - 1}
                          onClick={() => moveQuestion(idx, 1)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(idx)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Remove question from mock test"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedIdx(isOpen ? -1 : idx)}
                          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                        >
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Question Editor */}
                    {isOpen && (
                      <div className="flex flex-col gap-2.5 border-t border-slate-100 px-3 pt-2.5 pb-3.5">
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              Question (supports $...$ Maths)
                            </label>
                            <span className="text-[10px] text-slate-400">
                              {q.question.length}/3000
                            </span>
                          </div>
                          <textarea
                            rows={4}
                            maxLength={3000}
                            value={q.question}
                            onChange={(e) =>
                              updateQuestion(idx, { question: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                          />
                          {q.question.includes('$') && (
                            <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900">
                              <MathText text={q.question} />
                            </div>
                          )}
                        </div>

                        {/* Visual Selector */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              Visual (Box / Table / SVG / Image)
                            </span>
                            <select
                              value={q.visualType}
                              onChange={(e) =>
                                updateQuestion(idx, {
                                  visualType: e.target.value,
                                  ...(e.target.value === 'none'
                                    ? { visualData: '' }
                                    : {}),
                                })
                              }
                              className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-800 outline-none"
                            >
                              <option value="none">None</option>
                              <option value="box">Grid Box</option>
                              <option value="table">Table</option>
                              <option value="svg">SVG Drawing</option>
                              <option value="image">Image URL</option>
                            </select>
                          </div>
                          {q.visualType !== 'none' && (
                            <>
                              <textarea
                                rows={2}
                                value={q.visualData}
                                onChange={(e) =>
                                  updateQuestion(idx, {
                                    visualData: e.target.value,
                                  })
                                }
                                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono text-[11px] text-slate-900 outline-none"
                              />
                              {q.visualData.trim() && (
                                <QuizVisualBlock
                                  visualType={q.visualType}
                                  visualData={q.visualData}
                                  compact
                                />
                              )}
                            </>
                          )}
                        </div>

                        {/* 4 Options + Right Answer Selector */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Options (Tap letter to set Right Answer)
                          </label>
                          {q.options.map((opt, oIdx) => {
                            const isRight = q.correctIndex === oIdx;
                            const letter = String.fromCharCode(65 + oIdx);
                            return (
                              <div key={oIdx} className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuestion(idx, { correctIndex: oIdx })
                                  }
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-extrabold transition ${
                                    isRight
                                      ? 'border-emerald-600 bg-emerald-600 text-white'
                                      : 'border-slate-200 bg-white text-slate-600'
                                  }`}
                                >
                                  {isRight ? (
                                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                                  ) : (
                                    letter
                                  )}
                                </button>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) =>
                                    updateQuestionOption(idx, oIdx, e.target.value)
                                  }
                                  placeholder={`Option ${letter}`}
                                  className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs text-slate-900 outline-none ${
                                    isRight
                                      ? 'border-emerald-500 bg-emerald-50/40 font-semibold'
                                      : 'border-slate-200 bg-white focus:border-slate-900'
                                  }`}
                                />
                              </div>
                            );
                          })}
                        </div>

                        <div>
                          <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase">
                            Explanation (Optional)
                          </label>
                          <textarea
                            rows={2}
                            maxLength={2000}
                            value={q.explanation}
                            onChange={(e) =>
                              updateQuestion(idx, {
                                explanation: e.target.value,
                              })
                            }
                            placeholder="Explain why the answer is right..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Save Footer */}
          <footer className="flex items-center gap-2 border-t border-slate-200 bg-white px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{saving ? 'Saving Mock Test...' : 'Save All Changes'}</span>
            </button>
          </footer>
        </form>
      )}
    </div>
  );
}
