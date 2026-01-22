import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, PlayCircle, RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTranslation } from 'react-i18next';

interface ReviveModalProps {
  isOpen: boolean;
  score: number;
  onRevive: () => void;
  onRestart: () => void;
  gameName?: string;
}

export const ReviveModal: React.FC<ReviveModalProps> = ({
  isOpen,
  score,
  onRevive,
  onRestart,
  gameName = 'Game'
}) => {
  const { hp, maxHp, decrementHp, restoreHp } = useStore();
  const { t } = useTranslation();
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  const handleReviveWithHp = () => {
    if (decrementHp()) {
      onRevive();
    }
  };

  const handleWatchAd = () => {
    setIsWatchingAd(true);
    // Simulate Ad duration
    setTimeout(() => {
      setIsWatchingAd(false);
      restoreHp(10); // Full restore or just enough? User said "10 hp берсін"
      // Optionally auto-revive or let user click revive now that they have HP
      // Let's auto revive if they were out of HP, or just give HP.
      // User said "get recovery by watching ad".
      // Let's give HP and then call onRevive? 
      // Or just give HP and let them choose?
      // "hp лар жеңілген кезде восттановлениеге көмектеседі" implies HP is currency.
      // So ad gives HP. Then they spend HP to revive.
      // But for better UX, if they watch ad specifically in this modal, maybe we just revive them for free?
      // Or give them HP and revive.
      // Let's give 10 HP as requested and revive immediately.
      onRevive();
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-gray-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm text-center relative overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white mb-2">{t('game_over', 'Game Over')}</h2>
            <p className="text-gray-400">{gameName}</p>
            <div className="mt-4 text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              {score}
            </div>
          </div>

          {isWatchingAd ? (
            <div className="py-8">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white animate-pulse">{t('watching_ad')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 mb-4 text-white/80">
                <Heart className={`w-6 h-6 ${hp > 0 ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                <span className="text-xl font-bold">{hp}/{maxHp} HP</span>
              </div>

              {hp > 0 ? (
                <button
                  onClick={handleReviveWithHp}
                  className="w-full py-4 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-red-500/30"
                >
                  <Heart className="w-5 h-5 fill-white" />
                  {t('revive_hp')}
                </button>
              ) : (
                <div className="text-red-400 text-sm mb-2">{t('no_hp')}</div>
              )}

              <button
                onClick={handleWatchAd}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-blue-500/30"
              >
                <PlayCircle className="w-5 h-5" />
                {t('watch_ad_hp')}
              </button>

              <div className="h-px bg-white/10 my-4" />

              <button
                onClick={onRestart}
                className="w-full py-3 bg-white/5 border border-white/10 rounded-xl font-semibold text-gray-300 flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {t('restart_game')}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
