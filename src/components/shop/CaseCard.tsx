import { Coins, Gem } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import type { CaseDefinition, CaseId } from '../../store/useStore';
import { formatCasePrice, getCaseBadges, getCasePreviewRewards, getCaseTheme } from './caseOpening.utils';
import { CaseIcon } from './CaseIcon';

type CaseCardProps = {
  caseDefinition: CaseDefinition;
  coins: number;
  gems: number;
  freeOpens: number;
  isOpening: boolean;
  onOpen: (caseId: CaseId) => void;
};

export const CaseCard = ({
  caseDefinition,
  coins,
  gems,
  freeOpens,
  isOpening,
  onOpen,
}: CaseCardProps) => {
  const { t } = useTranslation();
  const theme = getCaseTheme(caseDefinition.id);
  const rewardBadges = getCaseBadges(caseDefinition, t);
  const previewRewards = getCasePreviewRewards(caseDefinition, t);
  const usesFreeOpen = freeOpens > 0;
  const effectivePrice = usesFreeOpen ? 0 : caseDefinition.price;
  const canAfford =
    effectivePrice === 0 ||
    (caseDefinition.priceCurrency === 'coins' ? coins >= effectivePrice : gems >= effectivePrice);
  const disabled = !canAfford || isOpening;
  const PriceIcon = caseDefinition.priceCurrency === 'coins' ? Coins : Gem;
  const priceIconClass = caseDefinition.priceCurrency === 'coins' ? 'text-amber-300' : 'text-cyan-300';

  return (
    <div className={clsx('rounded-[28px] border p-5 text-white', theme.frameClass, theme.glowClass)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-white/55">
            {t(caseDefinition.subtitleKey)}
          </div>
          <h3 className="mt-2 text-2xl font-black">{t(caseDefinition.titleKey)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/62">{t(caseDefinition.descriptionKey)}</p>
        </div>
        <button
          type="button"
          onClick={() => !disabled && onOpen(caseDefinition.id)}
          disabled={disabled}
          className="group flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 p-2 shadow-[0_0_30px_rgba(255,255,255,0.08)] transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 hover:scale-105"
        >
          <CaseIcon caseId={caseDefinition.id} className="h-full w-full drop-shadow-2xl transition-transform group-hover:scale-110" />
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {rewardBadges.map((badge) => (
          <div
            key={badge.id}
            className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${theme.chipClass}`}
          >
            {badge.label}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-end gap-3">
          <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-white/65">
            {usesFreeOpen ? t('shop_case_open_free') : formatCasePrice(caseDefinition, t)}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {previewRewards.map((reward) => (
            <div
              key={reward.id}
              className="relative overflow-hidden rounded-[18px] border border-white/10 bg-white/5 p-3 text-center"
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${reward.accentClass}`} />
              <div className="flex h-16 items-center justify-center">
                {reward.imageUrl ? (
                  <img
                    src={reward.imageUrl}
                    alt={reward.label}
                    className="h-12 w-12 rounded-xl object-cover shadow-[0_0_18px_rgba(255,255,255,0.16)]"
                  />
                ) : (
                  <div className="text-4xl drop-shadow-lg">{reward.icon}</div>
                )}
              </div>
              <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
                {reward.rarity}
              </div>
              <div className="mt-1 text-[11px] font-bold leading-tight text-white/88">
                {reward.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/48">
            {t('shop_case_open_price_title')}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xl font-black text-white">
            <PriceIcon size={18} className={priceIconClass} />
            {usesFreeOpen ? t('shop_case_open_free') : effectivePrice}
          </div>
          <div className="mt-1 text-xs text-white/54">
            {usesFreeOpen ? t('shop_case_free_opens_hint', { count: freeOpens }) : canAfford ? t('shop_case_ready_status') : t('shop_case_locked_status')}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpen(caseDefinition.id)}
          disabled={disabled}
          className="min-h-[50px] min-w-[132px] rounded-2xl bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-white/60"
        >
          {isOpening ? t('shop_case_opening_cta') : t('shop_case_open_cta')}
        </button>
      </div>
    </div>
  );
};
