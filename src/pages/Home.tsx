import { useState, useEffect, useMemo, type ElementType } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain, Calculator, Type, Trophy, Bell,
  Zap, Eye, Copy, Flame, Coins, Gem, Sparkles,
  Settings, Gift, User, ChevronRight, ArrowRight,
  Wallet, Grid, Blocks, Grid2x2, Target, Crown, BarChart3, Lock, Route
} from 'lucide-react';
import { useStore } from '../store/useStoreImpl';
import { clsx } from 'clsx';
import { DailyRewardModal } from '../components/DailyRewardModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { GuestBanner } from '../components/GuestBanner';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { hapticFeedback } from '../utils/telegram';
import type { Variants } from 'framer-motion';

const DAILY_WORKOUT_TARGET = 3;
const TODAY_KEY = () => new Date().toISOString().split('T')[0];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const gameButtons = [
  { title: 'game_memory', icon: Grid, path: '/game/memory' },
  { title: 'game_schulte', icon: Brain, path: '/game/schulte' },
  { title: 'game_agent_sequence', icon: Route, path: '/game/agent-sequence' },
  { title: 'game_math', icon: Calculator, path: '/game/math' },
  { title: 'game_pairs', icon: Copy, path: '/game/pairs' },
  { title: 'game_odd_one', icon: Eye, path: '/game/odd-one' },
  { title: 'game_agent_spot', icon: Target, path: '/game/agent-spot' },
  { title: 'game_code_breaker', icon: Lock, path: '/game/code-breaker' },
  { title: 'game_stroop', icon: Type, path: '/game/stroop' },
  { title: 'game_tetris', icon: Blocks, path: '/game/tetris' },
  { title: 'game_2048', icon: Grid2x2, path: '/game/2048' },
];

type StatAccent = 'amber' | 'yellow' | 'cyan' | 'violet' | 'emerald' | 'rose';

const STAT_ACCENT_CLASSES: Record<StatAccent, string> = {
  amber: 'text-amber-400',
  yellow: 'text-yellow-400',
  cyan: 'text-cyan-300',
  violet: 'text-violet-300',
  emerald: 'text-emerald-300',
  rose: 'text-rose-300',
};

const StatPill = ({
  icon: Icon,
  label,
  accent,
  styles,
}: {
  icon: ElementType;
  label: string;
  accent: StatAccent;
  styles: ReturnType<typeof useThemeStyles>;
}) => (
  <div
    className={clsx(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-full border whitespace-nowrap shrink-0 transition-colors duration-300',
      styles.cardClass
    )}
  >
    <Icon size={13} className={STAT_ACCENT_CLASSES[accent]} />
    <span className={clsx('text-xs font-bold tabular-nums', styles.textPrimary)}>{label}</span>
  </div>
);

