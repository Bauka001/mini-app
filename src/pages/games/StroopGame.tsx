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
  { name: 'Red', hex: '#EF4444', value: 'red' },
  { name: 'Blue', hex: '#3B82F6', value: 'blue' },
  { name: 'Green', hex: '#22C55E', value: 'green' },
  { name: 'Yellow', hex: '#EAB308', value: 'yellow' },
];

const StroopBoard = ({ onEnd }: { onEnd: (score: string, coins: number) => void }) => {
  const { activeSkin } = useStore();
  const [currentRound, setCurrentRound] = useState<{ word: string, color: string, colorValue: string } | null>(null);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [isWrong, setIsWrong] = useState(false);
  const skinClass = SKIN_STYLES[activeSkin] || SKIN_STYLES.default;

  const generateRound = () => {
    // Random word from COLORS names
    const wordObj = COLORS[Math.floor(Math.random() * COLORS.length)];
    // Random color from COLORS hex
    const colorObj = COLORS[Math.floor(Math.random() * COLORS.length)];

    setCurrentRound({
      word: wordObj.name,
      color: colorObj.hex,
      colorValue: colorObj.value
    });
  };

  useEffect(() => {
    generateRound();
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
      const timeSpent = ((Date.now() - startTime) / 1000).toFixed(1);
      const finalCorrect = isCorrect ? correctCount + 1 : correctCount;
      const coins = finalCorrect * 3; 
      onEnd(`${finalCorrect}/10 (${timeSpent}s)`, coins);
    } else {
      generateRound();
    }
  };

  if (!currentRound) return null;

  return (
    <div className="h-full flex flex-col items-center justify-between p-6 pb-20">
      <div className="w-full flex justify-between text-xl font-bold">
        <div className="text-primary">Correct: {correctCount}/10</div>
        <div className="text-white">Round: {roundsPlayed + 1}/10</div>
      </div>

      <div className={clsx(
        "flex-1 flex items-center justify-center w-full transition-colors duration-300 rounded-2xl mb-8",
        isWrong ? "bg-red-900/20" : ""
      )}>
        <h2 
          className="text-6xl font-black tracking-wider uppercase"
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
              "h-20 rounded-2xl active:scale-95 transition-transform font-bold text-xl uppercase tracking-wider",
              skinClass
            )}
          >
            {col.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StroopGame;
