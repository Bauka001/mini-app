import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { CaseId, MysteryBox } from '../../store/useStore';
import { getCaseTheme, getRewardPresentation } from './caseOpening.utils';

type RewardRevealProps = {
  caseId: CaseId;
  reward: MysteryBox;
  onClose: () => void;
};

const Particles = ({ color }: { color: string }) => {
  const colors = [color, 'bg-white'];
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-visible flex items-center justify-center">
      {Array.from({ length: 45 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 140 + 60;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{ 
              x: tx, 
              y: ty,
              scale: Math.random() * 1 + 0.5,
              opacity: 0,
              rotate: Math.random() * 360
            }}
            transition={{ 
              duration: Math.random() * 0.8 + 0.7, 
              ease: "easeOut" 
            }}
            className={`absolute w-2 h-2 rounded-sm ${colors[Math.floor(Math.random() * colors.length)]}`}
          />
        );
      })}
    </div>
  );
};

export const RewardReveal = ({ caseId, reward, onClose }: RewardRevealProps) => {
  const { t } = useTranslation();
  const rewardPresentation = getRewardPresentation(reward, t);
  const caseTheme = getCaseTheme(caseId);

  // Derive a solid tailwind background color class from the accent gradient for particles
  const particleColorMap: Record<MysteryBox['type'], string> = {
    coins: 'bg-amber-400',
    crystals: 'bg-cyan-400',
    booster: 'bg-rose-400',
    fec: 'bg-teal-400',
    skin: 'bg-fuchsia-400',
    raffle_ticket: 'bg-yellow-300',
    iphone_17: 'bg-sky-200',
  };
  const particleColor = particleColorMap[reward.type] || 'bg-amber-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ duration: 0.35, type: "spring", bounce: 0.4 }}
      className="space-y-4"
    >
      <div className={`relative rounded-[28px] border p-6 text-center overflow-hidden ${caseTheme.frameClass} ${caseTheme.glowClass}`}>
        <Particles color={particleColor} />
        
        <div className="relative z-10">
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-white/55">
            {t('shop_case_reward_reveal_title')}
          </div>
          <div className="relative mx-auto mt-5 flex h-32 w-32 items-center justify-center">
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${rewardPresentation.accentClass} blur-2xl`} 
            />
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", bounce: 0.6, delay: 0.1 }}
              className={`relative flex h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-white/6 text-5xl shadow-[0_0_50px_rgba(255,255,255,0.1)] ${rewardPresentation.glowClass}`}
            >
              {rewardPresentation.imageUrl ? (
                <img
                  src={rewardPresentation.imageUrl}
                  alt={rewardPresentation.title}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                rewardPresentation.icon
              )}
            </motion.div>
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 inline-flex rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-white/70"
          >
            {rewardPresentation.rarity}
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 text-2xl font-black text-white"
          >
            {rewardPresentation.title}
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-2 text-sm font-semibold text-white/80"
          >
            {rewardPresentation.label}
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/62"
          >
            {rewardPresentation.description}
          </motion.p>
        </div>
      </div>

      <div className={`rounded-3xl border px-4 py-3 text-center text-sm text-white/72 ${caseTheme.frameClass}`}>
        {rewardPresentation.stateMessage || t('shop_case_reward_state_applied')}
      </div>

      <button
        type="button"
        onClick={onClose}
        className={`min-h-[52px] w-full rounded-2xl bg-gradient-to-r ${rewardPresentation.accentClass} px-4 py-3 text-base font-black text-slate-950 transition-transform active:scale-[0.99]`}
      >
        {t('claim_reward')}
      </button>
    </motion.div>
  );
};
