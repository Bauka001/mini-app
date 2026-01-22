import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Camera, Edit2, Trophy, Gift, 
  Coins, Diamond, Zap, History, Star, 
  Award, TrendingUp, Calendar, LayoutGrid,
  Flame, Shield, Crown, Zap as ZapIcon, Calculator
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import WebApp from '@twa-dev/sdk';
import { BrainProfile } from '../components/BrainProfile';
import { Achievements } from '../components/Achievements';

const PLAN_CONFIG = {
  free: { icon: Star, name: 'Free', color: 'from-gray-500 to-gray-600', borderColor: 'border-gray-500' },
  standard: { icon: Shield, name: 'Standard', color: 'from-blue-500 to-blue-600', borderColor: 'border-blue-500' },
  hit: { icon: ZapIcon, name: 'Hit Sales', color: 'from-orange-500 to-red-500', borderColor: 'border-orange-500' },
  premium: { icon: Crown, name: 'Premium', color: 'from-yellow-400 to-yellow-600', borderColor: 'border-yellow-400' }
};

const ACHIEVEMENTS = [
  { id: 'first_game', name: 'Pioneer', description: 'Played your first game', icon: '🚀', color: 'bg-blue-500' },
  { id: 'gamer_10', name: 'Gamer', description: 'Played 10 games', icon: '🎮', color: 'bg-green-500' },
  { id: 'pro_gamer', name: 'Pro Gamer', description: 'Played 50 games', icon: '🏆', color: 'bg-purple-500' },
  { id: 'xp_master', name: 'XP Master', description: 'Earned 5000 XP', icon: '⚡', color: 'bg-yellow-500' },
];

const ProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { 
    user, 
    updateUserProfile, 
    history, 
    unclaimedLevelRewards, 
    claimLevelReward,
    coins,
    gems,
    streak,
    plan,
    planExpiry
  } = useStore();
  
  const currentPlan = PLAN_CONFIG[plan];
  const isPlanExpired = planExpiry ? Date.now() > planExpiry : false;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName);
  const [username, setUsername] = useState(user.username || '');

  // Calculate XP progress
  const xpProgress = useMemo(() => {
    const currentLevelXp = user.xp % 1000;
    return (currentLevelXp / 1000) * 100;
  }, [user.xp]);

  const nextLevelXp = useMemo(() => {
    return 1000 - (user.xp % 1000);
  }, [user.xp]);

  const handleSave = () => {
    updateUserProfile({
      firstName,
      username
    });
    setIsEditing(false);
    WebApp.HapticFeedback.notificationOccurred('success');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateUserProfile({ photoUrl: base64String });
        WebApp.HapticFeedback.impactOccurred('medium');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClaimReward = (level: number) => {
    claimLevelReward(level);
    WebApp.HapticFeedback.notificationOccurred('success');
  };

  const recentGames = useMemo(() => {
    return [...(history || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [history]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative pb-24 overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed top-[-10%] right-[-10%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[10%] left-[-10%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Header Cover */}
      <div className="h-40 w-full bg-gradient-to-b from-primary/20 via-primary/5 to-transparent relative">
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)} 
            className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10"
          >
            <ArrowLeft size={20} />
          </motion.button>
          
          <h1 className="text-lg font-black tracking-tight uppercase">{t('profile', 'Profile')}</h1>

          {isEditing ? (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              className="bg-primary text-black font-black text-xs px-4 py-2 rounded-full shadow-[0_0_15px_rgba(255,215,0,0.3)]"
            >
              {t('save', 'SAVE')}
            </motion.button>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsEditing(true)}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-primary"
            >
              <Edit2 size={18} />
            </motion.button>
          )}
        </div>
      </div>

      <div className="px-4 -mt-16 relative z-10 flex flex-col gap-6">
        {/* Passport Style Info Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none -mr-20 -mt-20" />
          
          <div className="flex items-center gap-5 relative z-10">
            {/* Avatar Section */}
            <div className="relative group flex-shrink-0">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 rounded-2xl p-1 bg-gradient-to-tr from-primary via-blue-400 to-cyan-300 shadow-lg relative"
              >
                <div className="w-full h-full rounded-xl bg-[#111] overflow-hidden relative border border-white/10">
                  <img 
                    src={user.photoUrl || "https://img.freepik.com/premium-photo/3d-avatar-boy-character_914455-603.jpg"} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                  />
                  <AnimatePresence>
                    {isEditing && (
                      <motion.button 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer transition-colors z-20"
                      >
                        <Camera size={24} className="text-white drop-shadow-lg" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Level Badge - Absolute Positioned */}
                <div className="absolute -bottom-2 -right-2 bg-black/40 backdrop-blur-md border border-white/20 rounded-lg px-2 py-0.5 flex items-center gap-1 shadow-lg">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-black text-white">{user.level}</span>
                </div>
              </motion.div>
            </div>

            {/* User Details - Side by Side */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Name"
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-primary/50"
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-white/70 font-mono text-xs focus:outline-none focus:border-primary/50"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <motion.h2 
                    initial={{ x: 10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="text-2xl font-black text-white truncate"
                  >
                    {user.firstName}
                  </motion.h2>
                  <motion.p 
                    initial={{ x: 10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-primary font-mono text-xs opacity-80 truncate bg-primary/10 px-2 py-1 rounded-md w-fit"
                  >
                    @{user.username || 'pioneer'}
                  </motion.p>
                  
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5 bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20">
                      <Flame size={12} className="text-orange-500 fill-orange-500" />
                      <span className="text-[10px] font-bold text-orange-500">{streak} Days</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Plan Info (Compact) */}
          <div className="mt-6 pt-4 border-t border-white/5">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className={clsx("p-2 rounded-xl bg-gradient-to-br", currentPlan.color)}>
                   <currentPlan.icon size={16} className="text-white" />
                 </div>
                 <div>
                   <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Current Plan</div>
                   <div className="text-sm font-black text-white">{currentPlan.name}</div>
                 </div>
               </div>
               {plan === 'free' ? (
                 <button onClick={() => navigate('/shop')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-white transition-colors">
                   UPGRADE
                 </button>
               ) : (
                 <div className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-1 rounded-md">
                   ACTIVE
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Brain Profile Section */}
        <div className="w-full">
          <BrainProfile />
        </div>

        {/* Achievements Section */}
        <div className="w-full mt-6">
          <Achievements />
        </div>

        {/* Level Progress Card */}
        <div className="w-full max-w-sm bg-white/5 backdrop-blur-xl rounded-3xl p-5 border border-white/10 mb-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
          
          <div className="flex justify-between items-end mb-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Current Progress</span>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                <span className="text-xl font-black text-white">{user.xp % 1000} <span className="text-xs text-gray-500 font-normal">/ 1000 XP</span></span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Next Level</span>
              <span className="text-sm font-bold text-primary">{nextLevelXp} XP left</span>
            </div>
          </div>

          <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary via-orange-400 to-yellow-300 rounded-full shadow-[0_0_10px_rgba(255,215,0,0.3)]"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
          <StatCard icon={Coins} value={coins} label="Coins" color="text-yellow-400" />
          <StatCard icon={Diamond} value={gems} label="Gems" color="text-blue-400" />
          <StatCard icon={Star} value={user.xp} label="Total XP" color="text-purple-400" />
          <StatCard icon={LayoutGrid} value={(history || []).length} label="Games" color="text-green-400" />
        </div>

        {/* Achievements Section */}
        <div className="w-full max-w-sm mb-8">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-lg font-black flex items-center gap-2">
              <Award size={20} className="text-gray-400" />
              Achievements
            </h3>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              {(user.achievements || []).length} / {ACHIEVEMENTS.length}
            </span>
          </div>
          
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2">
            {ACHIEVEMENTS.map((achievement) => {
              const isUnlocked = (user.achievements || []).includes(achievement.id);
              return (
                <div 
                  key={achievement.id}
                  className={clsx(
                    "min-w-[100px] flex flex-col items-center p-4 rounded-3xl border transition-all duration-300",
                    isUnlocked 
                      ? "bg-white/5 border-white/10 opacity-100" 
                      : "bg-white/5 border-white/5 opacity-40 grayscale"
                  )}
                >
                  <div className={clsx(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 shadow-lg",
                    isUnlocked ? achievement.color : "bg-gray-800"
                  )}>
                    {achievement.icon}
                  </div>
                  <span className="text-[10px] font-black text-center leading-tight">{achievement.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Level Rewards (If any) */}
        <AnimatePresence>
          {(unclaimedLevelRewards || []).length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full max-w-sm mb-8"
            >
              <div className="bg-gradient-to-r from-primary to-orange-500 p-[1px] rounded-3xl overflow-hidden shadow-xl">
                <div className="bg-[#0f0f0f] p-5 rounded-[23px]">
                  <h3 className="text-white font-black mb-4 flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-xl">
                      <Gift size={20} className="text-primary" />
                    </div>
                    Level Up Rewards!
                  </h3>
                  <div className="space-y-3">
                    {unclaimedLevelRewards.map(level => (
                      <div key={level} className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <Award size={18} className="text-yellow-500" />
                          <span className="text-sm font-bold text-white">Level {level} Chest</span>
                        </div>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleClaimReward(level)}
                          className="px-4 py-2 bg-primary text-black text-xs font-black rounded-xl"
                        >
                          CLAIM
                        </motion.button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Activity */}
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-lg font-black flex items-center gap-2">
              <History size={20} className="text-gray-400" />
              Recent Activity
            </h3>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Last 5 Games</span>
          </div>
          
          <div className="space-y-3">
            {recentGames.length > 0 ? (
              recentGames.map((game, i) => (
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  key={game.timestamp}
                  className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      {getGameIcon(game.gameId)}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white capitalize">{game.gameId}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                        <Calendar size={10} />
                        {game.date}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-white">{game.score}</div>
                    <div className="text-[10px] text-primary font-bold">+{game.coinsEarned} coins</div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-white/5 rounded-3xl p-10 border border-white/5 border-dashed flex flex-col items-center justify-center text-gray-500">
                <Zap size={32} className="mb-2 opacity-20" />
                <p className="text-sm font-medium">No games played yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, value, label, color }: any) => (
  <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/5 flex flex-col items-center hover:bg-white/10 transition-all group">
    <div className={clsx("p-2 rounded-xl bg-white/5 mb-2 group-hover:scale-110 transition-transform", color)}>
      <Icon size={18} />
    </div>
    <span className="text-xl font-black text-white">{typeof value === 'number' ? value.toLocaleString() : value}</span>
    <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-0.5">{label}</span>
  </div>
);

const getGameIcon = (gameId: string) => {
  switch (gameId.toLowerCase()) {
    case 'math': return <Calculator size={20} />;
    case 'memory': return <LayoutGrid size={20} />;
    case 'schulte': return <Star size={20} />;
    case 'tetris': return <LayoutGrid size={20} />;
    case '2048': return <Zap size={20} />;
    default: return <Zap size={20} />;
  }
};

export default ProfilePage;
