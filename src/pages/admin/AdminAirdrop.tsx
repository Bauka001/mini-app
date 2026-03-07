import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Users, TrendingUp, CheckCircle, XCircle, AlertCircle, Send, Download, Upload } from 'lucide-react';
import { generateRandomAirdrops, calculateAirdropStats, AirdropConfig } from '../../utils/airdrop';

export default function AdminAirdrop() {
  const [config, setConfig] = useState<AirdropConfig>({
    totalUsers: 1000000,
    minReward: 100,
    maxReward: 5000,
    totalBudget: 100000000,
    currency: 'coins'
  });
  
  const [airdrops, setAirdrops] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const mockUsers = Array.from({ length: Math.min(100, config.totalUsers) }, (_, i) => ({
        id: 1000000 + i,
        username: `user_${1000000 + i}`,
        firstName: `User ${i + 1}`
      }));

      const generated = generateRandomAirdrops(mockUsers, config);
      setAirdrops(generated);
      setStats(calculateAirdropStats(generated));
      setIsGenerating(false);
    }, 1500);
  };

  const handleSendAirdrop = () => {
    if (confirm(`Вы уверены, что хотите разослать айдроп ${airdrops.length} пользователям?`)) {
      setIsSending(true);
      
      setTimeout(() => {
        const updated = airdrops.map(a => ({ ...a, status: 'sent' as const }));
        setAirdrops(updated);
        setStats(calculateAirdropStats(updated));
        setIsSending(false);
        alert('Айдроп успешно разослан!');
      }, 3000);
    }
  };

  const handleExportCSV = () => {
    const headers = ['User ID', 'Username', 'First Name', 'Reward', 'Status', 'Timestamp'];
    const rows = airdrops.map(a => [
      a.userId,
      a.username || '',
      a.firstName || '',
      a.reward,
      a.status,
      a.timestamp
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `airdrop-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Airdrop Басқарушы</h1>
          <p className="text-gray-400 mt-1">Миллиондаған пайдаланушыға сыйақы тарату</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            disabled={airdrops.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={20} />
            Экспорт
          </button>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <AlertCircle size={24} className="text-yellow-500" />
          Конфигурация
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2">Пайдаланушылар саны</label>
            <input
              type="number"
              value={config.totalUsers}
              onChange={(e) => setConfig({ ...config, totalUsers: parseInt(e.target.value) })}
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-primary"
              min="1"
              max="10000000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2">Мин. сыйақы</label>
            <input
              type="number"
              value={config.minReward}
              onChange={(e) => setConfig({ ...config, minReward: parseInt(e.target.value) })}
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-primary"
              min="1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2">Макс. сыйақы</label>
            <input
              type="number"
              value={config.maxReward}
              onChange={(e) => setConfig({ ...config, maxReward: parseInt(e.target.value) })}
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-primary"
              min="1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2">Бюджет</label>
            <input
              type="number"
              value={config.totalBudget}
              onChange={(e) => setConfig({ ...config, totalBudget: parseInt(e.target.value) })}
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-primary"
              min="1"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-black/30 border-t-primary rounded-full animate-spin" />
                Генерациялау...
              </>
            ) : (
              <>
                <Gift size={20} />
                Генерациялау
              </>
            )}
          </button>

          <button
            onClick={handleSendAirdrop}
            disabled={airdrops.length === 0 || isSending}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 text-black font-bold rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <div className="w-5 h-5 border-2 border-black/30 border-t-green-300 rounded-full animate-spin" />
                Жіберуде...
              </>
            ) : (
              <>
                <Send size={20} />
                Айдроп жіберу
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <AnimatePresence>
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl p-6 border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm font-bold">Пайдаланушылар</span>
                <Users size={24} className="text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats.totalRecipients.toLocaleString()}</div>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl p-6 border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm font-bold">Жалпы сыйақы</span>
                <TrendingUp size={24} className="text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats.totalAmount.toLocaleString()}</div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-2xl p-6 border border-yellow-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm font-bold">Орташа</span>
                <Gift size={24} className="text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats.averageAmount.toFixed(0)}</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl p-6 border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm font-bold">Күту</span>
                <AlertCircle size={24} className="text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats.pendingCount}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Airdrops List */}
      {airdrops.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-xl font-bold text-white">Айдроп тізімі</h3>
            <p className="text-gray-400 text-sm">Ашық {airdrops.length} пайдаланушы</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-400">User ID</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-400">Username</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-400">Сыйақы</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-400">Күй</th>
                </tr>
              </thead>
              <tbody>
                {airdrops.map((airdrop, index) => (
                  <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-white font-mono text-sm">{airdrop.userId}</td>
                    <td className="px-4 py-3 text-white text-sm">
                      {airdrop.username || airdrop.firstName || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-primary font-bold">{airdrop.reward.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {airdrop.status === 'sent' ? (
                        <span className="flex items-center gap-1 text-green-400 text-sm font-bold">
                          <CheckCircle size={16} /> Жіберілді
                        </span>
                      ) : airdrop.status === 'failed' ? (
                        <span className="flex items-center gap-1 text-red-400 text-sm font-bold">
                          <XCircle size={16} /> Сәтсіз
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                          <AlertCircle size={16} /> Күту
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
