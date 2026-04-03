import { useState, useEffect, useCallback } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStore.1';
import { motion, AnimatePresence } from 'framer-motion';
import { ParticleSystem, Particle } from '../../components/effects/ParticleSystem';

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

export const OddOneOutGame = () => {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  
  return (
    <GameWrapper
      title={t('game_odd_one', 'Odd One Out')}
      instructions={t('odd_one_desc', 'Find the item that looks different from the others.')}
    >
      {({ onEnd, isPaused, theme }) => <OddOneOutBoard onEnd={onEnd} addGameResult={addGameResult} isPaused={isPaused} theme={theme} />}
    </GameWrapper>
  );
};

export const OddOneOutBoard = ({ onEnd, addGameResult, isPaused, theme }: { onEnd: (score: string, coins: number) => void, addGameResult: (result: any) => void, isPaused: boolean, theme: string }) => {
  const [level, setLevel] = useState(1);
  const [gridSize, setGridSize] = useState(3);
  const [items, setItems] = useState<string[]>([]);
  const [oddIndex, setOddIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [isWrong, setIsWrong] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  
  // New state for level progress
  const [foundCount, setFoundCount] = useState(0);
  const [targetCount, setTargetCount] = useState(10); // Start with 10 targets per level

  const generateLevel = useCallback(() => {
    // Determine grid size based on level (slightly harder progression)
    const newGridSize = Math.min(8, 3 + Math.floor((level - 1) / 2));
    setGridSize(newGridSize);
    
    // Update target count based on level (max 40)
    const newTarget = Math.min(40, 10 + (level - 1));
    setTargetCount(newTarget);

    const set = EMOJI_SETS[Math.floor(Math.random() * EMOJI_SETS.length)];
    const totalItems = newGridSize * newGridSize;
    const newOddIndex = Math.floor(Math.random() * totalItems);
    
    const newItems = Array(totalItems).fill(set.common);
    newItems[newOddIndex] = set.odd;

    setItems(newItems);
    setOddIndex(newOddIndex);
  }, [level]);

  useEffect(() => {
    generateLevel();
    const timer = setInterval(() => {
      // Pause timer when showing Level Up screen or Level Complete Modal
      if (showLevelUp || showLevelComplete || isPaused) return;

      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          // Use setTimeout to avoid "Cannot update component while rendering" warning
          setTimeout(() => {
             // Game Over logic
             addGameResult({ gameId: 'odd_one_out', score, coinsEarned: Math.floor(score / 2) });
             onEnd(`${score} pts`, Math.floor(score / 2));
          }, 0);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [showLevelUp, showLevelComplete, isPaused, addGameResult, onEnd, score, generateLevel]);

  // Re-generate when level changes
  useEffect(() => {
    if (level > 1 && !showLevelComplete) {
       generateLevel();
       setFoundCount(0); // Reset found count for new level
    }
  }, [level, showLevelComplete, generateLevel]);

  const handleNextLevel = () => {
    setLevel(l => l + 1);
    setShowLevelComplete(false);
    setTimeLeft(t => Math.min(60, t + 15)); // Bonus time for next level
  };

  const handleReplayLevel = () => {
    setFoundCount(0);
    generateLevel();
    setShowLevelComplete(false);
    setTimeLeft(60); // Reset time for replay? Or keep current? Usually reset for replay.
  };

  const handleMenu = () => {
    addGameResult({ gameId: 'odd_one_out', score, coinsEarned: Math.floor(score / 2) });
    onEnd(`${score} pts`, Math.floor(score / 2));
  };

  const handleItemClick = (index: number) => {
    if (showLevelUp || showLevelComplete) return;

    if (index === oddIndex) {
      const newFoundCount = foundCount + 1;
      setFoundCount(newFoundCount);
      setScore(s => s + 10);
      
      // Add a tiny time bonus for each find
      setTimeLeft(t => Math.min(60, t + 0.5));

      // Check if level is complete
      if (newFoundCount >= targetCount) {
        // Award coins for level completion immediately
        const levelReward = 50 + (level * 10);
        setTimeout(() => {
          addGameResult({ gameId: 'odd_one_out_level', score: 0, coinsEarned: levelReward });
        }, 0);
        
        setShowLevelComplete(true);
      } else {
        // Just generate next puzzle in same level
        generateLevel();
      }
    } else {
      setIsWrong(true);
      setTimeLeft(t => Math.max(0, t - 3)); // Penalty
      setTimeout(() => setIsWrong(false), 300);
    }
  };

  return (
    <div className={clsx(
      "h-full flex flex-col items-center justify-center p-4 relative transition-colors duration-500",
      theme === 'light' ? 'bg-gradient-to-br from-blue-50 to-indigo-50' : 'bg-transparent'
    )}>
      {theme !== 'light' && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background z-0" />
      )}

      <AnimatePresence>
        {/* Level Complete Modal */}
        {showLevelComplete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: -20 }}
              className="bg-gray-900/90 border border-gray-700/50 rounded-3xl p-8 w-full max-w-sm text-center shadow-[0_0_50px_rgba(79,70,229,0.3)] backdrop-blur-xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 mb-2">LEVEL {level} COMPLETE!</h2>
              <div className="text-yellow-400 font-black text-2xl mb-8 flex items-center justify-center gap-2 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                +{50 + (level * 10)} Coins!
              </div>
              
              <div className="space-y-4">
                <button 
                  onClick={handleNextLevel}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-2xl text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                >
                  Next Level
                </button>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={handleReplayLevel}
                    className="w-full py-3 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-colors"
                  >
                    Replay
                  </button>
                  <button 
                    onClick={handleMenu}
                    className="w-full py-3 bg-white/5 text-gray-400 font-bold rounded-2xl hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Menu
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 flex flex-col items-center z-10 w-full max-w-sm"
      >
        <div className="flex justify-between w-full px-4 mb-4">
          <div className={clsx(
            "px-4 py-1.5 rounded-xl text-xs backdrop-blur-md border shadow-sm font-mono tracking-wider",
            theme === 'light' ? "bg-white/80 border-indigo-100 text-indigo-600" : "bg-white/10 border-white/10 text-white/60"
          )}>
            Level {level}
          </div>
          <div className={clsx(
            "px-4 py-1.5 rounded-xl text-xs backdrop-blur-md border shadow-sm font-mono tracking-wider transition-colors flex gap-2",
            timeLeft < 10 ? "bg-red-500/20 border-red-500/40 text-red-500 animate-pulse-glow" : theme === 'light' ? "bg-white/80 border-indigo-100 text-indigo-600" : "bg-white/10 border-white/10 text-white/60"
          )}>
            ⏱ {timeLeft.toFixed(1)}s
          </div>
        </div>

        <div className="flex gap-4 mt-2 mb-2">
           <div className={clsx("px-4 py-2 rounded-2xl backdrop-blur-xl border shadow-lg text-sm font-bold tracking-widest uppercase flex items-center gap-2", theme === 'light' ? "bg-white/90 border-indigo-100 text-indigo-600" : "bg-indigo-500/20 border-indigo-500/30 text-indigo-300")}>
             <span className="text-lg">✨</span> Score: {score}
           </div>
           <div className={clsx("px-4 py-2 rounded-2xl backdrop-blur-xl border shadow-lg text-sm font-bold tracking-widest uppercase flex items-center gap-2", theme === 'light' ? "bg-white/90 border-green-100 text-green-600" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-300")}>
             🎯 Found: {foundCount}/{targetCount}
           </div>
        </div>
      </motion.div>

      <motion.div 
        animate={isWrong ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className={clsx(
          "grid gap-2 p-4 rounded-[2rem] transition-all duration-300 backdrop-blur-2xl border shadow-2xl z-10",
          isWrong 
            ? "bg-red-500/20 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.4)]" 
            : theme === 'light'
              ? "bg-white/60 border-white shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
              : "bg-white/5 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        )}
        style={{ 
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          width: 'min(90vw, 400px)', 
          height: 'min(90vw, 400px)' 
        }}
      >
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <motion.button
              key={`${level}-${foundCount}-${index}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.01, type: "spring", stiffness: 300, damping: 20 }}
              whileHover={{ scale: 1.1, zIndex: 10 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleItemClick(index)}
              className={clsx(
                "flex items-center justify-center text-3xl sm:text-4xl rounded-2xl transition-colors duration-200 relative overflow-hidden group shadow-sm border",
                theme === 'light' 
                  ? "bg-white border-indigo-50 hover:bg-indigo-50 text-gray-800"
                  : "bg-white/10 border-white/5 hover:bg-white/20 text-white"
              )}
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
