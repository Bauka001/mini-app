import { ArrowLeft, Brain, Crown, Sparkles, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { clsx } from 'clsx';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { usePlanGate } from '../hooks/usePlanGate';
import { buildVipAnalyticsSnapshot, useStore } from '../store/useStoreImpl';
import { VipAnalyticsLockedCard, VipAnalyticsPanel } from '../components/analytics/VipAnalyticsContent';

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const styles = useThemeStyles();
  const history = useStore((state) => state.history);
  const brainStats = useStore((state) => state.brainStats);

  // Server-canonical plan check. Until /users/me responds we deny VIP — fail
  // closed rather than briefly showing premium content to a tampered local
  // state. The hook also caches across navigations so this rarely blocks.
  const { isPremiumActive, plan, planExpiry } = usePlanGate();
  const isVipAnalyticsUnlocked = isPremiumActive === true;
  const isPlanExpired =
    plan === 'premium' && planExpiry ? Date.now() > planExpiry : false;
  const analytics = useMemo(() => buildVipAnalyticsSnapshot(history || [], brainStats), [brainStats, history]);

  return (
    <div className={clsx('min-h-screen px-4 pb-24 pt-5', styles.bgClass)}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <header className={clsx('rounded-[32px] border p-5 relative overflow-hidden', styles.panelClass)}>
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-cyan-400/10 pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className={clsx('rounded-2xl p-3 transition-colors', styles.cardClass)}
              >
                <ArrowLeft size={20} className={styles.textPrimary} />
              </button>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                  <Crown size={14} />
                  VIP Analytics
                </div>
                <h1 className={clsx('mt-3 text-3xl font-black', styles.textPrimary)}>Brain Score аналитикасы</h1>
                <p className={clsx('mt-2 max-w-2xl text-sm leading-6', styles.textSecondary)}>
                  Бұл бет VIP сатылымының негізгі нүктесі: ойыншы өз динамикасын, gold мәртебесін және турнирге дайындық деңгейін осы жерден көреді.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className={clsx('rounded-2xl px-4 py-3', styles.cardClass)}>
                <div className={clsx('text-[10px] font-black uppercase tracking-widest', styles.textSecondary)}>Статус</div>
                <div className={clsx('mt-1 text-sm font-black', styles.textPrimary)}>
                  {isVipAnalyticsUnlocked ? 'VIP Active' : 'Locked'}
                </div>
              </div>
              <div className={clsx('rounded-2xl px-4 py-3', styles.cardClass)}>
                <div className={clsx('text-[10px] font-black uppercase tracking-widest', styles.textSecondary)}>Combined Score</div>
                <div className={clsx('mt-1 text-sm font-black', styles.textPrimary)}>
                  {brainStats.combinedScore ?? 100}
                </div>
              </div>
              <div className={clsx('rounded-2xl px-4 py-3', styles.cardClass)}>
                <div className={clsx('text-[10px] font-black uppercase tracking-widest', styles.textSecondary)}>Weekend Mode</div>
                <div className={clsx('mt-1 text-sm font-black', styles.textPrimary)}>Tournament Ready</div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
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
              <h2 className={clsx('text-lg font-black', styles.textPrimary)}>VIP қалай сатылады</h2>
              <p className={clsx('mt-1 text-sm', styles.textSecondary)}>
                Analytics + gold статус + weekend tournament utility бір bundle ретінде көрсетіледі.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
