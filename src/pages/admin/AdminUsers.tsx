import { useState } from 'react';
import { Search, Shield, ShieldOff, MoreVertical, Filter, User, Coins, Calendar, Zap } from 'lucide-react';
import { clsx } from 'clsx';

interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  level: number;
  coins: number;
  score: number;
  joinedAt: string;
  status: 'active' | 'blocked';
  lastActive: string;
}

const MOCK_USERS: User[] = [
  { id: '1', name: 'User_001', username: 'user001', email: 'user001@example.com', level: 25, coins: 54320, score: 98750, joinedAt: '2024-01-15', status: 'active', lastActive: '2 min ago' },
  { id: '2', name: 'User_002', username: 'user002', email: 'user002@example.com', level: 23, coins: 32100, score: 87620, joinedAt: '2024-02-10', status: 'active', lastActive: '5 min ago' },
  { id: '3', name: 'User_003', username: 'user003', email: 'user003@example.com', level: 21, coins: 28750, score: 76540, joinedAt: '2024-02-20', status: 'blocked', lastActive: '1 hour ago' },
  { id: '4', name: 'User_004', username: 'user004', email: 'user004@example.com', level: 19, coins: 19800, score: 65430, joinedAt: '2024-03-01', status: 'active', lastActive: '10 min ago' },
  { id: '5', name: 'User_005', username: 'user005', email: 'user005@example.com', level: 18, coins: 15600, score: 54320, joinedAt: '2024-03-05', status: 'active', lastActive: '15 min ago' },
  { id: '6', name: 'User_006', username: 'user006', email: 'user006@example.com', level: 15, coins: 12500, score: 43210, joinedAt: '2024-03-10', status: 'active', lastActive: '20 min ago' },
  { id: '7', name: 'User_007', username: 'user007', email: 'user007@example.com', level: 12, coins: 9800, score: 32100, joinedAt: '2024-03-15', status: 'blocked', lastActive: '1 day ago' },
  { id: '8', name: 'User_008', username: 'user008', email: 'user008@example.com', level: 10, coins: 7600, score: 21000, joinedAt: '2024-03-20', status: 'active', lastActive: '30 min ago' },
];

export const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'level' | 'coins' | 'score' | 'joined'>('name');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name': return a.name.localeCompare(b.name);
      case 'level': return b.level - a.level;
      case 'coins': return b.coins - a.coins;
      case 'score': return b.score - a.score;
      case 'joined': return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      default: return 0;
    }
  });

  const handleToggleBlock = (userId: string) => {
    setUsers(users.map(user =>
      user.id === userId
        ? { ...user, status: user.status === 'active' ? 'blocked' : 'active' }
        : user
    ));
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    blocked: users.filter(u => u.status === 'blocked').length,
    totalCoins: users.reduce((sum, u) => sum + u.coins, 0),
    totalScore: users.reduce((sum, u) => sum + u.score, 0),
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Пайдаланушыларды басқару</h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Барлығы</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Белсенді</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500 rounded-lg">
              <ShieldOff className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Блокталған</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.blocked}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Барлық монеталар</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCoins.toLocaleString()}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Барлық ұпай</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalScore.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Іздеу: аты, username, email..."
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
              onChange={(e) => setSortBy(e.target.value as any)}
              className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="name">Аты бойынша</option>
              <option value="level">Level бойынша</option>
              <option value="coins">Монеталар бойынша</option>
              <option value="score">Ұпай бойынша</option>
              <option value="joined">Қосылған уақыт</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Пайдаланушы</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Статус</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Level</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Монеталар</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Ұпай</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Соңғы белсенді</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Әрекет</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">@{user.username}</p>
                      {user.email && <p className="text-xs text-gray-500 dark:text-gray-500">{user.email}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      'inline-flex px-3 py-1 rounded-full text-xs font-semibold',
                      user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    )}>
                      {user.status === 'active' ? 'Белсенді' : 'Блокталған'}
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
                    <span className="font-semibold text-purple-500">{user.score.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {user.lastActive}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleBlock(user.id)}
                      className={clsx(
                        'inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors',
                        user.status === 'active'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                      )}
                    >
                      {user.status === 'active' ? (
                        <>
                          <ShieldOff className="w-4 h-4" />
                          Блоктау
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4" />
                          Блокты шешу
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Пайдаланушылар табылмады</p>
          </div>
        )}
      </div>
    </div>
  );
};
