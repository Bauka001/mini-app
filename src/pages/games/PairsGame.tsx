import { useState, useEffect, useRef, useCallback } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { Brain, Star, Heart, Zap, Coffee, Anchor, Music, Sun, Moon, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Difficulty, DIFFICULTY_COIN_MULT } from '../../types/games';
import { useGameTimer } from '../../hooks/useGameTimer';
import { useLocalBest } from '../../hooks/useLocalBest';
import { useHaptic } from '../../hooks/useHaptic';
import { useGameSettings } from '../../store/gameSettings';
import { DifficultySelector } from '../../components/games/DifficultySelector';
import { GameHUD } from '../../components/games/GameHUD';
import { soundManager } from '../../utils/soundManager';

const ICONS = [Brain, Star, Heart, Zap, Coffee, Anchor, Music, Sun, Moon, Sparkles];
const GAME_ID = 'pairs';

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { pairs: number; timeMs: number; cols: number }
> = {
  easy:   { pairs: 6,  timeMs: 60_000, cols: 3 },
  medium: { pairs: 8,  timeMs: 75_000, cols: 4 },
  hard:   { pairs: 10, timeMs: 90_000, cols: 4 },
};

export const PairsGame = () => {
  const { t } = useTranslation();
  const { addGameResult, theme } = useStore();

  return (
    <GameWrapper
      title={t('game_pairs', 'Pairs')}
      instructions={t('pairs_desc', 'Find all matching pairs of cards.')}
    >
      {({ onEnd, isPaused }) => (
        <PairsBoard
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

interface Card {
  id: number;
  iconIndex: number;
  isFlipped: boolean;
  isMatched: boolean;
}

const PairsBoard = ({ onEnd, isGamePaused, theme }: { onEnd: (score: string, coins: number) => void, isGamePaused: boolean, theme: string }) => {
  // -------- Settings --------
  const storedDifficulty = useGameSettings(s => s.difficultyPrefs[GAME_ID] ?? 'medium');
  const setStoredDifficulty = useGameSettings(s => s.setDifficulty);
  const [difficulty, setDifficulty] = useState<Difficulty>(storedDifficulty);
  const config = DIFFICULTY_CONFIG[difficulty];
  const pairCount = Math.min(config.pairs, ICONS.length);

  const { best, submit } = useLocalBest(GAME_ID, difficulty);
  const haptic = useHaptic();

  // -------- Round state --------
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isPreviewing, setIsPreviewing] = useState(true);

  // Guards against stale closure and double-trigger
  const matchesRef = useRef(0);
  const gameEndedRef = useRef(false);

  // -------- Initialize deck --------
  const initializeDeck = useCallback(() => {
    const selectedIcons = ICONS.slice(0, pairCount);
    const deck = [...selectedIcons, ...selectedIcons]
      .map((_, index) => ({
        id: index,
        iconIndex: index % pairCount,
        isFlipped: true,
        isMatched: false
      }))
      .sort(() => Math.random() - 0.5);

    setCards(deck);
    matchesRef.current = 0;
    gameEndedRef.current = false;
    setFlippedIndices([]);
    setCombo(0);
    setScore(0);
    setIsPreviewing(true);
  }, [pairCount]);

  // -------- Countdown timer (pause-aware) --------
  const { timeLeftMs, reset: resetTimer } = useGameTimer({
    durationMs: config.timeMs,
    tickMs: 100,
    isActive: !isPreviewing && !isGamePaused,
    isPaused: isGamePaused,
    resetKey: `${difficulty}`,
    onExpire: () => {
      if (!gameEndedRef.current) {
        gameEndedRef.current = true;
        haptic.notification('error');
        soundManager.playError();
        const finalScore = Math.max(0, score + Math.floor(timeLeftMs / 1000));
        const isNewBest = submit(finalScore);
        const coins = Math.round((finalScore * DIFFICULTY_COIN_MULT[difficulty]) / 4);
        onEnd(
          isNewBest ? `${finalScore} ★` : `${finalScore}`,
          Math.max(0, coins)
        );
      }
    },
  });

  useEffect(() => {
    initializeDeck();
  }, [initializeDeck]);

  useEffect(() => {
    if (isPreviewing) {
      const id = window.setTimeout(() => {
        setCards(prev => prev.map(c => ({ ...c, isFlipped: false })));
        setIsPreviewing(false);
      }, 2000);
      return () => window.clearTimeout(id);
    }
  }, [isPreviewing]);

  // -------- Mismatch visual feedback --------
  const [mismatchIndices, setMismatchIndices] = useState<number[]>([]);

  const handleCardClick = useCallback((index: number) => {
    if (isPreviewing || isGamePaused || gameEndedRef.current) return;
    if (cards[index].isMatched || cards[index].isFlipped || flippedIndices.length >= 2) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;

      if (cards[first].iconIndex === cards[second].iconIndex) {
        // Match
        haptic.notification('success');
        soundManager.playSuccess();
        setTimeout(() => {
          setCards(prev => prev.map((c, i) =>
            i === first || i === second ? { ...c, isMatched: true } : c
          ));
          setFlippedIndices([]);
          setScore(s => s + 10);
          setCombo(c => c + 1);

          matchesRef.current += 1;
          if (matchesRef.current === pairCount) {
            // Win
            if (!gameEndedRef.current) {
              gameEndedRef.current = true;
              const comboBonus = combo > 0 ? combo * 5 : 0;
              const finalScore = score + 10 + comboBonus + Math.floor(timeLeftMs / 2000);
              const isNewBest = submit(finalScore);
              const coins = Math.round((finalScore * DIFFICULTY_COIN_MULT[difficulty]) / 4);
              onEnd(
                isNewBest ? `${finalScore} ★` : `${finalScore}`,
                Math.max(0, coins)
              );
            }
          }
        }, 500);
      } else {
        // Mismatch - red tint + shake
        haptic.notification('error');
        soundManager.playError();
        setMismatchIndices([first, second]);
        setCombo(0);

        setTimeout(() => {
          setCards(prev => prev.map((c, i) =>
            i === first || i === second ? { ...c, isFlipped: false } : c
          ));
          setFlippedIndices([]);
          setMismatchIndices([]);
        }, 2000);
      }
    }
  }, [isPreviewing, isGamePaused, cards, flippedIndices, combo, timeLeftMs, score, pairCount, submit, difficulty, onEnd, haptic]);

  // -------- Change difficulty — fully reset --------
  const changeDifficulty = useCallback((next: Difficulty) => {
    setStoredDifficulty(GAME_ID, next);
    setDifficulty(next);
    resetTimer();
    initializeDeck();
  }, [setStoredDifficulty, resetTimer, initializeDeck]);

  const bgStyle = theme === 'light' ? 'bg-gradient-to-br from-indigo-50 to-blue-50' : 'bg-transparent';
  const gridBg =
    theme === 'light'
      ? 'bg-white/60 border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-xl'
      : 'bg-white/5 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-2xl';

  return (
    <div className={clsx(
      "h-full flex flex-col items-center p-4 relative overflow-hidden transition-colors duration-500",
      bgStyle
    )}>
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
          disabled={!isPreviewing}
        />
      </motion.div>

      <div
        role="grid"
        aria-label="Memory pairs grid"
        className={clsx(
          "grid gap-3 sm:gap-4 w-full max-w-sm p-4 sm:p-6 rounded-[2.5rem] backdrop-blur-2xl border shadow-2xl z-10",
          mismatchIndices.length > 0 ? "bg-red-500/20 border-red-500/50" : gridBg
        )}
        style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))` }}
      >
        {cards.map((card, index) => {
          const Icon = ICONS[card.iconIndex];
          const isRevealed = card.isFlipped || card.isMatched;

          return (
            <div key={card.id} className="relative aspect-square" style={{ perspective: '800px' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  transformStyle: 'preserve-3d',
                  transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  transition: 'transform 0.5s ease-in-out',
                }}
              >
                <div
                  className={clsx(
                    "absolute inset-0 rounded-2xl border shadow-lg flex items-center justify-center overflow-hidden",
                    theme === 'light'
                      ? "bg-gradient-to-br from-indigo-100 to-purple-100 border-white"
                      : "bg-gradient-to-br from-white/10 to-white/5 border-white/10"
                  )}
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(0deg)',
                  }}
                >
                  <div
                    className={clsx(
                      "w-12 h-12 rounded-full border-4 border-dashed opacity-50",
                      theme === 'light' ? "border-indigo-300" : "border-white/20"
                    )}
                  />
                </div>

                <div
                  className={clsx(
                    "absolute inset-0 rounded-2xl border shadow-xl flex items-center justify-center overflow-hidden",
                    card.isMatched
                      ? theme === 'light'
                        ? "bg-gradient-to-br from-green-100 to-emerald-100 border-green-200"
                        : "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30"
                      : theme === 'light'
                      ? "bg-white border-white"
                      : "bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30"
                  )}
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <Icon
                    size={40}
                    strokeWidth={2.5}
                    className={clsx(
                      "drop-shadow-md",
                      card.isMatched
                        ? "text-emerald-500"
                        : theme === 'light'
                        ? "text-indigo-600"
                        : "text-indigo-300"
                    )}
                  />
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={() => handleCardClick(index)}
                  disabled={isRevealed || isPreviewing || isGamePaused}
                  aria-label={`Card ${index + 1}${isRevealed ? (card.isMatched ? ' matched' : ' flipped') : ''}`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 10,
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: isRevealed || isPreviewing || isGamePaused ? 'default' : 'pointer',
                    opacity: isRevealed || isPreviewing || isGamePaused ? 0.6 : 1,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PairsGame;
