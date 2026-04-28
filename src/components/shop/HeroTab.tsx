import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Gift, Zap, Shield, Clock, Check, Sparkles, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import WebApp from '@twa-dev/sdk';

export const HeroTab = () => {
  const { t } = useTranslation();
  const {
    dailyRewardStreak,
    claimDailyLoginReward,
    coins,
    gems,
    energy,
    maxEnergy,
    weeklyQuest,
    claimWeeklyQuestMilestone,
    streakProtection,
    buyStreakProtection,
    mysteryBoxAvailable,
    mysteryBoxPrice,
    openMysteryBox,
    updateEnergyRegen
  } = useStore();

  const [claimedReward, setClaimedReward] = useState(false);
  const [mysteryBoxResult, setMysteryBoxResult] = useState<any>(null);
  const [showMysteryBox, setShowMysteryBox] = useState(false);
  const safeWeeklyQuest = weeklyQuest ?? {
    gamesPlayed: 0,
    targetGames: 10,
    milestones: []
  };

  const today = new Date().toISOString().split('T')[0];
  const lastDailyRewardDate = dailyRewardStreak?.lastClaimDate || null;
  const canClaimDaily = lastDailyRewardDate !== today && !claimedReward;
  
  const streakDays = Array.from({ length: 14 }, (_, i) => i + 1);
  const getStreakDayStatus = (day: number) => {
    const count = dailyRewardStreak?.count || 0;
    if (day < count) return 'completed';
    if (day === count && canClaimDaily) return 'today';
    if (day === count && !canClaimDaily) return 'claimed';
    return 'locked';
  };
  
  const [mysteryBoxTimeLeft, setMysteryBoxTimeLeft] = useState(7200);
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setMysteryBoxTimeLeft(prev => Math.max(0, prev - 1));
        updateEnergyRegen();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [updateEnergyRegen]);

  const handleClaimDaily = () => {
    const result = claimDailyLoginReward();
    if (result.success) {
      setClaimedReward(true);
      WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  const handleOpenMysteryBox = () => {
    if (!mysteryBoxAvailable || coins < mysteryBoxPrice) return;

    const result = openMysteryBox();
    if (result) {
      setMysteryBoxResult(result);
      setShowMysteryBox(true);
      WebApp.HapticFeedback.impactOccurred('heavy');
      setTimeout(() => {
        WebApp.HapticFeedback.notificationOccurred('success');
      }, 1000);
    }
  };

  const handleClaimMilestone = (index: number) => {
    const success = claimWeeklyQuestMilestone(index);
    if (success) {
      WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  const handleBuyStreakProtection = () => {
    const success = buyStreakProtection();
    if (success) {
      WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'coins': return '🪙';
      case 'crystals': return '💎';
      case 'energy': return '⚡';
      case 'fec': return '💎';
      case 'skin': return '🎨';
      case 'booster': return '🚀';
      default: return '🎁';
    }
  };

  return (
    <div className="space-y-6">
      {/* Daily Streak Section */}
      <section className={clsx(
        "rounded-2xl p-5 border transition-all",
        "bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500 text-white">
              <Flame size={24} fill="currentColor" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100">
                {t('daily_streak', { count: dailyRewardStreak?.count || 0 })}
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                {t('streak_description')}
              </p>
            </div>
          </div>
          {(dailyRewardStreak?.count || 0) >= 7 && (
            <div className="px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-bold">
              🔥 {t('streak_master')}
            </div>
          )}
        </div>

        {/* 10-Day Calendar View */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {streakDays.map((day) => {
            const status = getStreakDayStatus(day);
            return (
              <div
                key={day}
                className={clsx(
                  "aspect-square rounded-lg flex items-center justify-center font-bold text-sm transition-all",
                  status === 'completed' && "bg-orange-500 text-white",
                  status === 'today' && "bg-gradient-to-br from-orange-400 to-red-500 text-white ring-2 ring-orange-300",
                  status === 'claimed' && "bg-orange-500/20 text-orange-700 dark:text-orange-300",
                  status === 'locked' && "bg-gray-200 dark:bg-gray-700 text-gray-400"
                )}
              >
                {status === 'completed' && <Check size={14} />}
                {status === 'today' && day}
                {status === 'claimed' && day}
                {status === 'locked' && <Lock size={14} />}
              </div>
            );
          })}
        </div>

        {canClaimDaily ? (
          <button
            onClick={handleClaimDaily}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-95 animate-pulse"
          >
            {t('claim_daily_reward')}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500/10 text-orange-700 dark:text-orange-300 font-bold">
            <Check size={20} />
            <span>{t('daily_reward_claimed')}</span>
          </div>
        )}
      </section>

      {/* Pending Rewards */}
      <section className={clsx(
        "rounded-2xl p-5 border",
        "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20"
      )}>
        <div className="flex items-center gap-2 mb-4">
          <Gift size={20} className="text-purple-600 dark:text-purple-400" />
          <h3 className="font-bold text-purple-900 dark:text-purple-100">
            {t('pending_rewards')}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-white/50 dark:bg-black/30 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🪙</span>
              <span className="font-bold text-lg text-purple-900 dark:text-purple-100">
                {coins}
              </span>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              {t('coins_available')}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/50 dark:bg-black/30 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">💎</span>
              <span className="font-bold text-lg text-purple-900 dark:text-purple-100">
                {gems}
              </span>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              {t('crystals_available')}
            </p>
          </div>

          <div className="col-span-2 p-3 rounded-xl bg-white/50 dark:bg-black/30 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-yellow-500" />
                <div>
                  <div className="font-bold text-lg text-purple-900 dark:text-purple-100">
                    {energy} / {maxEnergy}
                  </div>
                  <div className="h-2 w-32 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                      style={{ width: `${(energy / maxEnergy) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <span className="text-xs text-purple-700 dark:text-purple-300">
                {t('energy_status')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Limited Offer - Mystery Box */}
      {mysteryBoxAvailable && (
        <section className={clsx(
          "rounded-2xl p-5 border relative overflow-hidden",
          "bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20"
        )}>
          <div className="absolute top-0 right-0 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-bl-xl flex items-center gap-1">
            <Clock size={12} />
            {formatTime(mysteryBoxTimeLeft)}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={20} className="text-yellow-600 dark:text-yellow-400" />
            <h3 className="font-bold text-yellow-900 dark:text-yellow-100">
              {t('mystery_box_title')}
            </h3>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="text-6xl animate-bounce">
              🎁
            </div>
            <div className="flex-1">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                {t('mystery_box_description')}
              </p>
              <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300">
                <span>🪙 {mysteryBoxPrice}</span>
                <span>•</span>
                <span>⏰ {t('limited_time')}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenMysteryBox}
            disabled={coins < mysteryBoxPrice}
            className={clsx(
              "w-full py-3 rounded-xl font-bold text-lg transition-all active:scale-95",
              coins >= mysteryBoxPrice
                ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50"
                : "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
            )}
          >
            {t('open_mystery_box')}
          </button>
        </section>
      )}

      {/* Weekly Quest Progress */}
      <section className={clsx(
        "rounded-2xl p-5 border",
        "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-blue-900 dark:text-blue-100">
              {t('weekly_quest')}
            </h3>
          </div>
          <div className="text-sm font-bold text-blue-700 dark:text-blue-300">
            {safeWeeklyQuest.gamesPlayed} / {safeWeeklyQuest.targetGames}
          </div>
        </div>

        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 transition-all duration-500"
            style={{ width: `${(safeWeeklyQuest.gamesPlayed / Math.max(safeWeeklyQuest.targetGames, 1)) * 100}%` }}
          />
        </div>

        <div className="space-y-2">
          {safeWeeklyQuest.milestones.map((milestone, index) => {
            const isUnlocked = safeWeeklyQuest.gamesPlayed >= milestone.gamesRequired;
            const isClaimed = milestone.isClaimed;
            const isNext = index === 0 || (index > 0 && safeWeeklyQuest.milestones[index - 1].isClaimed);

            return (
              <div
                key={index}
                className={clsx(
                  "flex items-center justify-between p-3 rounded-xl border transition-all",
                  isUnlocked && !isClaimed && isNext
                    ? "bg-blue-500/10 border-blue-500/30 ring-2 ring-blue-300"
                    : isUnlocked && !isClaimed
                    ? "bg-blue-500/10 border-blue-500/30"
                    : isClaimed
                    ? "bg-green-500/10 border-green-500/30 opacity-60"
                    : "bg-gray-500/5 border-gray-500/20 opacity-40"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    isUnlocked && !isClaimed
                      ? "bg-blue-500 text-white"
                      : isClaimed
                      ? "bg-green-500 text-white"
                      : "bg-gray-400 text-white"
                  )}>
                    {isClaimed ? <Check size={16} /> : index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-blue-900 dark:text-blue-100 text-sm">
                      {milestone.gamesRequired} {t('games')}
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                      {milestone.reward.coins > 0 && <span>🪙 {milestone.reward.coins}</span>}
                      {milestone.reward.crystals > 0 && <span>💎 {milestone.reward.crystals}</span>}
                      {milestone.reward.energy > 0 && <span>⚡ {milestone.reward.energy}</span>}
                    </div>
                  </div>
                </div>

                {isUnlocked && !isClaimed && (
                  <button
                    onClick={() => handleClaimMilestone(index)}
                    className={clsx(
                      "px-4 py-2 rounded-lg text-white font-bold text-sm transition-all",
                      isNext ? "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30" : "bg-blue-400 hover:bg-blue-500"
                    )}
                  >
                    {t('claim_reward')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Streak Protection */}
      <section className={clsx(
        "rounded-2xl p-5 border",
        "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20"
      )}>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={20} className="text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-bold text-emerald-900 dark:text-emerald-100">
            {t('streak_protection')}
          </h3>
        </div>

        {streakProtection > 0 ? (
          <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <Shield size={24} className="text-emerald-600 dark:text-emerald-400" />
            <div>
              <div className="font-bold text-lg text-emerald-900 dark:text-emerald-100">
                {streakProtection}x {t('protection_available')}
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                {t('auto_applied')}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-emerald-800 dark:text-emerald-200">
              {t('streak_protection_description')}
            </p>
            <button
              onClick={handleBuyStreakProtection}
              disabled={coins < 200}
              className={clsx(
                "w-full py-3 rounded-xl font-bold transition-all active:scale-95",
                coins >= 200
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
                  : "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
              )}
            >
              {t('buy_streak_protection')} (200 🪙)
            </button>
          </div>
        )}
      </section>

      {/* Mystery Box Result Modal */}
      {showMysteryBox && mysteryBoxResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={clsx(
            "max-w-sm w-full rounded-2xl p-6 text-center",
            "bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/90 dark:to-orange-900/90 border border-yellow-500/30"
          )}>
            <div className="text-6xl mb-4 animate-bounce">
              {getRewardIcon(mysteryBoxResult.type)}
            </div>
            <h2 className="text-2xl font-black text-yellow-900 dark:text-yellow-100 mb-2">
              {t('congratulations')}
            </h2>
            <p className="text-lg text-yellow-800 dark:text-yellow-200 mb-4">
              {t('you_found')}
            </p>
            <div className="p-4 rounded-xl bg-white/50 dark:bg-black/30 border border-yellow-500/30 mb-6">
              <div className="text-3xl font-black text-yellow-600 dark:text-yellow-400">
                {mysteryBoxResult.amount}
              </div>
              <div className="text-sm text-yellow-800 dark:text-yellow-200 capitalize">
                {t(mysteryBoxResult.type)}
              </div>
            </div>
            <button
              onClick={() => setShowMysteryBox(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-lg shadow-lg hover:shadow-yellow-500/50 transition-all active:scale-95"
            >
              {t('claim_reward')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
