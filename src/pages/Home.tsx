import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Play, Brain, Calculator, Type, Grid, Trophy, Target, Bell, CheckCircle, Video, Coins, Zap, Eye, Copy, Swords, Info, Settings, AlertOctagon, Gem, Gift } from 'lucide-react';
import { useStore } from '../store/useStore';
import { clsx } from 'clsx';
import { showAd } from '../utils/ads';
import { InfoGuideModal } from '../components/InfoGuideModal';

const GameCard = ({ 
  title, 
  description,
  icon: Icon, 
  gradient, 
  onClick 
}: { 
  title: string, 
  description?: string,
  icon: any, 
  gradient: string, 
  iconColor?: string,
  onClick: () => void 
}) => (
  <button 
    onClick={onClick}
    className="group relative w-full h-full p-0.5 rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
  >
    {/* Clean Background for Card */}
    <div className="relative h-full bg-secondary/95 backdrop-blur-xl rounded-[14px] p-4 flex flex-col items-center justify-center border border-white/5 text-center gap-3">
      <div className={clsx(`p-4 rounded-2xl bg-gradient-to-br ${gradient} bg-opacity-20 shadow-inner mb-1`)}>
        <Icon size={32} className="text-white drop-shadow-md" />
      </div>
      
      <div className="flex flex-col items-center">
        <span className="text-sm font-bold text-white group-hover:text-primary transition-colors leading-tight">{title}</span>
        {description && <span className="text-[10px] text-gray-400 font-medium mt-1">{description}</span>}
      </div>
    </div>
  </button>
);

const DailyWorkoutCard = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation();
  
  return (
    <button 
      onClick={onClick}
      className="w-full p-5 mb-8 rounded-3xl bg-gradient-to-br from-primary to-orange-500 shadow-2xl shadow-primary/20 relative overflow-hidden group active:scale-[0.98] transition-transform"
    >
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
      
      <div className="relative z-10 flex flex-col items-start">
        <div className="flex items-center gap-2 mb-2 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
          <Zap size={14} className="text-white" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">{t('daily_workout')}</span>
        </div>
        
        <h2 className="text-2xl font-black text-white mb-1">{t('start_workout')}</h2>
        <p className="text-white/80 text-sm font-medium mb-4 max-w-[80%] text-left">
          {t('workout_desc')}
        </p>
        
        <div className="flex items-center gap-2">
           <div className="flex -space-x-2">
             <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
               <Brain size={14} className="text-white" />
             </div>
             <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
               <Calculator size={14} className="text-white" />
             </div>
             <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
               <Eye size={14} className="text-white" />
             </div>
           </div>
           <span className="text-xs font-bold text-white/80 ml-2">3 Games • ~3 min</span>
        </div>
      </div>
      
      <div className="absolute right-4 bottom-4 w-12 h-12 bg-white text-primary rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
        <Play size={24} className="ml-1" />
      </div>
    </button>
  );
};

const NotificationPopover = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  if (!isOpen) return null;
  
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-20 right-5 z-50 w-72 bg-secondary/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Bell size={16} className="text-primary" />
            Notifications
          </h3>
          <button 
            onClick={() => navigate('/leaderboard')}
            className="text-xs text-primary font-bold hover:underline"
          >
            View Leaderboard
          </button>
        </div>
        <div className="space-y-3">
          <div className="bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-bold text-green-400">Energy Full ⚡</span>
              <span className="text-[10px] text-gray-500">Just now</span>
            </div>
            <p className="text-xs text-gray-300">Your energy has been fully restored. Ready to play!</p>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
             <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-bold text-yellow-400">Special Offer 🎁</span>
              <span className="text-[10px] text-gray-500">2h ago</span>
            </div>
            <p className="text-xs text-gray-300">50% Discount on all Neon Skins! Valid for 24h.</p>
          </div>
        </div>
      </div>
    </>
  );
};

