import { useState, useEffect } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStore';

const GRID_SIZE = 5;
const TOTAL_NUMBERS = GRID_SIZE * GRID_SIZE;

const SKIN_STYLES: Record<string, string> = {
  default: "bg-white/5 text-white border border-white/10 hover:bg-white/10 backdrop-blur-sm shadow-lg shadow-black/20",
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
      {({ onEnd }) => <SchulteBoard onEnd={(score, coins) => {
        addGameResult({ gameId: 'schulte', score, coinsEarned: coins });
        onEnd(score, coins);
      }} />}
    </GameWrapper>
  );
};

export const SchulteBoard = ({ onEnd }: { onEnd: (score: string, coins: number) => void }) => {
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
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className={clsx(
          "text-6xl font-black font-mono tracking-tighter transition-colors",
          timeLeft < 10 ? "text-red-500 animate-pulse" : "text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400"
        )}>
          {timeLeft.toFixed(1)}
        </div>
        <div className="text-xs text-primary font-bold tracking-widest uppercase mt-1">Time Left</div>
      </div>
      
      <div className="flex items-center gap-3 mb-6 bg-white/5 px-4 py-2 rounded-full border border-white/5">
        <span className="text-gray-400 text-sm uppercase font-bold tracking-wider">Find</span>
        <div className="w-8 h-8 rounded-lg bg-primary text-black flex items-center justify-center font-black text-xl shadow-[0_0_15px_rgba(255,215,0,0.5)]">
           {nextNumber}
        </div>
      </div>

      <div 
        className={clsx(
          "grid grid-cols-5 gap-2 p-3 rounded-2xl transition-all duration-300 backdrop-blur-xl border border-white/5 shadow-2xl relative",
          isError ? "bg-red-500/20 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]" : "bg-white/5"
        )}
        style={{ width: 'min(90vw, 400px)', height: 'min(90vw, 400px)' }}
      >
        {/* Central Focus Dot */}
        <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />

        {numbers.map((num) => (
          <button
            key={num}
            onClick={() => handleCellClick(num)}
            className={clsx(
              "flex items-center justify-center text-xl sm:text-2xl font-bold rounded-xl transition-all active:scale-90 relative overflow-hidden",
              num < nextNumber 
                ? "opacity-50 grayscale text-gray-500 bg-black/20" // Don't fade out completely, just dim
                : skinClass
            )}
          >
            {num}
             {/* Subtle reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default SchulteGame;
