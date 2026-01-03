import { useState, useEffect } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStore';
import { SKIN_STYLES } from '../../utils/skins';

export const StroopGame = () => {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  
  return (
    <GameWrapper
      title={t('game_stroop', 'Stroop Test')}
      instructions={t('stroop_desc', 'Select the COLOR of the text, not what the text says. Complete 10 rounds.')}
    >
      {({ onEnd }) => <StroopBoard onEnd={(score, coins) => {
        addGameResult({ gameId: 'stroop', score, coinsEarned: coins });
        onEnd(score, coins);
      }} />}
    </GameWrapper>
  );
};

const COLORS = [
  { name: 'Red', hex: '#EF4444', value: 'red', bg: 'bg-red-500' },
  { name: 'Blue', hex: '#3B82F6', value: 'blue', bg: 'bg-blue-500' },
  { name: 'Green', hex: '#22C55E', value: 'green', bg: 'bg-green-500' },
  { name: 'Yellow', hex: '#EAB308', value: 'yellow', bg: 'bg-yellow-500' },
];

const StroopBoard = ({ onEnd }: { onEnd: (score: string, coins: number) => void }) => {
  const { activeSkin } = useStore();
  const [currentRound, setCurrentRound] = useState<{ word: string, color: string, colorValue: string } | null>(null);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60); // 60s hard limit
  const [isWrong, setIsWrong] = useState(false);
  
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
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          onEnd("Failed (Time)", 0);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

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

  if (!currentRound) return null;

  return (
    <div className="h-full flex flex-col items-center justify-between p-6 pb-20 relative">
      <div className="w-full flex justify-between text-lg font-bold">
        <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/5 text-primary shadow-lg">
          Score: {correctCount}/10
        </div>
        <div className={clsx(
           "px-4 py-2 rounded-full backdrop-blur-md border border-white/5 shadow-lg transition-colors",
           timeLeft < 10 ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-white/10 text-white"
        )}>
          {timeLeft.toFixed(1)}s
        </div>
        <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/5 text-white shadow-lg">
          Round: {roundsPlayed + 1}/10
        </div>
      </div>

      <div className={clsx(
        "flex-1 flex items-center justify-center w-full transition-all duration-300 rounded-3xl mb-8 border border-white/5 relative overflow-hidden",
        isWrong ? "bg-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.4)]" : "bg-white/5 backdrop-blur-xl shadow-2xl"
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
    </div>
  );
};

export default StroopGame;
