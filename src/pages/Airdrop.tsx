import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import { useTranslation } from 'react-i18next';
import { Coins, Users, Gift, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { clsx } from 'clsx';
import WebApp from '@twa-dev/sdk';

const AirdropPage = () => {
  const { t } = useTranslation();
  const wallet = useTonWallet();
  const { coins, fecBalance } = useStore();

  const tasks = [
    {
      id: 1,
      title: "Connect Wallet",
      reward: 1000,
      completed: !!wallet,
      icon: Gift,
      action: () => {} // Handled by TonConnectButton
    },
    {
      id: 2,
      title: "Invite 3 Friends",
      reward: 5000,
      completed: false,
      icon: Users,
      action: () => {
        WebApp.openTelegramLink(`https://t.me/share/url?url=${window.location.href}&text=Join me in Focus App!`);
      }
    }
  ];

  return (
    <div className="p-4 pb-24 space-y-6">
      <div className="flex flex-col items-center justify-center pt-8 pb-4">
        <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <Coins size={48} className="text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Airdrop Soon
        </h1>
        <p className="text-gray-400 text-center mt-2 max-w-xs">
          {t('airdrop_desc') || "Collect coins and connect your wallet to be eligible for the upcoming token airdrop."}
        </p>
      </div>

      <div className="flex justify-center">
        <TonConnectButton />
      </div>

      <div className="bg-secondary/50 rounded-2xl p-6 border border-white/5 space-y-4">
        <div>
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-white">
            <Coins className="text-yellow-400" size={20} />
            In-game Coins
          </h2>
          <div className="text-3xl font-bold text-white">{coins.toLocaleString()}</div>
          <p className="text-xs text-gray-500">Exchange Rate: 10,000 Coins = 1 $FEC</p>
        </div>

        <div className="w-full h-px bg-white/10" />

        <div>
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-white">
            <Gift className="text-blue-400" size={20} />
            $FEC Balance
          </h2>
          <div className="text-3xl font-bold text-blue-400">{fecBalance?.toFixed(2) || '0.00'} $FEC</div>
        </div>

        <button 
          className="w-full py-3 bg-white/5 text-gray-400 font-bold rounded-xl border border-white/10 cursor-not-allowed flex items-center justify-center gap-2"
          disabled
        >
          Withdraw to Wallet
          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded ml-2">Coming Soon</span>
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold px-2">Tasks</h2>
        {tasks.map((task) => (
          <div 
            key={task.id}
            className={clsx(
              "bg-secondary p-4 rounded-xl border flex items-center gap-4 transition-all",
              task.completed ? "border-green-500/30 bg-green-500/5" : "border-white/10"
            )}
          >
            <div className={clsx(
              "p-3 rounded-full",
              task.completed ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
            )}>
              <task.icon size={24} />
            </div>
            
            <div className="flex-1">
              <h3 className="font-bold">{task.title}</h3>
              <div className="flex items-center gap-1 text-sm text-yellow-400 font-mono">
                +{task.reward} <Coins size={12} />
              </div>
            </div>

            {task.completed ? (
              <div className="text-green-400 font-bold text-sm">Done</div>
            ) : (
              <button 
                onClick={task.action}
                className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
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