const ChallengeCard = ({ 
  description, 
  current, 
  target, 
  reward, 
  isClaimed, 
  onClaim 
}: { 
  description: string, 
  current: number, 
  target: number, 
  reward: number, 
  isClaimed: boolean, 
  onClaim: () => void 
}) => {
  const progress = Math.min(100, (current / target) * 100);
  const isCompleted = current >= target;

  return (
    <div className="bg-white/5 p-3 rounded-xl border border-white/5 mb-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-white">{description}</span>
        <div className="flex items-center gap-1 text-primary text-xs font-bold">
          <Coins size={12} />
          +{reward}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {isClaimed ? (
          <span className="text-xs text-green-400 flex items-center gap-1 font-bold">
            <CheckCircle size={12} /> Done
          </span>
        ) : isCompleted ? (
          <button 
            onClick={onClaim}
            className="px-3 py-1 bg-primary text-black text-xs font-bold rounded-lg animate-pulse"
          >
            Claim
          </button>
        ) : (
          <span className="text-xs text-gray-500 font-mono">
            {current}/{target}
          </span>
        )}
      </div>
    </div>
  );
};

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { 
    dailyGoalMinutes, 
    history, 
    lastDailyGoalClaimDate, 
    claimDailyReward,
    challenges,
    refreshChallenges,
    claimChallengeReward,
    watchAd,
    gems,
    coins,
    fecBalance
  } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  const [activeCategory, setActiveCategory] = useState<'all' | 'attention' | 'memory' | 'reasoning'>('all');

  useEffect(() => {
    refreshChallenges();
  }, [refreshChallenges]);

  const today = new Date().toISOString().split('T')[0];
  const todayGames = history.filter(h => h.date === today);
  const minutesPlayed = todayGames.length * 2; 
  const progressPercent = Math.min(100, (minutesPlayed / dailyGoalMinutes) * 100);
  
  const isGoalReached = minutesPlayed >= dailyGoalMinutes;
  const isRewardClaimed = lastDailyGoalClaimDate === today;

  const handleWatchAd = async () => {
    setIsWatchingAd(true);
    const success = await showAd();
    setIsWatchingAd(false);
    
    if (success) {
      watchAd(50); // Give 50 coins reward
      alert("You earned 50 coins!");
    } else {
      alert("Ad skipped or failed to load.");
    }
  };

  const startDailyWorkout = () => {
    navigate('/daily-workout');
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed top-[-20%] left-[-20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 p-5 pt-8">
        <header className="mb-8 flex justify-between items-end relative">
          <div>
            <p className="text-gray-400 text-sm font-medium mb-1 tracking-wide uppercase">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">
              Focus<span className="text-primary">.</span>
            </h1>
            {/* Currency Display */}
            <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-left-2">
               <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                <Coins size={16} className="text-yellow-400" />
                {coins.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-blue-400">
                <Gift size={16} />
                {fecBalance?.toFixed(2) || '0.00'} $FEC
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
              onClick={() => setShowInfo(true)}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <Info size={20} className="text-white" />
            </button>

             <button 
              onClick={() => navigate('/settings')}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <Settings size={20} className="text-white" />
            </button>

             <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors relative"
            >
              <Bell size={20} className="text-white" />
              <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
            </button>
            
            <button 
              onClick={() => navigate('/profile')}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-orange-400 p-[2px] hover:scale-105 transition-transform"
            >
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full rounded-full bg-black" />
            </button>
          </div>
          
          <NotificationPopover isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
          <InfoGuideModal isOpen={showInfo} onClose={() => setShowInfo(false)} />
        </header>

        {/* Battle Mode Banner */}
        <button 
          onClick={() => navigate('/battle')}
          className="w-full p-4 mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-between shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
               <Swords size={20} className="text-white" />
             </div>
             <div className="text-left">
               <h3 className="font-bold text-white text-lg leading-tight">Online Battle</h3>
               <p className="text-xs text-blue-200 font-medium">1vs1 Real-time Math</p>
             </div>
          </div>
          <div className="px-3 py-1 bg-white/20 rounded-lg text-xs font-bold text-white">PLAY</div>
        </button>

        <DailyWorkoutCard onClick={startDailyWorkout} />

        {/* Daily Goal Card */}
        <div className="mb-8 p-5 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-colors" />
          
          <div className="flex justify-between items-start mb-4 relative">
            <div>
              <span className="text-sm text-gray-400 font-medium block mb-1">{t('daily_goal')}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{minutesPlayed}</span>
                <span className="text-gray-500 font-medium">/ {dailyGoalMinutes} min</span>
              </div>
            </div>
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Target size={22} />
            </div>
          </div>
          
          <div className="relative w-full bg-black/50 rounded-full h-3 overflow-hidden mb-4">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,215,0,0.5)]" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex gap-2">
            {isGoalReached && !isRewardClaimed ? (
              <button 
                onClick={() => claimDailyReward(50)}
                className="flex-1 py-3 bg-primary text-black font-bold rounded-xl shadow-[0_0_15px_rgba(255,215,0,0.4)] animate-pulse hover:scale-[1.02] transition-transform"
              >
                {t('claim_reward')} (+50 🪙)
              </button>
            ) : isGoalReached && isRewardClaimed ? (
              <div className="flex-1 py-3 bg-white/5 text-gray-400 font-bold rounded-xl text-center border border-white/5">
                {t('reward_claimed')} ✅
              </div>
            ) : (
               <div className="flex-1 py-3 bg-white/5 text-gray-500 font-bold rounded-xl text-center border border-white/5 text-sm">
                 Keep Playing...
               </div>
            )}
            
            <button 
              onClick={handleWatchAd}
              disabled={isWatchingAd}
              className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
            >
               {isWatchingAd ? (
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
               ) : (
                 <Video size={20} />
               )}
               <span className="text-xs">+50</span>
            </button>
          </div>
        </div>

        {/* Daily Challenges */}
        <div className="mb-8">
           <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
             <Trophy size={18} className="text-yellow-500" />
             Daily Challenges
           </h2>
           <div className="space-y-2">
             {challenges.map(challenge => (
               <ChallengeCard
                 key={challenge.id}
                 description={challenge.description}
                 current={challenge.current}
                 target={challenge.target}
                 reward={challenge.reward}
                 isClaimed={challenge.isClaimed}
                 onClaim={() => claimChallengeReward(challenge.id)}
               />
             ))}
           </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Play size={20} className="text-primary" />
          {t('start')}
        </h2>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
          {(['all', 'attention', 'memory', 'reasoning'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                "px-4 py-2 rounded-full text-xs font-bold uppercase whitespace-nowrap transition-all",
                activeCategory === cat 
                  ? "bg-primary text-black shadow-lg shadow-primary/20" 
                  : "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"
              )}
            >
              {cat === 'all' ? t('home') : t(cat)}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-2 gap-3 pb-8">
          {(activeCategory === 'all' || activeCategory === 'attention') && (
            <>
              <GameCard 
                title={t('game_odd_one', 'Odd One Out')}
                description="Perception"
                icon={Eye} 
                gradient="from-yellow-500 to-orange-500"
                iconColor="text-yellow-400"
                onClick={() => navigate('/game/odd-one')} 
              />
              <GameCard 
                title={t('game_schulte', 'Schulte Table')}
                description="Attention"
                icon={Brain} 
                gradient="from-blue-500 to-cyan-400"
                iconColor="text-blue-400"
                onClick={() => navigate('/game/schulte')} 
              />
              <GameCard 
                title={t('game_stroop', 'Stroop Test')}
                description="Flexibility"
                icon={Type} 
                gradient="from-red-500 to-pink-500"
                iconColor="text-red-400"
                onClick={() => navigate('/game/stroop')} 
              />
              <GameCard 
                title={t('game_reaction', 'Reaction')}
                description="Focus Speed"
                icon={Zap} 
                gradient="from-green-500 to-emerald-500"
                iconColor="text-green-400"
                onClick={() => navigate('/game/reaction')} 
              />
            </>
          )}

          {(activeCategory === 'all' || activeCategory === 'memory') && (
             <>
              <GameCard 
                title={t('game_memory', 'Memory Matrix')}
                description="Visual Memory"
                icon={Grid} 
                gradient="from-purple-500 to-violet-400"
                iconColor="text-purple-400"
                onClick={() => navigate('/game/memory')} 
              />
               <GameCard 
                title={t('game_pairs', 'Pairs')}
                description="Recall"
                icon={Copy} 
                gradient="from-pink-500 to-rose-400"
                iconColor="text-pink-400"
                onClick={() => navigate('/game/pairs')} 
              />
             </>
          )}

          {(activeCategory === 'all' || activeCategory === 'reasoning') && (
            <>
             <GameCard 
              title={t('game_math', 'Arithmetic')}
              description="Speed Math"
              icon={Calculator} 
              gradient="from-green-500 to-emerald-400"
              iconColor="text-green-400"
              onClick={() => navigate('/game/math')} 
            />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
