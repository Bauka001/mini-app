import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import { useTranslation } from 'react-i18next';
import { Coins, Users, Gift, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStoreImpl';
import { clsx } from 'clsx';
import WebApp from '@twa-dev/sdk';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { claudeTokens } from '../components/ui/claudeTokens';

const AirdropPage = () => {
  const { t } = useTranslation();
  const wallet = useTonWallet();
  const { coins, fecBalance } = useStore();
  const styles = useThemeStyles();
  const { isClaude, textPrimary, textSecondary, panelClass } = styles;

  const tasks = [
    {
      id: 1,
      title: t('connect_wallet'),
      reward: 1000,
      completed: !!wallet,
      icon: Gift,
      action: () => {} // Handled by TonConnectButton
    },
    {
      id: 2,
      title: t('invite_three_friends'),
      reward: 5000,
      completed: false,
      icon: Users,
      action: () => {
        const botUrl = 'https://t.me/Focus_game_bot';
        WebApp.openTelegramLink(`https://t.me/share/url?url=${botUrl}&text=${encodeURIComponent(t('airdrop_share_text'))}`);
      }
    }
  ];

  if (isClaude) {
    return (
      <div
        className="min-h-screen pb-24 px-5"
        style={{ backgroundColor: claudeTokens.surface, color: claudeTokens.textPrimary }}
      >
        {/* Editorial hero — chapter mark, serif title, body, no rainbow gradient */}
        <header className="pt-8 pb-6 text-center">
          <div
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
            style={{
              backgroundColor: claudeTokens.surface,
              border: `1px solid ${claudeTokens.borderStrong}`,
            }}
          >
            <Coins size={28} strokeWidth={1.5} style={{ color: claudeTokens.accent }} />
          </div>
          <span
            className="block mt-4 text-[10px] font-medium uppercase tracking-[0.28em]"
            style={{ color: claudeTokens.accent, fontFamily: claudeTokens.serifStack }}
          >
            Airdrop
          </span>
          <h1
            className="mt-2 leading-tight tracking-tight italic"
            style={{
              color: claudeTokens.textPrimary,
              fontFamily: claudeTokens.serifStack,
              fontSize: '28px',
              fontWeight: 500,
            }}
          >
            {t('airdrop_hero_title')}
          </h1>
          <p
            className="mt-3 mx-auto max-w-xs text-[14px] leading-relaxed"
            style={{ color: claudeTokens.textBody }}
          >
            {t('airdrop_desc')}
          </p>
        </header>

        <div className="flex justify-center mb-6">
          <TonConnectButton />
        </div>

        {/* Balance card — two hairline-divided columns with serif old-style figures */}
        <section
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: claudeTokens.surface,
            border: `1px solid ${claudeTokens.border}`,
          }}
        >
          <div className="grid grid-cols-2">
            <div className="p-5" style={{ borderRight: `1px solid ${claudeTokens.border}` }}>
              <div className="flex items-center gap-1.5">
                <Coins size={13} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
                <span
                  className="text-[10px] font-medium uppercase tracking-[0.22em]"
                  style={{ color: claudeTokens.textMuted }}
                >
                  In-game
                </span>
              </div>
              <div
                className="mt-2 tabular-nums"
                style={{
                  color: claudeTokens.textPrimary,
                  fontFamily: claudeTokens.serifStack,
                  fontSize: '26px',
                  fontWeight: 500,
                  fontFeatureSettings: '"lnum","tnum"',
                  lineHeight: 1,
                }}
              >
                {coins.toLocaleString()}
              </div>
              <div className="mt-1 text-[11px]" style={{ color: claudeTokens.textMuted }}>
                {t('exchange_rate_fec')}
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-1.5">
                <Gift size={13} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
                <span
                  className="text-[10px] font-medium uppercase tracking-[0.22em]"
                  style={{ color: claudeTokens.textMuted }}
                >
                  $FEC
                </span>
              </div>
              <div
                className="mt-2 tabular-nums"
                style={{
                  color: claudeTokens.textPrimary,
                  fontFamily: claudeTokens.serifStack,
                  fontSize: '26px',
                  fontWeight: 500,
                  fontFeatureSettings: '"lnum","tnum"',
                  lineHeight: 1,
                }}
              >
                {fecBalance?.toFixed(2) || '0.00'}
              </div>
              <div className="mt-1 text-[11px]" style={{ color: claudeTokens.textMuted }}>
                {t('fec_balance')}
              </div>
            </div>
          </div>
          <button
            disabled
            className="w-full py-3 text-[13px] font-medium flex items-center justify-center gap-2 cursor-not-allowed"
            style={{
              backgroundColor: claudeTokens.surfaceMuted,
              color: claudeTokens.textMuted,
              borderTop: `1px solid ${claudeTokens.border}`,
            }}
          >
            {t('withdraw_to_wallet')}
            <span
              className="text-[10px] tracking-[0.18em] uppercase italic"
              style={{ color: claudeTokens.accent, fontFamily: claudeTokens.serifStack }}
            >
              {t('coming_soon')}
            </span>
          </button>
        </section>

        {/* Tasks — hairline list with terracotta on completion */}
        <section className="mt-6">
          <h2
            className="px-1 mb-3 leading-none italic"
            style={{
              color: claudeTokens.textPrimary,
              fontFamily: claudeTokens.serifStack,
              fontSize: '20px',
              fontWeight: 500,
            }}
          >
            {t('tasks_title')}
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: claudeTokens.surface,
              border: `1px solid ${claudeTokens.border}`,
            }}
          >
            {tasks.map((task, idx) => (
              <div
                key={task.id}
                className="flex items-center gap-4 p-4"
                style={{
                  borderBottom: idx < tasks.length - 1 ? `1px solid ${claudeTokens.border}` : 'none',
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: claudeTokens.surfaceMuted,
                    border: `1px solid ${task.completed ? claudeTokens.success : claudeTokens.border}`,
                    color: task.completed ? claudeTokens.success : claudeTokens.textPrimary,
                  }}
                >
                  <task.icon size={18} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[14px] truncate"
                    style={{ color: claudeTokens.textPrimary, fontWeight: 500 }}
                  >
                    {task.title}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] tabular-nums mt-0.5" style={{ color: claudeTokens.accent }}>
                    + {task.reward.toLocaleString()}
                    <Coins size={10} strokeWidth={1.75} />
                  </div>
                </div>
                {task.completed ? (
                  <span
                    className="text-[10px] uppercase tracking-[0.22em] italic"
                    style={{ color: claudeTokens.success, fontFamily: claudeTokens.serifStack }}
                  >
                    {t('done')}
                  </span>
                ) : (
                  <button
                    onClick={task.action}
                    disabled={task.id === 1}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: claudeTokens.surfaceMuted,
                      color: claudeTokens.textPrimary,
                      border: `1px solid ${claudeTokens.borderStrong}`,
                    }}
                  >
                    <ArrowRight size={16} strokeWidth={1.75} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // Legacy themes — original markup
  return (
    <div className="p-4 pb-24 space-y-6 transition-colors duration-500">
      <div className="flex flex-col items-center justify-center pt-8 pb-4">
        <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <Coins size={48} className="text-blue-500" />
        </div>
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          {t('airdrop_hero_title')}
        </h1>
        <p className={clsx(
          "text-center mt-2 max-w-xs font-medium",
          styles.isLight ? "text-slate-700" : "text-slate-200"
        )}>
          {t('airdrop_desc')}
        </p>
      </div>

      <div className="flex justify-center">
        <TonConnectButton />
      </div>

      <div className={clsx("rounded-2xl p-6 border space-y-4 transition-colors duration-500", panelClass)}>
        <div>
          <h2 className={clsx("text-xl font-bold mb-2 flex items-center gap-2", textPrimary)}>
            <Coins className="text-yellow-500" size={20} />
            {t('in_game_coins')}
          </h2>
          <div className={clsx("text-3xl font-bold", textPrimary)}>{coins.toLocaleString()}</div>
          <p className={clsx("text-xs font-medium", textSecondary)}>{t('exchange_rate_fec')}</p>
        </div>

        <div className="w-full h-px bg-gray-500/20" />

        <div>
          <h2 className={clsx("text-xl font-bold mb-2 flex items-center gap-2", textPrimary)}>
            <Gift className="text-blue-500" size={20} />
            {t('fec_balance')}
          </h2>
          <div className="text-3xl font-bold text-blue-500">{fecBalance?.toFixed(2) || '0.00'} $FEC</div>
        </div>

        <button
          className={clsx(
            "w-full py-3 font-bold rounded-xl border cursor-not-allowed flex items-center justify-center gap-2",
            styles.isLight
              ? "bg-slate-100 text-slate-700 border-slate-300"
              : "bg-slate-700/40 text-slate-100 border-slate-500/40"
          )}
          disabled
        >
          {t('withdraw_to_wallet')}
          <span className={clsx(
            "text-xs px-2 py-0.5 rounded ml-2 font-semibold",
            styles.isLight
              ? "bg-slate-200 text-slate-700"
              : "bg-slate-200/20 text-slate-100"
          )}>{t('coming_soon')}</span>
        </button>
      </div>

      <div className="space-y-4">
        <h2 className={clsx("text-xl font-bold px-2", textPrimary)}>{t('tasks_title')}</h2>
        {tasks.map((task) => (
          <div
            key={task.id}
            className={clsx(
              "p-4 rounded-xl border flex items-center gap-4 transition-all duration-300",
              panelClass,
              task.completed && "border-green-500/50"
            )}
          >
            <div className={clsx(
              "p-3 rounded-full",
              task.completed ? "bg-green-500/20 text-green-500" : "bg-blue-500/20 text-blue-500"
            )}>
              <task.icon size={24} />
            </div>

            <div className="flex-1">
              <h3 className={clsx("font-bold", textPrimary)}>{task.title}</h3>
              <div className="flex items-center gap-1 text-sm text-yellow-500 font-mono">
                +{task.reward} <Coins size={12} />
              </div>
            </div>

            {task.completed ? (
              <div className="text-green-500 font-bold text-sm">{t('done')}</div>
            ) : (
              <button
                onClick={task.action}
                className={clsx("p-2 rounded-lg transition-colors", styles.btnSecondary)}
                disabled={task.id === 1}
              >
                <ArrowRight size={20} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AirdropPage;
