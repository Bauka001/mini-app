import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Trophy, ChevronRight, Crown } from 'lucide-react';
import { clsx } from 'clsx';
import WebApp from '@twa-dev/sdk';
import { getDailyChallenge, type DailyChallenge } from '../utils/starsApi';

/**
 * Daily Challenge card — the primary daily-retention hook on Home.
 *
 * Shows today's designated game, the user's streak (🔥), today's reward, and a
 * peek at the live leaderboard. Tapping it launches the game with ?daily=1 so
 * GameWrapper submits the score to the daily leaderboard on finish.
 *
 * Self-refreshes on mount; the score submit happens inside GameWrapper, so
 * coming back to Home re-fetches the updated streak / played state.
 */
export function DailyChallengeCard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getDailyChallenge()
      .then((d) => { if (active) setData(d); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading || !data) {
    return (
      <div className="mx-4 mb-3 h-24 rounded-2xl bg-white/5 animate-pulse" />
    );
  }

  const play = () => {
    WebApp.HapticFeedback?.impactOccurred?.('medium');
    navigate(`/game/${data.gameId}?daily=1`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-3 rounded-2xl overflow-hidden border-2 border-amber-400/40 bg-gradient-to-br from-violet-600/25 via-fuchsia-600/15 to-amber-500/15 shadow-lg"
    >
      {/* Header row */}
      <button onClick={play} className="w-full text-left p-4 active:scale-[0.99] transition-transform">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
              🗓 Күн челленджі
            </span>
            {data.streak > 0 && (
              <span className="flex items-center gap-1 text-sm font-black text-orange-300">
                <Flame size={16} fill="currentColor" /> {data.streak}
              </span>
            )}
          </div>
          <ChevronRight size={20} className="text-white/50" />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-black text-white leading-tight">{data.gameLabel}</div>
            <div className="text-xs text-white/70 mt-0.5">
              {data.played
                ? <>✓ Бүгін ойнадыңыз · #{data.myRank} / {data.totalPlayers}</>
                : <>🎁 +{data.rewardFocus} $FOCUS · +{data.rewardCoins} монета</>}
            </div>
          </div>
          <div className={clsx(
            'rounded-xl px-4 py-2 text-sm font-black shadow-md',
            data.played
              ? 'bg-emerald-500/30 text-emerald-100 border border-emerald-400/40'
              : 'bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950',
          )}>
            {data.played ? 'Қайта' : 'Ойнау'}
          </div>
        </div>
      </button>

      {/* Mini leaderboard peek */}
      {data.leaderboard.length > 0 && (
        <div className="border-t border-white/10 px-4 py-2.5 bg-black/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Trophy size={12} className="text-amber-400" />
            <span className="text-[10px] uppercase tracking-wider text-white/60 font-bold">Бүгінгі топ</span>
          </div>
          <div className="space-y-1">
            {data.leaderboard.slice(0, 3).map((row) => (
              <div key={row.rank} className={clsx(
                'flex items-center justify-between text-xs',
                row.isMe ? 'text-amber-200 font-bold' : 'text-white/75',
              )}>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 text-center">
                    {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : row.rank}
                  </span>
                  {row.name}{row.isMe ? ' (сіз)' : ''}
                </span>
                <span className="font-mono">{row.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
