import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import { useTranslation } from 'react-i18next';
import { Coins, Users, Gift, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStoreImpl';
import { clsx } from 'clsx';
import WebApp from '@twa-dev/sdk';
import { useThemeStyles } from '../hooks/useThemeStyles';

const AirdropPage = () => {
  const { t } = useTranslation();
  const wallet = useTonWallet();
  const { coins, fecBalance } = useStore();
  const styles = useThemeStyles();
  const { textPrimary, textSecondary, panelClass } = styles;

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
                disabled={task.id === 1} // Disable manual action for wallet, handled by button
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