const ListItem = ({
  icon: Icon,
  title,
  subtitle,
  onClick,
  styles
}: {
  icon: ElementType,
  title: string,
  subtitle?: string,
  onClick: () => void,
  styles: ReturnType<typeof useThemeStyles>
}) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    variants={itemVariants}
    onClick={() => { hapticFeedback.click(); onClick(); }}
    className={clsx(
      "w-full p-4 flex items-center justify-between border-b last:border-0 transition-colors duration-300",
      styles.isLight ? "bg-white border-slate-100 hover:bg-slate-50" :
      styles.isBlue ? "bg-transparent border-blue-400/20 hover:bg-blue-800/30" :
      styles.isGold ? "bg-transparent border-amber-500/20 hover:bg-amber-900/30" :
      "bg-transparent border-zinc-800 hover:bg-zinc-800/50"
    )}
  >
    <div className="flex items-center gap-4">
      <div className={clsx(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300",
        styles.isLight ? "bg-indigo-50" :
        styles.isBlue ? "bg-blue-900/40" :
        styles.isGold ? "bg-amber-900/40" :
        "bg-white/10"
      )}>
        <Icon size={20} className={styles.textAccent} />
      </div>
      <div className="text-left">
        <div className={clsx("text-sm font-medium", styles.textPrimary)}>{title}</div>
        {subtitle && <div className={clsx("text-xs mt-0.5", styles.textSecondary)}>{subtitle}</div>}
      </div>
    </div>
    <ChevronRight size={18} className={styles.textSecondary} />
  </motion.button>
);

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const lastDailyRewardDate = useStore(state => state.lastDailyRewardDate);
  const user = useStore(state => state.user);
  const coins = useStore(state => state.coins);
  const gems = useStore(state => state.gems);
  const streak = useStore(state => state.streak);
  const history = useStore(state => state.history);

  const styles = useThemeStyles();
  const { isLight, textPrimary, textSecondary, bgClass, headerClass, panelClass } = styles;

  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = useStore(state => state.notifications);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const today = TODAY_KEY();
  const dailyBonusUnclaimed = lastDailyRewardDate !== today;

  // Today's progress toward the daily workout: distinct gameIds played today.
  const workoutProgress = useMemo(() => {
    const todaysGames = (history || []).filter((entry) => {
      const entryDate = entry?.date || (entry?.timestamp ? new Date(entry.timestamp).toISOString().split('T')[0] : '');
      return entryDate === today;
    });
    const distinct = new Set(todaysGames.map((entry) => entry.gameId)).size;
    return Math.min(DAILY_WORKOUT_TARGET, distinct);
  }, [history, today]);
  const workoutComplete = workoutProgress >= DAILY_WORKOUT_TARGET;
  const workoutRemaining = Math.max(0, DAILY_WORKOUT_TARGET - workoutProgress);

  // Most-played game over the last 30 entries — surfaces a "Popular" tag in the
  // practice grid so the page feels personalized after a few sessions.
  const mostPlayedGameId = useMemo(() => {
    const recent = (history || []).slice(-30);
    if (recent.length < 4) return null;
    const counts = new Map<string, number>();
    for (const entry of recent) {
      counts.set(entry.gameId, (counts.get(entry.gameId) || 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [id, n] of counts.entries()) {
      if (n > bestCount) { best = id; bestCount = n; }
    }
    return bestCount >= 3 ? best : null;
  }, [history]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (lastDailyRewardDate !== today) {
      const timer = setTimeout(() => {
        setShowDailyReward(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [lastDailyRewardDate]);

  const handleGameClick = (path: string) => {
    hapticFeedback.click();
    navigate(path);
  };

  return (
    <div className={clsx("min-h-screen pb-20 font-sans transition-colors duration-500", bgClass)}>

      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={clsx(
          "px-4 pt-4 pb-3 border-b sticky top-0 z-10 backdrop-blur-md transition-colors duration-500",
          headerClass
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => { hapticFeedback.click(); navigate('/profile'); }}
            className="flex items-center gap-3 min-w-0 group"
          >
            <div className={clsx(
              "w-11 h-11 rounded-full overflow-hidden flex items-center justify-center shrink-0 transition-transform duration-300 group-active:scale-95",
              styles.cardClass
            )}>
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={20} className={textPrimary} />
              )}
            </div>
            <div className="min-w-0 text-left">
              <div className={clsx("text-[11px] font-medium uppercase tracking-[0.18em]", textSecondary)}>
                Hello,
              </div>
              <div className={clsx("text-base font-bold truncate", textPrimary)}>
                {user.firstName || 'Focus Player'}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { hapticFeedback.click(); setShowNotifications(true); }}
              className={clsx("relative p-2.5 rounded-full transition-colors", styles.cardClass)}
            >
              <Bell size={18} className={textPrimary} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-black/40" />
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { hapticFeedback.click(); navigate('/settings'); }}
              className={clsx("p-2.5 rounded-full transition-colors", styles.cardClass)}
            >
              <Settings size={18} className={textPrimary} />
            </motion.button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 overflow-x-auto -mx-1 px-1 scrollbar-none">
          <StatPill icon={Flame} label={`${streak}d`} accent="amber" styles={styles} />
          <StatPill icon={Coins} label={coins.toLocaleString()} accent="yellow" styles={styles} />
          <StatPill icon={Gem} label={gems.toLocaleString()} accent="cyan" styles={styles} />
          <StatPill icon={Sparkles} label={`Lv ${user.level || 1}`} accent="violet" styles={styles} />
        </div>
      </motion.header>

      <GuestBanner />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="px-4 pt-4"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { hapticFeedback.click(); setShowDailyReward(true); }}
            className={clsx(
              "relative flex items-center gap-3 px-3.5 py-3 rounded-2xl border text-left transition-colors duration-300 overflow-hidden",
              styles.cardClass
            )}
          >
            {dailyBonusUnclaimed && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
            )}
            <div className={clsx(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              isLight ? "bg-emerald-50" : "bg-emerald-500/15"
            )}>
              <Gift size={16} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className={clsx("text-[10px] font-semibold uppercase tracking-[0.16em]", textSecondary)}>
                {dailyBonusUnclaimed ? 'Ready' : 'Claimed'}
              </div>
              <div className={clsx("text-sm font-bold truncate", textPrimary)}>
                {t('daily_bonus')}
              </div>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { hapticFeedback.click(); navigate('/leaderboard'); }}
            className={clsx(
              "flex items-center gap-3 px-3.5 py-3 rounded-2xl border text-left transition-colors duration-300",
              styles.cardClass
            )}
          >
            <div className={clsx(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              isLight ? "bg-orange-50" : "bg-orange-500/15"
            )}>
              <Trophy size={16} className="text-orange-400" />
            </div>
            <div className="min-w-0">
              <div className={clsx("text-[10px] font-semibold uppercase tracking-[0.16em]", textSecondary)}>
                Global
              </div>
              <div className={clsx("text-sm font-bold truncate", textPrimary)}>
                {t('top_players')}
              </div>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { hapticFeedback.click(); navigate('/tournaments'); }}
            className={clsx(
              "flex items-center gap-3 px-3.5 py-3 rounded-2xl border text-left transition-colors duration-300",
              styles.cardClass
            )}
          >
            <div className={clsx(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              isLight ? "bg-violet-50" : "bg-violet-500/15"
            )}>
              <Crown size={16} className="text-violet-300" />
            </div>
            <div className="min-w-0">
              <div className={clsx("text-[10px] font-semibold uppercase tracking-[0.16em]", textSecondary)}>
                Weekly
              </div>
              <div className={clsx("text-sm font-bold truncate", textPrimary)}>
                Tournament
              </div>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { hapticFeedback.click(); navigate('/analytics'); }}
            className={clsx(
              "flex items-center gap-3 px-3.5 py-3 rounded-2xl border text-left transition-colors duration-300",
              styles.cardClass
            )}
          >
            <div className={clsx(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              isLight ? "bg-cyan-50" : "bg-cyan-500/15"
            )}>
              <BarChart3 size={16} className="text-cyan-300" />
            </div>
            <div className="min-w-0">
              <div className={clsx("text-[10px] font-semibold uppercase tracking-[0.16em]", textSecondary)}>
                VIP
              </div>
              <div className={clsx("text-sm font-bold truncate", textPrimary)}>
                Analytics
              </div>
            </div>
          </motion.button>
        </div>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className={clsx(
          "mx-4 mt-4 p-5 rounded-3xl border transition-colors duration-500 relative overflow-hidden",
          panelClass
        )}
      >
        {!workoutComplete && (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
        )}
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className={clsx("text-[11px] uppercase tracking-[0.2em] font-semibold flex items-center gap-2", textSecondary)}>
                <span className={clsx("inline-block w-1.5 h-1.5 rounded-full", workoutComplete ? "bg-emerald-400" : "bg-amber-400 animate-pulse")} />
                {workoutComplete ? "Today's Session · Complete" : "Today's Session"}
              </div>
              <h2 className={clsx("text-[26px] font-black mt-2 tracking-tight leading-none", textPrimary)}>
                Daily Workout
              </h2>
              <p className={clsx("text-sm mt-2 leading-relaxed", textSecondary)}>
                {workoutComplete
                  ? 'Сессия аяқталды. Ертең қайта оралыңыз.'
                  : workoutProgress === 0
                    ? '3 кездейсоқ ойыннан өтіп, күнделікті фокус сессияны бастаңыз.'
                    : `Тағы ${workoutRemaining} ойын — сессияны аяқтаңыз.`}
              </p>
            </div>
            <div className={clsx(
              "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
              workoutComplete ? "bg-emerald-500/15" : styles.cardClass
            )}>
              <Zap size={28} className={workoutComplete ? "text-emerald-400" : styles.textAccent} />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: DAILY_WORKOUT_TARGET }).map((_, idx) => (
                <span
                  key={idx}
                  className={clsx(
                    'h-2 rounded-full transition-all duration-500',
                    idx < workoutProgress
                      ? 'w-6 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                      : 'w-2 bg-white/15'
                  )}
                />
              ))}
            </div>
            <span className={clsx("text-xs font-bold tabular-nums", textSecondary)}>
              {workoutProgress} / {DAILY_WORKOUT_TARGET}
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              hapticFeedback.click();
              navigate('/daily-workout');
            }}
            className={clsx(
              "mt-5 w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold text-sm tracking-wide",
              styles.btnPrimary
            )}
          >
            <span>{workoutComplete ? 'View results' : workoutProgress === 0 ? 'Start workout' : 'Continue workout'}</span>
            <ArrowRight size={16} />
          </motion.button>
        </div>
      </motion.section>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
        onClick={() => { hapticFeedback.click(); navigate('/tournaments'); }}
        className="relative mx-4 mt-4 rounded-3xl overflow-hidden group cursor-pointer border border-amber-500/25"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1208] via-[#1a0f1a] to-[#0a0f1a]" />
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-r from-transparent via-amber-400/10 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[1400ms] ease-in-out" />

        <div className="relative z-10 p-5 flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-600 flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.35)]">
            <Crown size={22} className="text-stone-900" fill="currentColor" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-amber-300/90 uppercase tracking-[0.22em]">
              Weekend tournament
            </div>
            <h3 className="text-base font-black text-amber-50 mt-0.5 leading-tight">
              Premium players play free
            </h3>
            <p className="text-[11px] text-amber-100/70 mt-1 leading-snug">
              Friday → Sunday · 3 games · top 50 win prizes
            </p>
          </div>
          <ArrowRight size={18} className="text-amber-300/80 shrink-0" />
        </div>
      </motion.div>

      <div className={clsx(
        "p-4 mt-4 rounded-3xl mx-4 transition-colors duration-500",
        panelClass
      )}>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <div className={clsx("text-[11px] font-semibold uppercase tracking-[0.2em]", textSecondary)}>
              Library
            </div>
            <h2 className={clsx("text-lg font-black mt-1 tracking-tight", textPrimary)}>
              Practice
            </h2>
          </div>
          <div className={clsx(
            "text-[10px] font-bold tabular-nums px-2.5 py-1 rounded-full border",
            styles.cardClass
          )}>
            <span className={textPrimary}>{gameButtons.length}</span>
            <span className={clsx("ml-1", textSecondary)}>games</span>
          </div>
        </div>
        <motion.div
          className="grid grid-cols-4 gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {gameButtons.map((game) => {
            const Icon = game.icon;
            // Map game.title (i18n key) → gameId used in history.
            const gameId = game.title.replace(/^game_/, '').replace(/-/g, '_');
            const isPopular = mostPlayedGameId === gameId;
            return (
              <motion.button
                key={game.title}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleGameClick(game.path)}
                variants={itemVariants}
                className={clsx(
                  "relative flex flex-col items-center gap-2 p-2.5 rounded-2xl transition-all duration-300",
                  styles.isLight ? "hover:bg-slate-100 active:bg-slate-200" :
                  styles.isBlue ? "hover:bg-blue-800/30 active:bg-blue-800/50" :
                  styles.isGold ? "hover:bg-stone-800/50 active:bg-stone-800/70" :
                  "hover:bg-zinc-800/50 active:bg-zinc-800"
                )}
              >
                {isPopular && (
                  <span className="absolute top-1 right-1 z-10 px-1.5 py-0.5 rounded-full bg-amber-400 text-[8px] font-black uppercase tracking-wider text-stone-900 shadow-[0_2px_8px_rgba(245,158,11,0.45)]">
                    Top
                  </span>
                )}
                <div className={clsx(
                  "w-14 h-14 flex items-center justify-center rounded-2xl border transition-colors duration-300",
                  isPopular
                    ? "bg-gradient-to-br from-amber-400/20 to-orange-500/10 border-amber-400/40"
                    : styles.cardClass
                )}>
                  <Icon size={24} className={isPopular ? "text-amber-300" : styles.textAccent} />
                </div>
                <span className={clsx("text-[11px] text-center font-semibold leading-tight", styles.textPrimary)}>
                  {t(game.title)}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      <motion.div
        className="mt-4 px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className={clsx("text-[11px] font-semibold uppercase tracking-[0.2em] mb-2 ml-1", textSecondary)}>
          More
        </div>
        <div className={clsx("rounded-3xl overflow-hidden border transition-colors duration-500", panelClass)}>
          <ListItem
            title={t('airdrop_title')}
            subtitle={t('airdrop_desc')}
            icon={Wallet}
            onClick={() => navigate('/airdrop')}
            styles={styles}
          />
          <ListItem
            title={t('profile_title')}
            subtitle={t('profile_desc')}
            icon={User}
            onClick={() => navigate('/profile')}
            styles={styles}
          />
        </div>
      </motion.div>

      <div className={clsx("px-6 pt-8 pb-4 text-center text-[10px] tracking-[0.18em] uppercase opacity-60", textSecondary)}>
        Focus App · v1.2.0
      </div>

      <DailyRewardModal isOpen={showDailyReward} onClose={() => setShowDailyReward(false)} />
      <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </div>
  );
};

export default Home;
