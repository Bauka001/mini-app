import { useState, useEffect, useMemo } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Crown } from 'lucide-react';

const SCHULTE_FREE_PLAYS_KEY = 'schulte_free_plays_v2';
const SCHULTE_FREE_LIMIT = 3;
const getSchultePlays = () => { try { return parseInt(localStorage.getItem(SCHULTE_FREE_PLAYS_KEY) || '0', 10) || 0; } catch { return 0; } };
const incSchultePlays = () => { try { localStorage.setItem(SCHULTE_FREE_PLAYS_KEY, String(getSchultePlays() + 1)); } catch {} };

// === Schulte modes — 5 variants for retention ===
//   classic  — 5×5 ascending 1→25 (original)
//   hard     — 7×7 ascending 1→49 (more cognitive load)
//   reverse  — 5×5 descending 25→1
//   colored  — 5×5 alternating red/black: find next red 1,3,5,…  then next black 2,4,6,…
//   shuffle  — 5×5 with random 25 numbers from 1..99 (find in ascending order)
export type SchulteMode = 'classic' | 'hard' | 'reverse' | 'colored' | 'shuffle';

export interface SchulteConfig {
  mode: SchulteMode;
  gridSize: number;
  timeLimit: number;
  // The sequence of numbers a user must hit in order.
  targetSequence: number[];
  // The numbers actually placed on the board (shuffled), parallel to indices.
  boardNumbers: number[];
  // Some modes (colored) need per-cell metadata
  cellColor?: ('red' | 'black')[];
  modeLabel: string;
}

const buildConfig = (mode: SchulteMode): SchulteConfig => {
  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  if (mode === 'hard') {
    const seq = Array.from({ length: 49 }, (_, i) => i + 1);
    return {
      mode, gridSize: 7, timeLimit: 120, targetSequence: seq,
      boardNumbers: shuffle(seq), modeLabel: 'HARD 7×7',
    };
  }
  if (mode === 'reverse') {
    const seq = Array.from({ length: 25 }, (_, i) => 25 - i); // 25,24,...,1
    return {
      mode, gridSize: 5, timeLimit: 60, targetSequence: seq,
      boardNumbers: shuffle([...seq]), modeLabel: 'REVERSE 25→1',
    };
  }
  if (mode === 'colored') {
    // Sequence: 1 (red), 2 (black), 3 (red), 4 (black), … 25 (red)
    const seq = Array.from({ length: 25 }, (_, i) => i + 1);
    const shuffled = shuffle([...seq]);
    // Even index in target order = red, odd = black — but on the board cells
    // we tie colour to the NUMBER, not position. So: number with same parity
    // as its position in seq gets one colour. Simpler: even number → black,
    // odd → red. That makes a deterministic colour per number.
    const cellColor: ('red' | 'black')[] = shuffled.map((n) => (n % 2 === 1 ? 'red' : 'black'));
    return {
      mode, gridSize: 5, timeLimit: 70, targetSequence: seq,
      boardNumbers: shuffled, cellColor, modeLabel: 'COLORED 1→25',
    };
  }
  if (mode === 'shuffle') {
    // Pick 25 random distinct numbers from 1..99, present them in ASCENDING
    // order — user can't memorise positions because numbers themselves vary.
    const pool = Array.from({ length: 99 }, (_, i) => i + 1);
    const picked = shuffle(pool).slice(0, 25).sort((a, b) => a - b);
    return {
      mode, gridSize: 5, timeLimit: 75, targetSequence: picked,
      boardNumbers: shuffle([...picked]), modeLabel: 'SHUFFLE 25 of 99',
    };
  }
  // classic 5×5
  const seq = Array.from({ length: 25 }, (_, i) => i + 1);
  return {
    mode: 'classic', gridSize: 5, timeLimit: 60, targetSequence: seq,
    boardNumbers: shuffle(seq), modeLabel: 'CLASSIC 5×5',
  };
};

