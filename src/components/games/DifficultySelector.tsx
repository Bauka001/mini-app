import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Difficulty, DIFFICULTIES } from '../../types/games';
import { soundManager } from '../../utils/soundManager';
import { useHaptic } from '../../hooks/useHaptic';

interface DifficultySelectorProps {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
  /** Small/medium sizing. */
  size?: 'sm' | 'md';
  /** When true, disables the selector (e.g. during an active round). */
  disabled?: boolean;
  className?: string;
}

const DIFFICULTY_ACCENT: Record<Difficulty, string> = {
  easy: 'from-emerald-400 to-green-500',
  medium: 'from-amber-400 to-orange-500',
  hard: 'from-rose-500 to-red-600',
};

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  value,
  onChange,
  size = 'md',
  disabled = false,
  className,
}) => {
  const { t } = useTranslation();
  const haptic = useHaptic();

  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  return (
    <div
      role="radiogroup"
      aria-label={t('difficulty', 'Difficulty')}
      className={clsx(
        'inline-flex items-center gap-1 p-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {DIFFICULTIES.map(d => {
        const active = d === value;
        return (
          <button
            key={d}
            role="radio"
            aria-checked={active}
            aria-label={t(`difficulty_${d}`, d)}
            disabled={disabled}
            onClick={() => {
              if (d === value) return;
              haptic.selection();
              soundManager.playClick();
              onChange(d);
            }}
            className={clsx(
              'relative rounded-full font-bold uppercase tracking-wider transition-colors',
              pad,
              active ? 'text-black' : 'text-white/70 hover:text-white'
            )}
          >
            {active && (
              <motion.span
                layoutId="difficulty-active-pill"
                transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
                className={clsx(
                  'absolute inset-0 rounded-full bg-gradient-to-r shadow-md',
                  DIFFICULTY_ACCENT[d]
                )}
              />
            )}
            <span className="relative z-10">{t(`difficulty_${d}`, d)}</span>
          </button>
        );
      })}
    </div>
  );
};

export default DifficultySelector;
