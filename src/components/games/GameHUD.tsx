import React from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Trophy, Flame, Star, Volume2, VolumeX, Smartphone } from 'lucide-react';
import { useStore } from '../../store/useStoreImpl';
import { useGameSettings } from '../../store/gameSettings';

interface GameHUDProps {
  /** Current round/score/etc. numeric value. Omit to hide. */
  score?: number;
  /** Optional label shown above score. Defaults to "SCORE". */
  scoreLabel?: string;
  /** Seconds left when the game has a timer. Omit to hide. */
  timeLeftSec?: number;
  /** Total duration in seconds, used for the progress ring. */
  timeTotalSec?: number;
  /** Local best for the active difficulty. 0 hides the badge. */
  best?: number;
  /** Current combo/streak count. 0 hides. */
  combo?: number;
  /** When true, shows the sound toggle inline. */
  showSoundToggle?: boolean;
  /** When true, shows the haptic toggle inline. */
  showHapticToggle?: boolean;
  className?: string;
}

/**
 * Consistent top-of-board HUD used by every pro-mode game. Keeps the various
 * scraps of status info (time, score, best, combo, sound) in one predictable
 * place so games don't each re-invent the layout.
 */
export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  scoreLabel = 'SCORE',
  timeLeftSec,
  timeTotalSec,
  best,
  combo,
  showSoundToggle = true,
  showHapticToggle = false,
  className,
}) => {
  const soundEnabled = useStore(s => s.soundEnabled);
  // Not all installations have `toggleSound` wired up; fall back to a raw set.
  const toggleSound = () => {
    const { soundEnabled: current } = useStore.getState();
    useStore.setState({ soundEnabled: !current } as any);
  };
  const hapticEnabled = useGameSettings(s => s.hapticEnabled);
  const toggleHaptic = useGameSettings(s => s.toggleHaptic);

  const timeLow = timeLeftSec !== undefined && timeLeftSec <= 5;
  const progress =
    timeLeftSec !== undefined && timeTotalSec && timeTotalSec > 0
      ? Math.max(0, Math.min(1, timeLeftSec / timeTotalSec))
      : undefined;

  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-3 w-full max-w-md mx-auto px-1',
        className
      )}
    >
      {/* Left cluster: time + best */}
      <div className="flex items-center gap-2 min-w-0">
        {timeLeftSec !== undefined && (
          <div
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-mono tabular-nums transition-colors',
              timeLow
                ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                : 'bg-black/40 border-white/10 text-white/80'
            )}
            aria-live="polite"
            aria-label={`Time left ${Math.ceil(timeLeftSec)} seconds`}
          >
            <Timer size={14} aria-hidden />
            {timeLeftSec.toFixed(timeLeftSec < 10 ? 1 : 0)}s
            {progress !== undefined && (
              <span
                className="ml-1 h-1.5 w-10 rounded-full bg-white/10 overflow-hidden"
                aria-hidden
              >
                <span
                  className={clsx(
                    'block h-full transition-[width] duration-100',
                    timeLow ? 'bg-red-400' : 'bg-primary'
                  )}
                  style={{ width: `${progress * 100}%` }}
                />
              </span>
            )}
          </div>
        )}

        {best !== undefined && best > 0 && (
          <div
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/40 border border-amber-400/30 text-amber-300 text-xs font-bold"
            aria-label={`Best score ${best}`}
          >
            <Trophy size={12} aria-hidden />
            {best}
          </div>
        )}
      </div>

      {/* Center: score */}
      {score !== undefined && (
        <div className="flex flex-col items-center leading-none">
          <span className="text-[10px] uppercase tracking-widest text-white/40">
            {scoreLabel}
          </span>
          <motion.span
            key={score}
            initial={{ scale: 1.15, color: '#fbbf24' }}
            animate={{ scale: 1, color: '#ffffff' }}
            transition={{ duration: 0.25 }}
            className="text-2xl font-black tabular-nums"
          >
            {score}
          </motion.span>
        </div>
      )}

      {/* Right cluster: combo + toggles */}
      <div className="flex items-center gap-2">
        <AnimatePresence>
          {combo !== undefined && combo >= 2 && (
            <motion.div
              key={`combo-${combo}`}
              initial={{ scale: 0.6, opacity: 0, y: -4 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0.4 }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-black shadow-lg shadow-orange-500/40"
              aria-label={`Combo x${combo}`}
            >
              <Flame size={12} aria-hidden />
              x{combo}
            </motion.div>
          )}
        </AnimatePresence>

        {showSoundToggle && (
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Disable sound' : 'Enable sound'}
            aria-pressed={soundEnabled}
            className="p-2 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        )}

        {showHapticToggle && (
          <button
            type="button"
            onClick={toggleHaptic}
            aria-label={hapticEnabled ? 'Disable haptics' : 'Enable haptics'}
            aria-pressed={hapticEnabled}
            className={clsx(
              'p-2 rounded-full border text-white/70 hover:text-white hover:bg-white/10 transition-colors',
              hapticEnabled
                ? 'bg-black/40 border-white/10'
                : 'bg-black/20 border-white/5 opacity-60'
            )}
          >
            <Smartphone size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

/** Inline "+10" popup convenience — renders a floating score change on screen. */
export const ScorePopup: React.FC<{ value: number; kind?: 'gain' | 'loss'; id?: string | number }> = ({
  value,
  kind = 'gain',
  id,
}) => (
  <AnimatePresence>
    {value !== 0 && (
      <motion.div
        key={id ?? `${kind}-${value}`}
        initial={{ opacity: 0, y: 0, scale: 0.8 }}
        animate={{ opacity: 1, y: -36, scale: 1 }}
        exit={{ opacity: 0, y: -60 }}
        transition={{ duration: 0.7 }}
        className={clsx(
          'pointer-events-none absolute left-1/2 -translate-x-1/2 top-8 z-40 font-black text-2xl drop-shadow-lg',
          kind === 'gain' ? 'text-emerald-400' : 'text-rose-400'
        )}
      >
        {kind === 'gain' ? '+' : ''}
        {value}
        <Star size={10} className="inline ml-1 -translate-y-1" aria-hidden />
      </motion.div>
    )}
  </AnimatePresence>
);

export default GameHUD;
