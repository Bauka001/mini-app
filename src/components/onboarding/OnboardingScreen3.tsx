import { motion } from 'framer-motion';
import { BarChart3, Crown, Sparkles, Wallet } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { useTranslation } from 'react-i18next';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { bindWallet } from '../../utils/web3Api';
import { earnFocus } from '../../utils/web3Api';

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
  const [tonUi] = useTonConnectUI();
  const tonAddress = useTonAddress();
  const [walletStatus, setWalletStatus] = useState<'idle' | 'binding' | 'bound' | 'error'>('idle');
  const [reward, setReward] = useState<number>(0);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Auto-bind once user connects wallet
  useEffect(() => {
    if (!tonAddress || walletStatus !== 'idle') return;
    let cancelled = false;
    (async () => {
      try {
        setWalletStatus('binding');
        setWalletError(null);
        const account = tonUi.account;
        const result = await bindWallet({
          address: tonAddress,
          chain: account?.chain === '-3' ? 'testnet' : 'mainnet',
          publicKey: account?.publicKey,
          walletInfo: tonUi.wallet
            ? {
                appName: tonUi.wallet.device?.appName,
                platform: tonUi.wallet.device?.platform,
              }
            : null,
        });
        if (cancelled) return;
        setReward(result.onboardingReward || 0);
        setWalletStatus('bound');
        // Also fire $FOCUS earn (idempotent on the server side via the same `reason`)
        if (result.onboardingReward > 0) {
          earnFocus('onboarding_wallet_bind').catch(() => {});
        }
      } catch (e) {
        if (cancelled) return;
        setWalletStatus('error');
        setWalletError(e instanceof Error ? e.message : 'wallet_bind_failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tonAddress, tonUi, walletStatus]);

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

          {/* TON wallet connect CTA — $FOCUS earn */}
          <div className={clsx(
            "rounded-2xl p-4 flex items-start gap-3 border",
            walletStatus === 'bound'
              ? "bg-emerald-500/10 border-emerald-400/40"
              : "bg-sky-500/10 border-sky-400/40"
          )}>
            <Wallet size={20} className="mt-0.5 shrink-0 text-sky-400" />
            <div className="flex-1">
              <div className={clsx("text-sm font-bold", textPrimary)}>
                Connect TON Wallet — earn 25 $FOCUS
              </div>
              <div className={clsx("text-xs mt-1", textSecondary)}>
                {walletStatus === 'bound'
                  ? `✅ Wallet bound. +${reward} $FOCUS credited.`
                  : walletStatus === 'binding'
                  ? '⏳ Binding wallet…'
                  : walletStatus === 'error'
                  ? `❌ ${walletError}`
                  : 'Earn jetton credits, unlock NFT trophies, claim on-chain rewards.'}
              </div>
              {walletStatus !== 'bound' && (
                <button
                  onClick={() => tonUi.openModal()}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-3 py-2 text-xs font-bold text-white shadow-md hover:bg-sky-600 transition-colors"
                >
                  <Wallet size={14} />
                  {tonAddress ? 'Re-bind' : 'Connect Wallet'}
                </button>
              )}
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
