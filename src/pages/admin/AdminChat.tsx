import { useState } from 'react';
import { Search, Filter, Trash2, Shield, ShieldOff, MoreVertical, MessageSquare, Users, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface Message {
  id: string;
  groupId: string;
  groupName: string;
  userId: string;
  username: string;
  text: string;
  timestamp: string;
  status: 'active' | 'deleted';
  reports?: number;
}

interface Group {
  id: string;
  name: string;
  icon: string;
  color: string;
  onlineCount: number;
  messagesCount: number;
}

const MOCK_GROUPS: Group[] = [
  { id: 'g1', name: 'Global', icon: '🌍', color: 'bg-blue-500', onlineCount: 847, messagesCount: 15420 },
  { id: 'g2', name: 'Smart People', icon: '🧠', color: 'bg-purple-500', onlineCount: 234, messagesCount: 8730 },
  { id: 'g3', name: 'Crypto Masters', icon: '💎', color: 'bg-yellow-500', onlineCount: 156, messagesCount: 5680 },
  { id: 'g4', name: 'Founding Group', icon: '👑', color: 'bg-red-500', onlineCount: 89, messagesCount: 3240 },
  { id: 'g5', name: 'Tech Enthusiasts', icon: '💻', color: 'bg-green-500', onlineCount: 312, messagesCount: 9870 },
];

const MOCK_MESSAGES: Message[] = [
  { id: 'm1', groupId: 'g1', groupName: 'Global', userId: 'u1', username: 'User_001', text: 'Hello everyone! 👋', timestamp: '2 min ago', status: 'active', reports: 0 },
  { id: 'm2', groupId: 'g2', groupName: 'Smart People', userId: 'u2', username: 'User_002', text: 'Has anyone solved level 10?', timestamp: '5 min ago', status: 'active', reports: 0 },
  { id: 'm3', groupId: 'g3', groupName: 'Crypto Masters', userId: 'u3', username: 'User_003', text: '🚀 Moon soon!', timestamp: '8 min ago', status: 'active', reports: 2 },
  { id: 'm4', groupId: 'g1', groupName: 'Global', userId: 'u4', username: 'User_004', text: 'This game is amazing!', timestamp: '10 min ago', status: 'active', reports: 0 },
  { id: 'm5', groupId: 'g2', groupName: 'Smart People', userId: 'u5', username: 'User_005', text: 'How do I get more coins?', timestamp: '12 min ago', status: 'active', reports: 0 },
  { id: 'm6', groupId: 'g3', groupName: 'Crypto Masters', userId: 'u6', username: 'User_006', text: 'Buy before dump!', timestamp: '15 min ago', status: 'deleted', reports: 5 },
  { id: 'm7', groupId: 'g4', groupName: 'Founding Group', userId: 'u7', username: 'User_007', text: 'Welcome to the founding group!', timestamp: '18 min ago', status: 'active', reports: 0 },
  { id: 'm8', groupId: 'g1', groupName: 'Global', userId: 'u8', username: 'User_008', text: 'Anyone want to play Tetris?', timestamp: '20 min ago', status: 'active', reports: 0 },
  { id: 'm9', groupId: 'g5', groupName: 'Tech Enthusiasts', userId: 'u9', username: 'User_009', text: 'Check out this new feature!', timestamp: '22 min ago', status: 'active', reports: 0 },
  { id: 'm10', groupId: 'g2', groupName: 'Smart People', userId: 'u10', username: 'User_010', text: '🧠 Brain training is important!', timestamp: '25 min ago', status: 'active', reports: 0 },
];

export const AdminChat = () => {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deleted'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'reports'>('recent');

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         message.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = groupFilter === 'all' || message.groupId === groupFilter;
    const matchesStatus = statusFilter === 'all' || message.status === statusFilter;
    return matchesSearch && matchesGroup && matchesStatus;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'recent': return -1;
      case 'oldest': return 1;
      case 'reports': return (b.reports || 0) - (a.reports || 0);
      default: return 0;
    }
  });

  const handleDeleteMessage = (messageId: string) => {
    setMessages(messages.map(msg =>
      msg.id === messageId ? { ...msg, status: 'deleted' } : msg
    ));
  };

  const handleBanUser = (userId: string) => {
    alert(`User ${userId} blocked!`);
  };

  const stats = {
    totalMessages: messages.length,
    activeMessages: messages.filter(m => m.status === 'active').length,
    deletedMessages: messages.filter(m => m.status === 'deleted').length,
    reportedMessages: messages.filter(m => (m.reports || 0) > 0).length,
    totalGroups: MOCK_GROUPS.length,
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Чат модерациясы</h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Барлық хабарламалар</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalMessages}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Белсенді хабарламалар</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeMessages}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500 rounded-lg">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Жойылған</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.deletedMessages}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500 rounded-lg">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Шағымданған</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.reportedMessages}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Топтар</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalGroups}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Іздеу: username, хабарлама..."
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
            {MOCK_GROUPS.map(group => (
              <button
                key={group.id}
                onClick={() => setGroupFilter(group.id)}
                className={clsx(
                  'px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
                  groupFilter === group.id ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                )}
              >
                <span>{group.icon}</span>
                {group.name}
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
              onClick={() => setStatusFilter('active')}
              className={clsx(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                statusFilter === 'active' ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              Белсенді
            </button>
            <button
              onClick={() => setStatusFilter('deleted')}
              className={clsx(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                statusFilter === 'deleted' ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              Жойылған
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
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredMessages.map((message) => {
            const group = MOCK_GROUPS.find(g => g.id === message.groupId);
            return (
              <div key={message.id} className={clsx(
                'p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                message.status === 'deleted' && 'opacity-60 bg-red-50 dark:bg-red-900/10'
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{group?.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white">@{message.username}</p>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                            {group?.name}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                            {message.timestamp}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className={clsx(
                      'text-gray-700 dark:text-gray-300',
                      message.status === 'deleted' && 'line-through text-gray-500 dark:text-gray-500'
                    )}>
                      {message.text}
                    </p>

                    {(message.reports || 0) > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-orange-500 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{message.reports} шағым</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {message.status === 'active' && (
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 rounded-lg font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Жою
                      </button>
                    )}
                    <button
                      onClick={() => handleBanUser(message.userId)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                    >
                      <ShieldOff className="w-4 h-4" />
                      Блоктау
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredMessages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Хабарламалар табылмады</p>
          </div>
        )}
      </div>
    </div>
  );
};
