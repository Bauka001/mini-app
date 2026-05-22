import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../store/useStoreImpl';
import WebApp from '@twa-dev/sdk';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { claudeTokens } from './ui/claudeTokens';
import { soundManager } from '../utils/soundManager';

interface ChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
}

export const ChestModal = ({ isOpen, onClose, gameTitle }: ChestModalProps) => {
  const { t } = useTranslation();
  const { addFec, addCoins, theme, soundEnabled } = useStore(); // Using addCoins to add coins easily
  const { isClaude } = useThemeStyles();
  const [chestState, setChestState] = useState<'closed' | 'shaking' | 'opening' | 'opened'>('closed');
  const [reward, setReward] = useState<{ type: 'coins' | 'fec' | 'gem', amount: number } | null>(null);

  const isLight = theme === 'light';

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    if (isOpen) {
      setChestState('closed');
      setReward(null);
    }
  }, [isOpen]);

  const handleOpenChest = () => {
    if (chestState !== 'closed') return;

    WebApp.HapticFeedback.impactOccurred('heavy');
    void soundManager.playClick();
    setChestState('shaking');

    setTimeout(() => {
      setChestState('opening');
      WebApp.HapticFeedback.notificationOccurred('success');
      void soundManager.playTing();

      // Calculate Reward
      const rand = Math.random();
      let newReward;

      if (rand > 0.8) {
        const amount = Number((Math.random() * 0.5 + 0.1).toFixed(2));
        newReward = { type: 'fec' as const, amount };
        addFec(amount);
      } else if (rand > 0.7) {
        const fecAmount = Number((Math.random() * 1.0 + 0.5).toFixed(2));
        newReward = { type: 'fec' as const, amount: fecAmount };
        addFec(fecAmount);
      } else {
        const amount = Math.floor(Math.random() * 100) + 50;
        newReward = { type: 'coins' as const, amount };
        addCoins(amount);
      }

      setReward(newReward);
      setChestState('opened');
      void soundManager.playTingTing();
    }, 1000);
  };

  const handleClose = () => {
    void soundManager.playClick();
    onClose();
  };

  if (!isOpen) return null;

  if (isClaude) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300"
        style={{ backgroundColor: 'rgba(31,30,29,0.55)' }}
      >
        <div
          className="w-full max-w-sm rounded-2xl overflow-hidden p-8 text-center"
          style={{
            backgroundColor: claudeTokens.surface,
            border: `1px solid ${claudeTokens.border}`,
          }}
        >
          {/* Eyebrow */}
          <span
            className="text-[10px] font-medium uppercase tracking-[0.28em]"
            style={{ color: claudeTokens.accent, fontFamily: claudeTokens.serifStack }}
          >
            {chestState === 'opened' ? 'Reward' : 'Victory chest'}
          </span>

          {/* Title */}
          <h2
            className="mt-2 leading-tight italic"
            style={{
              color: claudeTokens.textPrimary,
              fontFamily: claudeTokens.serifStack,
              fontSize: '26px',
              fontWeight: 500,
            }}
          >
            {chestState === 'opened' ? t('congratulations') : t('victory_chest')}
          </h2>
          <p className="mt-1 text-[13px]" style={{ color: claudeTokens.textBody }}>
            {chestState === 'opened' ? t('you_found') : `${t('reward_for_completing')} ${gameTitle}`}
          </p>

          {/* Chest / reward area */}
          <div
            onClick={handleOpenChest}
            className={clsx(
              'relative w-44 h-44 mx-auto mt-6 cursor-pointer transition-transform duration-100 rounded-2xl flex items-center justify-center',
              chestState === 'shaking' && 'animate-shake',
              chestState === 'opening' && 'scale-105'
            )}
            style={{
              backgroundColor: claudeTokens.surfaceMuted,
              border: `1px solid ${chestState === 'opened' ? claudeTokens.accent : claudeTokens.borderStrong}`,
            }}
          >
            <div
              className={clsx(
                'absolute inset-0 flex items-center justify-center transition-all duration-500',
                chestState === 'opened' ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
              )}
            >
              <span className="text-[5rem]" aria-hidden>
                🎁
              </span>
            </div>

            <div
              className={clsx(
                'absolute inset-0 flex flex-col items-center justify-center transition-all duration-500',
                chestState === 'opened' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
              )}
            >
              {reward && (
                <>
                  <span className="text-[3.5rem]" aria-hidden>
                    {reward.type === 'coins' ? '🪙' : '💎'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Reward amount card */}
          {chestState === 'opened' && reward && (
            <div
              className="mt-6 rounded-xl py-4 px-5"
              style={{
                backgroundColor: claudeTokens.surfaceMuted,
                border: `1px solid ${claudeTokens.border}`,
              }}
            >
              <span
                className="text-[10px] uppercase tracking-[0.22em]"
                style={{ color: claudeTokens.textMuted }}
              >
                {reward.type === 'fec' ? t('crypto_token') : t('ingame_currency')}
              </span>
              <div
                className="mt-1 tabular-nums"
                style={{
                  color: claudeTokens.textPrimary,
                  fontFamily: claudeTokens.serifStack,
                  fontSize: '32px',
                  fontWeight: 500,
                  fontFeatureSettings: '"lnum","tnum"',
                  lineHeight: 1,
                }}
              >
                {reward.amount}
                <span
                  className="text-[14px] ml-2 italic"
                  style={{ color: claudeTokens.accent }}
                >
                  {reward.type === 'coins' ? 'coins' : '$FEC'}
                </span>
              </div>
            </div>
          )}

          {/* Footer state */}
          {chestState === 'closed' && (
            <p
              className="mt-6 text-[12px] uppercase tracking-[0.22em] animate-pulse"
              style={{ color: claudeTokens.textMuted, fontFamily: claudeTokens.serifStack }}
            >
              {t('tap_to_open')}
            </p>
          )}

          {chestState === 'opened' && (
            <button
              onClick={handleClose}
              className="mt-6 w-full rounded-lg py-3.5 text-[14px] font-medium transition-colors"
              style={{ backgroundColor: claudeTokens.accent, color: '#FFFFFF' }}
            >
              {t('claim_reward')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Legacy themes — original markup
  return (
    <div className={clsx(
      "modal-shell fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300",
      isLight ? "bg-white/90" : "bg-black/90"
    )}>
      <div className="modal-card flex flex-col items-center max-w-sm w-full overflow-y-auto">

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
          <div className={clsx(
            "w-full h-full flex items-center justify-center text-[8rem] transition-all duration-500",
            chestState === 'opened' ? "opacity-0 scale-0 absolute" : "opacity-100 scale-100"
          )}>
            🎁
          </div>

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
            onClick={handleClose}
            className={clsx(
              "mt-12 w-full min-h-[44px] py-4 font-black text-xl rounded-2xl hover:scale-105 transition-transform",
              isLight ? "bg-blue-600 text-white shadow-lg" : "bg-primary text-black shadow-[0_0_20px_rgba(255,215,0,0.3)]"
            )}
          >
            {t('claim_reward')}
          </button>
        )}

      </div>

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
