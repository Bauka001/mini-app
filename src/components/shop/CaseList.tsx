import { AlertCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CaseDefinition, CaseId } from '../../store/useStore';
import { CaseCard } from './CaseCard';
import { CaseIcon } from './CaseIcon';

type CaseListProps = {
  cases: CaseDefinition[];
  coins: number;
  gems: number;
  freeOpens: number;
  starterFreeOpens: number;
  premiumGiftCases: number;
  errorMessage: string | null;
  isOpening: boolean;
  onOpen: (caseId: CaseId) => void;
};

export const CaseList = ({
  cases,
  coins,
  gems,
  freeOpens,
  starterFreeOpens,
  premiumGiftCases,
  errorMessage,
  isOpening,
  onOpen,
}: CaseListProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(9,11,20,0.98),rgba(17,24,39,0.92))] p-5 text-white shadow-[0_18px_60px_rgba(15,23,42,0.32)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/15 bg-fuchsia-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-fuchsia-100">
              <Sparkles size={14} />
              {t('shop_case_feature_badge')}
            </div>
            <h2 className="mt-4 text-2xl font-black">{t('shop_cases_title')}</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/64">{t('shop_cases_desc')}</p>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-white/6 p-2 shadow-[0_0_36px_rgba(255,255,255,0.08)]">
            <CaseIcon caseId="legendary_case" className="h-full w-full" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
              {t('shop_case_balance_title')}
            </div>
            <div className="mt-2 text-2xl font-black text-white">{coins}</div>
            <div className="mt-1 text-xs text-white/55">{t('shop_case_balance_desc')}</div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
              {t('crystals', 'Crystals')}
            </div>
            <div className="mt-2 text-2xl font-black text-white">{gems}</div>
            <div className="mt-1 text-xs text-white/55">{t('shop_case_crystals_desc')}</div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
              {t('shop_case_free_opens_title')}
            </div>
            <div className="mt-2 text-2xl font-black text-white">{freeOpens}</div>
            <div className="mt-1 text-xs text-white/55">{t('shop_case_free_opens_desc')}</div>
          </div>

          <div className="rounded-[22px] border border-cyan-400/20 bg-cyan-400/8 p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/70">
              {t('shop_case_starter_opens_title', 'Starter cases')}
            </div>
            <div className="mt-2 text-2xl font-black text-white">{starterFreeOpens}</div>
            <div className="mt-1 text-xs text-white/55">{t('shop_case_starter_opens_desc', 'Onboarding free opens')}</div>
          </div>

          <div className="rounded-[22px] border border-amber-300/20 bg-amber-400/8 p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-100/70">
              {t('shop_case_premium_gift_title', 'Premium gift cases')}
            </div>
            <div className="mt-2 text-2xl font-black text-white">{premiumGiftCases}</div>
            <div className="mt-1 text-xs text-white/55">{t('shop_case_premium_gift_desc', 'Gifted from Premium plan')}</div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
              {t('shop_case_service_title')}
            </div>
            <div className="mt-2 text-base font-black text-white">
              {t('shop_case_service_online')}
            </div>
            <div className="mt-1 text-xs text-white/55">{t('shop_case_service_desc')}</div>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="flex items-start gap-3 rounded-[22px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div className="space-y-4">
        {cases.map((caseDefinition) => (
          <CaseCard
            key={caseDefinition.id}
            caseDefinition={caseDefinition}
            coins={coins}
            gems={gems}
            freeOpens={freeOpens}
            isOpening={isOpening}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
};
