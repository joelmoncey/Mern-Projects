import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronRight,
  Globe,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { formatHierarchyPath } from '../pages/CreateQuizView.jsx';

/**
 * Easy, flexible Exam + Multi-Language + Optional Sub-Exam/Subject/Topic filter modal:
 * - Exam: Required (must pick 1 exam)
 * - Languages: Select 1 or MORE languages (multi-select)
 * - Sub Exam, Subject, Sub Subject, Sub Topic: All optional (default to "All" so
 *   selecting an Exam + Language(s) immediately gives all questions in that exam,
 *   and users can narrow down to a specific Subject / Sub Topic only if needed).
 */
export default function ExamTopicPickerModal({
  exams = [],
  groupedByExam = {},
  currentFilter,
  onApply,
  onClose = null,
  isInitialSetup = false,
}) {
  const initialExam =
    currentFilter?.examName && exams.includes(currentFilter.examName)
      ? currentFilter.examName
      : exams[0] || '';

  const [examName, setExamName] = useState(initialExam);
  const [subExamName, setSubExamName] = useState(
    currentFilter?.subExamName || 'ALL'
  );
  const [selectedLanguages, setSelectedLanguages] = useState(() => {
    if (
      Array.isArray(currentFilter?.languages) &&
      currentFilter.languages.length > 0
    ) {
      return currentFilter.languages;
    }
    if (currentFilter?.language) {
      return currentFilter.language
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);
    }
    return [];
  });
  const [subjectName, setSubjectName] = useState(
    currentFilter?.subjectName || 'ALL'
  );
  const [subSubjectName, setSubSubjectName] = useState(
    currentFilter?.subSubjectName || 'ALL'
  );
  const [hashtagId, setHashtagId] = useState(
    currentFilter?.hashtagId || 'ALL'
  );

  useEffect(() => {
    if (!examName && exams.length > 0) {
      setExamName(exams[0]);
    }
  }, [examName, exams]);

  const examTags = useMemo(
    () => groupedByExam[examName] || [],
    [groupedByExam, examName]
  );

  const subExamChoices = useMemo(
    () =>
      Array.from(
        new Set(
          examTags.map((t) => (t.subExamName || '').trim()).filter(Boolean)
        )
      ),
    [examTags]
  );

  const filteredBySubExam = useMemo(() => {
    if (!subExamName || subExamName === 'ALL') return examTags;
    return examTags.filter((t) => (t.subExamName || '').trim() === subExamName);
  }, [examTags, subExamName]);

  // Allowed languages configured by admin for the chosen Exam / Sub Exam
  const languageChoices = useMemo(() => {
    const langs = filteredBySubExam.flatMap((t) =>
      Array.isArray(t.languages) && t.languages.length > 0
        ? t.languages
        : ['English']
    );
    const unique = Array.from(
      new Set(langs.map((l) => l.trim()).filter(Boolean))
    );
    return unique.length > 0 ? unique : ['English'];
  }, [filteredBySubExam]);

  // Ensure at least 1 valid language from languageChoices is selected
  useEffect(() => {
    const validSelected = selectedLanguages.filter((l) =>
      languageChoices.includes(l)
    );
    if (validSelected.length === 0 && languageChoices.length > 0) {
      // Default to all available languages for this exam so user never misses questions
      setSelectedLanguages([...languageChoices]);
    } else if (validSelected.length !== selectedLanguages.length) {
      setSelectedLanguages(validSelected);
    }
  }, [languageChoices, selectedLanguages]);

  const subjectChoices = useMemo(
    () =>
      Array.from(
        new Set(
          filteredBySubExam
            .map((t) => (t.subjectName || '').trim())
            .filter(Boolean)
        )
      ),
    [filteredBySubExam]
  );

  useEffect(() => {
    if (
      subjectName !== 'ALL' &&
      subjectChoices.length > 0 &&
      !subjectChoices.includes(subjectName)
    ) {
      setSubjectName('ALL');
    }
  }, [subjectChoices, subjectName]);

  const filteredBySubject = useMemo(() => {
    if (!subjectName || subjectName === 'ALL') return filteredBySubExam;
    return filteredBySubExam.filter(
      (t) => (t.subjectName || '').trim() === subjectName
    );
  }, [filteredBySubExam, subjectName]);

  const subSubjectChoices = useMemo(
    () =>
      Array.from(
        new Set(
          filteredBySubject
            .map((t) => (t.subSubjectName || '').trim())
            .filter(Boolean)
        )
      ),
    [filteredBySubject]
  );

  const filteredTopicTags = useMemo(() => {
    if (!subSubjectName || subSubjectName === 'ALL') return filteredBySubject;
    return filteredBySubject.filter(
      (t) => (t.subSubjectName || '').trim() === subSubjectName
    );
  }, [filteredBySubject, subSubjectName]);

  const selectedTagDoc = useMemo(() => {
    if (hashtagId && hashtagId !== 'ALL') {
      return filteredTopicTags.find((t) => t._id === hashtagId) || null;
    }
    return null;
  }, [filteredTopicTags, hashtagId]);

  function handleExamSelect(nextExam) {
    setExamName(nextExam);
    setSubExamName('ALL');
    const nextTags = groupedByExam[nextExam] || [];
    const nextLangs = Array.from(
      new Set(
        nextTags.flatMap((t) =>
          Array.isArray(t.languages) && t.languages.length > 0
            ? t.languages
            : ['English']
        )
      )
    );
    setSelectedLanguages(nextLangs.length > 0 ? nextLangs : ['English']);
    setSubjectName('ALL');
    setSubSubjectName('ALL');
    setHashtagId('ALL');
  }

  function handleToggleLanguage(lang) {
    setSelectedLanguages((prev) => {
      const exists = prev.includes(lang);
      if (exists) {
        // Keep at least 1 language selected
        if (prev.length <= 1) return prev;
        return prev.filter((l) => l !== lang);
      }
      return [...prev, lang];
    });
  }

  function handleSelectAllLanguages() {
    setSelectedLanguages([...languageChoices]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!examName) return;

    const finalLangs =
      selectedLanguages.length > 0 ? selectedLanguages : [languageChoices[0] || 'English'];

    const chosenTag = selectedTagDoc;

    const pathParts = chosenTag
      ? [formatHierarchyPath(chosenTag)]
      : [
          examName,
          subExamName !== 'ALL' ? subExamName : '',
          subjectName !== 'ALL' ? subjectName : 'All Subjects',
          subSubjectName !== 'ALL' ? subSubjectName : '',
        ].filter(Boolean);

    const langLabel =
      finalLangs.length === languageChoices.length && languageChoices.length > 1
        ? 'All Langs'
        : finalLangs.join(' + ');

    onApply({
      examName,
      subExamName: subExamName === 'ALL' ? '' : subExamName,
      languages: finalLangs,
      language: finalLangs.join(','),
      subjectName: subjectName === 'ALL' ? '' : subjectName,
      subSubjectName: subSubjectName === 'ALL' ? '' : subSubjectName,
      subTopicName: chosenTag?.subTopicName || '',
      hashtagId: chosenTag?._id || '',
      tag: chosenTag?.tag || '',
      label: `${pathParts.join(' › ')} (${langLabel})`,
    });
  }

  const allLangsSelected =
    languageChoices.length > 1 &&
    selectedLanguages.length === languageChoices.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 backdrop-blur-xs sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Select Exam, Language and Subject"
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white px-4 pt-4 pb-6 shadow-xl sm:rounded-2xl sm:border"
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                {isInitialSetup
                  ? 'Choose Your Exam & Language'
                  : 'Filter Exam, Language & Topics'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Exam &amp; Language required &middot; Subject &amp; Topic optional
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close selector"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          {/* 1. Exam Pills (Required) */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              1. Exam (Required)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {exams.map((exam) => {
                const active = exam === examName;
                return (
                  <button
                    key={exam}
                    type="button"
                    onClick={() => handleExamSelect(exam)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-wide uppercase transition active:scale-95 ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    {active && <Check className="h-3 w-3 stroke-[3]" />}
                    <span>{exam}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Language / Medium (Multi-Select: 1 or more languages) */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <Globe className="h-3 w-3" />
                <span>2. Language (Select 1 or more)</span>
              </label>
              {languageChoices.length > 1 && !allLangsSelected && (
                <button
                  type="button"
                  onClick={handleSelectAllLanguages}
                  className="text-[11px] font-bold text-slate-700 underline hover:text-slate-900"
                >
                  Select All
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {languageChoices.map((lang) => {
                const active = selectedLanguages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleToggleLanguage(lang)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                      active
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    {active && <Check className="h-3 w-3 stroke-[3]" />}
                    <span>{lang}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Sub Exam (Optional — defaults to All Sub Exams) */}
          {subExamChoices.length > 0 && (
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                3. Sub Exam (Optional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSubExamName('ALL');
                    setHashtagId('ALL');
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                    subExamName === 'ALL'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                  }`}
                >
                  All Sub Exams
                </button>
                {subExamChoices.map((se) => {
                  const active = subExamName === se;
                  return (
                    <button
                      key={se}
                      type="button"
                      onClick={() => {
                        setSubExamName(se);
                        setHashtagId('ALL');
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                      }`}
                    >
                      {se}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Subject Pills (Optional — defaults to All Subjects) */}
          {subjectChoices.length > 0 && (
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                4. Subject (Optional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSubjectName('ALL');
                    setSubSubjectName('ALL');
                    setHashtagId('ALL');
                  }}
                  className={`inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                    subjectName === 'ALL'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  {subjectName === 'ALL' && (
                    <Check className="h-3 w-3 stroke-[3]" />
                  )}
                  <span>All Subjects</span>
                </button>
                {subjectChoices.map((subj) => {
                  const active = subjectName === subj;
                  return (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => {
                        setSubjectName(subj);
                        setSubSubjectName('ALL');
                        setHashtagId('ALL');
                      }}
                      className={`inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      {active && <Check className="h-3 w-3 stroke-[3]" />}
                      <span>{subj}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Sub Subject & 6. Sub Topic (Optional drill-down when a Subject is chosen) */}
          {subjectName !== 'ALL' &&
            (subSubjectChoices.length > 0 || filteredTopicTags.length > 1) && (
              <div className="grid grid-cols-2 gap-2">
                {subSubjectChoices.length > 0 && (
                  <div>
                    <label className="mb-1 block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      5. Sub Subject (Optional)
                    </label>
                    <select
                      value={subSubjectName}
                      onChange={(e) => {
                        setSubSubjectName(e.target.value);
                        setHashtagId('ALL');
                      }}
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
                )}

                {filteredTopicTags.length > 1 && (
                  <div
                    className={
                      subSubjectChoices.length === 0 ? 'col-span-2' : ''
                    }
                  >
                    <label className="mb-1 block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      6. Sub Topic (Optional)
                    </label>
                    <select
                      value={hashtagId}
                      onChange={(e) => setHashtagId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    >
                      <option value="ALL">All Topics in {subjectName}</option>
                      {filteredTopicTags.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.subTopicName || t.subSubjectName || t.subjectName} (#{t.tag})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

          {/* Current Selection Summary */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-1 font-bold text-slate-900">
              <span>Showing:</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {selectedTagDoc
                  ? formatHierarchyPath(selectedTagDoc)
                  : [
                      examName,
                      subExamName !== 'ALL' ? subExamName : '',
                      subjectName !== 'ALL' ? subjectName : 'All Subjects',
                      subSubjectName !== 'ALL' ? subSubjectName : '',
                    ]
                      .filter(Boolean)
                      .join(' › ')}{' '}
                ({selectedLanguages.join(' + ')})
              </span>
            </div>
            {selectedTagDoc?.syllabusScope && (
              <p className="mt-1 flex items-start gap-1.5 text-[11px] text-slate-600">
                <BookOpen className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                <span>{selectedTagDoc.syllabusScope}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            className="mt-1 w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
          >
            {isInitialSetup ? 'Start Scrolling Quizzes' : 'Apply Filter'}
          </button>
        </div>
      </form>
    </div>
  );
}