const SchulteLocked = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-stone-950 via-amber-950/40 to-stone-950">
      <div className="max-w-md w-full rounded-3xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-500/15 to-rose-500/10 p-8 text-center shadow-2xl shadow-amber-500/30">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 shadow-lg">
          <Crown size={32} className="text-stone-950" fill="currentColor" />
        </div>
        <h2 className="text-2xl font-black text-amber-200 mb-2">Schulte — VIP</h2>
        <p className="text-sm text-amber-100/80 mb-1">Тегін {SCHULTE_FREE_LIMIT} пробный ойын аяқталды.</p>
        <p className="text-xs text-amber-100/60 mb-6 flex items-center justify-center gap-1"><Lock size={12} /> Шектеусіз ойнау үшін VIP қажет</p>
        <button onClick={() => navigate('/shop')} className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/40 hover:scale-[1.02] transition">VIP ашу</button>
        <button onClick={() => navigate(-1)} className="w-full mt-2 py-2.5 rounded-xl text-sm text-amber-200/80 hover:text-amber-200 transition">Артқа қайту</button>
      </div>
    </div>
  );
};

const SKIN_STYLES: Record<string, string> = {
  default: "bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm shadow-lg",
  neon_blue: "bg-blue-500/10 text-blue-200 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:bg-blue-500/20",
  royal_purple: "bg-purple-500/10 text-purple-200 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:bg-purple-500/20",
  matrix: "bg-green-500/10 text-green-400 border border-green-500/30 font-mono hover:bg-green-500/20",
};

const SchulteGameInner = () => {
  const { t } = useTranslation();
  const { addGameResult, plan } = useStore();
  const [searchParams] = useSearchParams();
  const modeParam = (searchParams.get('mode') || 'classic') as SchulteMode;
  const validModes: SchulteMode[] = ['classic', 'hard', 'reverse', 'colored', 'shuffle'];
  const mode = validModes.includes(modeParam) ? modeParam : 'classic';
  const config = useMemo(() => buildConfig(mode), [mode]);

  return (
    <GameWrapper
      title={`${t('game_schulte', 'Schulte Table')} · ${config.modeLabel}`}
      instructions={t(`schulte_desc_${mode}`, t('schulte_desc', 'Find numbers in order. Keep your eyes on the center.'))}
    >
      {({ onEnd, isPaused, theme }) => <SchulteBoard config={config} onEnd={(score, coins) => {
        if (plan !== 'pro' && plan !== 'premium') {
          incSchultePlays();
        }
        setTimeout(() => {
          addGameResult({ gameId: 'schulte', score, coinsEarned: coins });
        }, 0);
        onEnd(score, coins);
      }} isPaused={isPaused} theme={theme} />}
    </GameWrapper>
  );
};

