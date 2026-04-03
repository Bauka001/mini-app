import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Diamond, Star, Calendar, X, Check } from 'lucide-react';
import { useStore } from '../store/useStore.1';
import { clsx } from 'clsx';

export const DailyRewardModal = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  const { lastDailyRewardDate, dailyRewardStreak, claimDailyLoginReward } = useStore();
  const [claimedReward, setClaimedReward] = useState<{ coins: number; gems: number; xp: number } | null>(null);

  const handleClaim = async () => {
    const result = claimDailyLoginReward();
    if (result.success) {
      setClaimedReward(result.reward);
      // Close after 2 seconds
      setTimeout(() => {
        setClaimedReward(null); // Reset for next time
        onClose();
      }, 2500);
    }
  };

  if (!isOpen) return null;

  // Calculate current day in 7-day cycle (1-7)
  // If we haven't claimed today yet, the streak is from yesterday. 
  // If lastClaim was yesterday, today will be streak + 1.
  // If lastClaim was older, today is day 1.
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  let currentDay = 1;
  // If already claimed today, show the current streak day
  if (lastDailyRewardDate === today) {
    currentDay = ((dailyRewardStreak - 1) % 7) + 1;
  } else if (lastDailyRewardDate === yesterday) {
    // If claiming for today (streak + 1)
    currentDay = (dailyRewardStreak % 7) + 1;
  } else {
    // Streak broken or new
    currentDay = 1;
  }

  // If claimed today, we just show the calendar, no claim button (or disabled)
  const isClaimedToday = lastDailyRewardDate === today;

  const days = [1, 2, 3, 4, 5, 6, 7];

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
          className="bg-[#1a1a1a] w-full max-w-md rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative"
        >
           {/* Close button */}
           <button 
             onClick={onClose}
             className="absolute top-4 right-4 p-2 bg-white/5 rounded-full text-gray-400 hover:bg-white/10 z-10"
           >
             <X size={20} />
           </button>

           <div className="p-8 text-center relative overflow-hidden">
             {/* Background Glow */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />

             <h2 className="text-3xl font-black text-white mb-2 relative z-10 uppercase italic">Daily Rewards</h2>
             <p className="text-gray-400 text-sm mb-8 relative z-10 font-medium">Log in every day to earn bigger rewards!</p>

             <div className="grid grid-cols-4 gap-3 mb-8 relative z-10">
               {days.map((day) => {
                 // Logic for visual state
                 // If claimed today: days <= currentDay are green/done.
                 // If NOT claimed today: days < currentDay are done. currentDay is active.
                 
                 let status = 'future'; // default
                 if (isClaimedToday) {
                   if (day <= currentDay) status = 'done';
                 } else {
                   if (day < currentDay) status = 'done';
                   else if (day === currentDay) status = 'active';
                 }

                 const isBigReward = day === 7;
                 
                 return (
                   <div 
                     key={day} 
                     className={clsx(
                       "relative rounded-xl p-2 flex flex-col items-center justify-center border transition-all",
                       isBigReward ? "col-span-2 aspect-auto bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/50" : "aspect-square",
                       status === 'active' ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(255,215,0,0.3)] scale-105 z-20" : 
                       status === 'done' ? "bg-green-500/10 border-green-500/30 opacity-60" : "bg-white/5 border-white/5 opacity-40"
                     )}
                   >
                     {status === 'done' && (
                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl z-20">
                         <Check size={24} className="text-green-500 font-bold" strokeWidth={4} />
                       </div>
                     )}
                     
                     <span className={clsx("text-[10px] font-black uppercase mb-1", status === 'active' ? "text-primary" : "text-gray-500")}>
                       Day {day}
                     </span>
                     
                     {isBigReward ? (
                       <div className="flex items-center gap-2">
                          <div className="text-2xl">🎁</div>
                          <div className="flex flex-col items-start">
                            <span className="text-xs font-bold text-white">Big Chest</span>
                            <span className="text-[10px] text-yellow-500 font-black">+1000 Coins</span>
                          </div>
                       </div>
                     ) : (
                       <>
                         <Coins size={16} className={clsx("mb-1", status === 'active' ? "text-yellow-400" : "text-gray-600")} />
                         <span className={clsx("text-xs font-bold", status === 'active' ? "text-white" : "text-gray-500")}>
                           {50 * day}
                         </span>
                       </>
                     )}
                   </div>
                 );
               })}
             </div>

             {claimedReward ? (
               <motion.div 
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 className="bg-green-500 text-white font-black py-4 rounded-xl text-xl shadow-lg flex items-center justify-center gap-2"
               >
                 <Check size={24} />
                 CLAIMED!
               </motion.div>
             ) : isClaimedToday ? (
               <div className="bg-white/10 text-gray-400 font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2">
                 <Check size={16} />
                 Come back tomorrow
               </div>
             ) : (
               <button
                 onClick={handleClaim}
                 className="w-full bg-gradient-to-r from-primary to-orange-500 text-black font-black py-4 rounded-xl text-xl shadow-lg hover:scale-105 transition-transform active:scale-95"
               >
                 CLAIM REWARD
               </button>
             )}
           </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
