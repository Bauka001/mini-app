import { useState, useEffect } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStore';

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
      {({ onEnd }) => <OddOneOutBoard onEnd={(score, coins) => {
        addGameResult({ gameId: 'odd_one_out', score, coinsEarned: coins });
        onEnd(score, coins);
      }} />}
    </GameWrapper>
  );
};

export const OddOneOutBoard = ({ onEnd }: { onEnd: (score: string, coins: number) => void }) => {
  const [level, setLevel] = useState(1);
  const [gridSize, setGridSize] = useState(3);
  const [items, setItems] = useState<string[]>([]);
  const [oddIndex, setOddIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [isWrong, setIsWrong] = useState(false);

  const generateLevel = () => {
    // Determine grid size based on level
    const newGridSize = Math.min(6, 3 + Math.floor((level - 1) / 3));
    setGridSize(newGridSize);

    const set = EMOJI_SETS[Math.floor(Math.random() * EMOJI_SETS.length)];
    const totalItems = newGridSize * newGridSize;
    const newOddIndex = Math.floor(Math.random() * totalItems);
    
    const newItems = Array(totalItems).fill(set.common);
    newItems[newOddIndex] = set.odd;

    setItems(newItems);
    setOddIndex(newOddIndex);
  };

  useEffect(() => {
    generateLevel();
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          onEnd(`${score} pts`, Math.floor(score / 2));
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  // Re-generate when level changes
  useEffect(() => {
    if (level > 1) generateLevel();
  }, [level]);

  const handleItemClick = (index: number) => {
    if (index === oddIndex) {
      setScore(s => s + 10 * level);
      setLevel(l => l + 1);
      // Add a tiny time bonus
      setTimeLeft(t => Math.min(60, t + 2));
    } else {
      setIsWrong(true);
      setTimeLeft(t => Math.max(0, t - 5)); // Penalty
      setTimeout(() => setIsWrong(false), 300);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className={clsx(
          "text-6xl font-black font-mono tracking-tighter transition-colors",
          timeLeft < 10 ? "text-red-500 animate-pulse" : "text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400"
        )}>
          {timeLeft.toFixed(1)}
        </div>
        <div className="flex gap-4 mt-2">
           <div className="text-xs text-primary font-bold tracking-widest uppercase">Score: {score}</div>
           <div className="text-xs text-gray-400 font-bold tracking-widest uppercase">Level: {level}</div>
        </div>
      </div>

      <div 
        className={clsx(
          "grid gap-2 p-3 rounded-2xl transition-all duration-300 backdrop-blur-xl border border-white/5 shadow-2xl",
          isWrong ? "bg-red-500/20 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]" : "bg-white/5"
        )}
        style={{ 
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          width: 'min(90vw, 400px)', 
          height: 'min(90vw, 400px)' 
        }}
      >
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => handleItemClick(index)}
            className="flex items-center justify-center text-3xl sm:text-4xl rounded-xl bg-white/5 hover:bg-white/10 active:scale-90 transition-all duration-100"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
};

export default OddOneOutGame;
