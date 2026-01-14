import { useMemo } from 'react';
import { BarChart2, Gamepad2, PlayCircle, TrendingUp, Coins, Clock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { clsx } from 'clsx';

const GAME_LABELS: Record<string, string> = {
  schulte: 'Schulte Table',
  math: 'Arithmetic',
  stroop: 'Stroop Test',
  memory: 'Memory Matrix',
  odd_one_out: 'Odd One Out',
  odd_one_out_level: 'Odd One Out (Level Rewards)',
  pairs: 'Pairs',
  tetris: 'Tetris',
};

interface GameAggregatedStats {
  gameId: string;
  name: string;
  plays: number;
  totalScore: number;
  avgScore: number;
  totalCoinsEarned: number;
  // Бізде нақты «ақша салу» логы жоқ, сондықтан шартты түрде
  // премиум жоспарлар мен skin сатып алуларын «ақша салған» дерек деп санауға болады.
}

export const AdminGames = () => {
  const { history, plan, coins, fecBalance } = useStore();

  const gameStats: GameAggregatedStats[] = useMemo(() => {
    const map = new Map<string, GameAggregatedStats>();

    history.forEach((h) => {
      const id = h.gameId;
      const existing = map.get(id) || {
        gameId: id,
        name: GAME_LABELS[id] || id,
        plays: 0,
        totalScore: 0,
        avgScore: 0,
        totalCoinsEarned: 0,
      };

      const numericScore =
        typeof h.score === 'number'
          ? h.score
          : parseFloat(
              String(h.score)
                .replace(/[^0-9.]/g, '')
                .trim() || '0'
            );

      const updated: GameAggregatedStats = {
        ...existing,
        plays: existing.plays + 1,
        totalScore: existing.totalScore + (isNaN(numericScore) ? 0 : numericScore),
        avgScore:
          (existing.totalScore + (isNaN(numericScore) ? 0 : numericScore)) /
          (existing.plays + 1),
        totalCoinsEarned: existing.totalCoinsEarned + (h.coinsEarned || 0),
      };

      map.set(id, updated);
    });

    return Array.from(map.values()).sort((a, b) => b.plays - a.plays);
  }, [history]);

  const totalPlays = gameStats.reduce((sum, g) => sum + g.plays, 0);
  const totalCoinsEarned = gameStats.reduce((sum, g) => sum + g.totalCoinsEarned, 0);

  const estimatedMoneySpent = useMemo(() => {
    // Нақты төлем интеграциясы жоқ, сондықтан шамамен:
    // Премиум жоспарға өткен болса, шартты түрде:
    // silver = 5$, gold = 10$, premium = 20$ деп көрсетеміз.
    switch (plan) {
      case 'silver':
        return 5;
      case 'gold':
        return 10;
      case 'premium':
        return 20;
      default:
        return 0;
    }
  }, [plan]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Ойын статистикасы
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <PlayCircle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">
              Барлық ойындар
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalPlays}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">
              Ойыннан табылған монеталар
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {totalCoinsEarned.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500 rounded-lg">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">
              Қазіргі монеталар
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {coins.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">
              Шамамен салған ақша
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ${estimatedMoneySpent.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Бұл мән тек жоспарға қарай шамамен есептелген (нақты төлем логы жоқ).
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Ойындар бойынша статистика
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Ойын
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Ойналған реті
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Орташа ұпай
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Барлық ұпай (шартты)
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Ойыннан табылған монеталар
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {gameStats.map((game) => (
                <tr
                  key={game.gameId}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Gamepad2 className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {game.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {game.gameId}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {game.plays}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {isNaN(game.avgScore) ? '-' : game.avgScore.toFixed(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-purple-500">
                      {game.totalScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {game.totalCoinsEarned.toLocaleString()}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {gameStats.length === 0 && (
          <div className="text-center py-12">
            <Gamepad2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Әзірге ойын тарихы жоқ
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

