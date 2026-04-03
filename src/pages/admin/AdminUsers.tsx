import { useEffect, useMemo, useState } from 'react';
import { Search, Shield, ShieldOff, Filter, User, Coins, Calendar, Zap, RefreshCcw, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { AdminManagedUser, AdminUsersResponse, getAdminUsers, setUserBlockedState } from '../../utils/adminApi';

export const AdminUsers = () => {
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'level' | 'coins' | 'xp' | 'updated'>('updated');
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const nextData = await getAdminUsers();
      setData(nextData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Пайдаланушылар жүктелмеді');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const users = data?.users || [];
    const query = searchQuery.trim().toLowerCase();

    return users
      .filter((user) => {
        const fullName = `${user.firstName} ${user.lastName || ''}`.trim().toLowerCase();
        const username = (user.username || '').toLowerCase();
        const matchesSearch =
          !query || fullName.includes(query) || username.includes(query) || String(user.telegramId).includes(query);
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'blocked' ? user.isBlocked : !user.isBlocked);

        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        switch (sortBy) {
          case 'name':
            return `${left.firstName} ${left.lastName || ''}`.localeCompare(`${right.firstName} ${right.lastName || ''}`);
          case 'level':
            return right.level - left.level;
          case 'coins':
            return right.coins - left.coins;
          case 'xp':
            return right.xp - left.xp;
          case 'updated':
          default:
            return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        }
      });
  }, [data?.users, searchQuery, sortBy, statusFilter]);

  const handleToggleBlock = async (user: AdminManagedUser) => {
    const blocked = !user.isBlocked;
    const confirmed = window.confirm(
      blocked
        ? 'Пайдаланушыны блоктағыңыз келе ме?'
        : 'Пайдаланушыны блоктан шығарғыңыз келе ме?'
    );

    if (!confirmed) {
      return;
    }

    try {
      setBusyUserId(user.telegramId);
      const response = await setUserBlockedState(
        user.telegramId,
        blocked,
        blocked ? 'admin_panel_manual_action' : undefined
      );

      setData((current) => {
        if (!current) {
          return current;
        }

        const users = current.users.map((item) =>
          item.telegramId === response.user.telegramId ? response.user : item
        );

        return {
          users,
          stats: {
            total: users.length,
            active: users.filter((item) => !item.isBlocked).length,
            blocked: users.filter((item) => item.isBlocked).length,
            totalCoins: users.reduce((sum, item) => sum + item.coins, 0),
            totalXp: users.reduce((sum, item) => sum + item.xp, 0),
          },
        };
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Пайдаланушы статусы жаңартылмады');
    } finally {
      setBusyUserId(null);
    }
  };

  const stats = data?.stats;
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Пайдаланушыларды басқару</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">`users` кестесімен тікелей синхрондалған тізім</p>
        </div>
        <button
          onClick={() => void loadUsers()}
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
              <User className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Барлығы</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.total ?? 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Белсенді</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.active ?? 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500 rounded-lg">
              <ShieldOff className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Блокталған</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.blocked ?? 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Барлық монеталар</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{(stats?.totalCoins ?? 0).toLocaleString()}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Жалпы XP</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{(stats?.totalXp ?? 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Іздеу: аты, username, Telegram ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
              onClick={() => setStatusFilter('active')}
              className={clsx(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                statusFilter === 'active' ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              Белсенді
            </button>
            <button
              onClick={() => setStatusFilter('blocked')}
              className={clsx(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                statusFilter === 'blocked' ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              Блокталған
            </button>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'level' | 'coins' | 'xp' | 'updated')}
              className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="name">Аты бойынша</option>
              <option value="level">Level бойынша</option>
              <option value="coins">Монеталар бойынша</option>
              <option value="xp">XP бойынша</option>
              <option value="updated">Соңғы белсенділік</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-gray-600 dark:text-gray-400">Пайдаланушылар жүктелуде...</p>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Пайдаланушы</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Статус</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Level</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Монеталар</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">XP</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Соңғы белсенді</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Әрекет</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.telegramId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{`${user.firstName} ${user.lastName || ''}`.trim()}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{user.username ? `@${user.username}` : 'username жоқ'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Telegram ID: {user.telegramId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      'inline-flex px-3 py-1 rounded-full text-xs font-semibold',
                      user.isBlocked ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    )}>
                      {user.isBlocked ? 'Блокталған' : 'Белсенді'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs font-semibold">
                      Lvl {user.level}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      <span className="font-semibold text-gray-900 dark:text-white">{user.coins.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-purple-500">{user.xp.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {formatDate(user.updatedAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => void handleToggleBlock(user)}
                      disabled={busyUserId === user.telegramId}
                      className={clsx(
                        'inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors',
                        user.isBlocked
                          ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200',
                        busyUserId === user.telegramId && 'cursor-not-allowed opacity-60'
                      )}
                    >
                      {user.isBlocked ? (
                        <>
                          <Shield className="w-4 h-4" />
                          Блокты шешу
                        </>
                      ) : (
                        <>
                          <ShieldOff className="w-4 h-4" />
                          Блоктау
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Пайдаланушылар табылмады</p>
          </div>
        )}
      </div>
    </div>
  );
};
