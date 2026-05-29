import { ArrowLeft, Brain, Crown, Sparkles, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { usePlanGate } from '../hooks/usePlanGate';
import { buildVipAnalyticsSnapshot, useStore } from '../store/useStoreImpl';
import { VipAnalyticsLockedCard, VipAnalyticsPanel } from '../components/analytics/VipAnalyticsContent';
import { claudeTokens } from '../components/ui/claudeTokens';

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const styles = useThemeStyles();
  const { isClaude } = styles;
  const history = useStore((state) => state.history);
  const brainStats = useStore((state) => state.brainStats);

  const { isPremiumActive, plan, planExpiry } = usePlanGate();
  const isPlanExpired = planExpiry ? Date.now() > planExpiry : false;
  const isVipAnalyticsUnlocked = isPremiumActive === true || ((plan === 'pro' || plan === 'premium') && !isPlanExpired);
  const analytics = useMemo(() => buildVipAnalyticsSnapshot(history || [], brainStats), [brainStats, history]);

  if (isClaude) {
    return (
      <div
        className="min-h-screen px-5 pb-24 pt-5"
        style={{ backgroundColor: claudeTokens.surface, color: claudeTokens.textPrimary }}
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          {/* Header */}
          <header
            className="rounded-2xl p-6 relative"
            style={{
              backgroundColor: claudeTokens.surface,
              border: `1px solid ${claudeTokens.border}`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  aria-label="Back"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[#F0EEE6]"
                  style={{ color: claudeTokens.textBody }}
                >
                  <ArrowLeft size={18} strokeWidth={1.75} />
                </button>
                <div className="min-w-0">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] italic"
                    style={{
                      color: claudeTokens.accent,
                      border: `1px solid ${claudeTokens.accent}`,
                      fontFamily: claudeTokens.serifStack,
                    }}
                  >
                    <Crown size={11} strokeWidth={1.75} />
                    VIP Analytics
                  </span>
                  <h1
                    className="mt-3 leading-tight tracking-tight"
                    style={{
                      color: claudeTokens.textPrimary,
                      fontFamily: claudeTokens.serifStack,
                      fontSize: '28px',
                      fontWeight: 500,
                    }}
                  >
                    Brain Score аналитикасы
                  </h1>
                  <p
                    className="mt-2 max-w-2xl text-[14px] leading-relaxed"
                    style={{ color: claudeTokens.textBody }}
                  >
                    Бұл бет VIP сатылымының негізгі нүктесі: ойыншы өз динамикасын, gold мәртебесін
                    және турнирге дайындық деңгейін осы жерден көреді.
                  </p>
                </div>
              </div>
            </div>

            {/* Stat strip — three hairline-divided columns */}
            <div
              className="mt-5 grid grid-cols-3 rounded-xl overflow-hidden"
              style={{ border: `1px solid ${claudeTokens.border}` }}
            >
              {[
                { label: 'Status', value: isVipAnalyticsUnlocked ? 'Active' : 'Locked' },
                { label: 'Combined', value: brainStats.combinedScore ?? 100 },
                { label: 'Weekend', value: 'Ready' },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className="p-3.5"
                  style={{
                    borderRight: i < 2 ? `1px solid ${claudeTokens.border}` : 'none',
                    backgroundColor: claudeTokens.surface,
                  }}
                >
                  <div
                    className="text-[10px] font-medium uppercase tracking-[0.22em]"
                    style={{ color: claudeTokens.textMuted }}
                  >
                    {stat.label}
                  </div>
                  <div
                    className="mt-1 tabular-nums italic"
                    style={{
                      color: claudeTokens.textPrimary,
                      fontFamily: claudeTokens.serifStack,
                      fontSize: '18px',
                      fontWeight: 500,
                    }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </header>

          {/* Three feature columns */}
          <section className="grid gap-3 md:grid-cols-3">
            {[
              {
                icon: Brain,
                title: 'Premium analytics',
                text: '30 күндік график, Brain Score өзгерісі және ойындар breakdown бір бетке жиналады.',
              },
              {
                icon: Crown,
                title: 'Gold шекара',
                text: 'VIP ойыншы leaderboard пен профильде ерекше gold мәртебемен көрінеді.',
              },
              {
                icon: Trophy,
                title: 'Tournament utility',
                text: 'Аптасына 1 тегін турнир кіруі турнир монетизациясымен тікелей байланысады.',
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: claudeTokens.surface,
                  border: `1px solid ${claudeTokens.border}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-[10px] tracking-[0.18em] uppercase"
                    style={{ color: claudeTokens.accent, fontFamily: claudeTokens.serifStack }}
                  >
                    № {String(i + 1).padStart(2, '0')}
                  </span>
                  <item.icon size={16} strokeWidth={1.75} style={{ color: claudeTokens.textPrimary }} />
                </div>
                <h3
                  className="mt-3 italic leading-tight"
                  style={{
                    color: claudeTokens.textPrimary,
                    fontFamily: claudeTokens.serifStack,
                    fontSize: '18px',
                    fontWeight: 500,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  className="mt-2 text-[13px] leading-relaxed"
                  style={{ color: claudeTokens.textBody }}
                >
                  {item.text}
                </p>
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

          {/* Sales-pitch callout — pull-quote style with terracotta side rule */}
          <section
            className="relative rounded-2xl p-5"
            style={{
              backgroundColor: claudeTokens.surfaceMuted,
              border: `1px solid ${claudeTokens.border}`,
            }}
          >
            <span
              className="absolute left-0 top-5 bottom-5 w-[3px] rounded-full"
              style={{ backgroundColor: claudeTokens.accent }}
            />
            <div className="flex items-start gap-3 pl-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: claudeTokens.surface,
                  border: `1px solid ${claudeTokens.border}`,
                }}
              >
                <Sparkles size={18} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
              </div>
              <div className="min-w-0">
                <span
                  className="text-[10px] uppercase tracking-[0.22em]"
                  style={{ color: claudeTokens.textMuted }}
                >
                  How VIP sells
                </span>
                <h2
                  className="mt-1 italic leading-tight"
                  style={{
                    color: claudeTokens.textPrimary,
                    fontFamily: claudeTokens.serifStack,
                    fontSize: '18px',
                    fontWeight: 500,
                  }}
                >
                  Analytics + gold status + weekend tournament — bundled.
                </h2>
                <p className="mt-2 text-[13px]" style={{ color: claudeTokens.textBody }}>
                  Бір bundle ретінде көрсетіледі.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // Legacy themes — original markup
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
