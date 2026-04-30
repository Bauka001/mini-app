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
import { claudeTokens } from '../components/ui/claudeTokens';

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

// In Claude theme the stat strip becomes an editorial spec line:
//   01 streak  ·  248 coins  ·  …
// In every other theme it stays as the existing color-coded pills.
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
}) => {
  if (styles.isClaude) {
    return (
      <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
        <Icon size={13} style={{ color: claudeTokens.textMuted }} />
        <span
          className="text-[13px] font-medium tabular-nums"
          style={{ color: claudeTokens.textPrimary, fontFeatureSettings: '"lnum","tnum"' }}
        >
          {label}
        </span>
      </div>
    );
  }
  return (
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
};

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
      styles.isClaude ? "bg-transparent border-[#E5E2D8] hover:bg-[#F0EEE6]" :
      styles.isLight ? "bg-white border-slate-100 hover:bg-slate-50" :
      styles.isBlue ? "bg-transparent border-blue-400/20 hover:bg-blue-800/30" :
      styles.isGold ? "bg-transparent border-amber-500/20 hover:bg-amber-900/30" :
      "bg-transparent border-zinc-800 hover:bg-zinc-800/50"
    )}
  >
    <div className="flex items-center gap-4">
      <div className={clsx(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300",
        styles.isClaude ? "" :
        styles.isLight ? "bg-indigo-50" :
        styles.isBlue ? "bg-blue-900/40" :
        styles.isGold ? "bg-amber-900/40" :
        "bg-white/10"
      )}
      style={styles.isClaude ? { backgroundColor: claudeTokens.surfaceMuted, border: `1px solid ${claudeTokens.border}` } : undefined}
      >
        <Icon size={20} className={styles.isClaude ? '' : styles.textAccent} style={styles.isClaude ? { color: claudeTokens.textPrimary } : undefined} />
      </div>
      <div className="text-left">
        <div className={clsx("text-sm font-medium", styles.isClaude ? '' : styles.textPrimary)} style={styles.isClaude ? { color: claudeTokens.textPrimary } : undefined}>{title}</div>
        {subtitle && <div className={clsx("text-xs mt-0.5", styles.isClaude ? '' : styles.textSecondary)} style={styles.isClaude ? { color: claudeTokens.textMuted } : undefined}>{subtitle}</div>}
      </div>
    </div>
    <ChevronRight size={18} className={styles.isClaude ? '' : styles.textSecondary} style={styles.isClaude ? { color: claudeTokens.textMuted } : undefined} />
  </motion.button>
);

