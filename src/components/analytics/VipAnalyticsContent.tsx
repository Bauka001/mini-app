import { ChevronRight, Crown, History, LayoutGrid, Star, TrendingUp, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

type AnalyticsContentProps = {
  analytics: any;
  styles: any;
};

type AnalyticsLockedCardProps = {
  styles: any;
  onUnlock: () => void;
  isPlanExpired: boolean;
};

export const VipAnalyticsLockedCard = ({
  styles,
  onUnlock,
  isPlanExpired,
}: AnalyticsLockedCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className={clsx('w-full rounded-[32px] border p-6 relative overflow-hidden', styles.panelClass)}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-yellow-400/10 pointer-events-none" />
    <div className="relative z-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={clsx('text-[10px] font-black uppercase tracking-[0.3em]', styles.textSecondary)}>VIP Analytics</div>
          <h3 className={clsx('mt-2 text-2xl font-black', styles.textPrimary)}>Кеңейтілген аналитика VIP ішінде</h3>
          <p className={clsx('mt-3 text-sm leading-6', styles.textSecondary)}>
            Соңғы 30 күн графигін, Brain Score өзгерісін, Telegram орташасымен салыстыруды және әр ойынның бөлікті көрсеткішін ашыңыз.
          </p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-xl">
          <Crown size={24} className="text-black" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {['30 күн графигі', 'Brain Score тренді', 'Telegram benchmark', 'Ойын breakdown'].map((item) => (
          <div
            key={item}
            className={clsx('rounded-2xl border px-4 py-3 text-sm font-bold', styles.panelClass)}
          >
            {item}
          </div>
        ))}
      </div>

      <div className={clsx('rounded-2xl px-4 py-3 text-xs font-bold', styles.textSecondary, 'bg-black/5 dark:bg-white/5')}>
        {isPlanExpired ? 'VIP мерзімі аяқталған. Аналитиканы қайта ашу үшін VIP-ті жаңартыңыз.' : 'Analytics беті premium VIP қолданушысына ғана толық ашылады.'}
      </div>

      <button
        type="button"
        onClick={onUnlock}
        className="w-full rounded-2xl bg-primary text-black font-black py-4 px-4 flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(255,215,0,0.25)]"
      >
        VIP ашу
        <ChevronRight size={18} />
      </button>
    </div>
  </motion.div>
);

export const VipAnalyticsPanel = ({ analytics, styles }: AnalyticsContentProps) => {
  const maxBarValue = Math.max(...analytics.dailySeries.map((item: any) => item.value), 1);

  return (
    <div className="w-full flex flex-col gap-5">
      <div className={clsx('rounded-[32px] border p-5 relative overflow-hidden', styles.panelClass)}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-cyan-400/10 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={clsx('text-[10px] font-black uppercase tracking-[0.3em]', styles.textSecondary)}>VIP Analytics</div>
              <h3 className={clsx('mt-2 text-xl font-black', styles.textPrimary)}>Соңғы {analytics.dayRange} күннің динамикасы</h3>
              <p className={clsx('mt-2 text-sm', styles.textSecondary)}>
                Нәтиже графигі күндік өнімділік ұпайына негізделеді.
              </p>
            </div>
            <div className="text-right">
              <div className={clsx('text-[10px] font-black uppercase tracking-widest', styles.textSecondary)}>Белсенді күн</div>
              <div className={clsx('text-2xl font-black', styles.textPrimary)}>{analytics.activeDays}</div>
            </div>
          </div>

          <div className="mt-6 h-44 flex items-end gap-1.5">
            {analytics.dailySeries.map((item: any) => (
              <div key={item.key} className="flex-1 h-full flex flex-col justify-end items-center gap-2">
                <div className="h-full w-full flex items-end">
                  <div
                    className={clsx(
                      'w-full rounded-t-[10px] transition-all',
                      item.sessions > 0 ? 'bg-gradient-to-t from-primary via-orange-400 to-yellow-300' : 'bg-black/10 dark:bg-white/10'
                    )}
                    style={{ height: `${Math.max((item.value / maxBarValue) * 100, item.sessions > 0 ? 8 : 4)}%` }}
                  />
                </div>
                <span className={clsx('text-[9px] font-bold', styles.textSecondary)}>
                  {item.label.slice(0, 2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={TrendingUp} value={analytics.currentBrainScore} label="Brain Score" color="text-emerald-500" styles={styles} />
        <StatCard
          icon={Crown}
          value={analytics.brainScoreChange > 0 ? `+${analytics.brainScoreChange}` : analytics.brainScoreChange}
          label="30d Change"
          color={analytics.brainScoreChange >= 0 ? 'text-cyan-500' : 'text-rose-500'}
          styles={styles}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={History} value={analytics.totalSessions} label="Sessions" color="text-violet-500" styles={styles} />
        <StatCard
          icon={Star}
          value={`${analytics.currentBrainScore - analytics.telegramAverage > 0 ? '+' : ''}${analytics.currentBrainScore - analytics.telegramAverage}`}
          label="Vs Telegram"
          color={analytics.currentBrainScore >= analytics.telegramAverage ? 'text-emerald-500' : 'text-orange-500'}
          styles={styles}
        />
      </div>

      <div className={clsx('rounded-[28px] border p-5', styles.panelClass)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={clsx('text-lg font-black', styles.textPrimary)}>Telegram орташасымен салыстыру</h3>
          <span className={clsx('text-[10px] font-black uppercase tracking-widest', styles.textSecondary)}>
            LIVE SNAPSHOT
          </span>
        </div>
        <div className="space-y-4">
          {analytics.comparison.map((item: any) => (
            <AnalyticsMetricRow key={item.key} item={item} styles={styles} />
          ))}
        </div>
      </div>

      <div className={clsx('rounded-[28px] border p-5', styles.panelClass)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={clsx('text-lg font-black', styles.textPrimary)}>Әр ойынның бөлікті көрсеткіші</h3>
          <span className={clsx('text-[10px] font-black uppercase tracking-widest', styles.textSecondary)}>
            LAST 30 DAYS
          </span>
        </div>
        {analytics.gameBreakdown.length > 0 ? (
          <div className="space-y-3">
            {analytics.gameBreakdown.map((item: any) => (
              <div key={item.gameId} className={clsx('rounded-2xl border px-4 py-4', styles.panelClass)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-primary">
                      {getGameIcon(item.gameId)}
                    </div>
                    <div className="min-w-0">
                      <div className={clsx('text-sm font-black truncate', styles.textPrimary)}>{formatGameName(item.gameId)}</div>
                      <div className={clsx('text-[10px] font-bold uppercase tracking-widest', styles.textSecondary)}>
                        {item.plays} session
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={clsx('text-lg font-black', styles.textPrimary)}>{item.averageScore}</div>
                    <div className={clsx('text-[10px] font-bold', styles.textSecondary)}>avg score</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-black/5 dark:bg-white/5 px-3 py-2">
                    <div className={clsx('text-[10px] font-black uppercase tracking-widest', styles.textSecondary)}>Best</div>
                    <div className={clsx('mt-1 text-sm font-black', styles.textPrimary)}>{item.bestScore}</div>
                  </div>
                  <div className="rounded-2xl bg-black/5 dark:bg-white/5 px-3 py-2">
                    <div className={clsx('text-[10px] font-black uppercase tracking-widest', styles.textSecondary)}>Last</div>
                    <div className={clsx('mt-1 text-sm font-black', styles.textPrimary)}>{item.lastScore}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={clsx('rounded-3xl p-10 border border-dashed flex flex-col items-center justify-center', styles.panelClass, styles.textSecondary)}>
            <Zap size={32} className="mb-2 opacity-20" />
            <p className="text-sm font-medium text-center">Analytics ашу үшін соңғы 30 күнде кемі бір ойын ойнаңыз.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AnalyticsMetricRow = ({ item, styles }: any) => {
  const progressWidth = Math.max(item.userValue, item.telegramValue, 1);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className={clsx('text-sm font-black', styles.textPrimary)}>{item.label}</div>
        <div className={clsx('text-xs font-bold', item.difference >= 0 ? 'text-emerald-500' : 'text-orange-500')}>
          {item.difference >= 0 ? '+' : ''}{item.difference}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-3 items-center">
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full" style={{ width: `${(item.userValue / progressWidth) * 100}%` }} />
          </div>
          <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-slate-400 to-slate-500 rounded-full" style={{ width: `${(item.telegramValue / progressWidth) * 100}%` }} />
          </div>
        </div>
        <div className={clsx('text-[10px] font-black uppercase tracking-widest text-right', styles.textSecondary)}>
          <div>You {item.userValue}</div>
          <div>TG {item.telegramValue}</div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, value, label, color, styles }: any) => (
  <div className={clsx('p-4 rounded-3xl border flex flex-col items-center hover:scale-105 transition-all group duration-300', styles.panelClass)}>
    <div className={clsx('p-2 rounded-xl mb-2 group-hover:scale-110 transition-transform bg-black/5 dark:bg-white/5', color)}>
      <Icon size={18} />
    </div>
    <span className={clsx('text-xl font-black', styles.textPrimary)}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
    <span className={clsx('text-[9px] uppercase font-black tracking-widest mt-0.5', styles.textSecondary)}>{label}</span>
  </div>
);

const getGameIcon = (gameId: string) => {
  switch (gameId.toLowerCase()) {
    case 'math':
      return <TrendingUp size={20} />;
    case 'memory':
      return <LayoutGrid size={20} />;
    case 'schulte':
      return <Star size={20} />;
    case 'tetris':
      return <LayoutGrid size={20} />;
    case '2048':
      return <Zap size={20} />;
    default:
      return <Zap size={20} />;
  }
};

const formatGameName = (gameId: string) => {
  switch (gameId.toLowerCase()) {
    case 'odd_one_out':
      return 'Odd One Out';
    default:
      return gameId.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
};
