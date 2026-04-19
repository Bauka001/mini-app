import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Blocks,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Copy,
  Eye,
  Flame,
  Grid,
  Grid2x2,
  Calculator,
  Lock,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Type,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useStore } from '../store/useStoreImpl';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { hapticFeedback } from '../utils/telegram';

type WorkoutGame = {
  id: string;
  routeId: string;
  titleKey: string;
  description: string;
  icon: ElementType;
  accentClass: string;
  historyIds: string[];
};

type WorkoutSession = {
  date: string;
  startedAt: number;
  gameIds: string[];
};

type HistoryEntry = {
  gameId: string;
  score: string | number;
  timestamp: number;
  coinsEarned: number;
};

const DAILY_WORKOUT_STORAGE_KEY = 'focus-daily-workout-v1';

const workoutGamesCatalog: WorkoutGame[] = [
  {
    id: 'memory',
    routeId: 'memory',
    titleKey: 'game_memory',
    description: 'Кыска мерзімді есте сақтауды қыздырады.',
    icon: Grid,
    accentClass: 'from-violet-500/20 to-fuchsia-500/20 border-violet-400/30',
    historyIds: ['memory']
  },
  {
    id: 'schulte',
    routeId: 'schulte',
    titleKey: 'game_schulte',
    description: 'Фокус пен коз қозғалысын жылдамдатады.',
    icon: Brain,
    accentClass: 'from-blue-500/20 to-cyan-500/20 border-blue-400/30',
    historyIds: ['schulte']
  },
  {
    id: 'math',
    routeId: 'math',
    titleKey: 'game_math',
    description: 'Логика мен есептеу қарқынын тексереді.',
    icon: Calculator,
    accentClass: 'from-emerald-500/20 to-lime-500/20 border-emerald-400/30',
    historyIds: ['math']
  },
  {
    id: 'pairs',
    routeId: 'pairs',
    titleKey: 'game_pairs',
    description: 'Жады мен назарды жұптастырады.',
    icon: Copy,
    accentClass: 'from-pink-500/20 to-rose-500/20 border-pink-400/30',
    historyIds: ['pairs']
  },
  {
    id: 'odd-one',
    routeId: 'odd-one',
    titleKey: 'game_odd_one',
    description: 'Көзге түспейтін айырмашылықты табыңыз.',
    icon: Eye,
    accentClass: 'from-orange-500/20 to-amber-500/20 border-orange-400/30',
    historyIds: ['odd_one_out']
  },
  {
    id: 'agent-spot',
    routeId: 'agent-spot',
    titleKey: 'game_agent_spot',
    description: 'Күдіктілер ішінен жалған белгі мен intruder-ді сүзеді.',
    icon: Target,
    accentClass: 'from-cyan-500/20 to-red-500/20 border-cyan-400/30',
    historyIds: ['agent_spot']
  },
  {
    id: 'code-breaker',
    routeId: 'code-breaker',
    titleKey: 'game_code_breaker',
    description: 'Шифрларды тез шешіп, логикалық тізбекті үзіп алмаңыз.',
    icon: Lock,
    accentClass: 'from-cyan-500/20 to-violet-500/20 border-cyan-400/30',
    historyIds: ['code_breaker']
  },
  {
    id: 'stroop',
    routeId: 'stroop',
    titleKey: 'game_stroop',
    description: 'Икемділік пен реакцияны сынайды.',
    icon: Type,
    accentClass: 'from-red-500/20 to-rose-500/20 border-red-400/30',
    historyIds: ['stroop']
  },
  {
    id: 'tetris',
    routeId: 'tetris',
    titleKey: 'game_tetris',
    description: 'Кеңістіктік ойлау мен ырғақты ұстайды.',
    icon: Blocks,
    accentClass: 'from-cyan-500/20 to-sky-500/20 border-cyan-400/30',
    historyIds: ['tetris']
  },
  {
    id: '2048',
    routeId: '2048',
    titleKey: 'game_2048',
    description: 'Стратегия мен логиканы бір сессияға жинайды.',
    icon: Grid2x2,
    accentClass: 'from-yellow-500/20 to-orange-500/20 border-yellow-400/30',
    historyIds: ['2048']
  }
];

const getTodayKey = () => new Date().toISOString().split('T')[0];

