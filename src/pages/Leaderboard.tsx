import { Trophy, Crown, Medal } from 'lucide-react';
import { useStore } from '../store/useStoreImpl';
import { useMemo } from 'react';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { claudeTokens } from '../components/ui/claudeTokens';

// Mock Leaderboard Data
const MOCK_LEADERBOARD = [
  { id: 101, name: 'Alice', xp: 15400, level: 15, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice' },
  { id: 102, name: 'Bob', xp: 12300, level: 12, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
  { id: 103, name: 'Charlie', xp: 11200, level: 11, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie' },
  { id: 104, name: 'David', xp: 9500, level: 9, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' },
  { id: 105, name: 'Eve', xp: 8700, level: 8, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eve' },
];

const LeaderboardPage = () => {
  const { user } = useStore();
  const { isClaude } = useThemeStyles();
  const userInTop5 = MOCK_LEADERBOARD.some((u) => u.id === user.id);
  const displayList = useMemo(
    () => [...MOCK_LEADERBOARD].sort((a, b) => b.xp - a.xp),
    []
  );

  if (isClaude) {
    return (
      <div
        className="min-h-screen pb-24"
        style={{ backgroundColor: claudeTokens.surface, color: claudeTokens.textPrimary }}
      >
        <header
          className="sticky top-0 z-10 px-5 py-5 backdrop-blur-md"
          style={{
            backgroundColor: 'rgba(250, 249, 245, 0.92)',
            borderBottom: `1px solid ${claudeTokens.border}`,
          }}
        >
          <span
            className="text-[10px] font-medium uppercase tracking-[0.22em]"
            style={{ color: claudeTokens.textMuted }}
          >
            This week
          </span>
          <h1
            className="mt-1 leading-none tracking-tight flex items-center gap-3"
            style={{
              color: claudeTokens.textPrimary,
              fontFamily: claudeTokens.serifStack,
              fontSize: '30px',
              fontWeight: 500,
            }}
          >
            <Trophy size={22} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
            Leaderboard
          </h1>
        </header>

        <div className="px-5 pt-6">
          {/* Editorial podium — three columns of equal cream cards, ranks set
              in chapter numerals, single terracotta crown above #1, no neon. */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[1, 0, 2].map((displayIdx, slotIdx) => {
              const player = displayList[displayIdx];
              const rank = displayIdx + 1;
              const isFirst = displayIdx === 0;
              return (
                <div
                  key={player.id}
                  className="relative rounded-xl p-4 flex flex-col items-center"
                  style={{
                    backgroundColor: claudeTokens.surface,
                    border: `1px solid ${isFirst ? claudeTokens.accent : claudeTokens.border}`,
                    transform: slotIdx === 1 ? 'translateY(-12px)' : undefined,
                  }}
                >
                  {isFirst && (
                    <Crown
                      size={18}
                      strokeWidth={1.75}
                      className="absolute -top-3"
                      style={{ color: claudeTokens.accent, fill: claudeTokens.accent }}
                    />
                  )}
                  <span
                    className="text-[10px] tracking-[0.22em] uppercase"
                    style={{
                      color: isFirst ? claudeTokens.accent : claudeTokens.textMuted,
                      fontFamily: claudeTokens.serifStack,
                    }}
                  >
                    № {rank}
                  </span>
                  <div
                    className="w-14 h-14 rounded-full overflow-hidden mt-2"
                    style={{
                      backgroundColor: claudeTokens.surfaceMuted,
                      border: `1px solid ${claudeTokens.borderStrong}`,
                    }}
                  >
                    <img src={player.avatar} alt={player.name} className="w-full h-full" />
                  </div>
                  <span
                    className="mt-2 text-[14px] truncate w-full text-center italic"
                    style={{
                      color: claudeTokens.textPrimary,
                      fontFamily: claudeTokens.serifStack,
                      fontWeight: 500,
                    }}
                  >
                    {player.name}
                  </span>
                  <span
                    className="text-[11px] tabular-nums"
                    style={{
                      color: claudeTokens.textMuted,
                      fontFamily: claudeTokens.serifStack,
                      fontFeatureSettings: '"lnum","tnum"',
                    }}
                  >
                    {player.xp.toLocaleString()} XP
                  </span>
                </div>
              );
            })}
          </div>

          {/* Hairline list for the rest */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: claudeTokens.surface, border: `1px solid ${claudeTokens.border}` }}
          >
            {displayList.slice(3).map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-4"
                style={{
                  borderBottom:
                    index < displayList.slice(3).length - 1
                      ? `1px solid ${claudeTokens.border}`
                      : 'none',
                }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span
                    className="w-8 text-[14px] tabular-nums"
                    style={{
                      color: claudeTokens.textMuted,
                      fontFamily: claudeTokens.serifStack,
                      fontWeight: 500,
                    }}
                  >
                    {index + 4}
                  </span>
                  <div
                    className="w-9 h-9 rounded-full overflow-hidden shrink-0"
                    style={{
                      backgroundColor: claudeTokens.surfaceMuted,
                      border: `1px solid ${claudeTokens.border}`,
                    }}
                  >
                    <img src={player.avatar} alt={player.name} className="w-full h-full" />
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-[14px] truncate"
                      style={{ color: claudeTokens.textPrimary, fontWeight: 500 }}
                    >
                      {player.name}
                    </div>
                    <div className="text-[11px]" style={{ color: claudeTokens.textMuted }}>
                      Level {player.level}
                    </div>
                  </div>
                </div>
                <div
                  className="text-[14px] tabular-nums"
                  style={{
                    color: claudeTokens.accent,
                    fontFamily: claudeTokens.serifStack,
                    fontWeight: 500,
                    fontFeatureSettings: '"lnum","tnum"',
                  }}
                >
                  {player.xp.toLocaleString()} XP
                </div>
              </div>
            ))}
          </div>

          {!userInTop5 && (
            <div className="sticky bottom-24 mt-5">
              <div
                className="rounded-2xl p-4 flex items-center justify-between backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(240, 238, 230, 0.92)',
                  border: `1px solid ${claudeTokens.accent}`,
                }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span
                    className="w-8 text-center text-[14px]"
                    style={{
                      color: claudeTokens.accent,
                      fontFamily: claudeTokens.serifStack,
                      fontWeight: 500,
                    }}
                  >
                    —
                  </span>
                  <div
                    className="w-9 h-9 rounded-full overflow-hidden shrink-0"
                    style={{ border: `1px solid ${claudeTokens.accent}` }}
                  >
                    <img
                      src={
                        user.photoUrl ||
                        'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
                      }
                      alt="Me"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-[14px] truncate"
                      style={{ color: claudeTokens.textPrimary, fontWeight: 500 }}
                    >
                      {user.firstName} <span className="italic" style={{ color: claudeTokens.textMuted }}>(you)</span>
                    </div>
                    <div className="text-[11px]" style={{ color: claudeTokens.textMuted }}>
                      Level {user.level}
                    </div>
                  </div>
                </div>
                <div
                  className="text-[14px] tabular-nums"
                  style={{
                    color: claudeTokens.accent,
                    fontFamily: claudeTokens.serifStack,
                    fontWeight: 500,
                    fontFeatureSettings: '"lnum","tnum"',
                  }}
                >
                  {user.xp.toLocaleString()} XP
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Legacy themes — original markup
  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown size={24} className="text-yellow-400 fill-yellow-400" />;
      case 1: return <Medal size={24} className="text-gray-300 fill-gray-300" />;
      case 2: return <Medal size={24} className="text-orange-400 fill-orange-400" />;
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
              <div className="w-16 h-16 rounded-full border-2 border-gray-300 overflow-hidden mb-2 relative">
                 <img src={displayList[1].avatar} alt={displayList[1].name} className="w-full h-full" />
                 <div className="absolute bottom-0 w-full bg-gray-300 text-black text-[10px] font-bold text-center">2</div>
              </div>
              <span className="font-bold text-sm">{displayList[1].name}</span>
              <span className="text-xs text-gray-400">{displayList[1].xp} XP</span>
              <div className="w-12 h-24 bg-gray-300/20 rounded-t-lg mt-2 border-t border-gray-300/50" />
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <div className="relative">
                 <Crown size={32} className="text-yellow-400 absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce" />
                 <div className="w-20 h-20 rounded-full border-4 border-yellow-400 overflow-hidden mb-2 relative shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                    <img src={displayList[0].avatar} alt={displayList[0].name} className="w-full h-full" />
                 </div>
              </div>
              <span className="font-bold text-lg text-yellow-400">{displayList[0].name}</span>
              <span className="text-xs text-gray-400">{displayList[0].xp} XP</span>
              <div className="w-16 h-32 bg-yellow-400/20 rounded-t-lg mt-2 border-t border-yellow-400/50 relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/10 to-transparent" />
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-2 border-orange-400 overflow-hidden mb-2 relative">
                 <img src={displayList[2].avatar} alt={displayList[2].name} className="w-full h-full" />
                 <div className="absolute bottom-0 w-full bg-orange-400 text-black text-[10px] font-bold text-center">3</div>
              </div>
              <span className="font-bold text-sm">{displayList[2].name}</span>
              <span className="text-xs text-gray-400">{displayList[2].xp} XP</span>
              <div className="w-12 h-16 bg-orange-400/20 rounded-t-lg mt-2 border-t border-orange-400/50" />
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
                    <img src={user.photoUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} alt="Me" className="w-full h-full" />
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
