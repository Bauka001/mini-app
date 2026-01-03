import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Gem, Gift, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore';
import WebApp from '@twa-dev/sdk';

interface ChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
}

export const ChestModal = ({ isOpen, onClose, gameTitle }: ChestModalProps) => {
  const { t } = useTranslation();
  const { addFec, claimDailyReward } = useStore(); // Using claimDailyReward to add coins easily, or create addCoins action
  const [chestState, setChestState] = useState<'closed' | 'shaking' | 'opening' | 'opened'>('closed');
  const [reward, setReward] = useState<{ type: 'coins' | 'fec' | 'gem', amount: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setChestState('closed');
      setReward(null);
    }
  }, [isOpen]);

  const handleOpenChest = () => {
    if (chestState !== 'closed') return;

    WebApp.HapticFeedback.impactOccurred('heavy');
    setChestState('shaking');

    setTimeout(() => {
      setChestState('opening');
      WebApp.HapticFeedback.notificationOccurred('success');
      
      // Calculate Reward
      const rand = Math.random();
      let newReward;
      
      if (rand > 0.8) {
        // 20% chance for FEC (Crypto)
        const amount = Number((Math.random() * 0.5 + 0.1).toFixed(2));
        newReward = { type: 'fec' as const, amount };
        addFec(amount);
      } else if (rand > 0.7) {
        // 10% chance for Gems
        const amount = Math.floor(Math.random() * 3) + 1;
        newReward = { type: 'gem' as const, amount };
        // We need an addGems action, but for now let's reuse claimSocialReward logic or just skip state update for quick fix?
        // Actually, let's just use addFec for now or coins. 
        // Wait, store has 'gems' but no direct 'addGems'. Let's stick to FEC and Coins for simplicity or add 'addGems' later.
        // Fallback to FEC for this "Rare" drop
        const fecAmount = Number((Math.random() * 1.0 + 0.5).toFixed(2));
        newReward = { type: 'fec' as const, amount: fecAmount };
        addFec(fecAmount);
      } else {
        // 70% chance for Coins
        const amount = Math.floor(Math.random() * 100) + 50;
        newReward = { type: 'coins' as const, amount };
        claimDailyReward(amount); // Reusing this to add coins
      }

      setReward(newReward);
      setChestState('opened');
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="flex flex-col items-center max-w-sm w-full">
        
        <h2 className="text-3xl font-black text-white mb-2 text-center drop-shadow-lg">
          {chestState === 'opened' ? "CONGRATULATIONS!" : "VICTORY CHEST"}
        </h2>
        <p className="text-gray-400 mb-8 text-center">
          {chestState === 'opened' ? "You found:" : `Reward for completing ${gameTitle}`}
        </p>

        <div 
          onClick={handleOpenChest}
          className={clsx(
            "relative w-48 h-48 cursor-pointer transition-transform duration-100",
            chestState === 'shaking' && "animate-shake",
            chestState === 'opening' && "scale-110"
          )}
        >
          {/* Simple Chest Visualization with Emojis/Icons for now */}
          <div className={clsx(
            "w-full h-full flex items-center justify-center text-[8rem] transition-all duration-500",
            chestState === 'opened' ? "opacity-0 scale-0 absolute" : "opacity-100 scale-100"
          )}>
            🎁
          </div>

          {/* Reward Display */}
          <div className={clsx(
            "absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 transform",
            chestState === 'opened' ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 -rotate-12"
          )}>
             {reward && (
               <>
                 <div className="text-[6rem] mb-4 drop-shadow-[0_0_30px_rgba(255,215,0,0.5)]">
                    {reward.type === 'coins' ? '🪙' : reward.type === 'fec' ? '💎' : '✨'}
                 </div>
                 <div className="text-4xl font-black text-white flex items-center gap-2 bg-black/50 px-6 py-2 rounded-2xl border border-white/10">
                   {reward.amount} {reward.type === 'coins' ? 'Coins' : '$FEC'}
                 </div>
                 <div className="text-yellow-400 font-bold mt-2 text-sm uppercase tracking-wider">
                   {reward.type === 'fec' ? 'Crypto Token!' : 'In-game Currency'}
                 </div>
               </>
             )}
          </div>
        </div>

        {chestState === 'closed' && (
          <p className="text-gray-500 text-sm mt-8 animate-pulse">Tap the chest to open</p>
        )}

        {chestState === 'opened' && (
          <button 
            onClick={onClose}
            className="mt-12 w-full py-4 bg-primary text-black font-black text-xl rounded-2xl shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:scale-105 transition-transform"
          >
            CLAIM REWARD
          </button>
        )}

      </div>
      
      {/* Confetti Effect */}
      {chestState === 'opened' && (
         <div className="absolute inset-0 pointer-events-none overflow-hidden">
           {[...Array(20)].map((_, i) => (
             <div 
               key={i}
               className="absolute text-2xl animate-fall"
               style={{
                 left: `${Math.random() * 100}%`,
                 top: `-10%`,
                 animationDuration: `${Math.random() * 2 + 2}s`,
                 animationDelay: `${Math.random() * 1}s`
               }}
             >
               {Math.random() > 0.5 ? '🪙' : '✨'}
             </div>
           ))}
         </div>
      )}
    </div>
  );
};
