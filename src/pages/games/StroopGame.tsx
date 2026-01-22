import { useState, useEffect } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ReviveModal } from '../../components/modals/ReviveModal';
import { SKIN_STYLES } from '../../utils/skins';

export const StroopGame = () => {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  
  return (
    <GameWrapper
      title={t('game_stroop', 'Stroop Test')}
      instructions={t('stroop_desc', 'Select the COLOR of the text, not what the text says. Complete 10 rounds.')}
    >
      {({ onEnd, isPaused, theme }) => <StroopBoard onEnd={(score, coins) => {
        setTimeout(() => {
          addGameResult({ gameId: 'stroop', score, coinsEarned: coins });
        }, 0);
        onEnd(score, coins);
      }} isPaused={isPaused} theme={theme} />}
    </GameWrapper>
  );
};

const COLORS = [
  { name: 'Red', hex: '#EF4444', value: 'red', bg: 'bg-red-500' },
  { name: 'Blue', hex: '#3B82F6', value: 'blue', bg: 'bg-blue-500' },
  { name: 'Green', hex: '#22C55E', value: 'green', bg: 'bg-green-500' },
  { name: 'Yellow', hex: '#EAB308', value: 'yellow', bg: 'bg-yellow-500' },
];

const StroopBoard = ({ onEnd, isPaused, theme }: { onEnd: (score: string, coins: number) => void, isPaused: boolean, theme: string }) => {
  const { activeSkin } = useStore();
  const [currentRound, setCurrentRound] = useState<{ word: string, color: string, colorValue: string } | null>(null);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60); // 60s hard limit
  const [isWrong, setIsWrong] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState("");
  const [finalCoins, setFinalCoins] = useState(0);
  
  const skinClass = SKIN_STYLES[activeSkin] || SKIN_STYLES.default;

  const generateRound = () => {
    const wordObj = COLORS[Math.floor(Math.random() * COLORS.length)];
    const colorObj = COLORS[Math.floor(Math.random() * COLORS.length)];

    setCurrentRound({
      word: wordObj.name,
      color: colorObj.hex,
      colorValue: colorObj.value
    });
  };

  useEffect(() => {
    generateRound();
    const timer = setInterval(() => {
      if (gameOver || isPaused) return;

      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          setGameOver(true);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [gameOver, isPaused]);

  const handleAnswer = (selectedColorValue: string) => {
    if (!currentRound) return;
    
    let isCorrect = false;
    if (selectedColorValue === currentRound.colorValue) {
      isCorrect = true;
      setCorrectCount(c => c + 1);
    } else {
      setIsWrong(true);
      setTimeout(() => setIsWrong(false), 300);
    }

    const nextRound = roundsPlayed + 1;
    setRoundsPlayed(nextRound);

    if (nextRound >= 10) {
      const timeSpent = (60 - timeLeft).toFixed(1);
      const finalCorrect = isCorrect ? correctCount + 1 : correctCount;
      const coins = finalCorrect * 3; 
      onEnd(`${finalCorrect}/10 (${timeSpent}s)`, coins);
    } else {
      generateRound();
    }
  };

  const handleRestart = () => {
    setRoundsPlayed(0);
    setCorrectCount(0);
    setTimeLeft(60);
    setIsWrong(false);
    setGameOver(false);
    generateRound();
  };

  const handleRevive = () => {
    setTimeLeft(timeLeft + 15);
    setGameOver(false);
  };

  if (!currentRound) return null;

  return (
    <div className={clsx(
      "h-full flex flex-col items-center justify-between p-6 pb-20 relative transition-colors duration-300",
      theme === 'light' ? 'bg-gray-100' : 'bg-transparent'
    )}>
      <div className="w-full flex justify-between text-lg font-bold">
        <div className={clsx(
          "px-4 py-2 rounded-full backdrop-blur-md border shadow-lg",
          theme === 'light' ? "bg-white border-gray-200 text-primary" : "bg-white/10 border-white/5 text-primary"
        )}>
          Score: {correctCount}/10
        </div>
        <div className={clsx(
           "px-4 py-2 rounded-full backdrop-blur-md border shadow-lg transition-colors",
           timeLeft < 10 ? "bg-red-500/20 text-red-500 animate-pulse border-red-500/20" : 
           theme === 'light' ? "bg-white border-gray-200 text-gray-800" : "bg-white/10 border-white/5 text-white"
        )}>
          {timeLeft.toFixed(1)}s
        </div>
        <div className={clsx(
          "px-4 py-2 rounded-full backdrop-blur-md border shadow-lg",
          theme === 'light' ? "bg-white border-gray-200 text-gray-800" : "bg-white/10 border-white/5 text-white"
        )}>
          Round: {roundsPlayed + 1}/10
        </div>
      </div>

      <div className={clsx(
        "flex-1 flex items-center justify-center w-full transition-all duration-300 rounded-3xl mb-8 border relative overflow-hidden",
        isWrong 
          ? "bg-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.4)] border-red-500/20" 
          : theme === 'light'
            ? "bg-white border-gray-200 shadow-xl"
            : "bg-white/5 backdrop-blur-xl shadow-2xl border-white/5"
      )}>
        <h2 
          className="text-7xl font-black tracking-widest uppercase drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] scale-110"
          style={{ color: currentRound.color }}
        >
          {currentRound.word}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {COLORS.map((col) => (
          <button
            key={col.value}
            onClick={() => handleAnswer(col.value)}
            className={clsx(
              "h-24 rounded-2xl active:scale-95 transition-all duration-200 font-black text-xl uppercase tracking-widest flex items-center justify-center relative overflow-hidden group",
              skinClass
            )}
          >
            <span className="relative z-10">{col.name}</span>
            {/* Hover effect */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity ${col.bg}`} />
          </button>
        ))}
      </div>
      
      <AnimatePresence>
      <ReviveModal 
        isOpen={gameOver}
        score={correctCount}
        gameName="Stroop Test"
        onRevive={handleRevive}
        onRestart={handleRestart}
      />
      </AnimatePresence>
    </div>
  );
};

export default StroopGame;
