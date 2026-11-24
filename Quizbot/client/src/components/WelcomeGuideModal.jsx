import {
  ChevronRight,
  Flame,
  Globe,
  MessageCircle,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Trophy,
  X,
} from 'lucide-react';
import { openAdminContactLink } from '../lib/telegram.js';

export default function WelcomeGuideModal({
  reason = 'new_user', // 'new_user' | 'weekly_comeback' | 'manual'
  firstName = '',
  onClose,
  onOpenFilter,
  onOpenMocks,
}) {
  const isComeback = reason === 'weekly_comeback';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome Guide"
    >
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white px-4 pt-4 pb-6 shadow-2xl sm:rounded-3xl sm:border">
        {/* Header */}
        <div className="mb-3.5 flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xs">
              {isComeback ? (
                <Flame className="h-5 w-5 fill-amber-400 text-amber-400" />
              ) : (
                <Sparkles className="h-5 w-5 text-emerald-400" />
              )}
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                {isComeback
                  ? `Welcome Back${firstName ? `, ${firstName}` : ''}!`
                  : `Welcome to Quiz-Gram${firstName ? `, ${firstName}` : ''}!`}
              </h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                {isComeback
                  ? "It's been 7+ days since your last quiz — quick refresher below"
                  : 'Quick guide to customize your Exam, Language & Mock Tests'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close welcome guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 4 Crisp Guide Cards */}
        <div className="flex flex-col gap-2.5">
          {/* 1. Filter Exam & Adjust Language */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-xs font-extrabold text-slate-900">
                    1. Filter Exam &amp; Adjust Language
                  </p>
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                    <Globe className="h-2.5 w-2.5" />
                    EN · HI · ML
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  Tap <strong>Filter</strong> at the top-right anytime to choose your{' '}
                  <strong>Exam</strong> (SSC, UPSC, RRB, Kerala PSC),{' '}
                  <strong>Sub-Exam</strong>, <strong>Subject</strong>, and{' '}
                  <strong>Question Language</strong> (1 or multiple languages).
                </p>
                {onOpenFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose?.();
                      onOpenFilter();
                    }}
                    className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-extrabold text-white hover:bg-slate-800 active:scale-95"
                  >
                    <span>Set Exam &amp; Language</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. Timed Mock Tests */}
          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Timer className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-900">
                  2. Timed Mock Tests &amp; Telegram Share
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  Tap <strong>Mocks</strong> in the top bar to attend timed exam-style
                  tests with negative marking, instant scorecards, full explanations,
                  and share challenges with friends inside Telegram!
                </p>
                {onOpenMocks && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose?.();
                      onOpenMocks();
                    }}
                    className="mt-2 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-extrabold text-white hover:bg-indigo-500 active:scale-95"
                  >
                    <span>Explore Mock Tests</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Smart Daily Feed & Features */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <Trophy className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-900">
                  3. Smart Daily Feed &amp; Leaderboard
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  Swipe up through brand-new questions first (with Maths, Boxes,
                  Tables &amp; Diagrams) and zero same-day repeats. Build your daily
                  streak and climb the 7-day <strong>Weekly Leaderboard</strong>!
                </p>
              </div>
            </div>
          </div>

          {/* 4. Add a New Exam or Request Creator Access -> Contact Admin */}
          <div className="rounded-2xl border border-amber-200/90 bg-amber-50/50 p-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-900">
                  4. Need a New Exam Added? Contact Admin
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  Want us to add a <strong>new Exam or Syllabus</strong>, or want{' '}
                  <strong>Creator approval</strong> to publish quizzes &amp; mock
                  tests? Message Admin directly on Telegram!
                </p>
                <button
                  type="button"
                  onClick={openAdminContactLink}
                  className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-3 py-1 text-[10px] font-extrabold text-amber-900 shadow-2xs hover:bg-amber-100 active:scale-95"
                >
                  <MessageCircle className="h-3 w-3 text-amber-700" />
                  <span>Contact Admin on Telegram</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-2xl bg-slate-900 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
        >
          {isComeback ? "Let's Restart Practicing!" : 'Got It — Start Practicing!'}
        </button>
      </div>
    </div>
  );
}
