import { Trophy, Crown, Medal } from 'lucide-react';
import { useStore } from '../store/useStoreImpl';
import { useMemo } from 'react';
import { getDefaultAvatarUrl } from '../constants/avatars';

// Mock Leaderboard Data
const MOCK_LEADERBOARD = [
  { id: 101, name: 'Alice', xp: 15400, level: 15, avatar: getDefaultAvatarUrl('Alice') },
  { id: 102, name: 'Bob', xp: 12300, level: 12, avatar: getDefaultAvatarUrl('Bob') },
  { id: 103, name: 'Charlie', xp: 11200, level: 11, avatar: getDefaultAvatarUrl('Charlie') },
  { id: 104, name: 'David', xp: 9500, level: 9, avatar: getDefaultAvatarUrl('David') },
  { id: 105, name: 'Eve', xp: 8700, level: 8, avatar: getDefaultAvatarUrl('Eve') },
];

const LeaderboardPage = () => {
  const { user } = useStore();
  const userInTop5 = MOCK_LEADERBOARD.some(u => u.id === user.id);
  const displayList = useMemo(
    () => [...MOCK_LEADERBOARD].sort((a, b) => b.xp - a.xp),
    []
  );

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown size={24} className="text-yellow-500 fill-yellow-500" />;
      case 1: return <Medal size={24} className="text-slate-400 fill-slate-400" />;
      case 2: return <Medal size={24} className="text-amber-700 fill-amber-700" />;
      default: return <span className="text-lg font-bold text-gray-500 w-6 text-center">{index + 1}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-5">
      <header className="mb-8 pt-4">
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Trophy className="text-primary" size={32} />
          Leaderboard
        </h1>
        <p className="text-gray-400 text-sm mt-1">Top players this week</p>
      </header>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Top 3 Podium */}
          <div className="flex justify-center items-end gap-4 mb-10 mt-8">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-2 border-slate-400 overflow-hidden mb-2 relative">
                 <img src={displayList[1].avatar} alt={displayList[1].name} className="w-full h-full" />
                 <div className="absolute bottom-0 w-full bg-slate-400 text-black text-[10px] font-bold text-center">2</div>
              </div>
              <span className="font-bold text-sm text-slate-300">{displayList[1].name}</span>
              <span className="text-xs text-gray-400">{displayList[1].xp} XP</span>
              <div className="w-12 h-24 bg-slate-400/20 rounded-t-lg mt-2 border-t border-slate-400/50" />
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <div className="relative">
                 <Crown size={32} className="text-yellow-500 absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce" />
                 <div className="w-20 h-20 rounded-full border-4 border-yellow-500 overflow-hidden mb-2 relative shadow-[0_0_20px_rgba(234,179,8,0.5)]">
                    <img src={displayList[0].avatar} alt={displayList[0].name} className="w-full h-full" />
                 </div>
              </div>
              <span className="font-bold text-lg text-yellow-500">{displayList[0].name}</span>
              <span className="text-xs text-gray-400">{displayList[0].xp} XP</span>
              <div className="w-16 h-32 bg-yellow-500/20 rounded-t-lg mt-2 border-t border-yellow-500/50 relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent" />
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-2 border-amber-700 overflow-hidden mb-2 relative">
                 <img src={displayList[2].avatar} alt={displayList[2].name} className="w-full h-full" />
                 <div className="absolute bottom-0 w-full bg-amber-700 text-white text-[10px] font-bold text-center">3</div>
              </div>
              <span className="font-bold text-sm text-amber-600">{displayList[2].name}</span>
              <span className="text-xs text-gray-400">{displayList[2].xp} XP</span>
              <div className="w-12 h-16 bg-amber-700/20 rounded-t-lg mt-2 border-t border-amber-700/50" />
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {displayList.slice(3).map((player, index) => (
              <div key={player.id} className="bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-4">
                  {getRankIcon(index + 3)}
                  <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                    <img src={player.avatar} alt={player.name} className="w-full h-full" />
                  </div>
                  <div>
                    <div className="font-bold text-white">{player.name}</div>
                    <div className="text-xs text-gray-400">Lvl {player.level}</div>
                  </div>
                </div>
                <div className="font-mono font-bold text-primary">{player.xp} XP</div>
              </div>
            ))}
          </div>

          {/* Current User Fixed at Bottom */}
          {!userInTop5 && (
            <div className="sticky bottom-24 mt-6">
              <div className="bg-primary/20 backdrop-blur-xl p-4 rounded-2xl flex items-center justify-between border border-primary/50 shadow-lg">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-white w-6 text-center">?</span>
                  <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden border-2 border-primary">
                    <img src={user.photoUrl || getDefaultAvatarUrl('Felix')} alt="Me" className="w-full h-full" />
                  </div>
                  <div>
                    <div className="font-bold text-white">{user.firstName} (You)</div>
                    <div className="text-xs text-gray-300">Lvl {user.level}</div>
                  </div>
                </div>
                <div className="font-mono font-bold text-primary">{user.xp} XP</div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
