import { motion } from 'framer-motion';
import { BarChart3, Crown, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useThemeStyles } from '../../hooks/useThemeStyles';

type OnboardingScreen3Props = {
  onOpenShop: () => void;
  onSkip: () => void;
};

export default function OnboardingScreen3({
  onOpenShop,
  onSkip,
}: OnboardingScreen3Props) {
  const { t } = useTranslation();
  const styles = useThemeStyles();
  const { panelClass, textPrimary, textSecondary } = styles;

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md px-4 py-6 flex items-end">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        className={clsx("w-full rounded-[2rem] border p-6 shadow-2xl", panelClass)}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className={clsx("text-xs uppercase tracking-[0.24em] font-semibold", textSecondary)}>
              {t('onb3_kicker')}
            </div>
            <h2 className={clsx("text-3xl font-black mt-3", textPrimary)}>
              {t('onb3_title')}
            </h2>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-500 text-stone-950 flex items-center justify-center shadow-lg">
            <Crown size={28} />
          </div>
        </div>

        <p className={clsx("text-sm leading-relaxed mt-4", textSecondary)}>
          {t('onb3_body')}
        </p>

        <div className="space-y-3 mt-5">
          <div className={clsx("rounded-2xl p-4 flex items-start gap-3", styles.cardClass)}>
            <BarChart3 size={20} className={clsx("mt-0.5 shrink-0", styles.textAccent)} />
            <div>
              <div className={clsx("text-sm font-bold", textPrimary)}>{t('onb3_card1_title')}</div>
              <div className={clsx("text-xs mt-1", textSecondary)}>
                {t('onb3_card1_caption')}
              </div>
            </div>
          </div>

          <div className={clsx("rounded-2xl p-4 flex items-start gap-3", styles.cardClass)}>
            <Sparkles size={20} className={clsx("mt-0.5 shrink-0", styles.textAccent)} />
            <div>
              <div className={clsx("text-sm font-bold", textPrimary)}>{t('onb3_card2_title')}</div>
              <div className={clsx("text-xs mt-1", textSecondary)}>
                {t('onb3_card2_caption')}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenShop}
          className={clsx("w-full mt-6 px-4 py-4 rounded-2xl text-base font-black", styles.btnPrimary)}
        >
          {t('onb3_open_shop')}
        </button>

        <button
          onClick={onSkip}
          className={clsx("w-full mt-3 px-4 py-3 rounded-2xl text-sm font-semibold", styles.btnSecondary)}
        >
          {t('onb3_done')}
        </button>
      </motion.div>
    </div>
  );
}
