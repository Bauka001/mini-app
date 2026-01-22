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

  const generateLevel = () => {
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
  };

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
  }, [showLevelUp, showLevelComplete]);

  // Re-generate when level changes
  useEffect(() => {
    if (level > 1 && !showLevelComplete) {
       generateLevel();
       setFoundCount(0); // Reset found count for new level
    }
  }, [level, showLevelComplete]);

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
        addGameResult({ gameId: 'odd_one_out_level', score: 0, coinsEarned: levelReward });
        
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
      "h-full flex flex-col items-center justify-center p-4 relative transition-colors duration-300",
      theme === 'light' ? 'bg-gray-100' : 'bg-transparent'
    )}>
      {/* Level Complete Modal */}
      {showLevelComplete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <h2 className="text-3xl font-black text-white mb-2">LEVEL {level} COMPLETE!</h2>
            <div className="text-yellow-400 font-bold text-xl mb-6 flex items-center justify-center gap-2">
              +{50 + (level * 10)} Coins Earned!
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={handleNextLevel}
                className="w-full py-3 bg-primary text-black font-bold rounded-xl text-lg hover:scale-105 transition-transform shadow-lg shadow-primary/20"
              >
                Next Level
              </button>
              <button 
                onClick={handleReplayLevel}
                className="w-full py-3 bg-gray-700 text-white font-bold rounded-xl hover:bg-gray-600 transition-colors"
              >
                Replay Level
              </button>
              <button 
                onClick={handleMenu}
                className="w-full py-3 bg-transparent text-gray-400 font-bold hover:text-white transition-colors"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level Up Overlay (Small animation if needed, or remove since we have modal now) */}
      {/* We can keep it for small milestones or remove it. Let's remove it to avoid conflict with modal */}
      
      <div className="mb-8 flex flex-col items-center">
        <div className={clsx(
          "text-6xl font-black font-mono tracking-tighter transition-colors",
          timeLeft < 10 
            ? "text-red-500 animate-pulse" 
            : theme === 'light'
              ? "text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-600"
              : "text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400"
        )}>
          {timeLeft.toFixed(1)}
        </div>
        <div className="flex gap-4 mt-2">
           <div className={clsx("text-xs font-bold tracking-widest uppercase", theme === 'light' ? "text-primary" : "text-primary")}>Score: {score}</div>
           <div className={clsx("text-xs font-bold tracking-widest uppercase", theme === 'light' ? "text-gray-500" : "text-gray-400")}>Level: {level}</div>
           <div className="text-xs text-green-500 font-bold tracking-widest uppercase">Found: {foundCount}/{targetCount}</div>
        </div>
      </div>

      <div 
        className={clsx(
          "grid gap-2 p-3 rounded-2xl transition-all duration-300 backdrop-blur-xl border shadow-2xl",
          isWrong 
            ? "bg-red-500/20 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]" 
            : theme === 'light'
              ? "bg-white border-gray-200 shadow-xl"
              : "bg-white/5 border-white/5"
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
            className={clsx(
              "flex items-center justify-center text-3xl sm:text-4xl rounded-xl transition-all duration-100",
              theme === 'light' 
                ? "bg-gray-100 hover:bg-gray-200 active:scale-90 text-gray-800"
                : "bg-white/5 hover:bg-white/10 active:scale-90 text-white"
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
};

export default OddOneOutGame;
