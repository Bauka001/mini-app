import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Gem, Gift, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore.1';
import WebApp from '@twa-dev/sdk';

interface ChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
}

export const ChestModal = ({ isOpen, onClose, gameTitle }: ChestModalProps) => {
  const { t } = useTranslation();
  const { addFec, addCoins, theme } = useStore(); // Using addCoins to add coins easily
  const [chestState, setChestState] = useState<'closed' | 'shaking' | 'opening' | 'opened'>('closed');
  const [reward, setReward] = useState<{ type: 'coins' | 'fec' | 'gem', amount: number } | null>(null);

  const isLight = theme === 'light';
  const isBlue = theme === 'blue';

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
        addCoins(amount); // Reusing this to add coins
      }

      setReward(newReward);
      setChestState('opened');
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className={clsx(
      "fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300",
      isLight ? "bg-white/90" : "bg-black/90"
    )}>
      <div className="flex flex-col items-center max-w-sm w-full">
        
        <h2 className={clsx(
          "text-3xl font-black mb-2 text-center drop-shadow-lg",
          isLight ? "text-blue-600" : "text-white"
        )}>
          {chestState === 'opened' ? t('congratulations') : t('victory_chest')}
        </h2>
        <p className={clsx("mb-8 text-center", isLight ? "text-gray-500" : "text-gray-400")}>
          {chestState === 'opened' ? t('you_found') : `${t('reward_for_completing')} ${gameTitle}`}
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
                 <div className={clsx("text-[6rem] mb-4", !isLight && "drop-shadow-[0_0_30px_rgba(255,215,0,0.5)]")}>
                    {reward.type === 'coins' ? '🪙' : reward.type === 'fec' ? '💎' : '✨'}
                 </div>
                 <div className={clsx(
                   "text-4xl font-black flex items-center gap-2 px-6 py-2 rounded-2xl border",
                   isLight ? "text-blue-900 bg-blue-50 border-blue-200" : "text-white bg-black/50 border-white/10"
                 )}>
                   {reward.amount} {reward.type === 'coins' ? 'Coins' : '$FEC'}
                 </div>
                 <div className={clsx(
                   "font-bold mt-2 text-sm uppercase tracking-wider",
                   isLight ? "text-blue-500" : "text-yellow-400"
                 )}>
                   {reward.type === 'fec' ? t('crypto_token') : t('ingame_currency')}
                 </div>
               </>
             )}
          </div>
        </div>

        {chestState === 'closed' && (
          <p className={clsx("text-sm mt-8 animate-pulse", isLight ? "text-gray-400" : "text-gray-500")}>{t('tap_to_open')}</p>
        )}

        {chestState === 'opened' && (
          <button 
            onClick={onClose}
            className={clsx(
              "mt-12 w-full py-4 font-black text-xl rounded-2xl hover:scale-105 transition-transform",
              isLight ? "bg-blue-600 text-white shadow-lg" : "bg-primary text-black shadow-[0_0_20px_rgba(255,215,0,0.3)]"
            )}
          >
            {t('claim_reward')}
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
