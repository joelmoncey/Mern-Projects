import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Coffee,
  Heart,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { openTelegramStarsInvoice } from '../lib/telegram.js';
import { useAuth } from '../context/AuthContext.jsx';

const DEFAULT_STAR_TO_INR = Number(import.meta.env.VITE_STAR_TO_INR) || 2;

const DEFAULT_TIERS = [
  {
    id: 'cutting_chai',
    emoji: '☕',
    label: '1 Cutting Chai',
    stars: 10,
    cups: 1,
    tagline: 'Quick energy boost for daily quizzes',
  },
  {
    id: 'masala_chai',
    emoji: '🍵',
    label: '2 Masala Chais',
    stars: 25,
    cups: 2,
    tagline: 'Most popular supporter pick',
    popular: true,
  },
  {
    id: 'chai_snacks',
    emoji: '🫖',
    label: 'Chai & Samosa',
    stars: 50,
    cups: 5,
    tagline: 'Helps cover server & database bills',
  },
  {
    id: 'tea_patron',
    emoji: '🌟',
    label: 'Tea Stall Patron',
    stars: 100,
    cups: 10,
    tagline: 'Super supporter for free exam prep',
  },
];

export default function BuyMeAChaiModal({ onClose, onSupportConfirmed }) {
  const { user, isOfflinePreview, updateUserProfile } = useAuth();

  const [starToInr, setStarToInr] = useState(DEFAULT_STAR_TO_INR);
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [communityStats, setCommunityStats] = useState({
    totalStars: 0,
    totalCups: 0,
    totalSupporters: 0,
  });
  const [recentSupporters, setRecentSupporters] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [selectedTierId, setSelectedTierId] = useState('masala_chai');
  const [stars, setStars] = useState(25);
  const [cupsCount, setCupsCount] = useState(2);
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOfflinePreview) {
      setCommunityStats({ totalStars: 320, totalCups: 32, totalSupporters: 11 });
      setRecentSupporters([
        {
          _id: 'demo-1',
          firstName: 'Aarav',
          username: 'civil_prep',
          stars: 25,
          cupsCount: 2,
          tierLabel: '2 Masala Chais',
          note: 'Best free UPSC & SSC quiz feed!',
        },
        {
          _id: 'demo-2',
          firstName: 'Meera',
          username: 'kpsc_ranker',
          stars: 50,
          cupsCount: 5,
          tierLabel: 'Chai & Samosa',
          note: 'Thanks for Kerala PSC Malayalam questions ☕',
        },
      ]);
      setLoadingSummary(false);
      return;
    }

    let cancelled = false;
    apiRequest('/api/payments/chai/summary')
      .then((data) => {
        if (cancelled) return;
        if (data.starToInr) setStarToInr(data.starToInr);
        if (Array.isArray(data.tiers) && data.tiers.length > 0) {
          setTiers(data.tiers);
        }
        if (data.communityStats) setCommunityStats(data.communityStats);
        if (Array.isArray(data.recentSupporters)) {
          setRecentSupporters(data.recentSupporters);
        }
        if (data.mySupport) {
          updateUserProfile?.({
            isSupporter: data.mySupport.isSupporter,
            starsContributed: data.mySupport.starsContributed,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingSummary(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOfflinePreview]);

  function handleSelectTier(tier) {
    setSelectedTierId(tier.id);
    setStars(tier.stars);
    setCupsCount(tier.cups);
    setError('');
  }

  function handleStepStars(delta) {
    const next = Math.max(1, Math.min(2500, (Number(stars) || 0) + delta));
    setSelectedTierId('custom');
    setStars(next);
    setCupsCount(Math.max(1, Math.round(next / 10)));
    setError('');
  }

  function handleStarsInput(raw) {
    const digits = String(raw).replace(/[^0-9]/g, '');
    if (!digits) {
      setSelectedTierId('custom');
      setStars(0);
      return;
    }
    const clamped = Math.min(2500, Number(digits));
    setSelectedTierId('custom');
    setStars(clamped);
    setCupsCount(Math.max(1, Math.round(clamped / 10)));
    setError('');
  }

  const validStars = Number.isInteger(stars) && stars >= 1 && stars <= 2500;
  const approxInr = validStars ? stars * starToInr : 0;

  async function pollWebhookConfirmation(payloadId) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await new Promise((r) => setTimeout(r, 900));
      try {
        const res = await apiRequest(`/api/payments/stars/status/${payloadId}`);
        if (res.status === 'paid') {
          if (res.mySupport) {
            updateUserProfile?.({
              isSupporter: res.mySupport.isSupporter,
              starsContributed: res.mySupport.starsContributed,
            });
          }
          return true;
        }
      } catch {
        // Retry briefly
      }
    }
    return false;
  }

  async function handleContribute(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!validStars) {
      setError('Please enter at least 1 Telegram Star (max 2,500).');
      return;
    }

    if (isOfflinePreview) {
      updateUserProfile?.({
        isSupporter: true,
        starsContributed: (user?.starsContributed || 0) + stars,
      });
      setSuccessMsg(
        `Preview mode: Thank you for ${stars} ⭐ (≈ ₹${approxInr})! ☕ Supporter badge unlocked.`
      );
      onSupportConfirmed?.();
      return;
    }

    setSubmitting(true);
    try {
      const invoiceData = await apiRequest('/api/payments/stars/invoice', {
        method: 'POST',
        body: {
          stars,
          cupsCount,
          tierId: selectedTierId,
          note: note.trim(),
        },
      });

      const status = await openTelegramStarsInvoice(invoiceData.invoiceUrl);

      if (status === 'paid') {
        const confirmed = await pollWebhookConfirmation(invoiceData.payloadId);
        // Optimistically show supporter badge even if webhook is a second behind
        if (!confirmed) {
          updateUserProfile?.({
            isSupporter: true,
            starsContributed: (user?.starsContributed || 0) + stars,
          });
        }
        setNote('');
        setSuccessMsg(
          `Thank you for the Chai! ☕ Your ${stars} ⭐ (≈ ₹${approxInr}) contribution unlocked your ☕ Supporter badge on Profile & Leaderboard!`
        );
        onSupportConfirmed?.();
      } else if (status === 'external') {
        setSuccessMsg(
          `Opened Telegram Stars invoice (${stars} ⭐ ≈ ₹${approxInr}). Once paid inside Telegram, your ☕ Supporter badge activates automatically!`
        );
      } else if (status === 'cancelled') {
        setError('Payment cancelled — no Telegram Stars were deducted.');
      } else if (status === 'failed') {
        setError(
          'Telegram Stars payment could not be completed. Please check your Stars balance and try again.'
        );
      }
    } catch (err) {
      setError(
        err.message || 'Could not start Telegram Stars payment. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Buy Quiz-Gram a Chai"
    >
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-amber-200/80 bg-[#FFFDF9] px-4 pt-4 pb-6 shadow-2xl sm:rounded-3xl sm:border">
        {/* Warm Chai Header */}
        <div className="mb-3.5 flex items-start justify-between gap-2 border-b border-amber-200/70 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
              <Coffee className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                  Buy Quiz-Gram a Chai
                </h2>
                <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                  <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-600" />
                  <span>1 Star = ₹{starToInr}</span>
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-slate-600">
                Keep daily exam quizzes free, fast &amp; ad-free with Telegram Stars
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-amber-200 bg-white p-1.5 text-slate-500 hover:bg-amber-50 hover:text-slate-900"
            aria-label="Close Buy Me a Chai modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Community Stats Banner */}
        <div className="mb-3.5 flex items-center justify-between gap-2 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-base">🫖</span>
            <div>
              <p className="font-bold text-slate-900">
                {loadingSummary
                  ? 'Loading chai counter...'
                  : `${communityStats.totalCups || 0} Chais shared by ${communityStats.totalSupporters || 0} aspirants`}
              </p>
              <p className="text-[10px] font-semibold text-amber-800">
                Unlocks the ☕ Supporter badge on Profile &amp; Weekly Leaderboard
              </p>
            </div>
          </div>
          {user?.isSupporter && (
            <span className="shrink-0 rounded-full bg-amber-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-2xs">
              ☕ {user.starsContributed || 0}★
            </span>
          )}
        </div>

        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleContribute} className="flex flex-col gap-3.5">
          {/* Preset Chai Tiers (2x2 Grid) */}
          <div>
            <p className="mb-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Choose a Chai Treat
            </p>
            <div className="grid grid-cols-2 gap-2">
              {tiers.map((tier) => {
                const active = selectedTierId === tier.id;
                const tierInr = tier.stars * starToInr;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => handleSelectTier(tier)}
                    className={`relative flex flex-col items-start rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
                      active
                        ? 'border-amber-500 bg-amber-50/90 ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/30'
                    }`}
                  >
                    {tier.popular && (
                      <span className="absolute -top-2 right-2 rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase">
                        Popular
                      </span>
                    )}
                    <div className="flex w-full items-center justify-between gap-1">
                      <span className="text-lg leading-none">{tier.emoji}</span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-900">
                        {tier.stars} ⭐
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-bold text-slate-900">
                      {tier.label}
                    </p>
                    <p className="text-[11px] font-bold text-emerald-700">
                      ≈ ₹{tierInr}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-500">
                      {tier.tagline}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Telegram Stars Stepper with Live ₹ Conversion */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">
                Custom Telegram Stars
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
                {validStars ? `${stars} ⭐ = ₹${approxInr}` : 'Enter Stars'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStepStars(-5)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95"
                aria-label="Decrease 5 stars"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-amber-500 focus-within:bg-white">
                <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                <input
                  type="number"
                  min={1}
                  max={2500}
                  value={stars || ''}
                  onChange={(e) => handleStarsInput(e.target.value)}
                  className="w-20 bg-transparent text-center text-sm font-extrabold text-slate-900 outline-none"
                />
                <span className="text-xs font-bold text-slate-500">Stars</span>
              </div>
              <button
                type="button"
                onClick={() => handleStepStars(5)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95"
                aria-label="Increase 5 stars"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <input
              type="text"
              maxLength={140}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Say something nice... (optional supporter note)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500"
            />
          </div>

          {/* Primary Native Telegram Stars Contribute CTA */}
          <button
            type="submit"
            disabled={submitting || !validStars}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:from-amber-600 hover:via-orange-600 hover:to-amber-600 active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-amber-400" />
            )}
            <span>
              {submitting
                ? 'Opening Telegram Stars...'
                : `Buy Chai · ${validStars ? `${stars} ⭐ (≈ ₹${approxInr})` : ''}`}
            </span>
          </button>

          <p className="text-center text-[10px] font-medium text-slate-400">
            Powered natively by Telegram Stars (XTR) · 1 ⭐ = ₹{starToInr} approx.
          </p>
        </form>

        {/* Recent Supporters Wall */}
        {recentSupporters.length > 0 && (
          <div className="mt-4 border-t border-amber-200/70 pt-3">
            <p className="mb-2 flex items-center gap-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
              <span>Recent Chai Supporters</span>
            </p>
            <div className="flex flex-col gap-1.5">
              {recentSupporters.slice(0, 4).map((sup) => (
                <div
                  key={sup._id}
                  className="flex items-start justify-between gap-2 rounded-xl border border-amber-100 bg-white px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                      ☕ {sup.firstName}{' '}
                      {sup.username && (
                        <span className="font-medium text-slate-500">
                          @{sup.username}
                        </span>
                      )}
                    </p>
                    {sup.note && (
                      <p className="mt-0.5 truncate text-[11px] text-slate-600">
                        &ldquo;{sup.note}&rdquo;
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                    {sup.stars} ⭐ (₹{sup.approxInr || sup.stars * starToInr})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
