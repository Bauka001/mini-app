import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, MessageSquare, RefreshCcw, Send, ShieldCheck, Ticket, Users } from 'lucide-react';
import {
  AdminDashboardFeedback,
  AdminDashboardResponse,
  getAdminDashboard,
  replyAdminFeedback,
  updateAdminFeedbackStatus,
} from '../../utils/adminApi';

const statusLabel: Record<AdminDashboardFeedback['status'], string> = {
  new: 'Жаңа',
  read: 'Оқылды',
  resolved: 'Шешілді',
};

const statusClass: Record<AdminDashboardFeedback['status'], string> = {
  new: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  read: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const AdminDashboard = () => {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'read' | 'resolved'>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [busyFeedbackId, setBusyFeedbackId] = useState<number | null>(null);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const nextData = await getAdminDashboard();
      setData(nextData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Dashboard жүктелмеді');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const filteredFeedbacks = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.feedbacks.filter((feedback) => filter === 'all' || feedback.status === filter);
  }, [data, filter]);

  const patchFeedback = (feedback: AdminDashboardFeedback | null | undefined) => {
    if (!feedback) {
      return;
    }

    setData((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        feedbacks: current.feedbacks.map((item) => (item.id === feedback.id ? feedback : item)),
      };
    });
  };

  const handleReply = async (feedbackId: number) => {
    const reply = replyDrafts[feedbackId]?.trim();

    if (!reply) {
      return;
    }

    try {
      setBusyFeedbackId(feedbackId);
      const response = await replyAdminFeedback(feedbackId, reply);
      patchFeedback(response.feedback);
      setReplyDrafts((current) => ({ ...current, [feedbackId]: '' }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Reply сақталмады');
    } finally {
      setBusyFeedbackId(null);
    }
  };

  const handleStatusUpdate = async (feedbackId: number, status: 'read' | 'resolved') => {
    try {
      setBusyFeedbackId(feedbackId);
      const response = await updateAdminFeedbackStatus(feedbackId, status);
      patchFeedback(response.feedback);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Status жаңартылмады');
    } finally {
      setBusyFeedbackId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Admin деректері жүктелуде</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Server-side dashboard дайындалып жатыр</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-sm dark:border-red-900/40 dark:bg-red-950/30">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
        <h2 className="text-lg font-bold text-red-700 dark:text-red-300">Dashboard ашылмады</h2>
        <p className="mt-2 text-sm text-red-600/80 dark:text-red-300/80">{error}</p>
        <button
          onClick={() => void loadDashboard()}
          className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
        >
          <RefreshCcw className="h-4 w-4" />
          Қайта жүктеу
        </button>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Admin дашборд</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Backend-validated role, audit trail және production data бір жерге жиналды
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/admin/tickets"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <Ticket className="h-4 w-4" />
            Тікеттерге өту
          </Link>
          <button
            onClick={() => void loadDashboard()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            <RefreshCcw className="h-4 w-4" />
            Жаңарту
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 inline-flex rounded-2xl bg-blue-600 p-3 text-white">
            <Users className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Пайдаланушылар</p>
          <p className="mt-1 text-3xl font-black text-gray-900 dark:text-white">{stats?.totalUsers ?? 0}</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Блоктауда: {stats?.blockedUsers ?? 0}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 inline-flex rounded-2xl bg-purple-600 p-3 text-white">
            <MessageSquare className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Feedback queue</p>
          <p className="mt-1 text-3xl font-black text-gray-900 dark:text-white">{stats?.totalFeedbacks ?? 0}</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Ашық queue: {stats?.pendingFeedbacks ?? 0}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 inline-flex rounded-2xl bg-emerald-600 p-3 text-white">
            <Ticket className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Тікеттер</p>
          <p className="mt-1 text-3xl font-black text-gray-900 dark:text-white">{stats?.totalTickets ?? 0}</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Pending verify: {stats?.pendingTickets ?? 0}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 inline-flex rounded-2xl bg-amber-500 p-3 text-black">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Админ бақылау</p>
          <p className="mt-1 text-3xl font-black text-gray-900 dark:text-white">{stats?.activeAdmins ?? 0}</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Chat reports pending: {stats?.pendingChatReports ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-6 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">Feedback moderation</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">User шағымдары мен ұсыныстары</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'new', 'read', 'resolved'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                    filter === item
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {item === 'all' ? 'Барлығы' : statusLabel[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 p-6">
            {filteredFeedbacks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
                <MessageSquare className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                <p className="font-medium text-gray-600 dark:text-gray-300">Фильтрге сай feedback жоқ</p>
              </div>
            ) : (
              filteredFeedbacks.map((feedback) => (
                <article
                  key={feedback.id}
                  className="rounded-3xl border border-gray-200 bg-gray-50/60 p-5 dark:border-gray-800 dark:bg-gray-950/40"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {(feedback.username || 'U').slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{feedback.username}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Telegram ID: {feedback.userTelegramId}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass[feedback.status]}`}>
                          {statusLabel[feedback.status]}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(feedback.createdAt)}</span>
                      </div>
                    </div>
                    {feedback.imageUrl ? (
                      <img
                        src={feedback.imageUrl}
                        alt={feedback.username}
                        className="h-32 w-full rounded-2xl object-cover lg:w-44"
                      />
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    {feedback.text}
                  </div>

                  {feedback.latestReply ? (
                    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
                      <p className="font-bold">Админ жауабы</p>
                      <p className="mt-2">{feedback.latestReply.reply}</p>
                      <p className="mt-2 text-xs text-blue-700/80 dark:text-blue-300/80">
                        {formatDate(feedback.latestReply.createdAt)}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <textarea
                        value={replyDrafts[feedback.id] || ''}
                        onChange={(event) =>
                          setReplyDrafts((current) => ({ ...current, [feedback.id]: event.target.value }))
                        }
                        placeholder="Жауап жазыңыз..."
                        className="min-h-[96px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => void handleReply(feedback.id)}
                          disabled={busyFeedbackId === feedback.id || !replyDrafts[feedback.id]?.trim()}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Send className="h-4 w-4" />
                          Жауап жіберу
                        </button>
                        <button
                          onClick={() => void handleStatusUpdate(feedback.id, 'read')}
                          disabled={busyFeedbackId === feedback.id}
                          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:text-gray-200"
                        >
                          Оқылды деп белгілеу
                        </button>
                        <button
                          onClick={() => void handleStatusUpdate(feedback.id, 'resolved')}
                          disabled={busyFeedbackId === feedback.id}
                          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-emerald-500 hover:text-emerald-600 dark:border-gray-700 dark:text-gray-200"
                        >
                          Шешілді деп жабу
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 p-6 dark:border-gray-800">
            <h3 className="text-xl font-black text-gray-900 dark:text-white">Audit trail</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Соңғы admin әрекеттері</p>
          </div>

          <div className="space-y-3 p-6">
            {data?.auditLogs.length ? (
              data.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{log.action}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        actor #{log.actorTelegramId} • {log.entityType} • {log.entityId || 'n/a'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(log.createdAt)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
                <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                <p className="font-medium text-gray-600 dark:text-gray-300">Әзірге audit log жоқ</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
