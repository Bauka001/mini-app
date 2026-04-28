import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { Theme } from '../../store/useStore';
import { useStore } from '../../store/useStoreImpl';
import { motion } from 'framer-motion';
import { ParticleSystem, Particle } from '../../components/effects/ParticleSystem';
import { ReviveModal } from '../../components/modals/ReviveModal';
import { DifficultySelector } from '../../components/games/DifficultySelector';
import { GameHUD } from '../../components/games/GameHUD';
import { useGameSettings } from '../../store/gameSettings';
import { useGameTimer } from '../../hooks/useGameTimer';
import { useLocalBest } from '../../hooks/useLocalBest';
import { useHaptic } from '../../hooks/useHaptic';
import { Difficulty, DIFFICULTY_COIN_MULT } from '../../types/games';
import { soundManager } from '../../utils/soundManager';

const GAME_ID = 'memory';

/** Per-difficulty tuning. Keeps difficulty knobs in one place. */
const DIFFICULTY_CONFIG: Record<
  Difficulty,
  {
    startGrid: number;
    maxGrid: number;
    startTiles: number;
    tilesPerLevel: number; // +1 tile every N levels
    showMs: number;
    timeLimitMs: number;
    comboBonusEvery: number; // every Nth consecutive win multiplies score
  }
> = {
  easy:   { startGrid: 3, maxGrid: 4, startTiles: 2, tilesPerLevel: 3, showMs: 2800, timeLimitMs: 12_000, comboBonusEvery: 3 },
  medium: { startGrid: 4, maxGrid: 5, startTiles: 3, tilesPerLevel: 2, showMs: 2200, timeLimitMs: 10_000, comboBonusEvery: 3 },
  hard:   { startGrid: 4, maxGrid: 6, startTiles: 4, tilesPerLevel: 2, showMs: 1500, timeLimitMs: 7_000,  comboBonusEvery: 2 },
};

