import { useState, useEffect, useCallback, useRef } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { SKIN_STYLES } from '../../utils/skins';
import { motion, AnimatePresence } from 'framer-motion';
import { Difficulty, DIFFICULTY_COIN_MULT } from '../../types/games';
import { useGameTimer } from '../../hooks/useGameTimer';
import { useLocalBest } from '../../hooks/useLocalBest';
import { useHaptic } from '../../hooks/useHaptic';
import { useGameSettings } from '../../store/gameSettings';
import { DifficultySelector } from '../../components/games/DifficultySelector';
import { GameHUD } from '../../components/games/GameHUD';
import { ReviveModal } from '../../components/modals/ReviveModal';

const GAME_ID = 'math';

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  {
    timeMs: number;
    opRange: [number, number];
    ops: string[];
    questionCount: number;
  }
> = {
  easy:   { timeMs: 45_000, opRange: [1, 20],  ops: ['+', '-'],           questionCount: 10 },
  medium: { timeMs: 60_000, opRange: [1, 50],  ops: ['+', '-', '×'],       questionCount: 12 },
  hard:   { timeMs: 75_000, opRange: [1, 99],  ops: ['+', '-', '×', '÷'],  questionCount: 15 },
};

export const MathGame = () => {
  const { t } = useTranslation();
  const { addGameResult, theme } = useStore();

  return (
    <GameWrapper
      title={t('game_math', 'Arithmetic')}
      instructions={t('math_desc', 'Solve 10 math problems as fast as you can.')}
    >
      {({ onEnd, isPaused }) => (
        <MathBoard
          onEnd={(score, coins) => {
            queueMicrotask(() => addGameResult({ gameId: GAME_ID, score, coinsEarned: coins }));
            onEnd(score, coins);
          }}
          isGamePaused={isPaused}
          theme={theme}
        />
      )}
    </GameWrapper>
  );
};