export const SchulteBoard = ({ config, onEnd, isPaused, theme }: { config: SchulteConfig, onEnd: (score: string, coins: number) => void, isPaused: boolean, theme: string }) => {
  const { activeSkin } = useStore();
  const [numbers, setNumbers] = useState<number[]>([]);
  const [colors, setColors] = useState<('red' | 'black')[]>([]);
  const [sequenceIdx, setSequenceIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [isError, setIsError] = useState(false);

  const nextNumber = config.targetSequence[sequenceIdx];

  useEffect(() => {
    setNumbers(config.boardNumbers);
    setColors(config.cellColor || []);

    const timer = setInterval(() => {
      if (isPaused) return;
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          onEnd("Failed", 0);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
    // Mount-only ticker; onEnd / isPaused identities change every render and
    // would reset the countdown if added.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCellClick = (num: number) => {
    if (num === nextNumber) {
      // Was this the LAST target in the sequence?
      const isLast = sequenceIdx + 1 >= config.targetSequence.length;
      if (isLast) {
        const timeSpent = (config.timeLimit - timeLeft).toFixed(2);
        const t = parseFloat(timeSpent);
        // Scale reward by mode difficulty (hard 7×7 gives more, base = classic)
        const modeMultiplier = config.mode === 'hard' ? 1.5 : config.mode === 'colored' ? 1.3 : config.mode === 'shuffle' ? 1.2 : 1;
        let base = 10;
        if (t < config.timeLimit * 0.4) base = 100;
        else if (t < config.timeLimit * 0.58) base = 50;
        else if (t < config.timeLimit * 0.83) base = 25;
        onEnd(`${timeSpent}s`, Math.round(base * modeMultiplier));
      } else {
        setSequenceIdx((i) => i + 1);
      }
    } else {
      setIsError(true);
      setTimeout(() => setIsError(false), 300);
    }
  };

  const skinClass = SKIN_STYLES[activeSkin] || SKIN_STYLES.default;

  return (
    <div className={clsx(
      "h-full flex flex-col items-center justify-center p-4 transition-colors duration-500 relative",
      theme === 'light' ? 'bg-gradient-to-br from-indigo-50 to-blue-50' : 'bg-transparent'
    )}>
      {theme !== 'light' && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background z-0" />
      )}

      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 flex flex-col items-center z-10"
      >
        <div className={clsx(
          "text-6xl font-black font-mono tracking-tighter transition-colors",
          timeLeft < 10 
            ? "text-red-500 animate-pulse-glow" 
            : theme === 'light'
              ? "text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600"
              : "text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400"
        )}>
          {timeLeft.toFixed(1)}
        </div>
        <div className={clsx("text-xs font-bold tracking-widest uppercase mt-1", theme === 'light' ? "text-indigo-400" : "text-gray-400")}>Time Left</div>
      </motion.div>
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={clsx(
          "flex items-center gap-4 mb-6 px-6 py-3 rounded-full border shadow-lg backdrop-blur-xl z-10",
          theme === 'light' ? "bg-white/80 border-indigo-100" : "bg-white/10 border-white/20"
        )}
      >
        <span className={clsx("text-sm uppercase font-bold tracking-widest", theme === 'light' ? "text-indigo-600" : "text-gray-300")}>Find</span>
        <motion.div 
          key={nextNumber}
          initial={{ scale: 1.5, rotate: 180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center font-black text-2xl shadow-lg border-2",
            theme === 'light' 
              ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-white/50" 
              : "bg-white text-indigo-900 border-white/20"
          )}
        >
           {nextNumber}
        </motion.div>
      </motion.div>

      <motion.div 
        animate={isError ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className={clsx(
          "gap-2 p-4 rounded-[2.5rem] transition-all duration-300 backdrop-blur-2xl border shadow-2xl relative z-10",
          isError
            ? "bg-red-500/20 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.4)]"
            : theme === 'light'
              ? "bg-white/60 border-white shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
              : "bg-white/5 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        )}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${config.gridSize}, minmax(0, 1fr))`,
          width: 'min(90vw, 400px)',
          height: 'min(90vw, 400px)'
        }}
      >
        {/* Central Focus Dot */}
        <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse border-2 border-white/50" />

        {numbers.map((num, idx) => {
          // In COLORED mode, the next required colour matches the user's
          // current target's parity (odd target = red, even target = black).
          // We darken any cell whose number was already used — colour applies
          // to remaining cells.
          const isDone =
            config.mode === 'reverse'
              ? num > nextNumber
              : config.mode === 'shuffle'
                ? config.targetSequence.indexOf(num) < sequenceIdx
                : num < nextNumber;
          const cellColor = config.mode === 'colored' ? colors[idx] : null;
          const isHardCell = config.gridSize === 7;
          return (
            <motion.button
              key={`${num}-${idx}`}
              whileHover={!isDone ? { scale: 1.1, zIndex: 10 } : {}}
              whileTap={!isDone ? { scale: 0.9 } : {}}
              onClick={() => handleCellClick(num)}
              className={clsx(
                "flex items-center justify-center font-black rounded-2xl transition-colors relative overflow-hidden shadow-sm border",
                isHardCell ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl",
                isDone
                  ? theme === 'light'
                    ? "opacity-50 bg-gray-200/50 text-gray-400 border-transparent"
                    : "opacity-30 bg-black/40 text-gray-500 border-transparent"
                  : cellColor === 'red'
                    ? "bg-rose-500/15 text-rose-200 border-rose-500/40 hover:bg-rose-500/25"
                    : cellColor === 'black'
                      ? "bg-stone-900/70 text-stone-100 border-stone-600/40 hover:bg-stone-900/85"
                      : theme === 'light'
                        ? "bg-white border-indigo-50 text-gray-800 hover:bg-indigo-50"
                        : skinClass
              )}
            >
              <span className="relative z-10 drop-shadow-sm">{num}</span>
              {/* Subtle reflection */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};

export const SchulteGame = () => {
  const tier = useStore((state) => state.plan);
  const [plays] = useState(() => getSchultePlays());
  const unlimited = tier === 'pro' || tier === 'premium';
  if (!unlimited && plays >= SCHULTE_FREE_LIMIT) return <SchulteLocked />;
  return <SchulteGameInner />;
};

export default SchulteGame;
