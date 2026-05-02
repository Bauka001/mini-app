import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain, Calculator, Type, Trophy, Bell,
  Zap, Eye, Copy,
  Settings, Gift, User, ChevronRight,
  Grid, Grid2x2, Target, Crown, BarChart3,
  Youtube, Send, Instagram, Share2, CheckCircle, Gem, Lock, Car
} from 'lucide-react';
import { useStore } from '../store/useStoreImpl';
import { clsx } from 'clsx';
import { DailyRewardModal } from '../components/DailyRewardModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { hapticFeedback } from '../utils/telegram';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const gameButtons = [
  { title: 'game_memory', icon: Grid, path: '/game/memory' },
  { title: 'game_schulte', icon: Brain, path: '/game/schulte' },
  { title: 'game_math', icon: Calculator, path: '/game/math' },
  { title: 'game_pairs', icon: Copy, path: '/game/pairs' },
  { title: 'game_odd_one', icon: Eye, path: '/game/odd-one' },
  { title: 'game_stroop', icon: Type, path: '/game/stroop' },
  { title: 'game_2048', icon: Grid2x2, path: '/game/2048' },
];

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const watchAd = useStore(state => state.watchAd);
  const dailyRewardStreak = useStore(state => state.dailyRewardStreak);
  const weeklyChallenge = useStore(state => state.weeklyChallenge);
  const weekendEvent = useStore(state => state.weekendEvent);
  const tournamentTickets = useStore(state => state.tournamentTickets);
  const claimWeeklyChallengeReward = useStore(state => state.claimWeeklyChallengeReward);
  const user = useStore(state => state.user);
  const socialTasks = useStore(state => state.socialTasks);
  const claimSocialTask = useStore(state => state.claimSocialTask);
  const fetchSocialTasks = useStore(state => state.fetchSocialTasks);

  const styles = useThemeStyles();
  const { isLight, isBlue, isGold, textPrimary, textSecondary, bgClass, headerClass, panelClass } = styles;

  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    void fetchSocialTasks();
  }, [fetchSocialTasks]);

  const notifications = useStore(state => state.notifications);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (dailyRewardStreak?.lastClaimDate !== today) {
      const timer = setTimeout(() => {
        setShowDailyReward(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [dailyRewardStreak?.lastClaimDate]);

  const handleGameClick = (path: string) => {
    hapticFeedback.click();
    navigate(path);
  };

  return (
    <div className={clsx("mobile-page min-h-screen w-full max-w-full font-sans transition-colors duration-500", bgClass)}>

      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={clsx(
          "px-4 py-3 sm:py-4 flex justify-between items-center border-b sticky top-0 z-10 backdrop-blur-md transition-colors duration-500",
          headerClass
        )}
      >
        <div className="flex flex-col">
          <h1 className={clsx("text-lg sm:text-xl font-bold tracking-tight", textPrimary)}>Focus App</h1>
          <span className={clsx("text-sm font-medium", textSecondary)}>ID: {user.gameId || '17096844'}</span>
        </div>
        <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => { hapticFeedback.click(); setShowNotifications(true); }} className="relative min-h-[44px] min-w-[44px] p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            <Bell size={22} className={textPrimary} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-black" />
            )}
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => { hapticFeedback.click(); navigate('/settings'); }} className="min-h-[44px] min-w-[44px] p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            <Settings size={22} className={textPrimary} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => { hapticFeedback.click(); navigate('/profile'); }} className="min-h-[44px] min-w-[44px] p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            <User size={22} className={textPrimary} />
          </motion.button>
        </div>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 py-4 border-b"
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => { hapticFeedback.click(); navigate('/shop'); }}
          className="relative w-full aspect-[16/5] rounded-2xl overflow-hidden group cursor-pointer border border-amber-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.3)]"
        >
          <img
            src="/mustang.jpg"
            alt="Ford Mustang"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/50 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent z-10" />

          <div className="absolute top-2 left-2 z-20">
            <div className="px-2 py-0.5 rounded bg-amber-500 text-[10px] font-black text-black uppercase shadow-lg border border-amber-300">
              {t('plan_premium')}
            </div>
          </div>

          <div className="absolute left-5 bottom-3 z-20 flex max-w-[220px] flex-col items-start">
            <div className="flex items-center gap-2 mb-0.5">
              <Car size={14} className="text-amber-400" />
              <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest">{t('main_prize')}</span>
            </div>
            <h3 className="text-base font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-left">
              {t('win_car')}
            </h3>
            <p className="text-[10px] text-white/70 mt-0.5 text-left">Ford Mustang GT - {t('premium_pack')}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5">
                <Gem size={14} className="text-blue-400" />
                <span className="text-[11px] font-black text-white">{t('learn_more')}</span>
              </div>
              <ChevronRight size={18} className="text-white/50 group-hover:text-white/90 transition-colors" />
            </div>
          </div>
        </motion.button>
      </motion.div>

      <div className={clsx(
        "p-4 mt-4 rounded-2xl mx-4 transition-colors duration-500",
        panelClass
      )}>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className={clsx("text-lg font-bold", textPrimary)}>{t('practice')}</h2>
            <p className={clsx("text-sm mt-1", textSecondary)}>
              {t('practice_desc')}
            </p>
          </div>
          <div className={clsx("text-xs font-semibold uppercase tracking-[0.12em] sm:tracking-[0.18em]", textSecondary)}>
            {t('games_count', { count: gameButtons.length })}
          </div>
        </div>
        <motion.div
          className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {gameButtons.map((game) => {
            const Icon = game.icon;
            return (
              <motion.button
                key={game.title}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleGameClick(game.path)}
                variants={itemVariants}
                className={clsx(
                  "flex flex-col items-center gap-2 p-3 rounded-2xl min-h-[112px] transition-all duration-300",
                  styles.isLight ? "hover:bg-slate-100 active:bg-slate-200" :
                  styles.isBlue ? "hover:bg-blue-800/30 active:bg-blue-800/50" :
                  styles.isGold ? "hover:bg-stone-800/50 active:bg-stone-800/70" :
                  "hover:bg-zinc-800/50 active:bg-zinc-800"
                )}
              >
                <div className={clsx(
                  "w-14 h-14 flex items-center justify-center rounded-2xl shadow-sm transition-colors duration-300",
                  styles.cardClass
                )}>
                  <Icon size={26} className={styles.textAccent} />
                </div>
                <span className={clsx("text-sm text-center font-medium leading-tight", styles.textPrimary)}>{t(game.title)}</span>
              </motion.button>
            );
          })}
        </motion.div>
        
        {/* Social Tasks Section */}
        {socialTasks.length > 0 && (
          <div className="mt-6 border-t border-white/5 pt-4">
            <h3 className={clsx("text-sm font-bold uppercase mb-3 flex items-center gap-2", textSecondary)}>
              {t('earn_crystals')}
            </h3>
            <div className="space-y-3">
              {socialTasks.map(task => {
                const isClaimed = task.isClaimed;
                
                const getIcon = () => {
                  switch(task.platform) {
                    case 'youtube': return <Youtube size={20} className="text-red-500" />;
                    case 'telegram': return <Send size={20} className="text-blue-400" />;
                    case 'instagram': return <Instagram size={20} className="text-pink-500" />;
                    case 'twitter': return <Share2 size={20} className="text-blue-400" />;
                    default: return <Share2 size={20} className="text-gray-400" />;
                  }
                };

                const getName = () => {
                  switch(task.platform) {
                    case 'youtube': return t('task_youtube');
                    case 'telegram': return t('task_telegram');
                    case 'instagram': return t('task_instagram');
                    case 'twitter': return t('task_twitter');
                    default: return t('social_network');
                  }
                };

                const getGradient = () => {
                  switch(task.platform) {
                    case 'youtube': return 'from-red-500/10 to-orange-500/10 hover:from-red-500/20 hover:to-orange-500/20';
                    case 'telegram': return 'from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20';
                    case 'instagram': return 'from-pink-500/10 to-purple-500/10 hover:from-pink-500/20 hover:to-purple-500/20';
                    default: return 'from-gray-500/10 to-gray-400/10 hover:from-gray-500/20 hover:to-gray-400/20';
                  }
                };

                const handleSocialClick = (taskId: string, url: string) => {
                  WebApp.openLink(url);
                  setTimeout(() => {
                      void claimSocialTask(taskId);
                      WebApp.HapticFeedback.notificationOccurred('success');
                  }, 5000); 
                };

                return (
                  <button 
                    key={task.id}
                    onClick={() => handleSocialClick(task.id, task.url)}
                    disabled={isClaimed}
                    className={clsx(
                      "w-full p-3 rounded-2xl flex items-center justify-between border border-white/5 transition-all active:scale-[0.98]",
                      isClaimed ? "bg-white/5 opacity-50" : `bg-gradient-to-r ${getGradient()}`,
                      styles.cardClass
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center bg-black/20")}>
                        {getIcon()}
                      </div>
                      <div className="text-left">
                        <div className={clsx("text-sm font-bold", textPrimary)}>{getName()}</div>
                        <div className={clsx("text-xs", textSecondary)}>{t('support_community')}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isClaimed ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle size={14} /> {t('claimed')}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 bg-black/20 px-3 py-1.5 rounded-lg text-xs font-bold text-white">
                          <Gem size={14} className="text-blue-400" />
                          +{String(task.reward)}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className={clsx(
          "mx-4 mt-5 p-5 rounded-3xl border transition-colors duration-500",
          panelClass
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="max-w-full sm:max-w-[75%]">
            <div className={clsx("text-xs uppercase tracking-[0.22em] font-semibold", textSecondary)}>
              {t('today_focus')}
            </div>
            <h2 className={clsx("text-2xl font-black mt-2", textPrimary)}>{t('daily_workout')}</h2>
            <p className={clsx("text-sm mt-2 leading-relaxed", textSecondary)}>
              {t('daily_workout_subtitle')}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400">
              <Target size={12} />
              {t('main_direction')}
            </div>
          </div>
          <div className={clsx(
            "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
            styles.cardClass
          )}>
            <Zap size={28} className={styles.textAccent} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 mt-5 sm:grid-cols-3">
          <div className={clsx("p-3 rounded-2xl", styles.cardClass)}>
            <div className={clsx("text-xs font-medium", textSecondary)}>{t('games_label')}</div>
            <div className={clsx("text-lg font-bold mt-1", textPrimary)}>{t('random_three')}</div>
          </div>
          <div className={clsx("p-3 rounded-2xl", styles.cardClass)}>
            <div className={clsx("text-xs font-medium", textSecondary)}>{t('goal_label')}</div>
            <div className={clsx("text-lg font-bold mt-1", textPrimary)}>{t('one_result')}</div>
          </div>
          <div className={clsx("p-3 rounded-2xl", styles.cardClass)}>
            <div className={clsx("text-xs font-medium", textSecondary)}>{t('pace_label')}</div>
            <div className={clsx("text-lg font-bold mt-1", textPrimary)}>{t('fast')}</div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            hapticFeedback.click();
            navigate('/daily-workout');
          }}
          className={clsx(
            "w-full sm:w-[70%] mx-auto mt-6 flex items-center justify-center gap-3 px-5 py-4 rounded-2xl font-bold text-base",
            styles.btnPrimary
          )}
        >
          <Target size={20} />
          <span>{t('daily_workout')}</span>
        </motion.button>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className={clsx(
          "mx-4 mt-4 p-5 rounded-3xl border transition-colors duration-500",
          panelClass
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className={clsx("text-xs uppercase tracking-[0.22em] font-semibold", textSecondary)}>
              {t('rewards_calendar', { defaultValue: 'Сыйлықтар күнтізбесі' })}
            </div>
            <h3 className={clsx("text-xl font-black mt-2", textPrimary)}>
              {t('daily_streak_label', { defaultValue: 'Күндік серия' })}: {dailyRewardStreak?.count || 0}
            </h3>
            <p className={clsx("text-sm mt-2 leading-relaxed", textSecondary)}>
              {t('reward_milestones')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            {weekendEvent?.isActive ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">
                <Crown size={12} />
                {t('double_coins')}
              </div>
            ) : null}

            {tournamentTickets > 0 ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-purple-300">
                <Trophy size={12} />
                {t('tickets_label', { count: tournamentTickets })}
              </div>
            ) : null}
          </div>
        </div>

        {(() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const claimedDates = Array.isArray(dailyRewardStreak?.claimedDates) ? dailyRewardStreak.claimedDates : [];
          const fallbackClaimedDates = (() => {
            if (claimedDates.length > 0) return claimedDates;
            if (!dailyRewardStreak?.lastClaimDate || !dailyRewardStreak?.count) return [];
            const base = new Date(`${dailyRewardStreak.lastClaimDate}T00:00:00`);
            return Array.from({ length: Math.min(30, dailyRewardStreak.count) }, (_, idx) => {
              const date = new Date(base);
              date.setDate(base.getDate() - (Math.min(30, dailyRewardStreak.count) - 1 - idx));
              return date.toISOString().split('T')[0];
            });
          })();

          const claimedSet = new Set(fallbackClaimedDates);
          const days = Array.from({ length: 14 }, (_, idx) => {
            const date = new Date(today);
            date.setDate(today.getDate() - (13 - idx));
            return {
              key: date.toISOString().split('T')[0],
              label: String(date.getDate()).padStart(2, '0'),
            };
          });

          const todayKey = today.toISOString().split('T')[0];
          const lastClaimKey = dailyRewardStreak?.lastClaimDate || null;
          const canClaim = lastClaimKey !== todayKey;

          return (
            <div className="mt-5">
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {days.map((day) => {
                  const claimed = claimedSet.has(day.key);
                  const isToday = day.key === todayKey;
                  return (
                    <div
                      key={day.key}
                      className={clsx(
                        "h-9 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-xs font-black",
                        claimed && "bg-emerald-500/20 text-emerald-300 border border-emerald-400/20",
                        !claimed && isToday && canClaim && "bg-indigo-500/20 text-indigo-200 border border-indigo-400/30",
                        !claimed && !isToday && "bg-white/5 text-white/40 border border-white/10",
                        !claimed && isToday && !canClaim && "bg-white/10 text-white/60 border border-white/10"
                      )}
                    >
                      {day.label}
                    </div>
                  );
                })}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { hapticFeedback.click(); setShowDailyReward(true); }}
                className={clsx(
                  "w-full mt-4 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold",
                  styles.btnPrimary
                )}
              >
                <Gift size={18} />
                {canClaim ? t('claim_daily_reward', { defaultValue: 'Claim daily reward' }) : t('daily_reward_claimed', { defaultValue: 'Claimed' })}
              </motion.button>
            </div>
          );
        })()}

        <div className={clsx("mt-5 rounded-2xl p-4", styles.cardClass)}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={clsx("text-xs uppercase tracking-[0.14em] sm:tracking-[0.2em]", textSecondary)}>
                {t('weekly_challenge', { defaultValue: 'Weekly challenge' })}
              </div>
              <div className={clsx("text-sm font-bold mt-1", textPrimary)}>
                {t('weekly_challenge_desc')}
              </div>
              <div className={clsx("text-xs mt-1", textSecondary)}>
                {t('days_progress', { current: Math.min(7, weeklyChallenge?.completedDays?.length || 0), total: 7 })}
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <div className={clsx("text-xs font-black", textPrimary)}>
                +{weeklyChallenge?.reward?.coins ?? 250} {t('coins_unit')}
              </div>
              <button
                type="button"
                onClick={() => { hapticFeedback.click(); claimWeeklyChallengeReward(); }}
                disabled={(weeklyChallenge?.completedDays?.length || 0) < 7 || Boolean(weeklyChallenge?.isClaimed)}
                className={clsx(
                  "min-h-[44px] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-[0.14em] sm:tracking-[0.18em] transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                  styles.btnSecondary
                )}
              >
                {weeklyChallenge?.isClaimed
                  ? t('claimed', { defaultValue: 'Claimed' })
                  : t('claim', { defaultValue: 'Claim' })}
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
        onClick={() => { hapticFeedback.click(); navigate('/tournaments'); }}
        className="relative mx-4 mt-5 rounded-3xl overflow-hidden group cursor-pointer border border-amber-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.3)]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-[#23110a] to-[#0b1422]" />
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-r from-transparent via-amber-500/15 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />

        <div className="relative z-10 p-5">
        <div className="max-w-full sm:max-w-[85%]">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/35 border border-amber-400/40 mb-2 backdrop-blur-md">
              <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.45)]">
                <Crown size={15} className="text-white" fill="currentColor" />
              </div>
              <span className="text-[9px] font-black text-amber-300 uppercase tracking-widest drop-shadow-md">{t('weekend_tournament')}</span>
            </div>
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 leading-tight drop-shadow-lg">
              {t('tournament_vip_title')}
            </h3>
            <p className="text-[12px] text-amber-100 mt-2 leading-snug drop-shadow-md font-medium max-w-[320px]">
              {t('tournament_vip_desc')}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-white">
              <Trophy size={12} />
              {t('join_now')}
            </div>
          </div>
        </div>
      </motion.div>

      <div className={clsx("p-6 text-center text-xs transition-colors duration-500", textSecondary)}>
        <p>© 2026 Focus App. Version 1.2.0</p>
      </div>

      <DailyRewardModal isOpen={showDailyReward} onClose={() => setShowDailyReward(false)} />
      <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </div>
  );
};

export default Home;
