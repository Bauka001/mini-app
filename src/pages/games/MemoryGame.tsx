import { useState, useEffect, useCallback, useRef } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore, Theme } from '../../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ParticleSystem, Particle } from '../../components/effects/ParticleSystem';
import { ReviveModal } from '../../components/modals/ReviveModal';

export const MemoryGame = () => {
  const { t } = useTranslation();
  const { addGameResult, theme } = useStore();
  
  return (
    <GameWrapper
      title={t('game_memory', 'Memory Matrix')}
      instructions={t('memory_desc', 'Remember the highlighted tiles and repeat the pattern.')}
    >
      {({ onEnd, isPaused }) => <MemoryBoard onEnd={(score, coins) => {
        addGameResult({ gameId: 'memory', score, coinsEarned: coins });
        onEnd(score, coins);
      }} isGamePaused={isPaused} theme={theme} />}
    </GameWrapper>
  );
};

const MemoryBoard = ({ onEnd, isGamePaused, theme }: { onEnd: (score: string, coins: number) => void; isGamePaused: boolean; theme: Theme }) => {
  const [level, setLevel] = useState(1);
  const [gridSize, setGridSize] = useState(3);
  const [pattern, setPattern] = useState<number[]>([]);
  const [userSelection, setUserSelection] = useState<number[]>([]);
  const [gameState, setGameState] = useState<'showing' | 'playing' | 'success' | 'fail'>('showing');
  const [timeLeft, setTimeLeft] = useState(10); // 10s per level
  
  // Effects
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cleanup particles
  useEffect(() => {
    if (particles.length > 0) {
      const timer = setTimeout(() => {
        setParticles(prev => prev.slice(5));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [particles]);

  // Reset shake
  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 200);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  const getTileCount = (lvl: number) => Math.min(Math.floor(lvl / 2) + 2, gridSize * gridSize - 1);

  const generatePattern = useCallback(() => {
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
    if (isGamePaused) return;
    
    const newPattern = generatePattern();
    setPattern(newPattern);
    setUserSelection([]);
    setGameState('showing');
    setTimeLeft(10); // Reset time

    const timer = setTimeout(() => {
      setGameState('playing');
    }, 1500);

    return () => clearTimeout(timer);
  }, [level, generatePattern, isGamePaused]);

  // Timer effect
  useEffect(() => {
    if (gameState !== 'playing' || isGamePaused) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          setGameState('fail');
          setShake(true);
          // Don't auto-end, show revive modal
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [gameState, level, isGamePaused]);

  const triggerSuccessParticles = () => {
     if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newParticles: Particle[] = [];
        for (let i = 0; i < 20; i++) {
            newParticles.push({
                id: `success-${Date.now()}-${i}`,
                x: rect.width / 2,
                y: rect.height / 2,
                color: '#34d399' // Emerald
            });
        }
        setParticles(prev => [...prev, ...newParticles]);
     }
  };

  const handleTileClick = (index: number) => {
    if (gameState !== 'playing' || isGamePaused) return;
    if (userSelection.includes(index)) return;

    const newSelection = [...userSelection, index];
    setUserSelection(newSelection);

    if (pattern.includes(index)) {
      if (newSelection.length === pattern.length) {
        setGameState('success');
        triggerSuccessParticles();
        setTimeout(() => {
          setLevel(l => l + 1);
          if ((level + 1) % 3 === 0 && gridSize < 5) {
            setGridSize(g => g + 1);
          }
        }, 1000);
      }
    } else {
      setGameState('fail');
      setShake(true);
    }
  };

  const handleRevive = () => {
    // Retry current level
    const newPattern = generatePattern();
    setPattern(newPattern);
    setUserSelection([]);
    setGameState('showing');
    setTimeLeft(10);
    
    const timer = setTimeout(() => {
      setGameState('playing');
    }, 1500);
  };

  const handleRestart = () => {
    setLevel(1);
    setGridSize(3);
    setUserSelection([]);
    setGameState('showing');
    setTimeLeft(10);
    // useEffect will regenerate pattern when level changes or on mount
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

  // Theme Styles
  const bgStyle = theme === 'light' ? 'bg-white' : 'bg-transparent';
  const gridBg = theme === 'light' ? 'bg-gray-200/80 border-gray-300' : 'bg-white/5 border-white/10';
  const tileDefault = theme === 'light' ? 'bg-white hover:bg-gray-50 border-gray-200' : 'bg-white/5 hover:bg-white/10 border-white/5';

  return (
    <div ref={containerRef} className={`h-full flex flex-col items-center justify-center p-4 relative overflow-hidden ${bgStyle}`}>
      {/* Background Ambience */}
      {theme !== 'light' && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-gray-900 to-black z-0" />
      )}
      
      <ParticleSystem particles={particles} />

      <ReviveModal 
        isOpen={gameState === 'fail'}
        score={level * 10} 
        gameName="Memory Matrix"
        onRevive={handleRevive}
        onRestart={handleRestart}
      />

      <div className="mb-8 relative flex flex-col items-center z-10">
         <motion.div 
           key={level}
           initial={{ scale: 1.5, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 drop-shadow-lg"
         >
            Level {level}
         </motion.div>
         {gameState === 'showing' && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-sm text-purple-300 animate-pulse whitespace-nowrap">
               Memorize...
            </div>
         )}
         {gameState === 'playing' && (
            <div className={clsx(
              "absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm font-bold transition-colors",
              timeLeft < 3 ? "text-red-500 animate-pulse" : theme === 'light' ? "text-gray-800" : "text-white"
            )}>
               {timeLeft.toFixed(1)}s
            </div>
         )}
      </div>
      
      <motion.div 
        animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
        transition={{ duration: 0.3 }}
        className={`grid gap-3 p-5 backdrop-blur-xl rounded-3xl border shadow-2xl transition-all duration-300 z-10 ${gridBg}`}
        style={{ 
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          width: 'min(90vw, 400px)',
          height: 'min(90vw, 400px)'
        }}
      >
        {Array.from({ length: gridSize * gridSize }).map((_, index) => {
          const status = getTileStatus(index);
          return (
            <motion.button
              key={index}
              onClick={() => handleTileClick(index)}
              initial={{ scale: 1 }}
              animate={
                status === 'active' ? { scale: [1, 1.05, 1], boxShadow: "0 0 15px rgba(255,255,255,0.5)" } :
                status === 'success' ? { scale: [1, 1.1, 1], boxShadow: "0 0 20px rgba(52,211,153,0.6)" } :
                status === 'wrong' ? { rotate: [0, 5, -5, 0], scale: 0.95 } : 
                { scale: 1 }
              }
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={clsx(
                "rounded-xl transition-colors duration-300 relative overflow-hidden border",
                status === 'default' && tileDefault,
                status === 'active' && "bg-white border-white z-10",
                status === 'correct' && "bg-gradient-to-br from-green-400 to-emerald-600 border-transparent z-10",
                status === 'wrong' && "bg-gradient-to-br from-red-500 to-rose-700 border-transparent z-10",
                status === 'success' && "bg-gradient-to-br from-purple-500 to-indigo-600 border-transparent z-10",
                status === 'missed' && "bg-white/20"
              )}
              disabled={gameState !== 'playing' || isGamePaused}
            >
               {/* Inner glow for 3D effect */}
               <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};

export default MemoryGame;
