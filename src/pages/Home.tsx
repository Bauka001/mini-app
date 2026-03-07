import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Play, Brain, Calculator, Type, Grid, Trophy, Bell, 
  CheckCircle, Video, Coins, Zap, Eye, Copy, Swords, Info, 
  Settings, Gift, MessageCircle, User, ChevronRight, ShoppingCart, 
  Wallet, BarChart2, HelpCircle, Map, Flame, Grid3x3, Shield, Crown
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { clsx } from 'clsx';
import { showAd } from '../utils/ads';
import ChatModal from '../components/ChatModal';
import AdModal from '../components/AdModal';
import { DailyRewardModal } from '../components/DailyRewardModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { useThemeStyles } from '../hooks/useThemeStyles';

const GameGridItem = ({ 
  title, 
  icon: Icon, 
  onClick,
  isLight
}: { 
  title: string, 
  icon: any, 
  onClick: () => void,
  isLight: boolean
}) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-2 active:opacity-70 transition-opacity"
  >
    <div className="w-12 h-12 flex items-center justify-center">
      <Icon size={32} className={isLight ? "text-green-600 drop-shadow-sm" : "text-white drop-shadow-md"} />
    </div>
    <span className={clsx("text-[11px] font-medium text-center leading-tight", isLight ? "text-green-800" : "text-white/90")}>{title}</span>
  </button>
);

