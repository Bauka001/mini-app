import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, BrainCircuit, CalendarDays, Check, Crown, Lock, Users, X } from 'lucide-react';
import { useStore } from '../store/useStoreImpl';
import { clsx } from 'clsx';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { claudeTokens } from './ui/claudeTokens';

type AnalyticsClaimReward = {
  coins: number;
  gems: number;
  xp: number;
  analyticsDay: number;
  analyticsTitle: string;
  analyticsDescription: string;
  nextUnlockDay: number | null;
  isNewUnlock: boolean;
  streakPreservedByVip: boolean;
};

const ANALYTICS_REWARD_STEPS = [
  { day: 1, title: 'Ертеңгі нәтиже', description: 'Ертеңгі нәтижені көре аласыз', icon: CalendarDays },
  { day: 7, title: 'Апталық график', description: 'Апталық график ашылады', icon: BarChart3 },
  { day: 14, title: 'Орташа білім баласы', description: 'Орташа білім баласын көре аласыз', icon: BrainCircuit },
  { day: 30, title: 'Қоғамдық салыстырма', description: 'Айдан көпшілік салыстырма ашылады', icon: Users },
] as const;

export const DailyRewardModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { lastDailyRewardDate, dailyRewardStreak, claimDailyLoginReward, plan, planExpiry } = useStore();
  const { isClaude } = useThemeStyles();
  const [claimedReward, setClaimedReward] = useState<AnalyticsClaimReward | null>(null);

  const handleClaim = async () => {
    const result = claimDailyLoginReward();
    if (result.success) {
      setClaimedReward(result.reward as AnalyticsClaimReward);
      setTimeout(() => {
        setClaimedReward(null);
        onClose();
      }, 2500);
    }
  };

  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];
  const isVipActive = plan === 'premium' && (!planExpiry || planExpiry > Date.now());
  const isClaimedToday = lastDailyRewardDate === today;
  const canUseVipGrace = !isClaimedToday && isVipActive && lastDailyRewardDate === twoDaysAgo;
  const previewStreak = isClaimedToday
    ? dailyRewardStreak
    : lastDailyRewardDate === yesterday || canUseVipGrace
      ? dailyRewardStreak + 1
      : 1;
  const unlockedDays = isClaimedToday ? dailyRewardStreak : Math.max(dailyRewardStreak, 0);
  const nextMilestone = ANALYTICS_REWARD_STEPS.find((step) => step.day > unlockedDays) || null;
  const currentFocusDay =
    !isClaimedToday && ANALYTICS_REWARD_STEPS.some((step) => step.day === previewStreak)
      ? previewStreak
      : nextMilestone?.day || ANALYTICS_REWARD_STEPS[ANALYTICS_REWARD_STEPS.length - 1].day;

  const streakMessage = canUseVipGrace
    ? 'VIP мәртебесі бір күн кешіккен серияны сақтап тұр'
    : isClaimedToday
      ? 'Бүгінгі аналитика прогресі тіркелді'
      : 'Серия үзілсе, free қолданушы үшін прогресс 1-күннен қайта басталады';

  if (isClaude) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(31,30,29,0.55)', backdropFilter: 'blur(6px)' }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: claudeTokens.surface,
              border: `1px solid ${claudeTokens.border}`,
              maxHeight: '85vh',
            }}
          >
            {/* Header */}
            <header
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: `1px solid ${claudeTokens.border}` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: claudeTokens.accentSoft, color: claudeTokens.accent }}
                >
                  <CalendarDays size={18} strokeWidth={1.75} />
                </div>
                <h2
                  className="leading-tight"
                  style={{
                    color: claudeTokens.textPrimary,
                    fontFamily: claudeTokens.serifStack,
                    fontSize: '20px',
                    fontWeight: 500,
                  }}
                >
                  Daily analytics
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[#F0EEE6]"
                style={{ color: claudeTokens.textMuted }}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </header>

            <div className="overflow-y-auto px-6 py-5">
              <p className="text-[14px] leading-relaxed" style={{ color: claudeTokens.textBody }}>
                Күнделікті кіру арқылы аналитика бөлімінің жаңа қабаттарын ашыңыз.
              </p>

              {/* Streak panel */}
              <div
                className="mt-5 rounded-xl p-4"
                style={{
                  backgroundColor: claudeTokens.surfaceMuted,
                  border: `1px solid ${claudeTokens.border}`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className="text-[10px] font-medium uppercase tracking-[0.22em]"
                      style={{ color: claudeTokens.textMuted }}
                    >
                      Current streak
                    </span>
                    <div
                      className="mt-1 tabular-nums"
                      style={{
                        color: claudeTokens.textPrimary,
                        fontFamily: claudeTokens.serifStack,
                        fontSize: '28px',
                        fontWeight: 500,
                        fontFeatureSettings: '"lnum","tnum"',
                        lineHeight: 1,
                      }}
                    >
                      {dailyRewardStreak}
                      <span className="text-[14px] ml-1" style={{ color: claudeTokens.textMuted }}>
                        days
                      </span>
                    </div>
                  </div>
                  {isVipActive && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]"
                      style={{
                        color: claudeTokens.accent,
                        border: `1px solid ${claudeTokens.accent}`,
                        fontFamily: claudeTokens.serifStack,
                      }}
                    >
                      <Crown size={11} strokeWidth={1.75} />
                      VIP grace
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[13px]" style={{ color: claudeTokens.textBody }}>
                  {streakMessage}
                </p>
                {!isClaimedToday && nextMilestone && (
                  <p
                    className="mt-2 text-[11px] italic"
                    style={{ color: claudeTokens.accent, fontFamily: claudeTokens.serifStack }}
                  >
                    Next unlock: day {nextMilestone.day} · {nextMilestone.title.toLowerCase()}
                  </p>
                )}
              </div>

              {/* Milestone list */}
              <div className="mt-4 space-y-2">
                {ANALYTICS_REWARD_STEPS.map((step) => {
                  const Icon = step.icon;
                  const isUnlocked = unlockedDays >= step.day;
                  const isActive = !isUnlocked && currentFocusDay === step.day;

                  return (
                    <div
                      key={step.day}
                      className="rounded-xl p-3.5 flex items-start gap-3"
                      style={{
                        backgroundColor: claudeTokens.surface,
                        border: `1px solid ${
                          isActive ? claudeTokens.accent : isUnlocked ? claudeTokens.success : claudeTokens.border
                        }`,
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: claudeTokens.surfaceMuted,
                          border: `1px solid ${claudeTokens.border}`,
                          color: isActive
                            ? claudeTokens.accent
                            : isUnlocked
                              ? claudeTokens.success
                              : claudeTokens.textMuted,
                        }}
                      >
                        {isUnlocked ? <Check size={18} strokeWidth={2} /> : <Icon size={18} strokeWidth={1.75} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className="text-[10px] uppercase tracking-[0.22em]"
                            style={{
                              color: isActive
                                ? claudeTokens.accent
                                : isUnlocked
                                  ? claudeTokens.success
                                  : claudeTokens.textMuted,
                              fontFamily: claudeTokens.serifStack,
                            }}
                          >
                            Day {step.day}
                          </span>
                          {isUnlocked ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] italic"
                              style={{ color: claudeTokens.success, fontFamily: claudeTokens.serifStack }}
                            >
                              <Check size={10} strokeWidth={2} />
                              Open
                            </span>
                          ) : isActive ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] italic"
                              style={{ color: claudeTokens.accent, fontFamily: claudeTokens.serifStack }}
                            >
                              <Lock size={10} strokeWidth={1.75} />
                              Next
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em]"
                              style={{ color: claudeTokens.textMuted }}
                            >
                              <Lock size={10} strokeWidth={1.75} />
                              Locked
                            </span>
                          )}
                        </div>
                        <div
                          className="text-[14px] italic"
                          style={{
                            color: claudeTokens.textPrimary,
                            fontFamily: claudeTokens.serifStack,
                            fontWeight: 500,
                          }}
                        >
                          {step.title}
                        </div>
                        <div className="text-[12px] mt-0.5" style={{ color: claudeTokens.textBody }}>
                          {step.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer state — claimed callout / waiting / claim CTA */}
              <div className="mt-5">
                {claimedReward ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor: claudeTokens.surfaceMuted,
                      border: `1px solid ${claudeTokens.success}`,
                    }}
                  >
                    <div
                      className="flex items-center gap-2 italic"
                      style={{
                        color: claudeTokens.success,
                        fontFamily: claudeTokens.serifStack,
                        fontSize: '16px',
                        fontWeight: 500,
                      }}
                    >
                      <Check size={18} strokeWidth={2} />
                      {claimedReward.isNewUnlock ? 'Analytics unlocked' : 'Streak extended'}
                    </div>
                    <div
                      className="mt-1 text-[14px]"
                      style={{ color: claudeTokens.textPrimary, fontWeight: 500 }}
                    >
                      {claimedReward.analyticsTitle}
                    </div>
                    <div className="mt-1 text-[12px]" style={{ color: claudeTokens.textBody }}>
                      {claimedReward.analyticsDescription}
                    </div>
                    {claimedReward.streakPreservedByVip && (
                      <div
                        className="mt-2 text-[11px] italic"
                        style={{ color: claudeTokens.accent, fontFamily: claudeTokens.serifStack }}
                      >
                        VIP grace applied — streak preserved despite a one-day gap.
                      </div>
                    )}
                  </motion.div>
                ) : isClaimedToday ? (
                  <div
                    className="rounded-xl py-3.5 px-4 flex items-center justify-center gap-2 text-[13px]"
                    style={{
                      backgroundColor: claudeTokens.surfaceMuted,
                      border: `1px solid ${claudeTokens.border}`,
                      color: claudeTokens.textBody,
                    }}
                  >
                    <Check size={14} strokeWidth={1.75} />
                    Come back tomorrow to extend the streak
                  </div>
                ) : (
                  <button
                    onClick={handleClaim}
                    className="w-full rounded-lg py-3.5 text-[14px] font-medium transition-colors"
                    style={{ backgroundColor: claudeTokens.accent, color: '#FFFFFF' }}
                  >
                    Unlock today's analytics
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Legacy themes — original markup
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          className="bg-[#1a1a1a] w-full max-w-md rounded-3xl overflow-hidden border border-white/15 shadow-2xl relative"
        >
           <button
             onClick={onClose}
             className="absolute top-4 right-4 p-2 bg-white/5 rounded-full text-gray-400 hover:bg-white/10 z-10"
           >
             <X size={20} />
           </button>

           <div className="p-8 text-center relative overflow-hidden isolate">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none z-0" aria-hidden="true" />

             <h2
               style={{ color: '#FFFFFF' }}
               className="text-3xl font-extrabold mb-2 relative z-10 uppercase tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
             >
               Күнделікті аналитика
             </h2>
             <p style={{ color: '#E5E7EB' }} className="text-sm mb-4 relative z-10 font-medium">
               Күнделікті кіру арқылы аналитика бөлімінің жаңа қабаттарын ашыңыз.
             </p>

             <div className="relative z-10 mb-6 rounded-2xl border border-white/15 bg-white/[0.07] p-4 text-left">
               <div className="flex items-center justify-between gap-3 mb-2">
                 <div>
                   <p style={{ color: '#D1D5DB' }} className="text-xs uppercase tracking-[0.2em]">Қазіргі серия</p>
                   <p style={{ color: '#FFFFFF' }} className="text-2xl font-extrabold">{dailyRewardStreak} күн</p>
                 </div>
                 {isVipActive ? (
                   <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-300">
                     <Crown size={14} />
                     VIP қорғау
                   </div>
                 ) : null}
               </div>
               <p className="text-sm text-gray-200">{streakMessage}</p>
               {!isClaimedToday && nextMilestone ? (
                 <p className="mt-2 text-xs font-bold text-primary">
                   Келесі unlock: {nextMilestone.day}-күн, {nextMilestone.title.toLowerCase()}
                 </p>
               ) : null}
             </div>

             <div className="space-y-3 mb-8 relative z-10">
               {ANALYTICS_REWARD_STEPS.map((step) => {
                 const Icon = step.icon;
                 const isUnlocked = unlockedDays >= step.day;
                 const isActive = !isUnlocked && currentFocusDay === step.day;

                 return (
                   <div
                     key={step.day}
                     className={clsx(
                       "relative rounded-2xl p-4 border transition-all text-left flex items-start gap-4",
                       isActive
                         ? "bg-primary/20 border-primary shadow-[0_0_24px_rgba(255,215,0,0.25)]"
                         : isUnlocked
                           ? "bg-green-500/15 border-green-500/40"
                           : "bg-white/[0.07] border-white/15"
                     )}
                   >
                     <div className={clsx(
                       "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                       isActive
                         ? "bg-primary text-black"
                         : isUnlocked
                           ? "bg-green-500 text-white"
                           : "bg-white/15 text-gray-200"
                     )}>
                       {isUnlocked ? <Check size={22} /> : <Icon size={22} />}
                     </div>

                     <div className="flex-1">
                       <div className="flex items-center justify-between gap-3 mb-1">
                         <span className={clsx(
                           "text-xs font-black uppercase tracking-[0.18em]",
                           isActive ? "text-primary" : isUnlocked ? "text-green-300" : "text-gray-300"
                         )}>
                           Күн {step.day}
                         </span>
                         {isUnlocked ? (
                           <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-[11px] font-bold text-green-200">
                             <Check size={12} />
                             Ашық
                           </span>
                         ) : isActive ? (
                           <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-1 text-[11px] font-bold text-primary">
                             <Lock size={12} />
                             Кезекте
                           </span>
                         ) : (
                           <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[11px] font-bold text-gray-200">
                             <Lock size={12} />
                             Құлыптаулы
                           </span>
                         )}
                       </div>
                       <div style={{ color: '#FFFFFF' }} className="text-base font-bold">{step.title}</div>
                       <div style={{ color: '#E5E7EB' }} className="text-sm">{step.description}</div>
                     </div>
                   </div>
                 );
               })}
             </div>

             {claimedReward ? (
               <motion.div
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 className="rounded-2xl border border-green-500/40 bg-green-500/15 p-5 text-left shadow-lg"
               >
                 <div className="flex items-center gap-2 text-green-200 font-black text-lg mb-2">
                   <Check size={22} />
                   {claimedReward.isNewUnlock ? 'Analytics ашылды' : 'Streak жаңартылды'}
                 </div>
                 <div style={{ color: '#FFFFFF' }} className="font-bold">{claimedReward.analyticsTitle}</div>
                 <div style={{ color: '#E5E7EB' }} className="text-sm mt-1">{claimedReward.analyticsDescription}</div>
                 {claimedReward.streakPreservedByVip ? (
                   <div className="mt-3 text-xs font-semibold text-yellow-200">
                     VIP grace қолданылды: серия бір күн кешіккеніне қарамастан сақталды.
                   </div>
                 ) : null}
               </motion.div>
             ) : isClaimedToday ? (
               <div className="bg-white/15 text-gray-200 font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2">
                 <Check size={16} />
                 Ертең қайта кіріп, streak-ті жалғастырыңыз
               </div>
             ) : (
               <button
                 onClick={handleClaim}
                 className="w-full bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-stone-950 font-black py-4 rounded-xl text-xl shadow-[0_8px_24px_rgba(245,158,11,0.45)] hover:scale-[1.02] transition-transform active:scale-95"
               >
                 Analytics ашу
               </button>
             )}
           </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