const shuffleArray = <T,>(items: T[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const createWorkoutSession = (): WorkoutSession => ({
  date: getTodayKey(),
  startedAt: Date.now(),
  gameIds: shuffleArray(workoutGamesCatalog.map((game) => game.id)).slice(0, 3)
});

const readStoredWorkoutSession = (): WorkoutSession | null => {
  try {
    const raw = localStorage.getItem(DAILY_WORKOUT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<WorkoutSession>;
    if (!parsed.date || !Array.isArray(parsed.gameIds) || typeof parsed.startedAt !== 'number') {
      return null;
    }

    return {
      date: parsed.date,
      startedAt: parsed.startedAt,
      gameIds: parsed.gameIds.filter((gameId): gameId is string => typeof gameId === 'string').slice(0, 3)
    };
  } catch (error) {
    console.warn('Daily workout session read error:', error);
    return null;
  }
};

const writeWorkoutSession = (session: WorkoutSession) => {
  localStorage.setItem(DAILY_WORKOUT_STORAGE_KEY, JSON.stringify(session));
};

const getDailyWorkoutSession = (forceRefresh = false) => {
  const stored = readStoredWorkoutSession();
  if (!forceRefresh && stored?.date === getTodayKey() && stored.gameIds.length === 3) {
    return stored;
  }

  const nextSession = createWorkoutSession();
  writeWorkoutSession(nextSession);
  return nextSession;
};

const getWorkoutGameById = (gameId: string) =>
  workoutGamesCatalog.find((game) => game.id === gameId);

const getCompletedHistoryEntry = (
  game: WorkoutGame,
  history: HistoryEntry[],
  startedAt: number
) => {
  const matches = history.filter(
    (entry) => entry.timestamp >= startedAt && game.historyIds.includes(entry.gameId)
  );

  return matches.length > 0 ? matches[matches.length - 1] : null;
};

const toBrainScore = (entry: HistoryEntry) => Math.max(0, entry.coinsEarned * 10);

export default function DailyWorkoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const styles = useThemeStyles();
  const history = useStore((state) => state.history as HistoryEntry[]);
  const [session, setSession] = useState<WorkoutSession | null>(null);

  const { bgClass, panelClass, headerClass, textPrimary, textSecondary } = styles;

  useEffect(() => {
    // Кундік workout күйін route арасына сақтау үшін localStorage қолданамыз.
    setSession(getDailyWorkoutSession());
  }, []);

  const selectedGames = useMemo(() => {
    if (!session) return [];
    return session.gameIds
      .map((gameId) => getWorkoutGameById(gameId))
      .filter((game): game is WorkoutGame => Boolean(game));
  }, [session]);

  const workoutResults = useMemo(() => {
    if (!session) return [];

    return selectedGames.map((game) => {
      const result = getCompletedHistoryEntry(game, history, session.startedAt);
      return {
        game,
        result,
        brainScore: result ? toBrainScore(result) : 0
      };
    });
  }, [history, selectedGames, session]);

  const completedCount = workoutResults.filter((item) => item.result).length;
  const totalBrainScore = workoutResults.reduce((sum, item) => sum + item.brainScore, 0);
  const progressPercent = selectedGames.length > 0 ? (completedCount / selectedGames.length) * 100 : 0;
  const isCompleted = selectedGames.length > 0 && completedCount === selectedGames.length;

  const sessionDateLabel = useMemo(() => {
    if (!session) return '';
    return new Date(`${session.date}T00:00:00`).toLocaleDateString();
  }, [session]);

  const handleRefreshWorkout = () => {
    hapticFeedback.impact('medium');
    setSession(getDailyWorkoutSession(true));
  };

  const handleOpenGame = (routeId: string) => {
    hapticFeedback.click();
    navigate(`/game/${routeId}`);
  };

  return (
    <div className={clsx("min-h-screen pb-8 transition-colors duration-500", bgClass)}>
      <header
        className={clsx(
          "sticky top-0 z-10 px-4 py-4 flex items-center justify-between border-b backdrop-blur-md transition-colors duration-500",
          headerClass
        )}
      >
        <button
          onClick={() => {
            hapticFeedback.click();
            navigate('/');
          }}
          className={clsx("p-2 rounded-full transition-colors", styles.cardClass)}
        >
          <ArrowLeft size={20} className={textPrimary} />
        </button>

        <div className="text-center">
          <h1 className={clsx("text-lg font-black", textPrimary)}>Daily Workout</h1>
          <p className={clsx("text-xs", textSecondary)}>3 random games. 1 daily result.</p>
        </div>

        <button
          onClick={handleRefreshWorkout}
          className={clsx("p-2 rounded-full transition-colors", styles.cardClass)}
        >
          <RotateCcw size={18} className={styles.textAccent} />
        </button>
      </header>

      <main className="px-4 pt-5 space-y-4">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className={clsx("p-5 rounded-3xl border transition-colors duration-500", panelClass)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-[76%]">
              <div className={clsx("text-xs uppercase tracking-[0.22em] font-semibold", textSecondary)}>
                Today&apos;s Session
              </div>
              <h2 className={clsx("text-2xl font-black mt-2", textPrimary)}>Daily Workout</h2>
              <p className={clsx("text-sm mt-2 leading-relaxed", textSecondary)}>
                Бугінгі 3 ойынды аяктап, біріккен Daily Brain Score жинаңыз.
              </p>
            </div>
            <div className={clsx(
              "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
              styles.cardClass
            )}>
              <Flame size={28} className={styles.textAccent} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className={clsx("p-3 rounded-2xl", styles.cardClass)}>
              <div className={clsx("text-xs font-medium", textSecondary)}>Selected</div>
              <div className={clsx("text-xl font-black mt-1", textPrimary)}>{selectedGames.length}</div>
            </div>
            <div className={clsx("p-3 rounded-2xl", styles.cardClass)}>
              <div className={clsx("text-xs font-medium", textSecondary)}>Completed</div>
              <div className={clsx("text-xl font-black mt-1", textPrimary)}>{completedCount}/3</div>
            </div>
            <div className={clsx("p-3 rounded-2xl", styles.cardClass)}>
              <div className={clsx("text-xs font-medium", textSecondary)}>Date</div>
              <div className={clsx("text-sm font-bold mt-2", textPrimary)}>{sessionDateLabel}</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className={clsx("text-sm font-medium", textSecondary)}>Workout Progress</span>
              <span className={clsx("text-sm font-bold", textPrimary)}>{Math.round(progressPercent)}%</span>
            </div>
            <div className={clsx("h-3 rounded-full overflow-hidden", styles.cardClass)}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400"
              />
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className={clsx("p-5 rounded-3xl border transition-colors duration-500", panelClass)}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={clsx("text-xs uppercase tracking-[0.22em] font-semibold", textSecondary)}>
                Final Result
              </div>
              <h2 className={clsx("text-xl font-black mt-2", textPrimary)}>Daily Brain Score</h2>
            </div>
            <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center", styles.cardClass)}>
              <Trophy size={22} className={styles.textAccent} />
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <div className={clsx("text-4xl font-black", textPrimary)}>{totalBrainScore}</div>
              <p className={clsx("text-sm mt-1", textSecondary)}>
                {isCompleted
                  ? 'Workout аякталды, кундік нәтиже есептелді.'
                  : 'Ұпай барлық 3 ойын біткенде толық жиналады.'}
              </p>
            </div>
            <div className={clsx("px-3 py-2 rounded-2xl text-sm font-semibold", styles.cardClass)}>
              {isCompleted ? 'Completed' : `${3 - completedCount} left`}
            </div>
          </div>
        </motion.section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className={clsx("text-lg font-bold", textPrimary)}>Today&apos;s Games</h2>
              <p className={clsx("text-sm mt-1", textSecondary)}>
                Әр карточка бір workout қадамын білдіреді.
              </p>
            </div>
            <div className={clsx("flex items-center gap-2 text-sm", textSecondary)}>
              <Calendar size={16} />
              <span>{sessionDateLabel}</span>
            </div>
          </div>

          {workoutResults.map((item, index) => {
            const Icon = item.game.icon;
            const isDone = Boolean(item.result);

            return (
              <motion.div
                key={item.game.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + index * 0.06 }}
                className={clsx(
                  "p-4 rounded-3xl border bg-gradient-to-br transition-colors duration-500",
                  item.game.accentClass,
                  panelClass
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center", styles.cardClass)}>
                      <Icon size={24} className={styles.textAccent} />
                    </div>
                    <div>
                      <div className={clsx("text-xs font-semibold uppercase tracking-[0.18em]", textSecondary)}>
                        Game {index + 1}
                      </div>
                      <h3 className={clsx("text-lg font-bold mt-1", textPrimary)}>{t(item.game.titleKey)}</h3>
                      <p className={clsx("text-sm mt-1 leading-relaxed", textSecondary)}>
                        {item.game.description}
                      </p>
                    </div>
                  </div>

                  <div className={clsx(
                    "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1",
                    isDone ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-slate-400"
                  )}>
                    {isDone ? <CheckCircle2 size={14} /> : <Target size={14} />}
                    <span>{isDone ? 'Done' : 'Pending'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className={clsx("p-3 rounded-2xl", styles.cardClass)}>
                    <div className={clsx("text-xs font-medium", textSecondary)}>Result</div>
                    <div className={clsx("text-base font-bold mt-2", textPrimary)}>
                      {item.result ? String(item.result.score) : 'Not played yet'}
                    </div>
                  </div>
                  <div className={clsx("p-3 rounded-2xl", styles.cardClass)}>
                    <div className={clsx("text-xs font-medium", textSecondary)}>Brain Points</div>
                    <div className={clsx("text-base font-bold mt-2", textPrimary)}>
                      {item.result ? item.brainScore : 0}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenGame(item.game.routeId)}
                  className={clsx(
                    "w-full mt-4 px-4 py-3 rounded-2xl font-bold flex items-center justify-between",
                    isDone ? styles.btnSecondary : styles.btnPrimary
                  )}
                >
                  <span>{isDone ? 'Қайта ойнау' : 'Ойынды бастау'}</span>
                  <ChevronRight size={18} />
                </button>
              </motion.div>
            );
          })}
        </section>

        <section className={clsx("p-4 rounded-3xl border transition-colors duration-500", panelClass)}>
          <div className="flex items-start gap-3">
            <div className={clsx("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0", styles.cardClass)}>
              <Sparkles size={20} className={styles.textAccent} />
            </div>
            <div>
              <h3 className={clsx("text-base font-bold", textPrimary)}>Қалай аяқталады</h3>
              <p className={clsx("text-sm mt-1 leading-relaxed", textSecondary)}>
                Әр ойын біткен соң осы бетке қайта кіріп отырыңыз. Уш ойын толык жабылғанда
                `Daily Brain Score` автоматты түрде жаңарады.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
