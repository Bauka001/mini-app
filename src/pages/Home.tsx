import { useState, useEffect, type ElementType } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain, Calculator, Type, Trophy, Bell,
  Zap, Eye, Copy,
  Settings, Gift, User, ChevronRight, ShoppingCart,
  Wallet, Grid, Blocks, Grid2x2, Target, Crown, BarChart3, Lock
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
  { title: 'game_agent_spot', icon: Target, path: '/game/agent-spot' },
  { title: 'game_code_breaker', icon: Lock, path: '/game/code-breaker' },
  { title: 'game_stroop', icon: Type, path: '/game/stroop' },
  { title: 'game_tetris', icon: Blocks, path: '/game/tetris' },
  { title: 'game_2048', icon: Grid2x2, path: '/game/2048' },
];

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

  const watchAd = useStore(state => state.watchAd);
  const lastDailyRewardDate = useStore(state => state.lastDailyRewardDate);
  const user = useStore(state => state.user);

  const styles = useThemeStyles();
  const { isLight, isBlue, isGold, textPrimary, textSecondary, bgClass, headerClass, panelClass } = styles;

  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = useStore(state => state.notifications);
  const unreadCount = notifications.filter(n => !n.isRead).length;

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
          "px-4 py-4 flex justify-between items-center border-b sticky top-0 z-10 backdrop-blur-md transition-colors duration-500",
          headerClass
        )}
      >
        <div className="flex flex-col">
          <h1 className={clsx("text-lg font-bold tracking-tight", textPrimary)}>Focus App</h1>
          <span className={clsx("text-xs font-medium", textSecondary)}>ID: {user.gameId || '17096844'}</span>
        </div>
        <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => { hapticFeedback.click(); setShowNotifications(true); }} className="relative p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            <Bell size={22} className={textPrimary} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-black" />
            )}
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => { hapticFeedback.click(); navigate('/profile'); }} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            <User size={22} className={textPrimary} />
          </motion.button>
        </div>
      </motion.header>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={clsx(
          "px-4 py-5 border-b transition-colors duration-500",
          panelClass
        )}
      >
        <div className="flex justify-between gap-4">
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => { hapticFeedback.click(); setShowDailyReward(true); }} className="flex flex-col items-center gap-2 flex-1">
            <div className={clsx("w-16 h-16 rounded-full flex items-center justify-center shadow-sm transition-transform duration-300",
              isLight ? "bg-white border-2 border-indigo-100" :
              isBlue ? "bg-blue-900/40 border-2 border-blue-400/30" :
              isGold ? "bg-[#292524]/60 border-2 border-amber-500/30" :
              "bg-zinc-900/50 border-2 border-zinc-700/50"
            )}>
               <Gift size={24} className={isLight ? "text-indigo-500" : isBlue ? "text-blue-300" : isGold ? "text-amber-300" : "text-cyan-400"} />
            </div>
            <span className={clsx("text-xs font-medium", textPrimary)}>{t('daily_bonus')}</span>
          </motion.button>

          <motion.button whileTap={{ scale: 0.92 }} onClick={() => { hapticFeedback.click(); navigate('/leaderboard'); }} className="flex flex-col items-center gap-2 flex-1">
            <div className={clsx("w-16 h-16 rounded-full flex items-center justify-center shadow-sm transition-transform duration-300",
              isLight ? "bg-white border-2 border-orange-100" :
              isBlue ? "bg-blue-900/40 border-2 border-orange-400/30" :
              isGold ? "bg-[#292524]/60 border-2 border-amber-500/30" :
              "bg-zinc-900/50 border-2 border-zinc-700/50"
            )}>
               <Trophy size={24} className={isLight ? "text-orange-500" : isBlue ? "text-orange-300" : isGold ? "text-amber-400" : "text-orange-400"} />
            </div>
            <span className={clsx("text-xs font-medium", textPrimary)}>{t('top_players')}</span>
          </motion.button>

          <motion.button whileTap={{ scale: 0.92 }} onClick={() => { hapticFeedback.click(); navigate('/tournaments'); }} className="flex flex-col items-center gap-2 flex-1">
            <div className={clsx("w-16 h-16 rounded-full flex items-center justify-center shadow-sm transition-transform duration-300",
              isLight ? "bg-white border-2 border-purple-100" :
              isBlue ? "bg-blue-900/40 border-2 border-purple-400/30" :
              isGold ? "bg-[#292524]/60 border-2 border-purple-400/30" :
              "bg-zinc-900/50 border-2 border-zinc-700/50"
            )}>
               <Trophy size={24} className={isLight ? "text-purple-500" : isBlue ? "text-purple-300" : isGold ? "text-purple-300" : "text-purple-400"} />
            </div>
            <span className={clsx("text-xs font-medium", textPrimary)}>Tournament</span>
          </motion.button>

          <motion.button whileTap={{ scale: 0.92 }} onClick={() => { hapticFeedback.click(); navigate('/analytics'); }} className="flex flex-col items-center gap-2 flex-1">
            <div className={clsx("w-16 h-16 rounded-full flex items-center justify-center shadow-sm transition-transform duration-300",
              isLight ? "bg-white border-2 border-emerald-100" :
              isBlue ? "bg-blue-900/40 border-2 border-emerald-400/30" :
              isGold ? "bg-[#292524]/60 border-2 border-emerald-400/30" :
              "bg-zinc-900/50 border-2 border-zinc-700/50"
            )}>
               <BarChart3 size={24} className={isLight ? "text-emerald-500" : isBlue ? "text-emerald-300" : isGold ? "text-emerald-300" : "text-emerald-400"} />
            </div>
            <span className={clsx("text-xs font-medium", textPrimary)}>VIP Analytics</span>
          </motion.button>
        </div>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className={clsx(
          "mx-4 mt-5 p-5 rounded-3xl border transition-colors duration-500",
          panelClass
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-[75%]">
            <div className={clsx("text-xs uppercase tracking-[0.22em] font-semibold", textSecondary)}>
              Today&apos;s Focus
            </div>
            <h2 className={clsx("text-2xl font-black mt-2", textPrimary)}>Daily Workout</h2>
            <p className={clsx("text-sm mt-2 leading-relaxed", textSecondary)}>
              3 кездейсок ойыннан отип, кунделикти фокус сессияны аяктаңыз.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400">
              <Target size={12} />
              Ойыншыны бастайтын негізгі бағыт
            </div>
          </div>
          <div className={clsx(
            "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
            styles.cardClass
          )}>
            <Zap size={28} className={styles.textAccent} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className={clsx("p-3 rounded-2xl", styles.cardClass)}>
            <div className={clsx("text-xs font-medium", textSecondary)}>Games</div>
            <div className={clsx("text-lg font-bold mt-1", textPrimary)}>3 Random</div>
          </div>
          <div className={clsx("p-3 rounded-2xl", styles.cardClass)}>
            <div className={clsx("text-xs font-medium", textSecondary)}>Goal</div>
            <div className={clsx("text-lg font-bold mt-1", textPrimary)}>1 Score</div>
          </div>
          <div className={clsx("p-3 rounded-2xl", styles.cardClass)}>
            <div className={clsx("text-xs font-medium", textSecondary)}>Flow</div>
            <div className={clsx("text-lg font-bold mt-1", textPrimary)}>Quick</div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            hapticFeedback.click();
            navigate('/daily-workout');
          }}
          className={clsx(
            "w-[70%] mx-auto mt-6 flex items-center justify-center gap-3 px-5 py-4 rounded-2xl font-bold text-base",
            styles.btnPrimary
          )}
        >
          <Target size={20} />
          <span>Daily Workout</span>
        </motion.button>
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
          <div className="max-w-[85%]">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/35 border border-amber-400/40 mb-2 backdrop-blur-md">
              <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.45)]">
                <Crown size={15} className="text-white" fill="currentColor" />
              </div>
              <span className="text-[9px] font-black text-amber-300 uppercase tracking-widest drop-shadow-md">Weekend Tournament</span>
            </div>
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 leading-tight drop-shadow-lg">
              VIP + Tournament монетизациясы
            </h3>
            <p className="text-[12px] text-amber-100 mt-2 leading-snug drop-shadow-md font-medium max-w-[320px]">
              Жұма-жексенбі турниріне кіріңіз, VIP арқылы тегін entry алыңыз және analytics көмегімен нәтижеңізді бақылаңыз.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-white">
              <Trophy size={12} />
              Join now
            </div>
          </div>
        </div>
      </motion.div>

      <div className={clsx(
        "p-4 mt-4 rounded-2xl mx-4 transition-colors duration-500",
        panelClass
      )}>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className={clsx("text-lg font-bold", textPrimary)}>Practice</h2>
            <p className={clsx("text-sm mt-1", textSecondary)}>
              Кез келген ойынды тандап, жеке жаттыгу режиминде ойнаңыз.
            </p>
          </div>
          <div className={clsx("text-xs font-semibold uppercase tracking-[0.18em]", textSecondary)}>
            {gameButtons.length} games
          </div>
        </div>
        <motion.div
          className="grid grid-cols-4 gap-4"
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
                  "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300",
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
                <span className={clsx("text-xs text-center font-medium", styles.textPrimary)}>{t(game.title)}</span>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      <motion.div
        className="mt-4 space-y-4 px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className={clsx("rounded-2xl overflow-hidden border transition-colors duration-500", panelClass)}>
          <ListItem
            title={t('shop_title')}
            subtitle={t('shop_desc')}
            icon={ShoppingCart}
            onClick={() => navigate('/shop')}
            styles={styles}
          />
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
          <ListItem
            title={t('settings_title')}
            icon={Settings}
            onClick={() => navigate('/settings')}
            styles={styles}
          />
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
