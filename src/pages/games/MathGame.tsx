import { useState, useEffect } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStore';
import { SKIN_STYLES } from '../../utils/skins';

export const MathGame = () => {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  
  return (
    <GameWrapper
      title={t('game_math', 'Arithmetic')}
      instructions={t('math_desc', 'Solve 10 math problems as fast as you can.')}
    >
      {({ onEnd }) => <MathBoard onEnd={(score, coins) => {
        addGameResult({ gameId: 'math', score, coinsEarned: coins });
        onEnd(score, coins);
      }} />}
    </GameWrapper>
  );
};

export const MathBoard = ({ onEnd }: { onEnd: (score: string, coins: number) => void }) => {
  const { activeSkin } = useStore();
  const [question, setQuestion] = useState<{ text: string, answer: number, options: number[] } | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60); // 60s hard limit
  const [isWrong, setIsWrong] = useState(false);
  const skinClass = SKIN_STYLES[activeSkin] || SKIN_STYLES.default;

  useEffect(() => {
    generateQuestion();
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          onEnd(`Failed (Time)`, 0);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  const generateQuestion = () => {
    // ... existing logic ...
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, ans;

    if (op === '*') {
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      ans = a * b;
    } else {
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      if (op === '-') {
        if (a < b) [a, b] = [b, a];
        ans = a - b;
      } else {
        ans = a + b;
      }
    }

    const options = new Set<number>();
    options.add(ans);
    while (options.size < 4) {
      const offset = Math.floor(Math.random() * 10) - 5;
      const optionVal: number = ans + offset;
      if (optionVal !== ans && optionVal > 0) options.add(optionVal);
      if (options.size < 4) options.add(ans + Math.floor(Math.random() * 20) + 1);
    }

    setQuestion({
      text: `${a} ${op} ${b}`,
      answer: ans,
      options: Array.from(options).sort(() => Math.random() - 0.5)
    });
  };

  const handleAnswer = (val: number) => {
    let isCorrect = false;
    if (question && val === question.answer) {
      isCorrect = true;
      setCorrectCount(c => c + 1);
    } else {
      setIsWrong(true);
      setTimeout(() => setIsWrong(false), 300);
    }

    const nextCount = questionsAnswered + 1;
    setQuestionsAnswered(nextCount);

    if (nextCount >= 10) {
      const timeSpent = (60 - timeLeft).toFixed(1);
      const finalCorrect = isCorrect ? correctCount + 1 : correctCount;
      const coins = finalCorrect * 2; 
      onEnd(`${finalCorrect}/10 (${timeSpent}s)`, coins);
    } else {
      generateQuestion();
    }
  };

  if (!question) return null;

  return (
    <div className="h-full flex flex-col items-center justify-between p-6 pb-20 relative">
      <div className="w-full flex justify-between text-lg font-bold">
        <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/5 text-primary shadow-lg">
          Correct: {correctCount}/10
        </div>
        <div className={clsx(
           "px-4 py-2 rounded-full backdrop-blur-md border border-white/5 shadow-lg transition-colors",
           timeLeft < 10 ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-white/10 text-white"
        )}>
          {timeLeft.toFixed(1)}s
        </div>
        <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/5 text-white shadow-lg">
          Q: {questionsAnswered + 1}/10
        </div>
      </div>

      <div className={clsx(
        "flex-1 flex flex-col items-center justify-center w-full transition-all duration-300 rounded-3xl mb-8 border border-white/5 relative overflow-hidden",
        isWrong ? "bg-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.4)]" : "bg-white/5 backdrop-blur-xl shadow-2xl"
      )}>
        <h2 className="text-7xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 drop-shadow-2xl">
          {question.text}
        </h2>
        <div className="mt-4 text-2xl text-gray-400 font-bold">= ?</div>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {question.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswer(opt)}
            className={clsx(
              "text-4xl font-bold py-8 rounded-2xl active:scale-95 transition-all duration-200 shadow-lg relative overflow-hidden group",
              skinClass
            )}
          >
             <span className="relative z-10">{opt}</span>
             <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default MathGame;
