import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { readBest } from './GameResult';
import { getDailyChallenge } from '../utils/starsApi';

/**
 * Rich game tile for the Home grid — full redesign:
 *   • per-game colour gradient + glow (each game is visually distinct)
 *   • glassmorphism (glossy top highlight, soft inner border, depth shadow)
 *   • large game emoji as the primary visual
 *   • personal-best badge (🏆 N) read from localStorage
 *   • NEW badge for the four KZ-original games
 *   • ⭐ DAILY badge on today's challenge game
 *   • VIP crown + trials remaining (unchanged behaviour)
 */

type Design = { gradient: string; glow: string; emoji: string; isNew?: boolean };

export const GAME_DESIGN: Record<string, Design> = {
  '/game/schulte':      { gradient: 'from-amber-400 to-orange-600',   glow: 'shadow-amber-500/40',   emoji: '🔢' },
  '/game/stroop':       { gradient: 'from-rose-400 to-red-600',       glow: 'shadow-rose-500/40',    emoji: '🎨' },
  '/game/memory':       { gradient: 'from-purple-400 to-fuchsia-600', glow: 'shadow-purple-500/40',  emoji: '🧠' },
  '/game/math':         { gradient: 'from-emerald-400 to-green-600',  glow: 'shadow-emerald-500/40', emoji: '➗' },
  '/game/pairs':        { gradient: 'from-pink-400 to-rose-600',      glow: 'shadow-pink-500/40',    emoji: '🃏' },
  '/game/odd-one':      { gradient: 'from-cyan-400 to-sky-600',       glow: 'shadow-cyan-500/40',    emoji: '🔍' },
  '/game/2048':         { gradient: 'from-yellow-400 to-amber-600',   glow: 'shadow-yellow-500/40',  emoji: '🔟' },
  '/game/sozkoman':     { gradient: 'from-blue-400 to-indigo-600',    glow: 'shadow-blue-500/40',    emoji: '🔠', isNew: true },
  '/game/dala-tarih':   { gradient: 'from-amber-500 to-yellow-700',   glow: 'shadow-amber-600/40',   emoji: '🏛', isNew: true },
  '/game/togyzkumalak': { gradient: 'from-orange-400 to-amber-700',   glow: 'shadow-orange-500/40',  emoji: '🪨', isNew: true },
  '/game/bagdar':       { gradient: 'from-teal-400 to-cyan-600',      glow: 'shadow-teal-500/40',    emoji: '🧭', isNew: true },
};

// One shared daily-challenge fetch across all tiles (module-level cache).
let _dailyGameId: string | null = null;
let _dailyPromise: Promise<void> | null = null;
export function useDailyGameId(): string | null {
  const [id, setId] = useState<string | null>(_dailyGameId);
  useEffect(() => {
    if (_dailyGameId) { setId(_dailyGameId); return; }
    if (!_dailyPromise) {
      _dailyPromise = getDailyChallenge().then((d) => { _dailyGameId = d.gameId; }).catch(() => {});
    }
    _dailyPromise.then(() => setId(_dailyGameId));
  }, []);
  return id;
}

export function GameTile({
  game, isVip, vipUnlimited, trialsLeft, dailyGameId, itemVariants, onClick,
}: {
  game: { title: string; path: string };
  isVip: boolean;
  vipUnlimited: boolean;
  trialsLeft: number | null;
  dailyGameId: string | null;
  itemVariants: unknown;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const d = GAME_DESIGN[game.path] || { gradient: 'from-slate-500 to-slate-700', glow: '', emoji: '🎮' };
  const gameId = game.path.replace('/game/', '');
  const best = readBest(gameId);
  const isDaily = dailyGameId === gameId;

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      variants={itemVariants as never}
      className={clsx(
        'relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl min-h-[120px]',
        'overflow-hidden border border-white/15 shadow-lg transition-transform',
        d.glow,
      )}
    >
      {/* Coloured gradient background */}
      <div className={clsx('absolute inset-0 bg-gradient-to-br', d.gradient)} />
      {/* Glossy top highlight (glassmorphism) */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
      {/* Soft inner border ring */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 pointer-events-none" />
      {/* Bottom shade for text legibility */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />

      {/* Top-row badges */}
      <div className="absolute top-1.5 left-1.5 right-1.5 z-20 flex items-start justify-between">
        <div className="flex flex-col gap-1">
          {d.isNew && (
            <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-stone-900 shadow">
              NEW
            </span>
          )}
          {isDaily && (
            <span className="rounded-md bg-violet-600 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow">
              ⭐ DAILY
            </span>
          )}
        </div>
        {isVip && (
          <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200/60 bg-amber-400/30 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-50 backdrop-blur-sm">
            <Crown size={9} /> VIP
          </span>
        )}
      </div>

      {/* Emoji */}
      <div className="relative z-10 text-4xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] mt-1.5">{d.emoji}</div>

      {/* Title */}
      <span className="relative z-10 text-[13px] font-bold text-white text-center leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] px-1">
        {t(game.title)}
      </span>

      {/* Footer line: VIP trials OR personal best */}
      <div className="relative z-10 min-h-[14px]">
        {isVip ? (
          <span className="text-[10px] font-semibold text-white/90 drop-shadow">
            {vipUnlimited ? '∞ Шексіз' : `Сынақ: ${trialsLeft}`}
          </span>
        ) : best > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold text-white/95">
            🏆 {best}
          </span>
        ) : null}
      </div>
    </motion.button>
  );
}
