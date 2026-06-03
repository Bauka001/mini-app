import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';

/**
 * Rating tier + personal-best UI for the post-game screen.
 *
 *   - extractScore() turns the GameWrapper's mixed `lastScore` (string |
 *     number | object) into a single numeric value so a Schulte time string
 *     like "23.45s" doesn't break the tier calculation.
 *
 *   - scoreToTier() maps the numeric score into Bronze → Diamond. Each tier
 *     has a colour, icon and label used by both the badge and the confetti.
 *
 *   - rememberBest() / readBest() persists per-game best in localStorage
 *     so the next play can compare. No server round-trip needed — the
 *     leaderboard tournament still trusts server-side history.
 *
 *   - <Confetti /> renders a one-shot particle burst when the result tier
 *     is Gold or higher. Pure framer-motion, no extra library.
 */

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

const TIER_CONFIG: Record<Tier, { label: string; gradient: string; ring: string; icon: string; threshold: number }> = {
  bronze:   { label: 'Бронза',  gradient: 'from-amber-700 to-amber-900',   ring: 'ring-amber-500/60',  icon: '🥉', threshold: 0   },
  silver:   { label: 'Күміс',   gradient: 'from-stone-300 to-stone-500',   ring: 'ring-stone-300/60', icon: '🥈', threshold: 51  },
  gold:     { label: 'Алтын',   gradient: 'from-yellow-300 to-yellow-600', ring: 'ring-yellow-400/70', icon: '🥇', threshold: 151 },
  platinum: { label: 'Платина', gradient: 'from-cyan-200 to-cyan-500',     ring: 'ring-cyan-300/70',   icon: '🏆', threshold: 301 },
  diamond:  { label: 'Алмаз',   gradient: 'from-fuchsia-300 to-fuchsia-600', ring: 'ring-fuchsia-400/80', icon: '💎', threshold: 501 },
};

export const scoreToTier = (n: number): Tier => {
  if (n >= TIER_CONFIG.diamond.threshold) return 'diamond';
  if (n >= TIER_CONFIG.platinum.threshold) return 'platinum';
  if (n >= TIER_CONFIG.gold.threshold) return 'gold';
  if (n >= TIER_CONFIG.silver.threshold) return 'silver';
  return 'bronze';
};

export const extractScore = (s: unknown): number => {
  if (typeof s === 'number') return Math.round(s);
  if (typeof s === 'string') {
    // Prefer trailing numbers ("23.45s" → 23.45 then * inverted for time games)
    const m = /-?\d+(?:\.\d+)?/.exec(s);
    if (m) {
      const v = parseFloat(m[0]);
      // For Schulte the score is seconds — invert so faster = higher tier
      if (/\d+(?:\.\d+)?s$/.test(s)) {
        // 60s → 0, 0s → 1000
        return Math.max(0, Math.round((60 - v) * 16.67));
      }
      return Math.round(v);
    }
  }
  return 0;
};

const BEST_KEY = (gameId: string) => `focus-best:${gameId}`;

export const readBest = (gameId: string): number => {
  if (typeof localStorage === 'undefined') return 0;
  try { return parseInt(localStorage.getItem(BEST_KEY(gameId)) || '0', 10) || 0; } catch { return 0; }
};

export const rememberBest = (gameId: string, score: number): boolean => {
  if (typeof localStorage === 'undefined') return false;
  try {
    const prev = readBest(gameId);
    if (score > prev) {
      localStorage.setItem(BEST_KEY(gameId), String(score));
      return true;
    }
  } catch {}
  return false;
};

/* ──────────── UI bits ──────────── */

