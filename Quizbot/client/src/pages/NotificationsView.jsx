import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Edit3,
  Flag,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import EditQuizModal from '../components/EditQuizModal.jsx';

export default function NotificationsView({ onUnreadChanged, onOpenAdmin }) {
  const { user, isOfflinePreview } = useAuth();
  const [subTab, setSubTab] = useState('alerts'); // 'alerts' | 'myQuizzes'
  const [notifications, setNotifications] = useState([]);
  const [myQuizzes, setMyQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [loadingQuizId, setLoadingQuizId] = useState(null);

  const loadData = useCallback(async () => {
    if (isOfflinePreview) {
      setNotifications([
        {
          _id: 'n-preview-1',
          type: 'flag_edit_request',
          message:
            'Your UPSC quiz was flagged 3 times as potentially mistaken. Please review and edit it.',
          isRead: false,
          createdAt: new Date().toISOString(),
          quiz: {
            _id: 'preview-1',
            examName: 'UPSC',
            subjectName: 'History',
            flagCount: 3,
            needsCreatorEdit: true,
          },
        },
      ]);
      setMyQuizzes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [notifData, mineData] = await Promise.all([
        apiRequest('/api/notifications'),
        apiRequest('/api/quizzes/mine'),
      ]);
      setNotifications(notifData.notifications || []);
      setMyQuizzes(mineData.quizzes || []);
      onUnreadChanged?.(notifData.unreadCount || 0);
    } catch (err) {
      setError(err.message || 'Failed to load alerts & quizzes');
    } finally {
      setLoading(false);
    }
  }, [isOfflinePreview, onUnreadChanged]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleMarkAllRead() {
    if (isOfflinePreview) return;
    try {
      await apiRequest('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      onUnreadChanged?.(0);
    } catch {
      // Ignore
    }
  }

  async function handleOpenEditFromNotification(notif) {
    if (isOfflinePreview) return;
    const quizId = notif.quiz?._id || notif.quiz;
    if (!quizId) return;

    if (!notif.isRead) {
      apiRequest(`/api/notifications/${notif._id}/read`, {
        method: 'PATCH',
      }).catch(() => {});
    }

    setLoadingQuizId(quizId);
    try {
      const data = await apiRequest(`/api/quizzes/${quizId}`);
      setEditingQuiz(data.quiz);
    } catch (err) {
      setError(err.message || 'Could not load quiz for editing');
    } finally {
      setLoadingQuizId(null);
    }
  }

  const flaggedCount = myQuizzes.filter((q) => q.needsCreatorEdit).length;

  return (
    <div className="h-dvh overflow-y-auto bg-[#F8FAFC] px-4 pt-5 pb-24">
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Alerts &amp; My Quizzes
          </h1>
          <p className="text-xs text-slate-500">
            @{user?.username || user?.firstName || 'aspirant'} &middot;{' '}
            {user?.totalSolved || 0} solved
          </p>
        </div>

        {subTab === 'alerts' && notifications.some((n) => !n.isRead) && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Read all</span>
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setSubTab('alerts')}
          className={`rounded-lg py-1.5 text-xs font-bold transition ${
            subTab === 'alerts'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Alerts ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('myQuizzes')}
          className={`rounded-lg py-1.5 text-xs font-bold transition ${
            subTab === 'myQuizzes'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          My Quizzes ({myQuizzes.length}
          {flaggedCount > 0 ? ` · ${flaggedCount} flagged` : ''})
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
        </div>
      ) : subTab === 'alerts' ? (
        notifications.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xs">
            <Bell className="mx-auto mb-2 h-5 w-5 text-slate-400" />
            <p className="text-xs font-bold text-slate-900">No alerts yet</p>
            <p className="mt-1 text-[11px] text-slate-500">
              You&apos;ll be notified here if one of your quizzes is flagged for
              review or escalated.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {notifications.map((notif) => {
              const isEscalation = notif.type === 'admin_escalation';
              const quizId = notif.quiz?._id || notif.quiz;
              return (
                <div
                  key={notif._id}
                  className={`rounded-2xl border bg-white p-3.5 shadow-2xs ${
                    notif.isRead
                      ? 'border-slate-200'
                      : 'border-slate-900 ring-1 ring-slate-900/10'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                        isEscalation
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-900 text-white'
                      }`}
                    >
                      {isEscalation ? (
                        <>
                          <ShieldAlert className="h-3 w-3" />
                          Admin Escalation
                        </>
                      ) : (
                        <>
                          <Flag className="h-3 w-3" />
                          Edit Requested
                        </>
                      )}
                    </span>
                    {!notif.isRead && (
                      <span className="h-2 w-2 rounded-full bg-rose-600" />
                    )}
                  </div>

                  <p className="text-xs leading-relaxed text-slate-700">
                    {notif.message}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    {quizId && (
                      <button
                        type="button"
                        disabled={loadingQuizId === quizId}
                        onClick={() => handleOpenEditFromNotification(notif)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-2xs hover:bg-slate-800 disabled:opacity-60"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>
                          {loadingQuizId === quizId
                            ? 'Loading...'
                            : 'Review & Edit Quiz'}
                        </span>
                      </button>
                    )}

                    {isEscalation && onOpenAdmin && (
                      <button
                        type="button"
                        onClick={onOpenAdmin}
                        className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Open Queue
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : myQuizzes.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xs">
          <p className="text-xs font-bold text-slate-900">
            You haven&apos;t created any quizzes yet
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Quizzes you publish will appear here so you can edit them anytime.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {myQuizzes.map((quiz) => (
            <div
              key={quiz._id}
              className={`rounded-2xl border bg-white p-3.5 shadow-2xs ${
                quiz.needsCreatorEdit
                  ? 'border-rose-300 ring-1 ring-rose-500/15'
                  : 'border-slate-200'
              }`}
            >
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                    #{quiz.hashtag?.tag || quiz.examName}
                  </span>
                  {quiz.needsCreatorEdit && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 uppercase">
                      <Flag className="h-2.5 w-2.5" />
                      Needs Fix ({quiz.flagCount})
                    </span>
                  )}
                  {quiz.editCount > 0 && (
                    <span className="text-[10px] font-medium text-slate-500">
                      Edited {quiz.editCount}x
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setEditingQuiz(quiz)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-800 shadow-2xs hover:bg-slate-50"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              </div>

              <p className="text-xs leading-snug font-semibold text-slate-900">
                {quiz.question}
              </p>

              <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                {quiz.attemptsCount || 0} attempts &middot; Right Answer:{' '}
                <span className="font-bold text-emerald-700">
                  {String.fromCharCode(65 + (quiz.correctIndex || 0))}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}

      {editingQuiz && (
        <EditQuizModal
          quiz={editingQuiz}
          onClose={() => setEditingQuiz(null)}
          onSaved={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
