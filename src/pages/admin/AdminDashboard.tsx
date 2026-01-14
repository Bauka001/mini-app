import { Users, MessageSquare, Gamepad2, TrendingUp, Award, Activity } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: any;
  color: string;
  trend?: string;
}

const StatCard = ({ title, value, icon: Icon, color, trend }: StatCardProps) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-green-500 text-sm">
          <TrendingUp className="w-4 h-4" />
          {trend}
        </div>
      )}
    </div>
    <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">{title}</h3>
    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
  </div>
);

export const AdminDashboard = () => {
  const stats = [
    { title: 'Total Users', value: '12,458', icon: Users, color: 'bg-blue-500', trend: '+12%' },
    { title: 'Online Users', value: '847', icon: Activity, color: 'bg-green-500', trend: '+5%' },
    { title: 'Messages Today', value: '3,291', icon: MessageSquare, color: 'bg-purple-500', trend: '+8%' },
    { title: 'Games Played', value: '5,672', icon: Gamepad2, color: 'bg-orange-500', trend: '+15%' },
    { title: 'Total Score', value: '892,450', icon: Award, color: 'bg-yellow-500', trend: '+20%' },
  ];

  const recentActivity = [
    { id: 1, user: 'User_123', action: 'earned 50 coins', time: '2 min ago' },
    { id: 2, user: 'User_456', action: 'completed Tetris level 5', time: '5 min ago' },
    { id: 3, user: 'User_789', action: 'watched an ad', time: '8 min ago' },
    { id: 4, user: 'User_321', action: 'joined Crypto Masters chat', time: '10 min ago' },
    { id: 5, user: 'User_654', action: 'reached level 10', time: '15 min ago' },
  ];

  const topPlayers = [
    { rank: 1, name: 'User_001', score: 98750, level: 25 },
    { rank: 2, name: 'User_002', score: 87620, level: 23 },
    { rank: 3, name: 'User_003', score: 76540, level: 21 },
    { rank: 4, name: 'User_004', score: 65430, level: 19 },
    { rank: 5, name: 'User_005', score: 54320, level: 18 },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{activity.user}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{activity.action}</p>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Players</h3>
          <div className="space-y-3">
            {topPlayers.map((player) => (
              <div key={player.rank} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    player.rank === 1 ? 'bg-yellow-500' : player.rank === 2 ? 'bg-gray-400' : player.rank === 3 ? 'bg-amber-600' : 'bg-gray-500'
                  }`}>
                    {player.rank}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{player.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Level {player.level}</p>
                  </div>
                </div>
                <span className="font-bold text-blue-500">{player.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
