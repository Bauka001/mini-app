import { useState, useEffect, useCallback, useRef } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { motion, AnimatePresence } from 'framer-motion';
import { ParticleSystem, Particle } from '../../components/effects/ParticleSystem';
import { Difficulty, DIFFICULTY_COIN_MULT } from '../../types/games';
import { useGameTimer } from '../../hooks/useGameTimer';
import { useLocalBest } from '../../hooks/useLocalBest';
import { useHaptic } from '../../hooks/useHaptic';
import { useGameSettings } from '../../store/gameSettings';
import { DifficultySelector } from '../../components/games/DifficultySelector';
import { GameHUD } from '../../components/games/GameHUD';
import { soundManager } from '../../utils/soundManager';

const EMOJI_SETS = [
  { common: '😀', odd: '😃' },
  { common: '🍎', odd: '🍅' },
  { common: '🚗', odd: '🚙' },
  { common: '🐶', odd: '🐕' },
  { common: '⭐', odd: '🌟' },
  { common: '🌑', odd: '🌚' },
  { common: '⌚', odd: '⏰' },
  { common: '📦', odd: '📤' },
];

const GAME_ID = 'odd_one_out';

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { timeMs: number; startItems: number; maxItems: number; diffSpread: number }
> = {
  easy:   { timeMs: 60_000, startItems: 4, maxItems: 12, diffSpread: 60 },
  medium: { timeMs: 60_000, startItems: 6, maxItems: 16, diffSpread: 30 },
  hard:   { timeMs: 45_000, startItems: 8, maxItems: 20, diffSpread: 15 },
};

export const OddOneOutGame = () => {
  const { t } = useTranslation();
  const { addGameResult, theme } = useStore();

  return (
    <GameWrapper
      title={t('game_odd_one', 'Odd One Out')}
      instructions={t('odd_one_desc', 'Find the item that looks different from the others.')}
    >
      {({ onEnd, isPaused }) => (
        <OddOneOutBoard
          onEnd={(score, coins) => {
            queueMicrotask(() => addGameResult({ gameId: GAME_ID, score, coinsEarned: coins }));
            onEnd(score, coins);
          }}
          isGamePaused={isPaused}
          theme={theme}
        />
      )}
    </GameWrapper>
  );
};

