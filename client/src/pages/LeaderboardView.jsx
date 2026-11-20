import { useCallback, useEffect, useState } from 'react';
import {
  Award,
  Flame,
  Heart,
  Loader2,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const OFFLINE_SOLVERS = [
  {
    rank: 1,
    userId: 'c1',
    firstName: 'Aarav',
    username: 'civil_prep',
    weeklyCorrect: 48,
    weeklySolved: 52,
    accuracy: 92,
    streakCount: 7,
  },
  {
    rank: 2,
    userId: 'c2',
    firstName: 'Meera',
    username: 'ssc_daily',
    weeklyCorrect: 39,
    weeklySolved: 45,
    accuracy: 87,
    streakCount: 5,
  },
  {
    rank: 3,
    userId: 'offline-dev-user',
    firstName: 'Dev Aspirant',
    username: 'dev_aspirant',
    weeklyCorrect: 19,
    weeklySolved: 24,
    accuracy: 79,
    streakCount: 3,
  },
];

const OFFLINE_CREATORS = [
  {
    rank: 1,
    userId: 'c1',
    firstName: 'Aarav',
    username: 'civil_prep',
    quizzesCreated: 14,
    likesReceived: 186,
    attemptsReceived: 640,
  },
  {
    rank: 2,
    userId: 'c2',
    firstName: 'Meera',
    username: 'ssc_daily',
    quizzesCreated: 11,
    likesReceived: 142,
    attemptsReceived: 510,
  },
];

function getRankBadgeClasses(rank) {
  if (rank === 1) {
    return 'bg-amber-400 text-slate-950 ring-2 ring-amber-200 shadow-xs';
  }
  if (rank === 2) {
    return 'bg-slate-300 text-slate-900 ring-2 ring-slate-200 shadow-xs';
  }
  if (rank === 3) {
    return 'bg-amber-700 text-white ring-2 ring-amber-200 shadow-xs';
  }
  return 'bg-slate-100 text-slate-700 border border-slate-200';
}

export default function LeaderboardView({ onOpenCreatorProfile }) {
  const { isOfflinePreview } = useAuth();
  const [boardType, setBoardType] = useState('solvers'); // 'solvers' | 'creators'
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLeaderboard = useCallback(async () => {
    if (isOfflinePreview) {
      setEntries(
        boardType === 'creators' ? OFFLINE_CREATORS : OFFLINE_SOLVERS
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/api/leaderboard?type=${boardType}`);
      setEntries(data.entries || []);
    } catch (err) {
      setError(err.message || 'Failed to load weekly leaderboard');
    } finally {
      setLoading(false);
    }
  }, [boardType, isOfflinePreview]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <div className="h-dvh overflow-y-auto bg-[#F8FAFC] px-4 pt-5 pb-24">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Weekly Leaderboard
            </h1>
            <p className="text-xs text-slate-500">
              Top exam performers over the past 7 days
            </p>
          </div>
        </div>

        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-600 uppercase shadow-2xs">
          7 Days
        </span>
      </div>

      {/* Segmented Toggle: Top Solvers vs Top Creators */}
      <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setBoardType('solvers')}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
            boardType === 'solvers'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Award className="h-3.5 w-3.5" />
          <span>Top Solvers</span>
        </button>
        <button
          type="button"
          onClick={() => setBoardType('creators')}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
            boardType === 'creators'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Top Creators</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xs">
          <Trophy className="mx-auto mb-2 h-5 w-5 text-slate-400" />
          <p className="text-xs font-bold text-slate-900">
            No weekly rankings yet
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {boardType === 'solvers'
              ? 'Solve quizzes in the feed to claim the #1 spot this week!'
              : 'Publish high-quality exam quizzes to lead the creator board!'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {entries.map((entry) => {
            const initial = (
              entry.firstName ||
              entry.username ||
              'A'
            )
              .charAt(0)
              .toUpperCase();

            return (
              <button
                key={String(entry.userId)}
                type="button"
                onClick={() =>
                  entry.userId && onOpenCreatorProfile?.(entry.userId)
                }
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-2xs transition hover:border-slate-300 hover:bg-slate-50/70 active:scale-[0.99]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {/* Rank Badge (#1, #2, #3, ...) */}
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${getRankBadgeClasses(
                      entry.rank
                    )}`}
                  >
                    #{entry.rank}
                  </span>

                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {initial}
                  </div>

                  {/* User Handle */}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">
                      {entry.firstName}
                    </p>
                    <p className="truncate text-[11px] font-medium text-slate-500">
                      @{entry.username || 'aspirant'}
                    </p>
                  </div>
                </div>

                {/* Right Metrics */}
                {boardType === 'solvers' ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        ✓ {entry.weeklyCorrect} right
                      </span>
                      <div className="mt-1 flex items-center justify-end gap-2 text-[10px] font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-0.5">
                          <Target className="h-3 w-3 text-slate-400" />
                          {entry.accuracy}%
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-amber-600">
                          <Flame className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {entry.streakCount}d
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-white">
                      {entry.quizzesCreated} quizzes
                    </span>
                    <div className="mt-1 flex items-center justify-end gap-2 text-[10px] font-semibold text-slate-500">
                      <span className="inline-flex items-center gap-0.5 text-rose-600">
                        <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                        {entry.likesReceived}
                      </span>
                      <span>{entry.attemptsReceived} tries</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