export const TierBadge = ({ tier, large = false }: { tier: Tier; large?: boolean }) => {
  const c = TIER_CONFIG[tier];
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.1 }}
      className={clsx(
        'rounded-full flex flex-col items-center justify-center shadow-2xl ring-4',
        c.ring,
        large ? 'w-32 h-32' : 'w-20 h-20',
      )}
      style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
    >
      <div className={clsx('rounded-full bg-gradient-to-br', c.gradient, 'w-full h-full flex flex-col items-center justify-center')}>
        <div className={large ? 'text-5xl' : 'text-3xl'}>{c.icon}</div>
        <div className={clsx('font-black uppercase tracking-wider', large ? 'text-xs mt-1' : 'text-[8px]')}>
          {c.label}
        </div>
      </div>
    </motion.div>
  );
};

export const PersonalBestPill = ({ best, current, isNewBest }: { best: number; current: number; isNewBest: boolean }) => {
  if (isNewBest) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-rose-400 text-stone-950 text-xs font-black uppercase tracking-wider shadow-lg"
      >
        <motion.span
          animate={{ scale: [1, 1.2, 1], rotate: [0, 15, -10, 0] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        >🔥</motion.span>
        Жаңа рекорд! {current}
      </motion.div>
    );
  }
  if (best > 0) {
    return (
      <div className="text-[11px] text-stone-400">
        Жеке рекорд: <span className="font-bold text-amber-300">{best}</span>
        {current > 0 && current < best && (
          <span className="text-stone-500"> · бұл рет −{best - current}</span>
        )}
      </div>
    );
  }
  return null;
};

/* ──────────── Confetti ──────────── */

const PARTICLE_COUNT = 26;

export const Confetti = ({ tier }: { tier: Tier }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  const isHigh = tier === 'gold' || tier === 'platinum' || tier === 'diamond';
  if (!isHigh) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const left = Math.random() * 100;
        const colour = ['#f59e0b', '#ef4444', '#22d3ee', '#a855f7', '#fde68a'][i % 5];
        const size = 6 + Math.random() * 10;
        const duration = 2.4 + Math.random() * 1.6;
        const delay = Math.random() * 0.5;
        const xDrift = (Math.random() - 0.5) * 80;
        return (
          <motion.div
            key={i}
            initial={{ y: -40, x: 0, rotate: 0, opacity: 1 }}
            animate={{ y: '110vh', x: xDrift, rotate: 720, opacity: [1, 1, 0] }}
            transition={{ duration, delay, ease: 'easeIn' }}
            style={{
              position: 'absolute',
              top: 0,
              left: `${left}%`,
              width: size,
              height: size * 0.5,
              background: colour,
              borderRadius: 2,
              boxShadow: `0 0 6px ${colour}`,
            }}
          />
        );
      })}
    </div>
  );
};

export const RewardLine = ({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: 'primary' | 'gem' | 'focus' }) => (
  <div className={clsx(
    'flex items-center justify-between gap-2 px-3 py-2 rounded-xl border',
    tone === 'primary' && 'bg-amber-500/10 border-amber-500/30',
    tone === 'gem' && 'bg-cyan-500/10 border-cyan-500/30',
    tone === 'focus' && 'bg-fuchsia-500/10 border-fuchsia-500/30',
  )}>
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <span className="text-xs text-stone-300 uppercase tracking-wider">{label}</span>
    </div>
    <span className={clsx('text-base font-black',
      tone === 'primary' && 'text-amber-300',
      tone === 'gem' && 'text-cyan-300',
      tone === 'focus' && 'text-fuchsia-300',
    )}>{value}</span>
  </div>
);

export const useGameResult = (gameId: string, lastScore: unknown, lastCoins: number) => {
  return useMemo(() => {
    const numeric = extractScore(lastScore);
    const prevBest = readBest(gameId);
    const isNewBest = numeric > prevBest;
    if (isNewBest) rememberBest(gameId, numeric);
    const tier = scoreToTier(numeric);
    // Diamond bonus: double coins on Diamond tier.
    const tierBonus = tier === 'diamond' ? lastCoins : tier === 'platinum' ? Math.round(lastCoins * 0.5) : 0;
    return { numeric, prevBest, isNewBest, tier, tierBonus };
  }, [gameId, lastScore, lastCoins]);
};
