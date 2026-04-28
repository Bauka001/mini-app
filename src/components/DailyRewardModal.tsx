import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, BrainCircuit, CalendarDays, Check, Crown, Lock, Users, X } from 'lucide-react';
import { useStore } from '../store/useStoreImpl';
import { clsx } from 'clsx';

type AnalyticsClaimReward = {
  coins: number;
  gems: number;
  xp: number;
  tournamentTickets: number;
  analyticsDay: number;
  analyticsTitle: string;
  analyticsDescription: string;
  nextUnlockDay: number | null;
  isNewUnlock: boolean;
  streakPreservedByVip: boolean;
};

const ANALYTICS_REWARD_STEPS = [
  {
    day: 1,
    title: 'Ертеңгі нәтиже',
    description: 'Ертеңгі нәтижені көре аласыз',
    icon: CalendarDays,
  },
  {
    day: 7,
    title: 'Апталық график',
    description: 'Апталық график ашылады',
    icon: BarChart3,
  },
  {
    day: 14,
    title: 'Орташа білім баласы',
    description: 'Орташа білім баласын көре аласыз',
    icon: BrainCircuit,
  },
  {
    day: 30,
    title: 'Қоғамдық салыстырма',
    description: 'Айдан көпшілік салыстырма ашылады',
    icon: Users,
  },
] as const;

export const DailyRewardModal = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  const {
    dailyRewardStreak,
    claimDailyLoginReward,
    plan,
    planExpiry
  } = useStore();
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
  const lastDailyRewardDate = dailyRewardStreak?.lastClaimDate || null;
  const isClaimedToday = lastDailyRewardDate === today;
  const canUseVipGrace = !isClaimedToday && isVipActive && lastDailyRewardDate === twoDaysAgo;
  const previewStreak = isClaimedToday
    ? dailyRewardStreak.count
    : lastDailyRewardDate === yesterday || canUseVipGrace
      ? dailyRewardStreak.count + 1
      : 1;
  const unlockedDays = isClaimedToday ? dailyRewardStreak.count : Math.max(dailyRewardStreak.count, 0);
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

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-shell fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div 
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          className="modal-card bg-[#1a1a1a] w-full max-w-md rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative flex flex-col"
        >
           <button 
             onClick={onClose}
             className="absolute top-4 right-4 p-2 min-h-[44px] min-w-[44px] bg-white/5 rounded-full text-gray-400 hover:bg-white/10 z-10"
           >
             <X size={20} />
           </button>

           <div className="p-5 sm:p-8 text-center relative overflow-y-auto overflow-x-hidden">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />

             <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 relative z-10 uppercase italic">Күнделікті аналитика</h2>
             <p className="text-gray-400 text-sm sm:text-base mb-4 relative z-10 font-medium">
               Күнделікті кіру арқылы аналитика бөлімінің жаңа қабаттарын ашыңыз.
             </p>

             <div className="relative z-10 mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
               <div className="flex items-center justify-between gap-3 mb-2">
                 <div>
                   <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Қазіргі серия</p>
                  <p className="text-2xl font-black text-white">{dailyRewardStreak.count} күн</p>
                 </div>
                 {isVipActive ? (
                   <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-300">
                     <Crown size={14} />
                     VIP қорғау
                   </div>
                 ) : null}
               </div>
               <p className="text-sm text-gray-400">{streakMessage}</p>
               {!isClaimedToday && nextMilestone ? (
                 <p className="mt-2 text-xs font-semibold text-primary">
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
                         ? "bg-primary/15 border-primary shadow-[0_0_24px_rgba(255,215,0,0.22)]"
                         : isUnlocked
                           ? "bg-green-500/10 border-green-500/30"
                           : "bg-white/5 border-white/10 opacity-70"
                     )}
                   >
                     <div className={clsx(
                       "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                       isActive
                         ? "bg-primary text-black"
                         : isUnlocked
                           ? "bg-green-500 text-white"
                           : "bg-white/10 text-gray-400"
                     )}>
                       {isUnlocked ? <Check size={22} /> : <Icon size={22} />}
                     </div>

                     <div className="flex-1">
                       <div className="flex items-center justify-between gap-3 mb-1">
                         <span className={clsx(
                           "text-xs font-black uppercase tracking-[0.18em]",
                           isActive ? "text-primary" : isUnlocked ? "text-green-400" : "text-gray-500"
                         )}>
                           Күн {step.day}
                         </span>
                         {isUnlocked ? (
                           <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-1 text-[11px] font-bold text-green-300">
                             <Check size={12} />
                             Ашық
                           </span>
                         ) : isActive ? (
                           <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-[11px] font-bold text-primary">
                             <Lock size={12} />
                             Кезекте
                           </span>
                         ) : (
                           <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold text-gray-400">
                             <Lock size={12} />
                             Құлыптаулы
                           </span>
                         )}
                       </div>
                       <div className="text-base font-bold text-white">{step.title}</div>
                       <div className="text-sm text-gray-400">{step.description}</div>
                     </div>
                   </div>
                 );
               })}
             </div>

             {claimedReward ? (
               <motion.div 
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-left shadow-lg"
               >
                 <div className="flex items-center gap-2 text-green-300 font-black text-lg mb-2">
                   <Check size={22} />
                   {claimedReward.isNewUnlock ? 'Analytics ашылды' : 'Streak жаңартылды'}
                 </div>
                 <div className="text-white font-bold">{claimedReward.analyticsTitle}</div>
                 <div className="text-sm text-gray-300 mt-1">{claimedReward.analyticsDescription}</div>
                {claimedReward.coins > 0 || claimedReward.tournamentTickets > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {claimedReward.coins > 0 ? (
                      <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                        +{claimedReward.coins} coins
                      </div>
                    ) : null}
                    {claimedReward.tournamentTickets > 0 ? (
                      <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                        +{claimedReward.tournamentTickets} tournament ticket
                      </div>
                    ) : null}
                  </div>
                ) : null}
                 {claimedReward.streakPreservedByVip ? (
                   <div className="mt-3 text-xs font-semibold text-yellow-300">
                     VIP grace қолданылды: серия бір күн кешіккеніне қарамастан сақталды.
                   </div>
                 ) : null}
               </motion.div>
             ) : isClaimedToday ? (
               <div className="bg-white/10 text-gray-400 font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2">
                 <Check size={16} />
                 Ертең қайта кіріп, streak-ті жалғастырыңыз
               </div>
             ) : (
               <button
                 onClick={handleClaim}
                 className="w-full min-h-[44px] bg-gradient-to-r from-primary to-orange-500 text-black font-black py-4 rounded-xl text-xl shadow-lg hover:scale-105 transition-transform active:scale-95"
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
