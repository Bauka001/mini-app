import { useState, useEffect } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { SKIN_STYLES } from '../../utils/skins';
import { motion, AnimatePresence } from 'framer-motion';

export const MathGame = () => {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  
  return (
    <GameWrapper
      title={t('game_math', 'Arithmetic')}
      instructions={t('math_desc', 'Solve 10 math problems as fast as you can.')}
    >
      {({ onEnd, isPaused, theme }) => <MathBoard onEnd={(score, coins) => {
        addGameResult({ gameId: 'math', score, coinsEarned: coins });
        onEnd(score, coins);
      }} isPaused={isPaused} theme={theme} />}
    </GameWrapper>
  );
};

export const MathBoard = ({ onEnd, isPaused: _isPaused, theme }: { onEnd: (score: string, coins: number) => void, isPaused: boolean, theme: string }) => {
  const { activeSkin, user } = useStore();
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
    <div className={clsx(
      "h-full flex flex-col items-center justify-between p-6 pb-20 relative transition-colors duration-500",
      theme === 'light' ? 'bg-gradient-to-br from-blue-50 to-indigo-50' : 'bg-transparent'
    )}>
      {/* Top Bar Stats */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full flex justify-between items-center text-lg font-bold mb-4 z-10"
      >
        <div className="flex flex-col gap-2">
          <div className={clsx(
            "px-4 py-1.5 rounded-xl text-xs backdrop-blur-md border shadow-sm font-mono tracking-wider",
            theme === 'light' ? "bg-white/80 border-gray-200 text-gray-600" : "bg-white/10 border-white/10 text-white/60"
          )}>
            ID: {user?.gameId || '17096844'}
          </div>
          <div className={clsx(
            "px-5 py-2 rounded-2xl backdrop-blur-xl border shadow-lg flex items-center gap-2",
            theme === 'light' ? "bg-white/90 border-indigo-100 text-indigo-600" : "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
          )}>
            <span className="text-xl">✨</span> {correctCount}/10
          </div>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <motion.div 
            animate={timeLeft < 10 ? { scale: [1, 1.1, 1], color: ['#ef4444', '#f87171', '#ef4444'] } : {}}
            transition={{ repeat: timeLeft < 10 ? Infinity : 0, duration: 0.5 }}
            className={clsx(
              "px-5 py-2 rounded-2xl backdrop-blur-xl border shadow-lg tabular-nums tracking-wider",
              timeLeft < 10 
                ? "bg-red-500/20 border-red-500/40 text-red-500 animate-pulse-glow" 
                : theme === 'light' 
                  ? "bg-white/90 border-blue-100 text-blue-600" 
                  : "bg-blue-500/20 border-blue-500/30 text-blue-300"
            )}
          >
            ⏱ {timeLeft.toFixed(1)}s
          </motion.div>
          <div className={clsx(
            "px-4 py-1.5 rounded-xl backdrop-blur-md border shadow-sm text-sm font-medium",
            theme === 'light' ? "bg-white/80 border-gray-200 text-gray-600" : "bg-white/10 border-white/10 text-white/80"
          )}>
            Q: {questionsAnswered + 1}/10
          </div>
        </div>
      </motion.div>

      {/* Main Question Display */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={question.text}
          initial={{ scale: 0.8, opacity: 0, rotateX: -20 }}
          animate={{ scale: 1, opacity: 1, rotateX: 0 }}
          exit={{ scale: 1.1, opacity: 0, filter: "blur(10px)" }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.5 }}
          className={clsx(
            "flex-1 flex flex-col items-center justify-center w-full rounded-[2.5rem] mb-8 border relative overflow-hidden group",
            isWrong 
              ? "bg-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.4)] border-red-500/50 animate-shake" 
              : theme === 'light'
                ? "bg-white/60 border-white shadow-2xl backdrop-blur-xl"
                : "bg-white/5 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border-white/10"
          )}
        >
          {/* Decorative background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 pointer-events-none group-hover:opacity-100 transition-opacity duration-500" />
          
          <h2 className={clsx(
            "text-7xl sm:text-8xl font-black tracking-tighter text-transparent bg-clip-text drop-shadow-2xl z-10",
            theme === 'light' ? "bg-gradient-to-br from-gray-800 to-gray-500" : "bg-gradient-to-br from-white via-blue-100 to-gray-400"
          )}>
            {question.text}
          </h2>
          <div className={clsx(
            "mt-6 text-3xl font-bold z-10",
            theme === 'light' ? "text-indigo-400" : "text-indigo-400/80"
          )}>= ?</div>
        </motion.div>
      </AnimatePresence>

      {/* Answer Options */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm z-10">
        {question.options.map((opt, idx) => (
          <motion.button
            key={`${question.text}-${idx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAnswer(opt)}
            className={clsx(
              "text-4xl sm:text-5xl font-black py-8 rounded-[2rem] transition-all duration-300 shadow-xl relative overflow-hidden group border",
              theme === 'light' 
                ? "bg-white text-gray-800 border-gray-100 hover:shadow-indigo-200 hover:border-indigo-200" 
                : "bg-white/10 text-white border-white/10 hover:bg-white/20 hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]",
              skinClass
            )}
          >
             <span className="relative z-10 drop-shadow-md">{opt}</span>
             <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
             {/* Glossy reflection */}
             <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-[2rem] pointer-events-none" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default MathGame;
