import { useState, useEffect } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { motion, AnimatePresence } from 'framer-motion';
import { ReviveModal } from '../../components/modals/ReviveModal';
import { SKIN_STYLES } from '../../utils/skins';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';

const STROOP_FREE_PLAYS_KEY = 'stroop_free_plays_v2';
const STROOP_FREE_LIMIT = 3;
const getStroopPlays = () => { try { return parseInt(localStorage.getItem(STROOP_FREE_PLAYS_KEY) || '0', 10) || 0; } catch { return 0; } };
const incStroopPlays = () => { try { localStorage.setItem(STROOP_FREE_PLAYS_KEY, String(getStroopPlays() + 1)); } catch {} };

const StroopLocked = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-stone-950 via-indigo-950/40 to-stone-950">
      <div className="max-w-md w-full rounded-3xl border-2 border-yellow-400/60 bg-gradient-to-br from-yellow-500/15 to-orange-500/10 p-8 text-center shadow-2xl shadow-yellow-500/30">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
          <Zap size={32} className="text-stone-950" fill="currentColor" />
        </div>
        <h2 className="text-2xl font-black text-yellow-200 mb-2">Stroop Test — VIP</h2>
        <p className="text-sm text-yellow-100/80 mb-1">Тегін {STROOP_FREE_LIMIT} ойын аяқталды.</p>
        <p className="text-xs text-yellow-100/60 mb-6 flex items-center justify-center gap-1"><Lock size={12} /> Шектеусіз ойнау үшін VIP қажет</p>
        <button onClick={() => navigate('/shop')} className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-stone-950 shadow-lg shadow-yellow-500/40 hover:scale-[1.02] transition">VIP ашу</button>
        <button onClick={() => navigate(-1)} className="w-full mt-2 py-2.5 rounded-xl text-sm text-yellow-200/80 hover:text-yellow-200 transition">Артқа қайту</button>
      </div>
    </div>
  );
};

const StroopGameInner = () => {
  const { t } = useTranslation();
  const { addGameResult, plan } = useStore();
  
  return (
    <GameWrapper
      title={t('game_stroop', 'Stroop Test')}
      instructions={t('stroop_desc', 'Select the COLOR of the text, not what the text says. Complete 10 rounds.')}
    >
      {({ onEnd, isPaused, theme }) => <StroopBoard onEnd={(score, coins) => {
        if (plan !== 'pro' && plan !== 'premium') {
          incStroopPlays();
        }
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
  const { activeSkin, user } = useStore();
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
  }, [gameOver, isPaused, roundsPlayed]);

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
      "h-full flex flex-col items-center justify-between p-6 pb-20 relative transition-colors duration-500 overflow-hidden",
      theme === 'light' ? 'bg-gradient-to-br from-blue-50 to-indigo-50' : 'bg-transparent'
    )}>
      {theme !== 'light' && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background z-0" />
      )}

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
            Round: {roundsPlayed + 1}/10
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={roundsPlayed}
          initial={{ scale: 0.8, opacity: 0, rotateX: -20 }}
          animate={{ scale: 1, opacity: 1, rotateX: 0 }}
          exit={{ scale: 1.1, opacity: 0, filter: "blur(10px)" }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.5 }}
          className={clsx(
            "flex-1 flex items-center justify-center w-full transition-all duration-300 rounded-[2.5rem] mb-8 border relative group z-10",
            isWrong 
              ? "bg-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.4)] border-red-500/50 animate-shake" 
              : theme === 'light'
                ? "bg-white/60 border-white shadow-2xl backdrop-blur-xl"
                : "bg-white/5 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border-white/10"
          )}
        >
          {/* Decorative background glow based on current word's color */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity duration-500 rounded-[2.5rem]" 
            style={{ background: `radial-gradient(circle at center, ${currentRound.color}80 0%, transparent 70%)` }}
          />
          
          <h2 
            className="text-6xl sm:text-8xl font-black tracking-widest uppercase drop-shadow-[0_0_20px_rgba(0,0,0,0.5)] z-10"
            style={{ color: currentRound.color }}
          >
            {currentRound.word}
          </h2>
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm z-10">
        {COLORS.map((col, idx) => (
          <motion.button
            key={col.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAnswer(col.value)}
            className={clsx(
              "h-24 sm:h-28 rounded-[2rem] transition-all duration-300 font-black text-xl sm:text-2xl uppercase tracking-widest flex items-center justify-center relative overflow-hidden group shadow-xl border",
              theme === 'light' 
                ? "bg-white text-gray-800 border-gray-100 hover:shadow-indigo-200 hover:border-indigo-200" 
                : "bg-white/10 text-white border-white/10 hover:bg-white/20 hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]",
              skinClass
            )}
          >
            <span className="relative z-10 drop-shadow-md">{col.name}</span>
            {/* Hover effect mapping to actual color */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity ${col.bg}`} />
            {/* Glossy reflection */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-[2rem] pointer-events-none" />
          </motion.button>
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

export const StroopGame = () => {
  const tier = useStore((state) => state.plan);
  const [plays] = useState(() => getStroopPlays());
  const unlimited = tier === 'pro' || tier === 'premium';
  if (!unlimited && plays >= STROOP_FREE_LIMIT) return <StroopLocked />;
  return <StroopGameInner />;
};

export default StroopGame;