export const MathBoard = ({ onEnd, isGamePaused, theme }: { onEnd: (score: string, coins: number) => void, isGamePaused: boolean, theme: string }) => {
  const { activeSkin } = useStore();
  const storedDifficulty = useGameSettings(s => s.difficultyPrefs[GAME_ID] ?? 'medium');
  const setStoredDifficulty = useGameSettings(s => s.setDifficulty);
  const [difficulty, setDifficulty] = useState<Difficulty>(storedDifficulty);
  const config = DIFFICULTY_CONFIG[difficulty];

  const { best, submit } = useLocalBest(GAME_ID, difficulty);
  const haptic = useHaptic();


  const [question, setQuestion] = useState<{ text: string, answer: number, options: number[] } | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isWrong, setIsWrong] = useState(false);
  // Adaptive multiplier — auto-scales question complexity inside the chosen
  // difficulty band. Range 0.5×–2.0×; starts at 1.0×. Each correct answer
  // nudges up by ~10%, each wrong drops to 0.8×. A user who's nailing it
  // gets stretched; a struggling user gets a break. Reduces 'too easy' /
  // 'too hard' churn that fixed difficulties cause.
  const [skillBoost, setSkillBoost] = useState(1);
  const skinClass = SKIN_STYLES[activeSkin] || SKIN_STYLES.default;

  const questionRef = useRef<{ text: string, answer: number, options: number[] } | null>(null);
  questionRef.current = question;
  const skillRef = useRef(skillBoost);
  skillRef.current = skillBoost;

  const generateQuestion = useCallback(() => {
    // Scale the upper bound by current skill multiplier — pulls in or pushes
    // out the question's number range without changing which ops are allowed.
    const baseMax = config.opRange[1];
    const adaptiveMax = Math.max(config.opRange[0] + 5, Math.round(baseMax * skillRef.current));
    const opRange: [number, number] = [config.opRange[0], adaptiveMax];
    const ops = config.ops;
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, ans;

    if (op === '×') {
      a = Math.floor(Math.random() * (opRange[1] - opRange[0] + 1)) + opRange[0];
      b = Math.floor(Math.random() * (opRange[1] - opRange[0] + 1)) + opRange[0];
      ans = a * b;
    } else if (op === '÷') {
      b = Math.floor(Math.random() * (opRange[1] - 5)) + 2;
      ans = Math.floor(Math.random() * (opRange[1] - 5)) + 2;
      a = ans * b;
    } else {
      a = Math.floor(Math.random() * (opRange[1] - opRange[0] + 1)) + opRange[0];
      b = Math.floor(Math.random() * (opRange[1] - opRange[0] + 1)) + opRange[0];
      if (op === '-') {
        if (a < b) [a, b] = [b, a];
        ans = a - b;
      } else {
        ans = a + b;
      }
    }

    const options = new Set<number>();
    options.add(ans);

    // Generate 3 distinct wrong answers
    while (options.size < 4) {
      const offset = Math.floor(Math.random() * 20) - 10;
      const candidate = ans + offset;
      if (candidate !== ans && candidate > 0) {
        options.add(candidate);
      }
    }

    const optionsArray = Array.from(options).sort(() => Math.random() - 0.5);

    setQuestion({
      text: `${a} ${op} ${b}`,
      answer: ans,
      options: optionsArray
    });
  }, [config]);

  useEffect(() => {
    generateQuestion();
  }, [generateQuestion, difficulty]);

  const { timeLeftMs, reset: resetTimer } = useGameTimer({
    durationMs: config.timeMs,
    tickMs: 100,
    isActive: questionsAnswered < config.questionCount,
    isPaused: isGamePaused,
    resetKey: `${difficulty}`,
    onExpire: () => {
      haptic.notification('error');
      handleGameEnd();
    },
  });

  const addPointsForWin = useCallback(() => {
    const base = 10;
    const comboBonus = combo > 0 && combo % 3 === 0 ? 20 : 0;
    const gained = base + comboBonus;
    setScore(s => s + gained);
  }, [combo]);

  const handleAnswer = useCallback((val: number) => {
    if (!questionRef.current) return;

    const isCorrect = val === questionRef.current.answer;

    if (isCorrect) {
      setCorrectCount(c => c + 1);
      setCombo(c => c + 1);
      // Adaptive: each correct = +10% skill, capped at 2× — within ~6 right
      // answers user is at peak difficulty for their chosen tier.
      setSkillBoost((s) => Math.min(2, s * 1.1));
      addPointsForWin();
      haptic.impact('light');
    } else {
      setCombo(0);
      // Wrong answer = sharp drop to 0.8× (or 0.5× floor). Faster recovery
      // path than the slow +10% ladder feels fair, not punishing.
      setSkillBoost((s) => Math.max(0.5, s * 0.8));
      setIsWrong(true);
      haptic.notification('error');
      setTimeout(() => setIsWrong(false), 300);
    }

    const nextCount = questionsAnswered + 1;
    setQuestionsAnswered(nextCount);

    if (nextCount >= config.questionCount) {
      queueMicrotask(handleGameEnd);
    } else {
      generateQuestion();
    }
  }, [questionsAnswered, config.questionCount, addPointsForWin, haptic, generateQuestion]);

  const handleGameEnd = useCallback(() => {
    const isNewBest = submit(score);
    const coins = Math.round((score * DIFFICULTY_COIN_MULT[difficulty]) / 4);
    onEnd(
      isNewBest ? `${score} ★` : `${score}`,
      Math.max(0, coins)
    );
  }, [score, submit, difficulty, onEnd]);

  const handleRevive = useCallback(() => {
    resetTimer();
    setQuestionsAnswered(0);
    setCorrectCount(0);
    setScore(0);
    setCombo(0);
    generateQuestion();
    haptic.impact('medium');
  }, [resetTimer, generateQuestion, haptic]);

  const changeDifficulty = useCallback((next: Difficulty) => {
    setStoredDifficulty(GAME_ID, next);
    setDifficulty(next);
    setQuestionsAnswered(0);
    setCorrectCount(0);
    setScore(0);
    setCombo(0);
  }, [setStoredDifficulty]);

  const handleKeydown = useCallback((e: KeyboardEvent) => {
    if (questionsAnswered >= config.questionCount || isGamePaused) return;
    if (!question) return;
    if (e.key >= '1' && e.key <= '4') {
      const idx = parseInt(e.key, 10) - 1;
      if (idx < question.options.length) {
        handleAnswer(question.options[idx]);
      }
    }
  }, [questionsAnswered, config.questionCount, isGamePaused, question, handleAnswer]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [handleKeydown]);

  if (!question) return null;

  const isGameActive = questionsAnswered < config.questionCount && timeLeftMs > 0;

  return (
    <div
      className={clsx(
        'h-full flex flex-col items-center p-4 relative overflow-hidden transition-colors duration-500',
        theme === 'light' ? 'bg-gradient-to-br from-blue-50 to-indigo-50' : 'bg-transparent'
      )}
    >
      {theme !== 'light' && (
        <div
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background z-0"
          aria-hidden
        />
      )}

      <ReviveModal
        isOpen={timeLeftMs <= 0 && questionsAnswered < config.questionCount}
        score={score}
        gameName="Arithmetic"
        onRevive={handleRevive}
        onRestart={() => handleGameEnd()}
      />

      <div className="w-full max-w-md mx-auto z-10 mt-2 mb-4">
        <GameHUD
          score={score}
          timeLeftSec={timeLeftMs / 1000}
          timeTotalSec={config.timeMs / 1000}
          best={best}
          combo={combo}
          showSoundToggle
          showHapticToggle
        />
      </div>

      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-4 flex flex-col items-center z-10 w-full max-w-sm gap-3"
      >
        <DifficultySelector
          value={difficulty}
          onChange={changeDifficulty}
          size="sm"
          disabled={isGameActive}
        />
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.text}
          initial={{ scale: 0.8, opacity: 0, rotateX: -20 }}
          animate={{ scale: 1, opacity: 1, rotateX: 0 }}
          exit={{ scale: 1.1, opacity: 0, filter: "blur(10px)" }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.5 }}
          className={clsx(
            "flex-1 flex flex-col items-center justify-center w-full rounded-[2.5rem] mb-8 border relative overflow-hidden group z-10",
            isWrong
              ? "bg-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.4)] border-red-500/50 animate-shake"
              : theme === 'light'
                ? "bg-white/60 border-white shadow-2xl backdrop-blur-xl"
                : "bg-white/5 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border-white/10"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 pointer-events-none group-hover:opacity-100 transition-opacity duration-500" />

          <h2
            className={clsx(
              "text-7xl sm:text-8xl font-black tracking-tighter text-transparent bg-clip-text drop-shadow-2xl z-10",
              theme === 'light' ? "bg-gradient-to-br from-gray-800 to-gray-500" : "bg-gradient-to-br from-white via-blue-100 to-gray-400"
            )}
            role="heading"
            aria-level={2}
          >
            {question.text}
          </h2>
          <div
            className={clsx(
              "mt-6 text-3xl font-bold z-10",
              theme === 'light' ? "text-indigo-400" : "text-indigo-400/80"
            )}
          >
            = ?
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm z-10" role="group" aria-label="Answer options">
        {question.options.map((opt, idx) => (
          <motion.button
            key={`${question.text}-${idx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAnswer(opt)}
            aria-label={`Option ${idx + 1}: ${opt}`}
            className={clsx(
              "text-4xl sm:text-5xl font-black py-8 rounded-[2rem] transition-all duration-300 shadow-xl relative overflow-hidden group border focus:outline-none focus:ring-2 focus:ring-primary/60",
              theme === 'light'
                ? "bg-white text-gray-800 border-gray-100 hover:shadow-indigo-200 hover:border-indigo-200"
                : "bg-white/10 text-white border-white/10 hover:bg-white/20 hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]",
              skinClass
            )}
            disabled={!isGameActive}
          >
            <span className="relative z-10 drop-shadow-md">{opt}</span>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-[2rem] pointer-events-none" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default MathGame;
