import { useState, useEffect, useCallback } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStore';

export const MemoryGame = () => {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  
  return (
    <GameWrapper
      title={t('game_memory', 'Memory Matrix')}
      instructions={t('memory_desc', 'Remember the highlighted tiles and repeat the pattern.')}
    >
      {({ onEnd }) => <MemoryBoard onEnd={(score, coins) => {
        addGameResult({ gameId: 'memory', score, coinsEarned: coins });
        onEnd(score, coins);
      }} />}
    </GameWrapper>
  );
};

const MemoryBoard = ({ onEnd }: { onEnd: (score: string, coins: number) => void }) => {
  const [level, setLevel] = useState(1);
  const [gridSize, setGridSize] = useState(3);
  const [pattern, setPattern] = useState<number[]>([]);
  const [userSelection, setUserSelection] = useState<number[]>([]);
  const [gameState, setGameState] = useState<'showing' | 'playing' | 'success' | 'fail'>('showing');
  const [timeLeft, setTimeLeft] = useState(10); // 10s per level

  const getTileCount = (lvl: number) => Math.min(Math.floor(lvl / 2) + 2, gridSize * gridSize - 1);

  const generatePattern = useCallback(() => {
    // ... same
    const totalTiles = gridSize * gridSize;
    const count = getTileCount(level);
    const newPattern: number[] = [];
    
    while (newPattern.length < count) {
      const rand = Math.floor(Math.random() * totalTiles);
      if (!newPattern.includes(rand)) {
        newPattern.push(rand);
      }
    }
    return newPattern;
  }, [level, gridSize]);

  useEffect(() => {
    const newPattern = generatePattern();
    setPattern(newPattern);
    setUserSelection([]);
    setGameState('showing');
    setTimeLeft(10); // Reset time

    const timer = setTimeout(() => {
      setGameState('playing');
    }, 1500);

    return () => clearTimeout(timer);
  }, [level, generatePattern]);

  // Timer effect
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          setGameState('fail');
          setTimeout(() => {
            onEnd(`Level ${level} (Time)`, level * 5);
          }, 1000);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [gameState, level, onEnd]);

  const handleTileClick = (index: number) => {
    if (gameState !== 'playing') return;
    if (userSelection.includes(index)) return;

    const newSelection = [...userSelection, index];
    setUserSelection(newSelection);

    if (pattern.includes(index)) {
      if (newSelection.length === pattern.length) {
        setGameState('success');
        setTimeout(() => {
          setLevel(l => l + 1);
          if ((level + 1) % 3 === 0 && gridSize < 5) {
            setGridSize(g => g + 1);
          }
        }, 1000);
      }
    } else {
      setGameState('fail');
      setTimeout(() => {
        onEnd(`Level ${level}`, level * 10);
      }, 1000);
    }
  };

  const getTileStatus = (index: number) => {
    if (gameState === 'showing') {
      return pattern.includes(index) ? 'active' : 'default';
    }
    if (gameState === 'playing') {
      if (userSelection.includes(index)) {
        return pattern.includes(index) ? 'correct' : 'wrong';
      }
      return 'default';
    }
    if (gameState === 'success') {
      return pattern.includes(index) ? 'success' : 'default';
    }
    if (gameState === 'fail') {
      if (pattern.includes(index)) return 'missed';
      if (userSelection.includes(index) && !pattern.includes(index)) return 'wrong';
      return 'default';
    }
    return 'default';
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="mb-8 relative flex flex-col items-center">
         <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 drop-shadow-lg">
            Level {level}
         </div>
         {gameState === 'showing' && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-sm text-purple-300 animate-pulse whitespace-nowrap">
               Memorize...
            </div>
         )}
         {gameState === 'playing' && (
            <div className={clsx(
              "absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm font-bold transition-colors",
              timeLeft < 3 ? "text-red-500 animate-pulse" : "text-white"
            )}>
               {timeLeft.toFixed(1)}s
            </div>
         )}
      </div>
      
      <div 
        className="grid gap-3 p-5 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl transition-all duration-300"
        style={{ 
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          width: 'min(90vw, 400px)',
          height: 'min(90vw, 400px)'
        }}
      >
        {Array.from({ length: gridSize * gridSize }).map((_, index) => {
          const status = getTileStatus(index);
          return (
            <button
              key={index}
              onClick={() => handleTileClick(index)}
              className={clsx(
                "rounded-xl transition-all duration-300 relative overflow-hidden",
                status === 'default' && "bg-white/5 hover:bg-white/10 border border-white/5",
                status === 'active' && "bg-white shadow-[0_0_20px_rgba(255,255,255,0.6)] scale-105 border-white",
                status === 'correct' && "bg-gradient-to-br from-green-400 to-emerald-600 shadow-[0_0_20px_rgba(52,211,153,0.6)] scale-100 border-transparent",
                status === 'wrong' && "bg-gradient-to-br from-red-500 to-rose-700 shadow-[0_0_20px_rgba(244,63,94,0.6)] scale-90 border-transparent",
                status === 'success' && "bg-gradient-to-br from-purple-500 to-indigo-600 shadow-[0_0_20px_rgba(139,92,246,0.6)] scale-105 border-transparent",
                status === 'missed' && "bg-white/20 animate-pulse"
              )}
              disabled={gameState !== 'playing'}
            >
               {/* Inner glow for 3D effect */}
               <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MemoryGame;
