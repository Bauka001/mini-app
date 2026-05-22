import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import WebApp from '@twa-dev/sdk';
import type { CaseId, MysteryBox } from '../../store/useStore';
import { CASE_DEFINITIONS } from '../../store/cases';
import { useStore } from '../../store/useStoreImpl';
import { RewardReveal } from './RewardReveal';
import { buildCaseOpeningReel, getCaseTheme, getRewardPresentation } from './caseOpening.utils';
import { CaseIcon } from './CaseIcon';
import { soundManager } from '../../utils/soundManager';

type CaseOpeningModalProps = {
  caseId: CaseId | null;
  reward: MysteryBox | null;
  onClose: () => void;
};

const REEL_CARD_HEIGHT = 144;
const REEL_GAP = 12;
const REEL_TARGET_INDEX = 40;
const SPIN_DURATION_MS = 5200;
const REVEAL_STANDOFF_MS = 550;
const SPIN_TING_INTERVAL_MS = 180;

export const CaseOpeningModal = ({ caseId, reward, onClose }: CaseOpeningModalProps) => {
  const { t } = useTranslation();
  const soundEnabled = useStore((state) => state.soundEnabled);
  const [phase, setPhase] = useState<'initial' | 'opening' | 'revealed'>('initial');
  const [reelOffset, setReelOffset] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const caseDefinition = caseId ? CASE_DEFINITIONS[caseId] : null;
  const caseTheme = caseId ? getCaseTheme(caseId) : null;
  const rewardPresentation = reward ? getRewardPresentation(reward, t) : null;

  const timersRef = useRef<number[]>([]);
  const hasStartedRef = useRef(false);

  const reelItems = useMemo(() => {
    if (!reward || !caseId) {
      return [];
    }

    return buildCaseOpeningReel(caseId, reward, t, REEL_TARGET_INDEX);
  }, [caseId, reward, t]);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    if (!reward) {
      return;
    }

    WebApp.BackButton.show();
    WebApp.BackButton.onClick(onClose);

    return () => {
      WebApp.BackButton.offClick(onClose);
      WebApp.BackButton.hide();
    };
  }, [reward, onClose]);

  const startSequence = () => {
    setIsShaking(true);
    WebApp.HapticFeedback.impactOccurred('heavy');
    void soundManager.playClick();

    const shakeTimer = window.setTimeout(() => {
      setIsShaking(false);
      setPhase('opening');
      void soundManager.playTing();

      const startTimer = window.setTimeout(() => {
        // Randomize the exact stopping point within the target card for realism
        const exactCenter = (REEL_CARD_HEIGHT + REEL_GAP) * REEL_TARGET_INDEX;
        const randomOffset = Math.floor(Math.random() * (REEL_CARD_HEIGHT - 20)) - (REEL_CARD_HEIGHT - 20) / 2;
        setReelOffset(exactCenter + randomOffset);
        
        // Better haptic ticking matching quartic easeOut, with throttled bell ticks while spinning.
        let currentItem = 0;
        let lastTingAt = 0;
        const duration = SPIN_DURATION_MS;
        const totalItems = REEL_TARGET_INDEX;
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 4); // Quartic ease out
        
        const startTime = Date.now();
        const tickInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easedProgress = easeOut(progress);
          const expectedItem = Math.floor(easedProgress * totalItems);
          
          if (expectedItem > currentItem) {
             WebApp.HapticFeedback.selectionChanged();
             if (elapsed - lastTingAt >= SPIN_TING_INTERVAL_MS) {
               void soundManager.playTing();
               lastTingAt = elapsed;
             }
             currentItem = expectedItem;
          }
          
          if (progress >= 1) {
             clearInterval(tickInterval);
          }
        }, 16);

        timersRef.current.push(tickInterval as unknown as number);

      }, 50);

      // Standoff style long opening
      const revealTimer = window.setTimeout(() => {
        setPhase('revealed');
        WebApp.HapticFeedback.notificationOccurred('success');
        void soundManager.playTingTing();
      }, SPIN_DURATION_MS + REVEAL_STANDOFF_MS);

      timersRef.current.push(startTimer, revealTimer);
    }, 400);

    timersRef.current.push(shakeTimer);
  };

  useEffect(() => {
    if (!reward) {
      return;
    }

    setPhase('initial');
    setReelOffset(0);
    setIsShaking(false);
    hasStartedRef.current = false;

    // Автоматты түрде бастау (150ms кейін)
    const autoStart = window.setTimeout(() => {
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        startSequence();
      }
    }, 150);

    timersRef.current.push(autoStart);

    return () => {
      timersRef.current.forEach(window.clearTimeout);
      timersRef.current = [];
    };
  }, [reward]);

  const handleChestClick = () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    startSequence();
  };

  const handleClose = () => {
    void soundManager.playClick();
    onClose();
  };

  if (!reward || !caseId || !caseDefinition || !caseTheme || !rewardPresentation) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.94, y: 24 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 24 }}
          transition={{ duration: 0.25 }}
          className={`relative w-full max-w-md overflow-hidden rounded-[30px] border ${caseTheme.frameClass} ${caseTheme.glowClass}`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_36%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.08),transparent_42%)]" />

          <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-white/55">
                {phase === 'initial' ? t('shop_case_modal_ready') : phase === 'opening' ? t('shop_case_modal_opening') : t('shop_case_modal_revealed')}
              </div>
              <h3 className="mt-1 text-lg font-black text-white">{t(caseDefinition.titleKey)}</h3>
            </div>
            {phase === 'revealed' || phase === 'initial' ? (
              <button
                type="button"
                onClick={handleClose}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/80 transition-colors hover:bg-white/10"
                aria-label={t('close')}
              >
                <X size={18} />
              </button>
            ) : null}
          </div>

          <div className="relative p-5">
            {phase === 'initial' ? (
              <div className="flex flex-col items-center justify-center py-10">
                <motion.button
                  type="button"
                  onClick={handleChestClick}
                  animate={isShaking ? { x: [-8, 8, -8, 8, -4, 4, -2, 2, 0], y: [-2, 2, -2, 2, 0] } : {
                    y: [0, -10, 0],
                  }}
                  transition={isShaking ? { duration: 0.5 } : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className={`group flex h-44 w-44 items-center justify-center rounded-[36px] border border-white/20 bg-gradient-to-b from-white/10 to-white/5 p-6 shadow-[0_0_50px_rgba(255,255,255,0.1)] transition-transform hover:scale-105 active:scale-95 ${caseTheme.glowClass}`}
                >
                  <CaseIcon caseId={caseId} className="h-full w-full drop-shadow-2xl transition-transform group-hover:scale-110" />
                </motion.button>
                <div className="mt-8 text-lg font-black text-white">{t('shop_case_modal_click_to_open')}</div>
                <p className="mt-2 max-w-[240px] text-center text-sm leading-relaxed text-white/60">
                  Кейс ашылып жатыр...
                </p>
              </div>
            ) : phase === 'opening' ? (
              <div className="relative flex flex-col items-center justify-center space-y-6 py-6 overflow-hidden">
                {/* Vertical Reel Window */}
                <div className="relative z-20 h-[240px] w-full max-w-[160px] overflow-hidden rounded-[28px] border-2 border-white/10 bg-[#070b16]/90 p-3 shadow-[0_0_40px_rgba(0,0,0,0.8)_inset]">
                  {/* Glowing background inside the reel */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent pointer-events-none" />
                  
                  {/* Indicator pointers (left and right) */}
                  <div className="absolute top-1/2 left-0 z-30 w-full h-[2px] -translate-y-1/2 bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,1)]">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-l-[12px] border-t-transparent border-b-transparent border-l-yellow-400 drop-shadow-[2px_0_4px_rgba(250,204,21,0.8)]" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-r-[12px] border-t-transparent border-b-transparent border-r-yellow-400 drop-shadow-[-2px_0_4px_rgba(250,204,21,0.8)]" />
                  </div>

                  <motion.div
                    animate={{ y: -reelOffset }}
                    transition={{ duration: SPIN_DURATION_MS / 1000, ease: [0.1, 0.85, 0.15, 1] }}
                    className="flex flex-col gap-3 items-center"
                    style={{
                      paddingTop: '48px',
                      paddingBottom: '48px',
                    }}
                  >
                    {reelItems.map((item) => (
                      <div
                        key={item.id}
                        className={`relative flex flex-col h-[144px] w-[130px] shrink-0 overflow-hidden rounded-[16px] border border-white/10 bg-[#161a25] shadow-lg ${item.glowClass}`}
                      >
                        <div className={`absolute bottom-0 left-0 h-[4px] w-full bg-gradient-to-r ${item.accentClass}`} />
                        
                        <div className="flex-1 flex items-center justify-center text-6xl drop-shadow-xl z-10 mt-2">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="h-20 w-20 rounded-2xl object-cover shadow-[0_0_18px_rgba(255,255,255,0.18)]"
                            />
                          ) : (
                            item.icon
                          )}
                        </div>
                        
                        <div className="px-2 pb-3 text-center z-10">
                          <div className="text-[12px] font-black text-white truncate leading-tight">{item.title}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-white/50 truncate mt-0.5">{item.rarity}</div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </div>

                {/* Chest below the reel */}
                <div className="relative z-10 mx-auto flex h-28 w-28 items-center justify-center">
                  {/* Glow effect behind chest */}
                  <div className="absolute inset-0 animate-pulse rounded-full bg-white/20 blur-3xl opacity-60" />
                  
                  {/* Light beam connecting chest and reel */}
                  <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 w-[120px] h-[150px] bg-gradient-to-t from-white/10 to-transparent blur-md -z-10" />

                  <CaseIcon caseId={caseId} className="relative z-10 h-full w-full drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-110" />
                </div>
              </div>
            ) : (
              <RewardReveal caseId={caseId} reward={reward} onClose={handleClose} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
