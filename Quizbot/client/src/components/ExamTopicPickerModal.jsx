import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronRight,
  Globe,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  extractLanguagesArray,
  extractSubExamsArray,
} from '../lib/sscTaxonomyPreset.js';

/**
 * Refactored User Filter Modal (Filter Exam, Language & Topics):
 * 1. EXAM (REQUIRED): Single-select chip.
 * 2. LANGUAGE (SELECT 1 OR MORE): Multi-select chips + Select All toggle.
 * 3. SUB EXAM (OPTIONAL): Unique, deduplicated sub-exam chips derived from subExams[] (single or multi-select).
 * 4. SUBJECT (OPTIONAL): Dynamically filtered by Exam + Language + Sub Exam
 *    (e.g., Stenographer hides Quantitative Aptitude; Hindi-only hides English Language; English-only hides General Hindi).
 * 5. SUB SUBJECT & 6. SUB TOPIC (OPTIONAL / EXPANDABLE CHIPS): Revealed once a specific Subject is selected.
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

  // Selected sub-exams array (empty array means "All Sub Exams")
  const [selectedSubExams, setSelectedSubExams] = useState(() => {
    if (
      Array.isArray(currentFilter?.subExams) &&
      currentFilter.subExams.length > 0
    ) {
      return currentFilter.subExams;
    }
    if (
      currentFilter?.subExamName &&
      currentFilter.subExamName !== 'ALL'
    ) {
      return String(currentFilter.subExamName)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  });

  // Selected languages array (at least 1 required)
  const [selectedLanguages, setSelectedLanguages] = useState(() => {
    if (
      Array.isArray(currentFilter?.languages) &&
      currentFilter.languages.length > 0
    ) {
      return currentFilter.languages;
    }
    if (currentFilter?.language) {
      return String(currentFilter.language)
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
  const [subTopicName, setSubTopicName] = useState(
    currentFilter?.subTopicName || 'ALL'
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

  // All languages configured across this Exam
  const languageChoices = useMemo(() => {
    const langs = examTags.flatMap((t) => extractLanguagesArray(t));
    const unique = Array.from(new Set(langs));
    return unique.length > 0 ? unique : ['English'];
  }, [examTags]);

  // Keep selectedLanguages valid and non-empty
  useEffect(() => {
    const valid = selectedLanguages.filter((l) => languageChoices.includes(l));
    if (valid.length === 0 && languageChoices.length > 0) {
      setSelectedLanguages([...languageChoices]);
    } else if (valid.length !== selectedLanguages.length) {
      setSelectedLanguages(valid);
    }
  }, [languageChoices, selectedLanguages]);

  // Unique, deduplicated Sub Exam chips derived from subExams arrays (never "CGL,CHSL")
  const subExamChoices = useMemo(() => {
    const allSubExams = examTags.flatMap((t) => extractSubExamsArray(t));
    return Array.from(new Set(allSubExams));
  }, [examTags]);

  // Keep selectedSubExams valid when exam changes
  useEffect(() => {
    const valid = selectedSubExams.filter((se) => subExamChoices.includes(se));
    if (valid.length !== selectedSubExams.length) {
      setSelectedSubExams(valid);
    }
  }, [subExamChoices, selectedSubExams]);

  // Smart filter topics by Exam + Selected Language(s) + Selected Sub Exam(s)
  const topicsMatchingLangAndSubExam = useMemo(() => {
    const activeLangSet = new Set(
      selectedLanguages.map((l) => l.toLowerCase())
    );
    const activeSubExamSet = new Set(
      selectedSubExams.map((se) => se.toLowerCase())
    );

    return examTags.filter((t) => {
      // 1. Language compatibility check
      const topicLangs = extractLanguagesArray(t).map((l) => l.toLowerCase());
      const hasMatchingLang =
        activeLangSet.size === 0 ||
        topicLangs.some((l) => activeLangSet.has(l));
      if (!hasMatchingLang) return false;

      // 2. Sub-Exam compatibility check
      if (activeSubExamSet.size === 0) return true;
      const topicSubExams = extractSubExamsArray(t).map((se) =>
        se.toLowerCase()
      );
      // Include topics that either belong to the selected sub-exam(s) or are global to the exam
      return (
        topicSubExams.length === 0 ||
        topicSubExams.some((se) => activeSubExamSet.has(se))
      );
    });
  }, [examTags, selectedLanguages, selectedSubExams]);

  // 4. SUBJECT choices dynamically filtered by Exam + Language + Sub Exam
  const subjectChoices = useMemo(() => {
    return Array.from(
      new Set(
        topicsMatchingLangAndSubExam
          .map((t) => (t.subjectName || '').trim())
          .filter(Boolean)
      )
    );
  }, [topicsMatchingLangAndSubExam]);

  // If the previously selected subject is no longer compatible (e.g. Stenographer selected while Quantitative Aptitude was active, or Hindi-only selected while English Language was active), reset to ALL
  useEffect(() => {
    if (
      subjectName !== 'ALL' &&
      !subjectChoices.includes(subjectName)
    ) {
      setSubjectName('ALL');
      setSubSubjectName('ALL');
      setSubTopicName('ALL');
    }
  }, [subjectChoices, subjectName]);

  const topicsMatchingSubject = useMemo(() => {
    if (!subjectName || subjectName === 'ALL') {
      return topicsMatchingLangAndSubExam;
    }
    return topicsMatchingLangAndSubExam.filter(
      (t) => (t.subjectName || '').trim() === subjectName
    );
  }, [topicsMatchingLangAndSubExam, subjectName]);

  // 5. SUB SUBJECT choices (revealed when a specific Subject is selected)
  const subSubjectChoices = useMemo(() => {
    if (!subjectName || subjectName === 'ALL') return [];
    return Array.from(
      new Set(
        topicsMatchingSubject
          .map((t) => (t.subSubjectName || '').trim())
          .filter(Boolean)
      )
    );
  }, [topicsMatchingSubject, subjectName]);

  useEffect(() => {
    if (
      subSubjectName !== 'ALL' &&
      !subSubjectChoices.includes(subSubjectName)
    ) {
      setSubSubjectName('ALL');
      setSubTopicName('ALL');
    }
  }, [subSubjectChoices, subSubjectName]);

  const topicsMatchingSubSubject = useMemo(() => {
    if (!subSubjectName || subSubjectName === 'ALL') {
      return topicsMatchingSubject;
    }
    return topicsMatchingSubject.filter(
      (t) => (t.subSubjectName || '').trim() === subSubjectName
    );
  }, [topicsMatchingSubject, subSubjectName]);

  // 6. SUB TOPIC choices (revealed when a specific Subject / Sub Subject is selected)
  const subTopicChoices = useMemo(() => {
    if (!subjectName || subjectName === 'ALL') return [];
    return Array.from(
      new Set(
        topicsMatchingSubSubject
          .map((t) => (t.subTopicName || '').trim())
          .filter(Boolean)
      )
    );
  }, [topicsMatchingSubSubject, subjectName]);

  useEffect(() => {
    if (subTopicName !== 'ALL' && !subTopicChoices.includes(subTopicName)) {
      setSubTopicName('ALL');
    }
  }, [subTopicChoices, subTopicName]);

  const selectedTagDoc = useMemo(() => {
    if (subTopicName && subTopicName !== 'ALL') {
      return (
        topicsMatchingSubSubject.find(
          (t) => (t.subTopicName || '').trim() === subTopicName
        ) || null
      );
    }
    if (
      subjectName !== 'ALL' &&
      topicsMatchingSubSubject.length === 1
    ) {
      return topicsMatchingSubSubject[0];
    }
    return null;
  }, [topicsMatchingSubSubject, subTopicName, subjectName]);

  function handleExamSelect(nextExam) {
    setExamName(nextExam);
    setSelectedSubExams([]);
    const nextTags = groupedByExam[nextExam] || [];
    const nextLangs = Array.from(
      new Set(nextTags.flatMap((t) => extractLanguagesArray(t)))
    );
    setSelectedLanguages(nextLangs.length > 0 ? nextLangs : ['English']);
    setSubjectName('ALL');
    setSubSubjectName('ALL');
    setSubTopicName('ALL');
  }

  function handleToggleLanguage(lang) {
    setSelectedLanguages((prev) => {
      const exists = prev.includes(lang);
      if (exists) {
        if (prev.length <= 1) return prev;
        return prev.filter((l) => l !== lang);
      }
      return [...prev, lang];
    });
  }

  function handleToggleSubExam(se) {
    setSelectedSubExams((prev) => {
      if (prev.includes(se)) {
        return prev.filter((item) => item !== se);
      }
      return [...prev, se];
    });
  }

  // Real-time breadcrumb preview string
  const liveBreadcrumb = useMemo(() => {
    const subExamPart =
      selectedSubExams.length > 0 ? selectedSubExams.join(' + ') : '';
    const subjPart =
      subjectName && subjectName !== 'ALL' ? subjectName : 'All Subjects';
    const subSubjPart =
      subjectName !== 'ALL' && subSubjectName && subSubjectName !== 'ALL'
        ? subSubjectName
        : '';
    const topicPart =
      subjectName !== 'ALL' && subTopicName && subTopicName !== 'ALL'
        ? subTopicName
        : '';

    return [examName, subExamPart, subjPart, subSubjPart, topicPart]
      .filter(Boolean)
      .join(' › ');
  }, [
    examName,
    selectedSubExams,
    subjectName,
    subSubjectName,
    subTopicName,
  ]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!examName) return;

    const finalLangs =
      selectedLanguages.length > 0
        ? selectedLanguages
        : [languageChoices[0] || 'English'];

    const langLabel = finalLangs.join(' + ');

    onApply({
      examName,
      subExams: selectedSubExams,
      subExamName: selectedSubExams.join(','),
      languages: finalLangs,
      language: finalLangs.join(','),
      subjectName: subjectName === 'ALL' ? '' : subjectName,
      subSubjectName:
        subjectName === 'ALL' || subSubjectName === 'ALL'
          ? ''
          : subSubjectName,
      subTopicName:
        subjectName === 'ALL' || subTopicName === 'ALL' ? '' : subTopicName,
      hashtagId: selectedTagDoc?._id || '',
      tag: selectedTagDoc?.tag || '',
      label: `${liveBreadcrumb} (${langLabel})`,
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
      aria-label="Filter Exam, Language and Topics"
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
                Exam &amp; Language required &middot; Sub-Exam &amp; Subject optional
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
          {/* 1. EXAM (REQUIRED) */}
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

          {/* 2. LANGUAGE (SELECT 1 OR MORE) */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <Globe className="h-3 w-3" />
                <span>2. Language (Select 1 or more)</span>
              </label>
              {languageChoices.length > 1 && !allLangsSelected && (
                <button
                  type="button"
                  onClick={() => setSelectedLanguages([...languageChoices])}
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

          {/* 3. SUB EXAM (OPTIONAL — Unique deduplicated chips, never "CGL,CHSL") */}
          {subExamChoices.length > 0 && (
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                3. Sub Exam (Optional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedSubExams([])}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition active:scale-95 ${
                    selectedSubExams.length === 0
                      ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                  }`}
                >
                  {selectedSubExams.length === 0 && (
                    <Check className="h-3 w-3 stroke-[3]" />
                  )}
                  <span>All Sub Exams</span>
                </button>
                {subExamChoices.map((se) => {
                  const active = selectedSubExams.includes(se);
                  return (
                    <button
                      key={se}
                      type="button"
                      onClick={() => handleToggleSubExam(se)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition active:scale-95 ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      {active && <Check className="h-3 w-3 stroke-[3]" />}
                      <span>{se}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. SUBJECT (OPTIONAL — Dynamically filtered by Exam + Language + Sub Exam) */}
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
                  setSubTopicName('ALL');
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
                      setSubTopicName('ALL');
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

          {/* 5. SUB SUBJECT (OPTIONAL / EXPANDABLE CHIPS — Revealed when a Subject is selected) */}
          {subjectName !== 'ALL' && subSubjectChoices.length > 0 && (
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                5. Sub Subject (Optional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSubSubjectName('ALL');
                    setSubTopicName('ALL');
                  }}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition active:scale-95 ${
                    subSubjectName === 'ALL'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                  }`}
                >
                  {subSubjectName === 'ALL' && (
                    <Check className="h-3 w-3 stroke-[3]" />
                  )}
                  <span>All in {subjectName}</span>
                </button>
                {subSubjectChoices.map((ss) => {
                  const active = subSubjectName === ss;
                  return (
                    <button
                      key={ss}
                      type="button"
                      onClick={() => {
                        setSubSubjectName(ss);
                        setSubTopicName('ALL');
                      }}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition active:scale-95 ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      {active && <Check className="h-3 w-3 stroke-[3]" />}
                      <span>{ss}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. SUB TOPIC (OPTIONAL / EXPANDABLE CHIPS — Revealed when a Subject is selected) */}
          {subjectName !== 'ALL' && subTopicChoices.length > 0 && (
            <div>
              <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                6. Sub Topic (Optional)
              </label>
              <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setSubTopicName('ALL')}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition active:scale-95 ${
                    subTopicName === 'ALL'
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                  }`}
                >
                  {subTopicName === 'ALL' && (
                    <Check className="h-3 w-3 stroke-[3]" />
                  )}
                  <span>All Topics</span>
                </button>
                {subTopicChoices.map((st) => {
                  const active = subTopicName === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSubTopicName(st)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition active:scale-95 ${
                        active
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      {active && <Check className="h-3 w-3 stroke-[3]" />}
                      <span>{st}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live Breadcrumb Preview */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-1 font-bold text-slate-900">
              <span>Showing:</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {liveBreadcrumb} ({selectedLanguages.join(' + ')})
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
