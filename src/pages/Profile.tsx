import { useState, useRef, useMemo, lazy, Suspense, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, Edit2, Gift,
  Coins, Diamond, Zap, History, Star,
  Award, TrendingUp, Calendar, LayoutGrid,
  Flame, Shield, Crown, Zap as ZapIcon, Calculator, Target, Lock,
  BarChart3, Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { buildVipAnalyticsSnapshot, useStore } from '../store/useStoreImpl';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import WebApp from '@twa-dev/sdk';
import { Achievements } from '../components/Achievements';
import { Web3Section } from '../components/Web3Section';
import { ReferralCard } from '../components/ReferralCard';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { usePlanGate } from '../hooks/usePlanGate';
import { VipAnalyticsLockedCard, VipAnalyticsPanel } from '../components/analytics/VipAnalyticsContent';
import ProfileClaude from './ProfileClaude';
import { getProfileAvatarImage, PROFILE_AVATARS, ProfileAvatar } from '../constants/avatars';

// Lazy load BrainProfile to split recharts dependency
const BrainProfile = lazy(() => import('../components/BrainProfile').then(m => ({ default: m.BrainProfile })));

const PLAN_CONFIG = {
  free: { icon: Star, name: 'Free', color: 'from-gray-500 to-gray-600', borderColor: 'border-gray-500' },
  silver: { icon: Shield, name: 'Silver', color: 'from-blue-500 to-blue-600', borderColor: 'border-blue-500' },
  gold: { icon: ZapIcon, name: 'Gold', color: 'from-orange-500 to-red-500', borderColor: 'border-orange-500' },
  basic: { icon: Shield, name: 'Basic', color: 'from-sky-500 to-cyan-600', borderColor: 'border-sky-500' },
  pro: { icon: ZapIcon, name: 'Pro', color: 'from-fuchsia-500 to-purple-600', borderColor: 'border-fuchsia-500' },
  premium: { icon: Crown, name: 'Premium', color: 'from-yellow-400 to-yellow-600', borderColor: 'border-yellow-400' }
};

const ACHIEVEMENTS = [
  { id: 'first_game', name: 'Pioneer', description: 'Played your first game', icon: '🚀', color: 'bg-blue-500' },
  { id: 'gamer_10', name: 'Gamer', description: 'Played 10 games', icon: '🎮', color: 'bg-green-500' },
  { id: 'pro_gamer', name: 'Pro Gamer', description: 'Played 50 games', icon: '🏆', color: 'bg-purple-500' },
  { id: 'xp_master', name: 'XP Master', description: 'Earned 5000 XP', icon: '⚡', color: 'bg-yellow-500' },
];

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;

// Theme switcher — keeps the dark / light / blue / gold markup unchanged
// in LegacyProfilePage and routes the Claude theme to the editorial layout.
const ProfilePage = () => {
  const styles = useThemeStyles();
  return styles.isClaude ? <ProfileClaude /> : <LegacyProfilePage />;
};

const LegacyProfilePage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { 
    user, 
    updateUserProfile, 
    skinInventory,
    activeSkin,
    equipSkin,
    history, 
    brainStats,
    unclaimedLevelRewards, 
    claimLevelReward,
    coins,
    gems,
    streak,
    plan,
    planExpiry,
    canUseAvatar,
    loadAvatarImage,
    saveAvatarImage
  } = useStore();

  const styles = useThemeStyles();
  const { bgClass, textPrimary, textSecondary, panelClass } = styles;
  
  const currentPlan = PLAN_CONFIG[plan];
  const isPlanExpired = planExpiry ? Date.now() > planExpiry : false;
  const locale = i18n.language === 'ru' || i18n.language === 'kz' ? i18n.language : 'en';
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'analytics'>('profile');
  const [firstName, setFirstName] = useState(user.firstName);
  const [username, setUsername] = useState(user.username || '');
  const profileInitial = (user.firstName?.trim()?.[0] || user.username?.trim()?.[0] || 'U').toUpperCase();
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  useEffect(() => {
    loadAvatarImage();
  }, []);

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
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      WebApp.showAlert(t('select_only_image'));
      event.target.value = '';
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      WebApp.showAlert(t('image_size_limit'));
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      await saveAvatarImage(base64String);
      updateUserProfile({ photoUrl: base64String });
      WebApp.HapticFeedback.impactOccurred('medium');
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleClaimReward = (level: number) => {
    claimLevelReward(level);
    WebApp.HapticFeedback.notificationOccurred('success');
  };

  const recentGames = useMemo(() => {
    return [...(history || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [history]);

  const selectedAvatarPreset = useMemo(
    () => PROFILE_AVATARS.find((avatar) => avatar.id === activeSkin) || PROFILE_AVATARS[0],
    [activeSkin]
  );

  const profileAvatarSrc = user.photoUrl || getProfileAvatarImage(selectedAvatarPreset);

  const vipAnalytics = useMemo(() => {
    return buildVipAnalyticsSnapshot(history || [], brainStats);
  }, [brainStats, history]);

  const availableAvatars = useMemo(() => PROFILE_AVATARS, []);

  // Server-canonical VIP check. The local `plan` from the store is still
  // used for badges / tier display (cosmetic), but unlocking actual VIP
  // content is gated on what /users/me says, with local fallback.
  const { isPremiumActive } = usePlanGate();
  const isVipAnalyticsUnlocked =
    isPremiumActive === true || ((plan === 'pro' || plan === 'premium') && !isPlanExpired);

  const handleUnlockVipAnalytics = () => {
    WebApp.HapticFeedback.impactOccurred('medium');
    navigate('/shop');
  };

  const handleAvatarUploadClick = () => {
    setShowAvatarSelector(false);
    fileInputRef.current?.click();
  };

  const handleAvatarSelect = async (avatar: ProfileAvatar) => {
    if (!canUseAvatar(avatar.id)) {
      WebApp.showAlert(t('avatar_premium_required'));
      return;
    }

    const avatarImage = getProfileAvatarImage(avatar);
    equipSkin(avatar.id);
    await saveAvatarImage(avatarImage);
    updateUserProfile({ photoUrl: avatarImage });
    setShowAvatarSelector(false);
    WebApp.HapticFeedback.notificationOccurred('success');
  };

  const getAvatarDisplay = (avatar: ProfileAvatar) => {
    if (avatar.imageUrl) {
      return <img src={avatar.imageUrl} alt={avatar.name.en} className="w-full h-full object-contain" />;
    }
    if (avatar.emoji) {
      return <span className="text-3xl">{avatar.emoji}</span>;
    }
    return <span className="text-3xl">✨</span>;
  };

  return (
    <div className={clsx("min-h-screen relative pb-24 overflow-x-hidden transition-colors duration-500", bgClass)}>
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
            className={clsx("p-2.5 rounded-full backdrop-blur-md border transition-colors", styles.isLight ? "bg-white/80 border-gray-200" : "bg-black/40 border-white/10")}
          >
            <ArrowLeft size={20} className={textPrimary} />
          </motion.button>
          
          <h1 className={clsx("text-lg font-black tracking-tight uppercase", textPrimary)}>{t('profile', 'Profile')}</h1>

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
              className={clsx("p-2.5 rounded-full backdrop-blur-md border transition-colors text-primary", styles.isLight ? "bg-white/80 border-gray-200" : "bg-black/40 border-white/10")}
            >
              <Edit2 size={18} />
            </motion.button>
          )}
        </div>
      </div>

      <div className="px-4 -mt-16 relative z-10 flex flex-col gap-6">
        {/* Passport Style Info Card */}
        <div className={clsx(
          "rounded-[32px] p-6 border shadow-2xl relative overflow-hidden transition-colors duration-500",
          panelClass,
          isVipAnalyticsUnlocked ? "ring-2 ring-yellow-400/40 border-yellow-400/40" : ""
        )}>
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
                  {profileAvatarSrc ? (
                    <img
                      src={profileAvatarSrc}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-black text-3xl font-black text-white">
                      {profileInitial}
                    </div>
                  )}
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
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAvatarSelector((prev) => !prev)}
                      className={clsx("inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black", styles.btnSecondary)}
                    >
                      <LayoutGrid size={14} />
                      {showAvatarSelector ? t('hide_avatar_choices', 'Hide avatars') : t('choose_avatar', 'Choose avatar')}
                    </button>
                    <button
                      type="button"
                      onClick={handleAvatarUploadClick}
                      className={clsx("inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black", styles.btnSecondary)}
                    >
                      <Camera size={14} />
                      {user.photoUrl ? t('change_photo') : t('upload_photo')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <motion.h2 
                    initial={{ x: 10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className={clsx("text-2xl font-black truncate", textPrimary)}
                  >
                    {user.firstName}
                  </motion.h2>
                  <motion.p 
                    initial={{ x: 10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className={clsx("font-mono text-xs opacity-80 truncate px-2 py-1 rounded-md w-fit bg-black/5 dark:bg-white/10", textSecondary)}
                  >
                    @{user.username || 'pioneer'}
                  </motion.p>
                  
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border bg-black/5 border-black/10 dark:bg-white/5 dark:border-white/10">
                      <span className={clsx("text-[10px] font-bold", textPrimary)}>ID: {user.gameId || '17096844'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20">
                      <Flame size={12} className="text-orange-500 fill-orange-500" />
                      <span className="text-[10px] font-bold text-orange-500">{streak} Days</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAvatarSelector((prev) => !prev)}
                      className={clsx("inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black", styles.btnSecondary)}
                    >
                      <LayoutGrid size={14} />
                      {showAvatarSelector ? t('hide_avatar_choices', 'Hide avatars') : t('choose_avatar', 'Choose avatar')}
                    </button>
                    <button
                      type="button"
                      onClick={handleAvatarUploadClick}
                      className={clsx("inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black", styles.btnSecondary)}
                    >
                      <Camera size={14} />
                      {user.photoUrl ? t('change_photo') : t('upload_photo')}
                    </button>
                    {activeSkin !== 'default' ? (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-black text-emerald-500">
                        <LayoutGrid size={14} />
                        {i18n.language === 'kz' ? 'Белсенді стикер:' : i18n.language === 'ru' ? 'Активный аватар:' : 'Active Avatar:'} {PROFILE_AVATARS.find((sticker) => sticker.id === activeSkin)?.name[locale] || activeSkin}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showAvatarSelector && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className={clsx("mt-5 rounded-[28px] border p-4", panelClass)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className={clsx("text-sm font-black", textPrimary)}>{t('choose_avatar', 'Choose avatar')}</div>
                    <div className={clsx("mt-1 text-xs", textSecondary)}>
                      {t('avatar_picker_desc', 'Pick a ready avatar for your profile or keep your uploaded photo')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAvatarSelector(false)}
                    className={clsx("rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest", styles.btnSecondary)}
                  >
                    {t('close', 'Close')}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {availableAvatars.map((avatar) => {
                    const canUse = canUseAvatar(avatar.id);
                    const isSelected = activeSkin === avatar.id;

                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => handleAvatarSelect(avatar)}
                        disabled={!canUse}
                        className={clsx(
                          "rounded-2xl border p-3 text-left transition-all",
                          panelClass,
                          isSelected && "border-emerald-500 bg-emerald-500/10",
                          !canUse && "opacity-50"
                        )}
                      >
                        <div className="relative mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-black/10">
                          {getAvatarDisplay(avatar)}
                          {avatar.isPremium ? (
                            <div className="absolute right-1 top-1">
                              <Crown size={12} className="text-amber-400" />
                            </div>
                          ) : null}
                        </div>
                        <div className={clsx("mt-3 text-center text-[11px] font-black leading-tight", textPrimary)}>
                          {avatar.name[locale] || avatar.name.en}
                        </div>
                        <div className={clsx("mt-1 text-center text-[9px]", textSecondary)}>
                          {isSelected
                            ? t('profile_sticker_selected')
                            : !canUse
                            ? t('avatar_unlock')
                            : t('tap_to_select', 'Tap to select')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Plan Info (Compact) */}
          <div className="mt-6 pt-4 border-t border-gray-500/20">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className={clsx("p-2 rounded-xl bg-gradient-to-br", currentPlan.color)}>
                   <currentPlan.icon size={16} className="text-white" />
                 </div>
                 <div>
                   <div className={clsx("text-[10px] font-bold uppercase tracking-wider", textSecondary)}>Current Plan</div>
                   <div className={clsx("text-sm font-black", textPrimary)}>{currentPlan.name}</div>
                 </div>
               </div>
               <div className="flex items-center gap-2">
                 {isVipAnalyticsUnlocked ? (
                   <div className="text-[10px] font-mono px-2 py-1 rounded-md bg-amber-500/15 text-amber-400">
                     GOLD BORDER
                   </div>
                 ) : null}
                 <button
                   onClick={() => navigate(isVipAnalyticsUnlocked ? '/analytics' : '/shop')}
                   className={clsx("px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors", styles.btnSecondary)}
                 >
                   {isVipAnalyticsUnlocked ? 'ANALYTICS' : 'UPGRADE'}
                 </button>
               </div>
             </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/analytics')}
          className={clsx("w-full rounded-[28px] border p-5 flex items-center justify-between text-left", panelClass)}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-400">
              <BarChart3 size={20} />
            </div>
            <div>
              <div className={clsx("text-sm font-black", textPrimary)}>{t('profile_analytics_title')}</div>
              <div className={clsx("text-xs mt-1", textSecondary)}>
                {isVipAnalyticsUnlocked ? t('profile_analytics_unlocked') : t('profile_analytics_locked')}
              </div>
            </div>
          </div>
          <div className={clsx("text-xs font-black uppercase tracking-widest", styles.textAccent)}>
            Open
          </div>
        </button>

        <div className={clsx("p-1.5 rounded-2xl border flex gap-2", panelClass)}>
          <ProfileSectionTab
            isActive={activeSection === 'profile'}
            onClick={() => setActiveSection('profile')}
            label="Profile"
            icon={<Star size={16} />}
            styles={styles}
          />
          <ProfileSectionTab
            isActive={activeSection === 'analytics'}
            onClick={() => setActiveSection('analytics')}
            label="Analytics"
            icon={<TrendingUp size={16} />}
            styles={styles}
          />
        </div>

        {activeSection === 'profile' ? (
          <>
            {/* Brain Profile Section */}
            <div className="w-full mt-2">
              <Suspense fallback={<div className="h-[250px] w-full flex items-center justify-center"><div className="w-8 h-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /></div>}>
                <BrainProfile />
              </Suspense>
            </div>

            {/* Achievements Section */}
            <div className="w-full mt-6">
              <Achievements />
            </div>

            {/* Web3 Section — Wallet, $FOCUS jetton, NFT trophies */}
            <div className="w-full mt-6">
              <Web3Section />
            </div>

            {/* Referral — invite friend → both earn $FOCUS */}
            <div className="w-full mt-6">
              <ReferralCard />
            </div>

            {/* Level Progress Card */}
            <div className={clsx("w-full max-w-sm rounded-3xl p-5 border mb-6 relative overflow-hidden group transition-colors duration-500", panelClass)}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
              
              <div className="flex justify-between items-end mb-3">
                <div className="flex flex-col">
                  <span className={clsx("text-[10px] font-black uppercase tracking-widest mb-1", textSecondary)}>Current Progress</span>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className={styles.textAccent} />
                    <span className={clsx("text-xl font-black", textPrimary)}>{user.xp % 1000} <span className={clsx("text-xs font-normal", textSecondary)}>/ 1000 XP</span></span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={clsx("text-[10px] font-black uppercase tracking-widest block mb-1", textSecondary)}>Next Level</span>
                  <span className={clsx("text-sm font-bold", styles.textAccent)}>{nextLevelXp} XP left</span>
                </div>
              </div>

              <div className="h-3 w-full bg-gray-500/20 rounded-full overflow-hidden p-0.5">
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
              <StatCard icon={Coins} value={coins} label="Coins" color="text-yellow-500" styles={styles} />
              <StatCard icon={Diamond} value={gems} label="Gems" color="text-blue-500" styles={styles} />
              <StatCard icon={Star} value={user.xp} label="Total XP" color="text-purple-500" styles={styles} />
              <StatCard icon={LayoutGrid} value={(history || []).length} label="Games" color="text-green-500" styles={styles} />
            </div>

            <div className="w-full max-w-sm mb-8">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className={clsx("text-lg font-black flex items-center gap-2", textPrimary)}>
                  <LayoutGrid size={20} className={textSecondary} />
                  {t('profile_sticker_collection')}
                </h3>
                <span className={clsx("text-[10px] font-black uppercase tracking-widest", textSecondary)}>
                  {PROFILE_AVATARS.length}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {availableAvatars.map((avatar) => {
                  const isSelected = activeSkin === avatar.id;
                  const isPremiumAvatar = avatar.isPremium;
                  const canUse = canUseAvatar(avatar.id);

                  return (
                    <div
                      key={avatar.id}
                      className={clsx(
                        "rounded-3xl border p-4 transition-all duration-300",
                        panelClass,
                        isSelected && "border-emerald-500 bg-emerald-500/10",
                        isPremiumAvatar && !canUse && "opacity-50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="relative">
                          <div className={clsx(
                            "flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner overflow-hidden",
                            avatar.previewClass || "bg-gradient-to-br from-primary/10 to-primary/5"
                          )}>
                            {getAvatarDisplay(avatar)}
                          </div>
                          {isPremiumAvatar && (
                            <div className="absolute -top-1 -right-1">
                              <Sparkles size={12} className="text-amber-400 fill-amber-400" />
                            </div>
                          )}
                        </div>
                        {isSelected ? (
                          <span className="rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                            {t('profile_sticker_selected')}
                          </span>
                        ) : isPremiumAvatar && !canUse ? (
                          <Crown size={16} className="text-amber-400" />
                        ) : null}
                      </div>

                      <div className="mt-3">
                        <div className={clsx("text-sm font-black", textPrimary)}>{avatar.name[locale] || avatar.name.en}</div>
                        <div className={clsx("mt-1 text-xs", textSecondary)}>
                          {isPremiumAvatar && !canUse ? t('avatar_premium') : t('profile_sticker_desc')}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAvatarSelect(avatar)}
                        disabled={!canUse || isSelected}
                        className={clsx(
                          "mt-4 w-full rounded-xl px-3 py-2 text-xs font-black transition-colors flex items-center justify-center gap-1.5",
                          isSelected 
                            ? "bg-emerald-600 text-white cursor-default"
                            : isPremiumAvatar && !canUse
                            ? "bg-gray-500/20 text-gray-400 cursor-not-allowed"
                            : styles.btnSecondary
                        )}
                      >
                        {isSelected ? t('equipped') : isPremiumAvatar && !canUse ? (
                          <>
                            <Crown size={12} />
                            {t('avatar_unlock')}
                          </>
                        ) : t('equip')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Achievements Section */}
            <div className="w-full max-w-sm mb-8">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className={clsx("text-lg font-black flex items-center gap-2", textPrimary)}>
                  <Award size={20} className={textSecondary} />
                  Achievements
                </h3>
                <span className={clsx("text-[10px] font-black uppercase tracking-widest", textSecondary)}>
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
                          ? clsx(panelClass, "opacity-100") 
                          : clsx(panelClass, "opacity-40 grayscale")
                      )}
                    >
                      <div className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 shadow-lg",
                        isUnlocked ? achievement.color : "bg-gray-500/20"
                      )}>
                        {achievement.icon}
                      </div>
                      <span className={clsx("text-[10px] font-black text-center leading-tight", textPrimary)}>{achievement.name}</span>
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
                <h3 className={clsx("text-lg font-black flex items-center gap-2", textPrimary)}>
                  <History size={20} className={textSecondary} />
                  Recent Activity
                </h3>
                <span className={clsx("text-[10px] font-black uppercase tracking-widest", textSecondary)}>Last 5 Games</span>
              </div>
              
              <div className="space-y-3">
                {recentGames.length > 0 ? (
                  recentGames.map((game, i) => (
                    <motion.div 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      key={game.timestamp}
                      className={clsx("p-4 rounded-2xl border flex items-center justify-between group hover:scale-[1.02] transition-all duration-300", panelClass)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                          {getGameIcon(game.gameId)}
                        </div>
                        <div>
                          <div className={clsx("font-bold text-sm capitalize", textPrimary)}>{formatGameName(game.gameId)}</div>
                          <div className={clsx("flex items-center gap-1.5 text-[10px] font-medium", textSecondary)}>
                            <Calendar size={10} />
                            {game.date}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={clsx("text-sm font-black", textPrimary)}>{game.score}</div>
                        <div className={clsx("text-[10px] font-bold", styles.textAccent)}>+{game.coinsEarned} coins</div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className={clsx("rounded-3xl p-10 border border-dashed flex flex-col items-center justify-center", panelClass, textSecondary)}>
                    <Zap size={32} className="mb-2 opacity-20" />
                    <p className="text-sm font-medium">No games played yet</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : isVipAnalyticsUnlocked ? (
          <VipAnalyticsPanel analytics={vipAnalytics} styles={styles} />
        ) : (
          <VipAnalyticsLockedCard
            styles={styles}
            onUnlock={handleUnlockVipAnalytics}
            isPlanExpired={isPlanExpired}
          />
        )}
      </div>

    </div>
  );
};

const ProfileSectionTab = ({ isActive, onClick, label, icon, styles }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      "flex-1 rounded-xl px-4 py-3 text-sm font-black transition-all flex items-center justify-center gap-2",
      isActive
        ? clsx("text-black shadow-lg", styles.isGold ? "bg-gradient-to-r from-amber-400 to-yellow-500" : "bg-primary")
        : clsx(styles.textSecondary, "bg-black/5 dark:bg-white/5")
    )}
  >
    {icon}
    {label}
  </button>
);

const StatCard = ({ icon: Icon, value, label, color, styles }: any) => (
  <div className={clsx("p-4 rounded-3xl border flex flex-col items-center hover:scale-105 transition-all group duration-300", styles.panelClass)}>
    <div className={clsx("p-2 rounded-xl mb-2 group-hover:scale-110 transition-transform bg-black/5 dark:bg-white/5", color)}>
      <Icon size={18} />
    </div>
    <span className={clsx("text-xl font-black", styles.textPrimary)}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
    <span className={clsx("text-[9px] uppercase font-black tracking-widest mt-0.5", styles.textSecondary)}>{label}</span>
  </div>
);

const getGameIcon = (gameId: string) => {
  switch (gameId.toLowerCase()) {
    case 'math': return <Calculator size={20} />;
    case 'memory': return <LayoutGrid size={20} />;
    case 'schulte': return <Star size={20} />;
    case 'code_breaker': return <Lock size={20} />;
    case 'tetris': return <LayoutGrid size={20} />;
    case '2048': return <Zap size={20} />;
    default: return <Zap size={20} />;
  }
};

const formatGameName = (gameId: string) => {
  switch (gameId.toLowerCase()) {
    case 'odd_one_out':
      return 'Odd One Out';
    default:
      return gameId.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
};

export default ProfilePage;
