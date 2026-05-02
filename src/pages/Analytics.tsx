import { ArrowLeft, Brain, Crown, Sparkles, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { buildVipAnalyticsSnapshot, useStore } from '../store/useStoreImpl';
import { VipAnalyticsLockedCard, VipAnalyticsPanel } from '../components/analytics/VipAnalyticsContent';

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const styles = useThemeStyles();
  const history = useStore((state) => state.history);
  const brainStats = useStore((state) => state.brainStats);
  const plan = useStore((state) => state.plan);
  const planExpiry = useStore((state) => state.planExpiry);

  const isPlanExpired = planExpiry ? Date.now() > planExpiry : false;
  const isVipAnalyticsUnlocked = plan === 'premium' && !isPlanExpired;
  const analytics = useMemo(() => buildVipAnalyticsSnapshot(history || [], brainStats), [brainStats, history]);

  return (
    <div className={clsx('mobile-page min-h-screen px-4 pt-4 sm:pt-5', styles.bgClass)}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <header className={clsx('rounded-[32px] border p-5 relative overflow-hidden', styles.panelClass)}>
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-cyan-400/10 pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className={clsx('rounded-2xl p-3 min-h-[44px] min-w-[44px] transition-colors', styles.cardClass)}
              >
                <ArrowLeft size={20} className={styles.textPrimary} />
              </button>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                  <Crown size={14} />
                  VIP Analytics
                </div>
                <h1 className={clsx('mt-3 text-2xl sm:text-3xl font-black', styles.textPrimary)}>{t('analytics_title')}</h1>
                <p className={clsx('mt-2 max-w-2xl text-sm leading-6', styles.textSecondary)}>
                  {t('analytics_page_desc')}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 w-full lg:w-auto">
              <div className={clsx('rounded-2xl px-4 py-3', styles.cardClass)}>
                <div className={clsx('text-[10px] font-black uppercase tracking-widest', styles.textSecondary)}>{t('analytics_status')}</div>
                <div className={clsx('mt-1 text-sm font-black', styles.textPrimary)}>
                  {isVipAnalyticsUnlocked ? t('analytics_vip_active') : t('analytics_locked')}
                </div>
              </div>
              <div className={clsx('rounded-2xl px-4 py-3', styles.cardClass)}>
                <div className={clsx('text-[10px] font-black uppercase tracking-widest', styles.textSecondary)}>{t('analytics_combined_score')}</div>
                <div className={clsx('mt-1 text-sm font-black', styles.textPrimary)}>
                  {brainStats.combinedScore ?? 100}
                </div>
              </div>
              <div className={clsx('rounded-2xl px-4 py-3', styles.cardClass)}>
                <div className={clsx('text-[10px] font-black uppercase tracking-widest', styles.textSecondary)}>{t('analytics_weekend_mode')}</div>
                <div className={clsx('mt-1 text-sm font-black', styles.textPrimary)}>{t('analytics_tournament_ready')}</div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Brain,
              title: t('analytics_premium'),
              text: t('analytics_premium_desc'),
            },
            {
              icon: Crown,
              title: t('analytics_gold_border'),
              text: t('analytics_gold_border_desc'),
            },
            {
              icon: Trophy,
              title: t('analytics_tournament_utility'),
              text: t('analytics_tournament_utility_desc'),
            },
          ].map((item) => (
            <div key={item.title} className={clsx('rounded-[28px] border p-5', styles.panelClass)}>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-400">
                  <item.icon size={20} />
                </div>
                <div className={clsx('text-lg font-black', styles.textPrimary)}>{item.title}</div>
              </div>
              <p className={clsx('mt-3 text-sm leading-6', styles.textSecondary)}>{item.text}</p>
            </div>
          ))}
        </section>

        {isVipAnalyticsUnlocked ? (
          <VipAnalyticsPanel analytics={analytics} styles={styles} />
        ) : (
          <VipAnalyticsLockedCard
            styles={styles}
            isPlanExpired={isPlanExpired}
            onUnlock={() => {
              WebApp.HapticFeedback?.impactOccurred?.('medium');
              navigate('/shop');
            }}
          />
        )}

        <section className={clsx('rounded-[28px] border p-5', styles.panelClass)}>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className={clsx('text-lg font-black', styles.textPrimary)}>{t('analytics_how_sold')}</h2>
              <p className={clsx('mt-1 text-sm', styles.textSecondary)}>
                {t('analytics_how_sold_desc')}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
