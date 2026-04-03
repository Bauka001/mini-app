import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain, Calculator, Type, Trophy, Bell,
  Video, Zap, Eye, Copy,
  Settings, Gift, User, ChevronRight, ShoppingCart,
  Wallet, Grid, Blocks, Grid2x2
} from 'lucide-react';
import { useStore } from '../store/useStore.1';
import { clsx } from 'clsx';
import AdModal from '../components/AdModal';
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
  icon: React.ElementType,
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

  const [showAdModal, setShowAdModal] = useState(false);
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

  const handleWatchAd = () => {
    hapticFeedback.click();
    console.log('Watch Ad clicked');
    setShowAdModal(true);
  };

  const handleAdComplete = () => {
    console.log('Ad completed');
    watchAd(50);
  };

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

          <motion.button whileTap={{ scale: 0.92 }} onClick={handleWatchAd} className="flex flex-col items-center gap-2 flex-1">
            <div className={clsx("w-16 h-16 rounded-full flex items-center justify-center shadow-sm transition-transform duration-300",
              isLight ? "bg-white border-2 border-purple-100" :
              isBlue ? "bg-blue-900/40 border-2 border-purple-400/30" :
              isGold ? "bg-[#292524]/60 border-2 border-purple-400/30" :
              "bg-zinc-900/50 border-2 border-zinc-700/50"
            )}>
               <Video size={24} className={isLight ? "text-purple-500" : isBlue ? "text-purple-300" : isGold ? "text-purple-300" : "text-purple-400"} />
            </div>
            <span className={clsx("text-xs font-medium", textPrimary)}>{t('watch_ad')}</span>
          </motion.button>

          <motion.button whileTap={{ scale: 0.92 }} onClick={() => { hapticFeedback.click(); navigate('/airdrop'); }} className="flex flex-col items-center gap-2 flex-1">
            <div className={clsx("w-16 h-16 rounded-full flex items-center justify-center shadow-sm transition-transform duration-300",
              isLight ? "bg-white border-2 border-emerald-100" :
              isBlue ? "bg-blue-900/40 border-2 border-emerald-400/30" :
              isGold ? "bg-[#292524]/60 border-2 border-emerald-400/30" :
              "bg-zinc-900/50 border-2 border-zinc-700/50"
            )}>
               <span className={clsx("text-sm font-bold", isLight ? "text-emerald-500" : isBlue ? "text-emerald-300" : isGold ? "text-emerald-300" : "text-emerald-400")}>$FEC</span>
            </div>
            <span className={clsx("text-xs font-medium", textPrimary)}>{t('my_wallet')}</span>
          </motion.button>
        </div>
      </motion.div>

      <div className={clsx(
        "p-4 mt-4 rounded-2xl mx-4 transition-colors duration-500",
        panelClass
      )}>
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
        </div>

        <div className={clsx("rounded-2xl overflow-hidden border transition-colors duration-500", panelClass)}>
          <ListItem
            title={t('daily_workout_title')}
            subtitle={t('daily_workout_desc')}
            icon={Zap}
            onClick={() => navigate('/daily-workout')}
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
      <AdModal
        isOpen={showAdModal}
        onClose={() => setShowAdModal(false)}
        onComplete={handleAdComplete}
        reward={50}
      />
    </div>
  );
};

export default Home;
