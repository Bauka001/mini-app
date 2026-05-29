import { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Shield, MessageSquare, Users, AlertCircle, RefreshCcw, EyeOff, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { AdminChatReport, AdminChatResponse, getAdminChatReports, updateAdminChatReport } from '../../utils/adminApi';

export const AdminChat = () => {
  const [data, setData] = useState<AdminChatResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'dismissed' | 'hidden'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'reports'>('recent');
  const [busyReportId, setBusyReportId] = useState<number | null>(null);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const nextData = await getAdminChatReports();
      setData(nextData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Чат moderation queue жүктелмеді');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, []);

  const groupOptions = useMemo(
    () =>
      Array.from(
        new Map(
          (data?.reports || [])
            .filter((report) => report.groupId)
            .map((report) => [report.groupId, report.groupName || report.groupId])
        )
      ),
    [data?.reports]
  );

  const filteredReports = useMemo(() => {
    const reports = data?.reports || [];
    const query = searchQuery.trim().toLowerCase();

    return reports
      .filter((report) => {
        const matchesSearch =
          !query ||
          (report.username || '').toLowerCase().includes(query) ||
          report.messageText.toLowerCase().includes(query) ||
          String(report.reportedUserTelegramId || '').includes(query);
        const matchesGroup = groupFilter === 'all' || report.groupId === groupFilter;
        const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
        return matchesSearch && matchesGroup && matchesStatus;
      })
      .sort((left, right) => {
        switch (sortBy) {
          case 'oldest':
            return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
          case 'reports':
            return right.reportCount - left.reportCount;
          case 'recent':
          default:
            return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        }
      });
  }, [data?.reports, groupFilter, searchQuery, sortBy, statusFilter]);

  const applyReportPatch = (report: AdminChatReport) => {
    setData((current) => {
      if (!current) {
        return current;
      }

      const reports = current.reports.map((item) => (item.id === report.id ? report : item));

      return {
        reports,
        stats: {
          totalReports: reports.length,
          pendingReports: reports.filter((item) => item.status === 'pending').length,
          hiddenReports: reports.filter((item) => item.status === 'hidden').length,
          dismissedReports: reports.filter((item) => item.status === 'dismissed').length,
        },
      };
    });
  };

  const handleReportAction = async (
    report: AdminChatReport,
    action: 'reviewed' | 'dismissed' | 'hidden',
    label: string
  ) => {
    const confirmed = window.confirm(`${label} әрекетін растаңыз`);

    if (!confirmed) {
      return;
    }

    try {
      setBusyReportId(report.id);
      const response = await updateAdminChatReport(report.id, action, label);
      applyReportPatch(response.report);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Report статусы жаңартылмады');
    } finally {
      setBusyReportId(null);
    }
  };

  const stats = data?.stats;
  const formatDisplayLabel = (value?: string | null, fallback = 'Көрсетілмеген') => {
    if (!value) {
      return fallback;
    }

    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const formatStatusLabel = (value: AdminChatReport['status']) => {
    switch (value) {
      case 'pending':
        return 'Күтіп тұр';
      case 'hidden':
        return 'Жасырылған';
      case 'dismissed':
        return 'Жабылған';
      case 'reviewed':
        return 'Қаралған';
      default:
        return formatDisplayLabel(value);
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Чат модерациясы</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Шағымдар кезегі және модерация журналы</p>
        </div>
        <button
          onClick={() => void loadReports()}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          <RefreshCcw className="h-4 w-4" />
          Жаңарту
        </button>
      </div>

      {error ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Барлық шағым</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.totalReports ?? 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Күтіп тұрғандары</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.pendingReports ?? 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500 rounded-lg">
              <EyeOff className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Жасырылған</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.hiddenReports ?? 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500 rounded-lg">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Жабылған</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.dismissedReports ?? 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Топтар</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{groupOptions.length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Іздеу: қолданушы, хабарлама, Telegram ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setGroupFilter('all')}
              className={clsx(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                groupFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              Барлық топтар
            </button>
            {groupOptions.map(([groupId, groupName]) => (
              <button
                key={groupId}
                onClick={() => setGroupFilter(groupId ?? '')}
                className={clsx(
                  'px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
                  groupFilter === groupId ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                )}
              >
                {formatDisplayLabel(groupName, formatDisplayLabel(groupId))}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={clsx(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                statusFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              Барлығы
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={clsx(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                statusFilter === 'pending' ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              Күтіп тұр
            </button>
            <button
              onClick={() => setStatusFilter('hidden')}
              className={clsx(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                statusFilter === 'hidden' ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              Жасырылған
            </button>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="recent">Ең жаңа</option>
              <option value="oldest">Ең ескі</option>
              <option value="reports">Шағымдар бойынша</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-gray-600 dark:text-gray-400">Модерация кезегі жүктелуде...</p>
          </div>
        ) : null}

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredReports.map((report) => {
            return (
              <div key={report.id} className={clsx(
                'p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                report.status === 'hidden' && 'bg-red-50/50 opacity-70 dark:bg-red-900/10'
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white">{report.username ? `@${report.username}` : 'Белгісіз қолданушы'}</p>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                            {formatDisplayLabel(report.groupName || report.groupId, 'Топ көрсетілмеген')}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                            {formatDate(report.createdAt)}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                            {formatStatusLabel(report.status)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className={clsx(
                      'text-gray-700 dark:text-gray-300',
                      report.status === 'hidden' && 'line-through text-gray-500 dark:text-gray-500'
                    )}>
                      {report.messageText}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <span>Шағым саны: {report.reportCount}</span>
                      <span>Мақсат қолданушы: {report.reportedUserTelegramId || 'көрсетілмеген'}</span>
                    </div>

                    {report.reportCount > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-orange-500 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{report.reportCount} шағым</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void handleReportAction(report, 'reviewed', 'Қарау')}
                      disabled={busyReportId === report.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 font-medium text-emerald-700 transition-colors hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-900 dark:text-emerald-200"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Қарау
                    </button>
                    <button
                      onClick={() => void handleReportAction(report, 'hidden', 'Хабарламаны жасыру')}
                      disabled={busyReportId === report.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 font-medium text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-900 dark:text-red-200"
                    >
                      <EyeOff className="w-4 h-4" />
                      Жасыру
                    </button>
                    <button
                      onClick={() => void handleReportAction(report, 'dismissed', 'Шағымды жабу')}
                      disabled={busyReportId === report.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-gray-200"
                    >
                      <Shield className="w-4 h-4" />
                      Жабу
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isLoading && filteredReports.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Модерацияға түскен шағым жоқ</p>
          </div>
        )}
      </div>
    </div>
  );
};