// Editorial tile for the Claude theme home shortcuts. Cream card, hairline,
// monochrome icon, small-caps eyebrow, terracotta accent line on the side
// for the "ready" state.
const ClaudeShortcut = ({
  icon: Icon,
  eyebrow,
  title,
  pulse,
  onClick,
}: {
  icon: ElementType;
  eyebrow: string;
  title: string;
  pulse?: boolean;
  onClick: () => void;
}) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={() => { hapticFeedback.click(); onClick(); }}
    className="group relative flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left transition-colors"
    style={{
      backgroundColor: claudeTokens.surface,
      border: `1px solid ${claudeTokens.border}`,
      color: claudeTokens.textPrimary,
    }}
  >
    {pulse && (
      <span
        className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: claudeTokens.accent }}
      />
    )}
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
      style={{ backgroundColor: claudeTokens.surfaceMuted, border: `1px solid ${claudeTokens.border}` }}
    >
      <Icon size={16} style={{ color: claudeTokens.textPrimary }} />
    </div>
    <div className="min-w-0">
      <div
        className="text-[10px] font-medium uppercase tracking-[0.18em]"
        style={{ color: claudeTokens.textMuted }}
      >
        {eyebrow}
      </div>
      <div
        className="text-[14px] font-medium truncate mt-0.5"
        style={{ color: claudeTokens.textPrimary }}
      >
        {title}
      </div>
    </div>
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
  const { isClaude, isLight, textPrimary, textSecondary, bgClass, headerClass, panelClass } = styles;

  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = useStore(state => state.notifications);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const today = TODAY_KEY();
  const dailyBonusUnclaimed = lastDailyRewardDate !== today;

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

  // ---------- Claude editorial layout ----------
  if (isClaude) {
    return (
      <div
        className="min-h-screen pb-24 transition-colors duration-500"
        style={{
          backgroundColor: claudeTokens.surface,
          color: claudeTokens.textPrimary,
        }}
      >
        {/* Header — chapter-style greeting */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-5 pt-5 pb-4 sticky top-0 z-10 backdrop-blur-md"
          style={{
            backgroundColor: 'rgba(250, 249, 245, 0.92)',
            borderBottom: `1px solid ${claudeTokens.border}`,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <button
              onClick={() => { hapticFeedback.click(); navigate('/profile'); }}
              className="flex items-center gap-3 min-w-0 group"
            >
              <div
                className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                style={{ backgroundColor: claudeTokens.surfaceMuted, border: `1px solid ${claudeTokens.border}` }}
              >
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={18} style={{ color: claudeTokens.textMuted }} />
                )}
              </div>
              <div className="min-w-0 text-left">
                <div
                  className="text-[10px] font-medium uppercase tracking-[0.22em]"
                  style={{ color: claudeTokens.textMuted }}
                >
                  Welcome back
                </div>
                <div
                  className="text-[20px] leading-tight truncate font-normal italic"
                  style={{
                    color: claudeTokens.textPrimary,
                    fontFamily: claudeTokens.serifStack,
                  }}
                >
                  {user.firstName || 'Focus Player'}
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => { hapticFeedback.click(); setShowNotifications(true); }}
                className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[#F0EEE6]"
                style={{ color: claudeTokens.textBody }}
                aria-label="Notifications"
              >
                <Bell size={17} strokeWidth={1.75} />
                {unreadCount > 0 && (
                  <span
                    className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: claudeTokens.accent }}
                  />
                )}
              </button>
              <button
                onClick={() => { hapticFeedback.click(); navigate('/settings'); }}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[#F0EEE6]"
                style={{ color: claudeTokens.textBody }}
                aria-label="Settings"
              >
                <Settings size={17} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* Stat spec line — old-style figures separated by hairlines */}
          <div className="mt-4 flex items-center gap-4 overflow-x-auto scrollbar-none">
            <StatPill icon={Flame} label={`${streak}d`} accent="amber" styles={styles} />
            <span aria-hidden style={{ color: claudeTokens.border }}>·</span>
            <StatPill icon={Coins} label={coins.toLocaleString()} accent="yellow" styles={styles} />
            <span aria-hidden style={{ color: claudeTokens.border }}>·</span>
            <StatPill icon={Gem} label={gems.toLocaleString()} accent="cyan" styles={styles} />
            <span aria-hidden style={{ color: claudeTokens.border }}>·</span>
            <StatPill icon={Sparkles} label={`Lv ${user.level || 1}`} accent="violet" styles={styles} />
          </div>
        </motion.header>

        <GuestBanner />

        {/* Daily Workout — hero "feature article" */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-5 mt-6 p-6 rounded-2xl relative overflow-hidden"
          style={{
            backgroundColor: claudeTokens.surface,
            border: `1px solid ${claudeTokens.border}`,
          }}
        >
          {/* Chapter number — old-school editorial flourish */}
          <span
            className="absolute top-5 right-6 text-[12px] tracking-[0.2em] uppercase font-medium"
            style={{ color: claudeTokens.accent, fontFamily: claudeTokens.serifStack }}
          >
            № 01
          </span>

          <div
            className="text-[10px] uppercase tracking-[0.24em] font-medium flex items-center gap-2"
            style={{ color: claudeTokens.textMuted }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: workoutComplete ? claudeTokens.success : claudeTokens.accent }}
            />
            {workoutComplete ? "Today · Complete" : 'Today'}
          </div>

          <h2
            className="mt-3 leading-[1.05] tracking-tight"
            style={{
              color: claudeTokens.textPrimary,
              fontFamily: claudeTokens.serifStack,
              fontSize: '34px',
              fontWeight: 500,
            }}
          >
            Daily Workout
          </h2>

          <p
            className="text-[14px] mt-2.5 leading-relaxed max-w-md"
            style={{ color: claudeTokens.textBody }}
          >
            {workoutComplete
              ? 'Сессия аяқталды. Ертең қайта оралыңыз.'
              : workoutProgress === 0
                ? 'Three short games. One unbroken session. Begin when you are ready.'
                : `Тағы ${workoutRemaining} ойын — сессияны аяқтаңыз.`}
          </p>

          {/* Progress — terracotta segments on a hairline track */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: DAILY_WORKOUT_TARGET }).map((_, idx) => (
                <span
                  key={idx}
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: idx < workoutProgress ? '32px' : '12px',
                    backgroundColor: idx < workoutProgress ? claudeTokens.accent : claudeTokens.border,
                  }}
                />
              ))}
            </div>
            <span
              className="text-[11px] font-medium tabular-nums uppercase tracking-[0.18em]"
              style={{ color: claudeTokens.textMuted }}
            >
              {workoutProgress} of {DAILY_WORKOUT_TARGET}
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { hapticFeedback.click(); navigate('/daily-workout'); }}
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-lg text-[14px] font-medium transition-colors"
            style={{ backgroundColor: claudeTokens.accent, color: '#FFFFFF' }}
          >
            <span>{workoutComplete ? 'View results' : workoutProgress === 0 ? 'Start' : 'Continue'}</span>
            <ArrowRight size={15} strokeWidth={2.25} />
          </motion.button>
        </motion.section>

        {/* Quick destinations — 2x2 editorial cards */}
        <div className="px-5 pt-6">
          <div
            className="text-[10px] font-medium uppercase tracking-[0.22em] mb-3 ml-0.5"
            style={{ color: claudeTokens.textMuted }}
          >
            Quick links
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ClaudeShortcut
              icon={Gift}
              eyebrow={dailyBonusUnclaimed ? 'Ready' : 'Claimed'}
              title={t('daily_bonus')}
              pulse={dailyBonusUnclaimed}
              onClick={() => setShowDailyReward(true)}
            />
            <ClaudeShortcut
              icon={Trophy}
              eyebrow="Global"
              title={t('top_players')}
              onClick={() => navigate('/leaderboard')}
            />
            <ClaudeShortcut
              icon={Crown}
              eyebrow="Weekly"
              title="Tournament"
              onClick={() => navigate('/tournaments')}
            />
            <ClaudeShortcut
              icon={BarChart3}
              eyebrow="VIP"
              title="Analytics"
              onClick={() => navigate('/analytics')}
            />
          </div>
        </div>

        {/* Tournament feature — rebuilt as cream editorial card */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => { hapticFeedback.click(); navigate('/tournaments'); }}
          className="block w-full text-left mx-0 mt-6 px-5 group"
        >
          <div
            className="relative rounded-2xl p-5 transition-colors"
            style={{
              backgroundColor: claudeTokens.surfaceMuted,
              border: `1px solid ${claudeTokens.border}`,
            }}
          >
            {/* terracotta side rule */}
            <div
              className="absolute left-0 top-5 bottom-5 w-[3px] rounded-full"
              style={{ backgroundColor: claudeTokens.accent }}
            />
            <div className="flex items-center gap-4 pl-3">
              <div
                className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: claudeTokens.surface, border: `1px solid ${claudeTokens.border}` }}
              >
                <Crown size={20} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="text-[10px] font-medium uppercase tracking-[0.22em]"
                  style={{ color: claudeTokens.textMuted }}
                >
                  Weekend tournament
                </div>
                <h3
                  className="text-[18px] leading-snug mt-1"
                  style={{
                    color: claudeTokens.textPrimary,
                    fontFamily: claudeTokens.serifStack,
                    fontWeight: 500,
                  }}
                >
                  Premium players play free
                </h3>
                <p
                  className="text-[12px] mt-1 leading-snug"
                  style={{ color: claudeTokens.textBody }}
                >
                  Friday → Sunday · 3 games · top 50 win prizes
                </p>
              </div>
              <ArrowRight
                size={18}
                strokeWidth={1.75}
                className="shrink-0 transition-transform group-hover:translate-x-0.5"
                style={{ color: claudeTokens.textMuted }}
              />
            </div>
          </div>
        </motion.button>

        {/* Practice library — 4-column editorial grid with chapter numerals */}
        <section className="px-5 mt-8">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <div
                className="text-[10px] font-medium uppercase tracking-[0.22em]"
                style={{ color: claudeTokens.textMuted }}
              >
                Library
              </div>
              <h2
                className="mt-1.5 leading-none tracking-tight"
                style={{
                  color: claudeTokens.textPrimary,
                  fontFamily: claudeTokens.serifStack,
                  fontSize: '24px',
                  fontWeight: 500,
                }}
              >
                Practice
              </h2>
            </div>
            <span
              className="text-[10px] font-medium tabular-nums uppercase tracking-[0.18em]"
              style={{ color: claudeTokens.textMuted }}
            >
              {gameButtons.length} games
            </span>
          </div>

          <motion.div
            className="grid grid-cols-3 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {gameButtons.map((game, idx) => {
              const Icon = game.icon;
              const gameId = game.title.replace(/^game_/, '').replace(/-/g, '_');
              const isPopular = mostPlayedGameId === gameId;
              const numeral = String(idx + 1).padStart(2, '0');
              return (
                <motion.button
                  key={game.title}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleGameClick(game.path)}
                  variants={itemVariants}
                  className="relative flex flex-col items-stretch gap-3 p-3 pt-4 rounded-xl transition-colors text-left"
                  style={{
                    backgroundColor: claudeTokens.surface,
                    border: `1px solid ${isPopular ? claudeTokens.accent : claudeTokens.border}`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className="text-[10px] tracking-[0.18em] uppercase"
                      style={{
                        color: isPopular ? claudeTokens.accent : claudeTokens.textMuted,
                        fontFamily: claudeTokens.serifStack,
                      }}
                    >
                      № {numeral}
                    </span>
                    {isPopular && (
                      <span
                        className="text-[9px] uppercase tracking-[0.18em] italic"
                        style={{ color: claudeTokens.accent, fontFamily: claudeTokens.serifStack }}
                      >
                        Most played
                      </span>
                    )}
                  </div>
                  <Icon
                    size={28}
                    strokeWidth={1.5}
                    style={{ color: isPopular ? claudeTokens.accent : claudeTokens.textPrimary }}
                  />
                  <span
                    className="text-[12px] leading-tight font-medium"
                    style={{ color: claudeTokens.textPrimary }}
                  >
                    {t(game.title)}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </section>

        {/* More — hairline list */}
        <motion.div
          className="mt-8 px-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div
            className="text-[10px] font-medium uppercase tracking-[0.22em] mb-3 ml-0.5"
            style={{ color: claudeTokens.textMuted }}
          >
            More
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${claudeTokens.border}`, backgroundColor: claudeTokens.surface }}
          >
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

        <div
          className="px-6 pt-10 pb-6 text-center"
          style={{ color: claudeTokens.textMuted }}
        >
          <span
            className="text-[10px] tracking-[0.32em] uppercase"
            style={{ fontFamily: claudeTokens.serifStack }}
          >
            Focus · v1.2.0
          </span>
        </div>

        <DailyRewardModal isOpen={showDailyReward} onClose={() => setShowDailyReward(false)} />
        <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      </div>
    );
  }

  // ---------- Legacy themes (dark / light / blue / gold) — unchanged ----------
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
