import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, Calculator, Type, Grid, Trophy, Bell,
  Video, Zap, Eye, Copy,
  Settings, Gift, User, ChevronRight, ShoppingCart,
  Wallet, Grid3x3
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { clsx } from 'clsx';
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
    className="flex flex-col items-center gap-2 p-3"
  >
    <div className="w-12 h-12 flex items-center justify-center">
      <Icon size={28} className={isLight ? "text-gray-800" : "text-gray-100"} />
    </div>
    <span className={clsx("text-xs text-center", isLight ? "text-gray-700" : "text-gray-300")}>{title}</span>
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
      "w-full p-4 flex items-center justify-between border-b last:border-0",
      styles.isLight ? "bg-white border-gray-100" : "bg-transparent border-gray-800"
    )}
  >
    <div className="flex items-center gap-4">
      <div className={clsx("w-10 h-10 rounded flex items-center justify-center", styles.isLight ? "bg-gray-100" : "bg-gray-800")}>
        <Icon size={20} className={styles.isLight ? "text-gray-700" : "text-gray-300"} />
      </div>
      <div className="text-left">
        <div className={clsx("text-sm", styles.textPrimary)}>{title}</div>
        {subtitle && <div className={clsx("text-xs", styles.textSecondary)}>{subtitle}</div>}
      </div>
    </div>
    <ChevronRight size={16} className={styles.textSecondary} />
  </button>
);

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const watchAd = useStore(state => state.watchAd);
  const lastDailyRewardDate = useStore(state => state.lastDailyRewardDate);
  const user = useStore(state => state.user);

  const styles = useThemeStyles();
  const { isLight, textPrimary, textSecondary } = styles;

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
        "px-4 py-4 flex justify-between items-center border-b",
        isLight ? "bg-white border-gray-200" : "bg-black border-gray-800"
      )}>
        <div className="flex flex-col">
          <h1 className={clsx("text-lg font-semibold", isLight ? "text-gray-900" : "text-white")}>Focus App</h1>
          <span className={clsx("text-xs", isLight ? "text-gray-500" : "text-gray-400")}>ID: {user.gameId || '17096844'}</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowNotifications(true)} className="relative">
            <Bell size={20} className={isLight ? "text-gray-600" : "text-gray-400"} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
          <button onClick={() => navigate('/profile')}>
            <User size={20} className={isLight ? "text-gray-600" : "text-gray-400"} />
          </button>
        </div>
      </header>

      {/* Stories Area */}
      <div className={clsx(
        "px-4 py-4 border-b",
        isLight ? "bg-gray-50 border-gray-200" : "bg-gray-900 border-gray-800"
      )}>
        <div className="flex gap-6">
          <button onClick={() => setShowDailyReward(true)} className="flex flex-col items-center gap-2">
            <div className={clsx("w-14 h-14 rounded-full flex items-center justify-center", isLight ? "bg-white border-2 border-gray-200" : "bg-gray-800 border-2 border-gray-700")}>
               <Gift size={20} className={isLight ? "text-gray-700" : "text-gray-300"} />
            </div>
            <span className={clsx("text-xs", isLight ? "text-gray-700" : "text-gray-300")}>{t('daily_bonus')}</span>
          </button>

          <button onClick={() => navigate('/leaderboard')} className="flex flex-col items-center gap-2">
            <div className={clsx("w-14 h-14 rounded-full flex items-center justify-center", isLight ? "bg-white border-2 border-gray-200" : "bg-gray-800 border-2 border-gray-700")}>
               <Trophy size={20} className={isLight ? "text-gray-700" : "text-gray-300"} />
            </div>
            <span className={clsx("text-xs", isLight ? "text-gray-700" : "text-gray-300")}>{t('top_players')}</span>
          </button>

          <button onClick={handleWatchAd} className="flex flex-col items-center gap-2">
            <div className={clsx("w-14 h-14 rounded-full flex items-center justify-center", isLight ? "bg-white border-2 border-gray-200" : "bg-gray-800 border-2 border-gray-700")}>
               <Video size={20} className={isLight ? "text-gray-700" : "text-gray-300"} />
            </div>
            <span className={clsx("text-xs", isLight ? "text-gray-700" : "text-gray-300")}>{t('watch_ad')}</span>
          </button>
          
          <button onClick={() => navigate('/airdrop')} className="flex flex-col items-center gap-2">
            <div className={clsx("w-14 h-14 rounded-full flex items-center justify-center", isLight ? "bg-white border-2 border-gray-200" : "bg-gray-800 border-2 border-gray-700")}>
               <span className={clsx("text-xs font-bold", isLight ? "text-gray-700" : "text-gray-300")}>$FEC</span>
            </div>
            <span className={clsx("text-xs", isLight ? "text-gray-700" : "text-gray-300")}>{t('my_wallet')}</span>
          </button>
        </div>
      </div>

      {/* Main Grid Menu (Games) */}
      <div className={clsx(
        "p-4 mt-4",
        isLight ? "bg-white" : "bg-black"
      )}>
        <div className="grid grid-cols-4 gap-4">
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
      <div className={clsx(
        "mt-4 space-y-1",
        isLight ? "bg-white" : "bg-black"
      )}>
        <div className={clsx("rounded-lg overflow-hidden border", isLight ? "border-gray-200" : "border-gray-800")}>
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

        <div className={clsx("rounded-lg overflow-hidden border", isLight ? "border-gray-200" : "border-gray-800")}>
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
      <div className={clsx("p-6 text-center text-xs", isLight ? "text-gray-400" : "text-gray-600")}>
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