export const MemoryGame = () => {
  const { t } = useTranslation();
  const { addGameResult, theme } = useStore();

  return (
    <GameWrapper
      title={t('game_memory', 'Memory Matrix')}
      instructions={t('memory_desc', 'Remember the highlighted tiles and repeat the pattern.')}
    >
      {({ onEnd, isPaused }) => (
        <MemoryBoard
          onEnd={(score, coins) => {
            // Microtask so the board can finish its state commits first.
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

type BoardState = 'showing' | 'playing' | 'success' | 'fail';

const MemoryBoard = ({
  onEnd,
  isGamePaused,
  theme,
}: {
  onEnd: (score: string, coins: number) => void;
  isGamePaused: boolean;
  theme: Theme;
}) => {
  // -------- Settings --------
  const storedDifficulty = useGameSettings(s => s.difficultyPrefs[GAME_ID] ?? 'medium');
  const setStoredDifficulty = useGameSettings(s => s.setDifficulty);
  const [difficulty, setDifficulty] = useState<Difficulty>(storedDifficulty);
  const config = DIFFICULTY_CONFIG[difficulty];

  const { best, submit } = useLocalBest(GAME_ID, difficulty);
  const haptic = useHaptic();

  // -------- Round state --------
  const [level, setLevel] = useState(1);
  const [gridSize, setGridSize] = useState(config.startGrid);
  const [pattern, setPattern] = useState<number[]>([]);
  const [userSelection, setUserSelection] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [state, setState] = useState<BoardState>('showing');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use a ref for pattern inside async callbacks to avoid stale closures.
  const patternRef = useRef<number[]>([]);
  patternRef.current = pattern;

  // -------- Tile count scales with level --------
  const getTileCount = useCallback((lvl: number, grid: number) => {
    const tiles = config.startTiles + Math.floor((lvl - 1) / config.tilesPerLevel);
    return Math.min(tiles, grid * grid - 1);
  }, [config]);

  // -------- Generate a fresh pattern --------
  const generatePattern = useCallback(() => {
    const total = gridSize * gridSize;
    const count = getTileCount(level, gridSize);
    const pool = Array.from({ length: total }, (_, i) => i);
    // Fisher–Yates sample without duplicates.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count).sort((a, b) => a - b);
  }, [gridSize, level, getTileCount]);

  // -------- Start / reset a round --------
  const startRound = useCallback(() => {
    const nextPattern = generatePattern();
    setPattern(nextPattern);
    setUserSelection([]);
    setState('showing');
  }, [generatePattern]);

  // Reset when level or grid changes (not on pause toggles).
  useEffect(() => {
    if (isGamePaused) return;
    startRound();
  }, [level, gridSize, startRound, isGamePaused]);

  // Transition from "showing" -> "playing" after config.showMs.
  useEffect(() => {
    if (state !== 'showing' || isGamePaused) return;
    const id = window.setTimeout(() => setState('playing'), config.showMs);
    return () => window.clearTimeout(id);
  }, [state, config.showMs, isGamePaused, level]);

  // Shake cleanup.
  useEffect(() => {
    if (!shake) return;
    const id = window.setTimeout(() => setShake(false), 250);
    return () => window.clearTimeout(id);
  }, [shake]);

  // Particle cleanup.
  useEffect(() => {
    if (particles.length === 0) return;
    const id = window.setTimeout(() => setParticles(prev => prev.slice(8)), 500);
    return () => window.clearTimeout(id);
  }, [particles]);

  // -------- Countdown timer (pause-aware) --------
  const { timeLeftMs, reset: resetTimer, addTime } = useGameTimer({
    durationMs: config.timeLimitMs,
    tickMs: 100,
    isActive: state === 'playing',
    isPaused: isGamePaused,
    resetKey: `${level}-${gridSize}`,
    onExpire: () => {
      setState('fail');
      setShake(true);
      haptic.notification('error');
      soundManager.playError();
    },
  });

  // -------- Score helpers --------
  const addPointsForWin = useCallback(() => {
    const base = 10 * level;
    const comboBonus = combo > 0 && combo % config.comboBonusEvery === 0 ? 25 : 0;
    const gained = base + comboBonus;
    setScore(s => s + gained);
  }, [level, combo, config.comboBonusEvery]);

  const triggerSuccessParticles = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const parts: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: `success-${Date.now()}-${i}`,
      x: rect.width / 2,
      y: rect.height / 2,
      color: '#34d399',
    }));
    setParticles(prev => [...prev, ...parts]);
  }, []);

  // -------- Advance level on success --------
  const advance = useCallback(() => {
    setCombo(c => c + 1);
    addPointsForWin();
    triggerSuccessParticles();
    haptic.notification('success');
    soundManager.playSuccess();
    // Give the player a short time bonus to reward speed.
    addTime(1000);

    const id = window.setTimeout(() => {
      setLevel(l => {
        const next = l + 1;
        // Grow the grid every 3 levels up to the difficulty cap.
        if (next % 3 === 0 && gridSize < config.maxGrid) {
          setGridSize(g => Math.min(g + 1, config.maxGrid));
        }
        return next;
      });
    }, 650);
    return () => window.clearTimeout(id);
  }, [addPointsForWin, triggerSuccessParticles, haptic, addTime, gridSize, config.maxGrid]);

  // -------- Tile click handler --------
  const handleTileClick = useCallback((index: number) => {
    if (state !== 'playing' || isGamePaused) return;
    if (userSelection.includes(index)) return;

    const isCorrect = patternRef.current.includes(index);
    if (!isCorrect) {
      setUserSelection(prev => [...prev, index]);
      setCombo(0);
      setState('fail');
      setShake(true);
      haptic.notification('error');
      soundManager.playError();
      return;
    }

    const next = [...userSelection, index];
    setUserSelection(next);
    haptic.impact('light');
    soundManager.playClick();

    if (next.length === patternRef.current.length) {
      setState('success');
      advance();
    }
  }, [state, isGamePaused, userSelection, advance, haptic]);

  // -------- Keyboard navigation --------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state !== 'playing' || isGamePaused) return;
      if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < gridSize * gridSize) handleTileClick(idx);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, isGamePaused, gridSize, handleTileClick]);

  // -------- Fail -> Revive / restart --------
  const handleRevive = useCallback(() => {
    resetTimer();
    startRound();
    haptic.impact('medium');
  }, [resetTimer, startRound, haptic]);

  const finalScoreRef = useRef(0);
  const handleRestart = useCallback(() => {
    finalScoreRef.current = score;
    const isNewBest = submit(score);
    const coins = Math.round((score * DIFFICULTY_COIN_MULT[difficulty]) / 4);
    onEnd(
      isNewBest ? `${score} ★` : `${score}`,
      Math.max(0, coins)
    );
  }, [score, submit, difficulty, onEnd]);

  // Change difficulty — fully reset.
  const changeDifficulty = useCallback((next: Difficulty) => {
    setStoredDifficulty(GAME_ID, next);
    setDifficulty(next);
    setLevel(1);
    setGridSize(DIFFICULTY_CONFIG[next].startGrid);
    setScore(0);
    setCombo(0);
    setState('showing');
  }, [setStoredDifficulty]);

  // -------- Styling --------
  const bgStyle = theme === 'light' ? 'bg-gradient-to-br from-indigo-50 to-purple-50' : 'bg-transparent';
  const gridBg =
    theme === 'light'
      ? 'bg-white/60 border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-xl'
      : 'bg-white/5 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-2xl';
  const tileDefault =
    theme === 'light'
      ? 'bg-white hover:bg-indigo-50 border-indigo-100 shadow-sm'
      : 'bg-white/10 hover:bg-white/20 border-white/10 shadow-sm';

  const tiles = useMemo(
    () => Array.from({ length: gridSize * gridSize }, (_, i) => i),
    [gridSize]
  );

  const getTileStatus = (index: number) => {
    if (state === 'showing') return pattern.includes(index) ? 'active' : 'default';
    if (state === 'playing') {
      if (userSelection.includes(index)) {
        return pattern.includes(index) ? 'correct' : 'wrong';
      }
      return 'default';
    }
    if (state === 'success') return pattern.includes(index) ? 'success' : 'default';
    if (state === 'fail') {
      if (pattern.includes(index)) return 'missed';
      if (userSelection.includes(index)) return 'wrong';
      return 'default';
    }
    return 'default';
  };

  return (
    <div
      ref={containerRef}
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

      <ParticleSystem particles={particles} />

      <ReviveModal
        isOpen={state === 'fail'}
        score={score}
        gameName="Memory Matrix"
        onRevive={handleRevive}
        onRestart={handleRestart}
      />

      {/* HUD */}
      <div className="w-full max-w-md mx-auto z-10 mt-2 mb-4">
        <GameHUD
          score={score}
          timeLeftSec={timeLeftMs / 1000}
          timeTotalSec={config.timeLimitMs / 1000}
          best={best}
          combo={combo}
          showSoundToggle
          showHapticToggle
        />
      </div>

      {/* Title + Difficulty */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-4 flex flex-col items-center z-10 w-full max-w-sm gap-3"
      >
        <motion.div
          key={`title-${level}`}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-3xl font-black tracking-tighter text-transparent bg-clip-text"
          style={{
            backgroundImage:
              theme === 'light'
                ? 'linear-gradient(to right, #4f46e5, #ec4899)'
                : 'linear-gradient(to right, #818cf8, #f472b6)',
          }}
        >
          Level {level}
        </motion.div>

        <DifficultySelector
          value={difficulty}
          onChange={changeDifficulty}
          size="sm"
          disabled={state === 'playing' || state === 'showing'}
        />

        {state === 'showing' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
              'text-xs font-bold tracking-widest uppercase animate-pulse',
              theme === 'light' ? 'text-indigo-500' : 'text-indigo-400'
            )}
          >
            Memorize Pattern
          </motion.div>
        )}
      </motion.div>

      <motion.div
        role="grid"
        aria-label="Memory pattern grid"
        aria-rowcount={gridSize}
        aria-colcount={gridSize}
        animate={shake ? { x: [-6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.25 }}
        className={clsx(
          'grid gap-3 p-5 backdrop-blur-xl rounded-3xl border shadow-2xl transition-all duration-300 z-10',
          gridBg
        )}
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          width: 'min(90vw, 400px)',
          height: 'min(90vw, 400px)',
        }}
      >
        {tiles.map(index => {
          const status = getTileStatus(index);
          const row = Math.floor(index / gridSize) + 1;
          const col = (index % gridSize) + 1;
          return (
            <motion.button
              key={index}
              role="gridcell"
              aria-rowindex={row}
              aria-colindex={col}
              aria-label={`Tile row ${row} column ${col}${status !== 'default' ? ` ${status}` : ''}`}
              onClick={() => handleTileClick(index)}
              initial={{ scale: 1 }}
              animate={
                status === 'active'
                  ? { scale: [1, 1.08, 1], boxShadow: '0 0 28px rgba(239,68,68,0.9)' }
                  : status === 'success'
                  ? { scale: [1, 1.1, 1], boxShadow: '0 0 20px rgba(52,211,153,0.6)' }
                  : status === 'wrong'
                  ? { rotate: [0, 5, -5, 0], scale: 0.95 }
                  : { scale: 1 }
              }
              transition={{ duration: 0.3, type: "tween" }}
              whileHover={{ scale: state === 'playing' ? 1.04 : 1 }}
              whileTap={{ scale: state === 'playing' ? 0.95 : 1 }}
              className={clsx(
                'rounded-xl transition-colors duration-300 relative overflow-hidden border focus:outline-none focus:ring-2 focus:ring-primary/60',
                status === 'default' && tileDefault,
                status === 'active' && 'bg-gradient-to-br from-red-600 to-rose-700 border-transparent z-10',
                status === 'correct' && 'bg-gradient-to-br from-green-400 to-emerald-600 border-transparent z-10',
                status === 'wrong' && 'bg-gradient-to-br from-red-500 to-rose-700 border-transparent z-10',
                status === 'success' && 'bg-gradient-to-br from-purple-500 to-indigo-600 border-transparent z-10',
                status === 'missed' && 'bg-white/20'
              )}
              disabled={state !== 'playing' || isGamePaused}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" aria-hidden />
              {status === 'active' && (
                <div
                  className="absolute inset-0 rounded-xl animate-pulse pointer-events-none"
                  style={{ boxShadow: '0 0 45px 12px rgba(239,68,68,0.75)' }}
                  aria-hidden
                />
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};

export default MemoryGame;