export const OddOneOutBoard = ({ onEnd, isGamePaused, theme }: { onEnd: (score: string, coins: number) => void, isGamePaused: boolean, theme: string }) => {
  // -------- Settings --------
  const storedDifficulty = useGameSettings(s => s.difficultyPrefs[GAME_ID] ?? 'medium');
  const setStoredDifficulty = useGameSettings(s => s.setDifficulty);
  const [difficulty, setDifficulty] = useState<Difficulty>(storedDifficulty);
  const config = DIFFICULTY_CONFIG[difficulty];

  const { best, submit } = useLocalBest(GAME_ID, difficulty);
  const haptic = useHaptic();

  // -------- Round state --------
  const [items, setItems] = useState<string[]>([]);
  const [oddIndex, setOddIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isWrong, setIsWrong] = useState(false);

  // Guards against double-trigger
  const hasFinishedRef = useRef(false);

  // -------- Generate puzzle for current difficulty --------
  const generatePuzzle = useCallback(() => {
    const setIndex = Math.floor(Math.random() * EMOJI_SETS.length);
    const set = EMOJI_SETS[setIndex];
    const totalItems = Math.min(config.maxItems, config.startItems + Math.floor(combo / 3));
    const newOddIndex = Math.floor(Math.random() * totalItems);

    const newItems = Array(totalItems).fill(set.common);
    newItems[newOddIndex] = set.odd;

    setItems(newItems);
    setOddIndex(newOddIndex);
  }, [config.maxItems, config.startItems, combo]);

  // -------- Countdown timer (pause-aware) --------
  const { timeLeftMs, reset: resetTimer } = useGameTimer({
    durationMs: config.timeMs,
    tickMs: 100,
    isActive: !isGamePaused,
    isPaused: isGamePaused,
    resetKey: `${difficulty}`,
    onExpire: () => {
      if (!hasFinishedRef.current) {
        hasFinishedRef.current = true;
        haptic.notification('error');
        soundManager.playError();
        const isNewBest = submit(score);
        const coins = Math.round((score * DIFFICULTY_COIN_MULT[difficulty]) / 4);
        onEnd(
          isNewBest ? `${score} ★` : `${score}`,
          Math.max(0, coins)
        );
      }
    },
  });

  // -------- Initialize puzzle --------
  useEffect(() => {
    generatePuzzle();
  }, [generatePuzzle]);

  // -------- Keyboard support: 1-9 for indexed items --------
  useEffect(() => {
    if (isGamePaused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < items.length) handleItemClick(idx);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isGamePaused, items.length]);

  const handleItemClick = useCallback((index: number) => {
    if (hasFinishedRef.current || isGamePaused) return;

    if (index === oddIndex) {
      haptic.notification('success');
      soundManager.playSuccess();
      setScore(s => s + 10);
      setCombo(c => c + 1);
      generatePuzzle();
    } else {
      haptic.notification('error');
      soundManager.playError();
      setIsWrong(true);
      setCombo(0);
      setTimeout(() => setIsWrong(false), 300);
    }
  }, [oddIndex, isGamePaused, generatePuzzle, haptic]);

  // -------- Change difficulty — fully reset --------
  const changeDifficulty = useCallback((next: Difficulty) => {
    setStoredDifficulty(GAME_ID, next);
    setDifficulty(next);
    resetTimer();
    setScore(0);
    setCombo(0);
    hasFinishedRef.current = false;
    generatePuzzle();
  }, [setStoredDifficulty, resetTimer, generatePuzzle]);

  const bgStyle = theme === 'light' ? 'bg-gradient-to-br from-blue-50 to-indigo-50' : 'bg-transparent';
  const gridBg =
    theme === 'light'
      ? 'bg-white/60 border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-xl'
      : 'bg-white/5 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-2xl';

  return (
    <div
      className={clsx(
        'h-full flex flex-col items-center p-4 relative overflow-hidden transition-colors duration-500',
        bgStyle
      )}
    >
      {theme !== 'light' && (
        <div
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background z-0"
          aria-hidden
        />
      )}

      {/* HUD */}
      <div className="w-full max-w-md mx-auto z-10 mt-2 mb-4">
        <GameHUD
          score={score}
          timeLeftSec={timeLeftMs / 1000}
          timeTotalSec={config.timeMs / 1000}
          best={best}
          combo={combo}
          showSoundToggle
          showHapticToggle
        />
      </div>

      {/* Difficulty Selector */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-4 flex flex-col items-center z-10 w-full max-w-sm gap-2"
      >
        <DifficultySelector
          value={difficulty}
          onChange={changeDifficulty}
          size="sm"
          disabled={false}
        />
      </motion.div>

      <motion.div
        role="grid"
        aria-label="Odd one out grid"
        aria-rowcount={Math.ceil(items.length / Math.ceil(Math.sqrt(items.length)))}
        aria-colcount={Math.ceil(Math.sqrt(items.length))}
        animate={isWrong ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className={clsx(
          'grid gap-2 p-4 rounded-[2rem] transition-all duration-300 backdrop-blur-2xl border shadow-2xl z-10',
          isWrong
            ? 'bg-red-500/20 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.4)]'
            : gridBg
        )}
        style={{
          gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(items.length))}, minmax(0, 1fr))`,
          width: 'min(90vw, 400px)',
          height: 'min(90vw, 400px)',
        }}
      >
        <AnimatePresence>
          {items.map((item, index) => (
            <motion.button
              key={`item-${index}`}
              role="button"
              aria-label={`Item ${index + 1}${index === oddIndex ? ' odd one' : ''}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.01, type: 'spring', stiffness: 300, damping: 20 }}
              whileHover={{ scale: 1.1, zIndex: 10 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleItemClick(index)}
              className={clsx(
                'flex items-center justify-center text-3xl sm:text-4xl rounded-2xl transition-colors duration-200 relative overflow-hidden group shadow-sm border focus:outline-none focus:ring-2 focus:ring-primary/60',
                theme === 'light'
                  ? 'bg-white border-indigo-50 hover:bg-indigo-50 text-gray-800'
                  : 'bg-white/10 border-white/5 hover:bg-white/20 text-white'
              )}
              disabled={isGamePaused}
            >
              <span className="relative z-10 drop-shadow-md">{item}</span>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default OddOneOutGame;
