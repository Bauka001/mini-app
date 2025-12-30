import { useState, useEffect } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStore';

const GRID_SIZE = 5;
const TOTAL_NUMBERS = GRID_SIZE * GRID_SIZE;

const SKIN_STYLES: Record<string, string> = {
  default: "bg-secondary text-white",
  neon_blue: "bg-blue-900/40 text-blue-100 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]",
  royal_purple: "bg-purple-900/40 text-purple-100 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]",
  matrix: "bg-green-900/20 text-green-400 border border-green-500/30 font-mono",
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

const SchulteBoard = ({ onEnd }: { onEnd: (score: string, coins: number) => void }) => {
  const { activeSkin } = useStore();
  const [numbers, setNumbers] = useState<number[]>([]);
  const [nextNumber, setNextNumber] = useState(1);
  const [startTime, setStartTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const nums = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    setNumbers(nums);
    setStartTime(Date.now());
    
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);

    return () => clearInterval(timer);
  }, []);

  const handleCellClick = (num: number) => {
    if (num === nextNumber) {
      if (num === TOTAL_NUMBERS) {
        const timeSpent = (Date.now() - startTime) / 1000;
        const finalTime = timeSpent.toFixed(2);
        
        // Calculate coins based on speed
        let earned = 10; // Base
        if (timeSpent < 25) earned = 100;
        else if (timeSpent < 35) earned = 50;
        else if (timeSpent < 50) earned = 25;

        onEnd(`${finalTime}s`, earned);
      } else {
        setNextNumber(prev => prev + 1);
      }
    } else {
      setIsError(true);
      setTimeout(() => setIsError(false), 300);
    }
  };

  const timeElapsed = ((currentTime - startTime) / 1000).toFixed(1);
  const skinClass = SKIN_STYLES[activeSkin] || SKIN_STYLES.default;

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="mb-6 text-2xl font-mono text-primary font-bold">
        {timeElapsed}s
      </div>
      
      <div className="text-sm text-gray-400 mb-2">
        Find: <span className="text-white font-bold text-xl ml-2">{nextNumber}</span>
      </div>

      <div 
        className={clsx(
          "grid grid-cols-5 gap-2 p-2 rounded-xl transition-all duration-300",
          isError ? "bg-red-900/50" : "bg-secondary/30"
        )}
        style={{ width: 'min(90vw, 400px)', height: 'min(90vw, 400px)' }}
      >
        {numbers.map((num) => (
          <button
            key={num}
            onClick={() => handleCellClick(num)}
            className={clsx(
              "flex items-center justify-center text-xl sm:text-2xl font-bold rounded-lg transition-all active:scale-95",
              num < nextNumber 
                ? "opacity-20 pointer-events-none" // Fade out found numbers
                : skinClass
            )}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SchulteGame;
