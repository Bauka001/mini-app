import { useState, useEffect } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { motion, AnimatePresence } from 'framer-motion';

const GRID_SIZE = 5;
const TOTAL_NUMBERS = GRID_SIZE * GRID_SIZE;

const SKIN_STYLES: Record<string, string> = {
  default: "bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm shadow-lg",
  neon_blue: "bg-blue-500/10 text-blue-200 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:bg-blue-500/20",
  royal_purple: "bg-purple-500/10 text-purple-200 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:bg-purple-500/20",
  matrix: "bg-green-500/10 text-green-400 border border-green-500/30 font-mono hover:bg-green-500/20",
};

export const SchulteGame = () => {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  
  return (
    <GameWrapper
      title={t('game_schulte', 'Schulte Table')}
      instructions={t('schulte_desc', 'Find numbers from 1 to 25 in ascending order. Keep your eyes on the center of the grid.')}
    >
      {({ onEnd, isPaused, theme }) => <SchulteBoard onEnd={(score, coins) => {
        setTimeout(() => {
          addGameResult({ gameId: 'schulte', score, coinsEarned: coins });
        }, 0);
        onEnd(score, coins);
      }} isPaused={isPaused} theme={theme} />}
    </GameWrapper>
  );
};

export const SchulteBoard = ({ onEnd, isPaused, theme }: { onEnd: (score: string, coins: number) => void, isPaused: boolean, theme: string }) => {
  const { activeSkin } = useStore();
  const [numbers, setNumbers] = useState<number[]>([]);
  const [nextNumber, setNextNumber] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60); // 60s limit
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const nums = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    setNumbers(nums);
    
    const timer = setInterval(() => {
      if (isPaused) return;
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          onEnd("Failed", 0);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  const handleCellClick = (num: number) => {
    if (num === nextNumber) {
      if (num === TOTAL_NUMBERS) {
        const timeSpent = (60 - timeLeft).toFixed(2);
        
        let earned = 10;
        if (parseFloat(timeSpent) < 25) earned = 100;
        else if (parseFloat(timeSpent) < 35) earned = 50;
        else if (parseFloat(timeSpent) < 50) earned = 25;

        onEnd(`${timeSpent}s`, earned);
      } else {
        setNextNumber(prev => prev + 1);
      }
    } else {
      setIsError(true);
      setTimeout(() => setIsError(false), 300);
    }
  };

  const skinClass = SKIN_STYLES[activeSkin] || SKIN_STYLES.default;

  return (
    <div className={clsx(
      "h-full flex flex-col items-center justify-center p-4 transition-colors duration-500 relative",
      theme === 'light' ? 'bg-gradient-to-br from-indigo-50 to-blue-50' : 'bg-transparent'
    )}>
      {theme !== 'light' && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background z-0" />
      )}

      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 flex flex-col items-center z-10"
      >
        <div className={clsx(
          "text-6xl font-black font-mono tracking-tighter transition-colors",
          timeLeft < 10 
            ? "text-red-500 animate-pulse-glow" 
            : theme === 'light'
              ? "text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600"
              : "text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400"
        )}>
          {timeLeft.toFixed(1)}
        </div>
        <div className={clsx("text-xs font-bold tracking-widest uppercase mt-1", theme === 'light' ? "text-indigo-400" : "text-gray-400")}>Time Left</div>
      </motion.div>
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={clsx(
          "flex items-center gap-4 mb-6 px-6 py-3 rounded-full border shadow-lg backdrop-blur-xl z-10",
          theme === 'light' ? "bg-white/80 border-indigo-100" : "bg-white/10 border-white/20"
        )}
      >
        <span className={clsx("text-sm uppercase font-bold tracking-widest", theme === 'light' ? "text-indigo-600" : "text-gray-300")}>Find</span>
        <motion.div 
          key={nextNumber}
          initial={{ scale: 1.5, rotate: 180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center font-black text-2xl shadow-lg border-2",
            theme === 'light' 
              ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-white/50" 
              : "bg-white text-indigo-900 border-white/20"
          )}
        >
           {nextNumber}
        </motion.div>
      </motion.div>

      <motion.div 
        animate={isError ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className={clsx(
          "grid grid-cols-5 gap-2 p-4 rounded-[2.5rem] transition-all duration-300 backdrop-blur-2xl border shadow-2xl relative z-10",
          isError 
            ? "bg-red-500/20 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.4)]" 
            : theme === 'light'
              ? "bg-white/60 border-white shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
              : "bg-white/5 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        )}
        style={{ width: 'min(90vw, 400px)', height: 'min(90vw, 400px)' }}
      >
        {/* Central Focus Dot */}
        <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse border-2 border-white/50" />

        {numbers.map((num) => (
          <motion.button
            key={num}
            whileHover={num >= nextNumber ? { scale: 1.1, zIndex: 10 } : {}}
            whileTap={num >= nextNumber ? { scale: 0.9 } : {}}
            onClick={() => handleCellClick(num)}
            className={clsx(
              "flex items-center justify-center text-2xl sm:text-3xl font-black rounded-2xl transition-colors relative overflow-hidden shadow-sm border",
              num < nextNumber 
                ? theme === 'light'
                  ? "opacity-50 bg-gray-200/50 text-gray-400 border-transparent"
                  : "opacity-30 bg-black/40 text-gray-500 border-transparent" 
                : theme === 'light'
                  ? "bg-white border-indigo-50 text-gray-800 hover:bg-indigo-50"
                  : skinClass
            )}
          >
            <span className="relative z-10 drop-shadow-sm">{num}</span>
            {/* Subtle reflection */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};

export default SchulteGame;
