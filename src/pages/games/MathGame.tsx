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

const MathBoard = ({ onEnd }: { onEnd: (score: string, coins: number) => void }) => {
  const { activeSkin } = useStore();
  const [question, setQuestion] = useState<{ text: string, answer: number, options: number[] } | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [isWrong, setIsWrong] = useState(false);
  const skinClass = SKIN_STYLES[activeSkin] || SKIN_STYLES.default;

  const generateQuestion = () => {
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
      text: `${a} ${op} ${b} = ?`,
      answer: ans,
      options: Array.from(options).sort(() => Math.random() - 0.5)
    });
  };

  useEffect(() => {
    generateQuestion();
  }, []);

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
      // Game Over
      const timeSpent = ((Date.now() - startTime) / 1000).toFixed(1);
      const finalCorrect = isCorrect ? correctCount + 1 : correctCount;
      const coins = finalCorrect * 2; // 2 coins per correct answer
      onEnd(`${finalCorrect}/10 (${timeSpent}s)`, coins);
    } else {
      generateQuestion();
    }
  };

  if (!question) return null;

  return (
    <div className="h-full flex flex-col items-center justify-between p-6 pb-20">
      <div className="w-full flex justify-between text-xl font-bold">
        <div className="text-primary">Correct: {correctCount}/10</div>
        <div className="text-white">Q: {questionsAnswered + 1}/10</div>
      </div>

      <div className={clsx(
        "flex-1 flex items-center justify-center w-full transition-colors duration-300 rounded-2xl mb-8",
        isWrong ? "bg-red-900/20" : ""
      )}>
        <h2 className="text-6xl font-black tracking-wider">{question.text}</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {question.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswer(opt)}
            className={clsx(
              "text-3xl font-bold py-8 rounded-2xl active:scale-95 transition-transform",
              skinClass
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MathGame;