const ListItem = ({ 
  icon: Icon, 
  title, 
  subtitle,
  onClick,
  styles
}: { 
  icon: any, 
  title: string, 
  subtitle?: string,
  onClick: () => void,
  styles: any
}) => (
  <button 
    onClick={onClick}
    className={clsx(
      "w-full p-4 flex items-center justify-between border-b last:border-0 transition-colors",
      styles.isLight ? "bg-white border-green-50 active:bg-green-50" : "bg-transparent border-white/5 active:bg-white/5"
    )}
  >
    <div className="flex items-center gap-4">
      <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", styles.isLight ? "bg-green-100" : "bg-white/20")}>
        <Icon size={24} className={styles.isLight ? "text-green-600" : "text-white"} />
      </div>
      <div className="text-left">
        <div className={clsx("font-medium", styles.textPrimary)}>{title}</div>
        {subtitle && <div className={clsx("text-xs", styles.textSecondary)}>{subtitle}</div>}
      </div>
    </div>
    <ChevronRight size={20} className={styles.textSecondary} />
  </button>
);

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Optimized Selectors to prevent unnecessary re-renders
  const coins = useStore(state => state.coins);
  const fecBalance = useStore(state => state.fecBalance);
  const watchAd = useStore(state => state.watchAd);
  const dailyRewardStreak = useStore(state => state.dailyRewardStreak);
  const lastDailyRewardDate = useStore(state => state.lastDailyRewardDate);
  const user = useStore(state => state.user);
  // plan is not used in Home, removed it

  const styles = useThemeStyles();
  const { isLight, isGold, bgClass, headerClass, cardClass, textPrimary, textSecondary, textAccent } = styles;

  const [showChat, setShowChat] = useState(false);
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
    console.log('Watch Ad clicked');
    setShowAdModal(true);
  };

  const handleAdComplete = () => {
    console.log('Ad completed');
    watchAd(50);
  };

  return (
    <div className={clsx("min-h-screen pb-20 font-sans transition-colors duration-500", bgClass)}>

      {/* Header */}
      <header className={clsx(
        "px-4 py-3 flex justify-between items-center sticky top-0 z-50 border-b backdrop-blur-xl",
        headerClass
      )}>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowChat(true)} className="relative">
            <MessageCircle size={24} className={textAccent} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
          </button>
          <div className="flex flex-col">
            <span className={clsx("text-[10px] font-bold opacity-60", textAccent)}>ID: {user.gameId || '17096844'}</span>
            <h1 className={clsx("text-lg font-bold tracking-tight", textAccent)}>Focus App</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowNotifications(true)} className="relative">
            <Bell size={24} className={textAccent} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>
          <button onClick={() => navigate('/profile')}>
            <User size={24} className={textAccent} />
          </button>
        </div>
      </header>

      {/* Stories Area */}
      <div className={clsx(
        "p-4 pb-6 border-b backdrop-blur-md",
        isLight ? "bg-white/60 border-green-100" : isGold ? "bg-amber-900/10 border-amber-500/20" : "bg-white/5 border-white/5"
      )}>
        <div className="flex overflow-x-auto gap-4 no-scrollbar pb-2">
          {/* Daily Reward Story */}
          <button onClick={() => setShowDailyReward(true)} className="flex flex-col items-center gap-1 min-w-[70px]">
            <div className={clsx("w-16 h-16 rounded-full border-2 p-1", isLight ? "border-green-200 bg-white" : "border-blue-400")}>
               <div className={clsx("w-full h-full rounded-full flex items-center justify-center", isLight ? "bg-green-50" : "bg-blue-400/20 backdrop-blur-md")}>
                 <Gift size={24} className={isLight ? "text-green-500" : "text-blue-400"} />
               </div>
            </div>
            <span className={clsx("text-[10px] font-medium text-center leading-tight", textPrimary)} dangerouslySetInnerHTML={{ __html: t('daily_bonus').replace(' ', '<br/>') }} />
          </button>

          {/* Leaderboard Story */}
          <button onClick={() => navigate('/leaderboard')} className="flex flex-col items-center gap-1 min-w-[70px]">
            <div className={clsx("w-16 h-16 rounded-full border-2 p-1", isLight ? "border-green-200 bg-white" : "border-blue-400")}>
               <div className={clsx("w-full h-full rounded-full flex items-center justify-center", isLight ? "bg-green-50" : "bg-blue-400/20 backdrop-blur-md")}>
                 <Trophy size={24} className={isLight ? "text-green-500" : "text-blue-400"} />
               </div>
            </div>
            <span className={clsx("text-[10px] font-medium text-center leading-tight", textPrimary)} dangerouslySetInnerHTML={{ __html: t('top_players').replace(' ', '<br/>') }} />
          </button>

          {/* Ad Story */}
          <button onClick={handleWatchAd} className="flex flex-col items-center gap-1 min-w-[70px]">
            <div className={clsx("w-16 h-16 rounded-full border-2 p-0.5", isLight ? "border-green-500 bg-white" : "border-pink-500")}>
               <div className="w-full h-full rounded-full overflow-hidden relative">
                 <img src="https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=150&q=80" alt="Ad" className={clsx("w-full h-full object-cover", !isLight && "opacity-80")} />
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                   <Video size={20} className="text-white" />
                 </div>
               </div>
            </div>
            <span className={clsx("text-[10px] font-medium text-center leading-tight", textPrimary)} dangerouslySetInnerHTML={{ __html: t('watch_ad').replace(' ', '<br/>') }} />
          </button>
          
          {/* Balance Story */}
          <button onClick={() => navigate('/airdrop')} className="flex flex-col items-center gap-1 min-w-[70px]">
            <div className={clsx("w-16 h-16 rounded-full border-2 p-1", isLight ? "border-green-200 bg-white" : "border-green-400")}>
               <div className={clsx("w-full h-full rounded-full flex flex-col items-center justify-center", isLight ? "bg-green-100" : "bg-green-400/20 backdrop-blur-md")}>
                 <span className={clsx("text-[10px] font-bold", isLight ? "text-green-700" : "text-green-400")}>$FEC</span>
                 <span className={clsx("text-xs font-black", isLight ? "text-green-800" : "text-white")}>{fecBalance?.toFixed(1)}</span>
               </div>
            </div>
            <span className={clsx("text-[10px] font-medium text-center leading-tight", textPrimary)} dangerouslySetInnerHTML={{ __html: t('my_wallet').replace(' ', '<br/>') }} />
          </button>
        </div>
      </div>

      {/* Battle Button - Separate Long Button */}
      <div className="px-4 my-6">
        <motion.button
          onClick={() => navigate('/battle')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={clsx(
            "w-full py-5 px-6 rounded-2xl flex items-center justify-center gap-4 shadow-xl shadow-green-900/20 relative overflow-hidden border border-white/20",
            "bg-gradient-to-r from-green-600 via-emerald-500 to-teal-600"
          )}
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMDQgMEgwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
          
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl"
          />
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-md animate-pulse" />
              <div className="relative w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/30">
                <Swords size={28} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white tracking-tight drop-shadow-lg">{t('battle_title')}</span>
                <Flame size={20} className="text-green-200" fill="currentColor" />
              </div>
              <span className="text-sm font-semibold text-white/90 drop-shadow">
                {t('battle_desc')}
              </span>
            </div>
            
            <ChevronRight size={24} className="text-white/80 ml-auto" />
          </div>
        </motion.button>
      </div>

      {/* Main Grid Menu (Games) */}
      <div className={clsx(
        "p-3 sm:p-4 pt-4 sm:pt-6 pb-6 -mt-4 rounded-t-3xl border-t relative z-10 mx-1 sm:mx-2 backdrop-blur-lg",
        isLight ? "bg-white/90 border-green-100 shadow-sm" : isGold ? "bg-amber-900/20 border-amber-500/20" : "bg-white/10 border-white/10"
      )}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-5 sm:gap-y-6 gap-x-2">
          <GameGridItem title={t('game_memory')} icon={Grid} onClick={() => navigate('/game/memory')} isLight={isLight} />
          <GameGridItem title={t('game_schulte')} icon={Brain} onClick={() => navigate('/game/schulte')} isLight={isLight} />
          <GameGridItem title={t('game_math')} icon={Calculator} onClick={() => navigate('/game/math')} isLight={isLight} />
          <GameGridItem title={t('game_pairs')} icon={Copy} onClick={() => navigate('/game/pairs')} isLight={isLight} />
          
          <GameGridItem title={t('game_odd_one')} icon={Eye} onClick={() => navigate('/game/odd-one')} isLight={isLight} />
          <GameGridItem title={t('game_stroop')} icon={Type} onClick={() => navigate('/game/stroop')} isLight={isLight} />
          <GameGridItem title={t('game_tetris')} icon={Grid} onClick={() => navigate('/game/tetris')} isLight={isLight} />
          <GameGridItem title={t('game_2048')} icon={Grid3x3} onClick={() => navigate('/game/2048')} isLight={isLight} />
        </div>
      </div>

      {/* List Menu Section */}
      <div className="mt-4 space-y-3 px-4">
        <div className={clsx("rounded-2xl overflow-hidden border", cardClass)}>
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

        <div className={clsx("rounded-2xl overflow-hidden border", cardClass)}>
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
      </div>

      {/* Bottom Info */}
      <div className={clsx("p-6 text-center text-xs", textSecondary)}>
        <p>© 2026 Focus App. All rights reserved.</p>
        <p className="mt-1">Version 1.2.0</p>
      </div>

      <ChatModal isOpen={showChat} onClose={() => setShowChat(false)} />
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
