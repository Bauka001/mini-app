import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Gem, Trophy, ExternalLink, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { useTranslation } from 'react-i18next';
import WebApp from '@twa-dev/sdk';
import { useThemeStyles } from '../hooks/useThemeStyles';
import {
  bindWallet,
  unbindWallet,
  getWallet,
  getFocusBalance,
  claimFocus,
  getNftTrophies,
  claimNftTrophy,
  type FocusBalance,
  type NftTrophyAward,
  type WalletBinding,
} from '../utils/web3Api';

/**
 * Web3 hub for the Profile page — wallet binding, $FOCUS balance, NFT trophies.
 *
 * Data is server-authoritative (Supabase). On-chain claim actions queue an
 * intent that an external worker fulfills once the jetton master + NFT
 * collection contracts are deployed.
 */
export function Web3Section() {
  const { t } = useTranslation();
  const styles = useThemeStyles();
  const { textPrimary, textSecondary, panelClass } = styles;
  const [tonUi] = useTonConnectUI();
  const tonAddress = useTonAddress();

  const [wallet, setWallet] = useState<WalletBinding | null>(null);
  const [focus, setFocus] = useState<FocusBalance | null>(null);
  const [trophies, setTrophies] = useState<NftTrophyAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingFocus, setClaimingFocus] = useState(false);
  const [claimingTrophy, setClaimingTrophy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [w, f, tr] = await Promise.all([
        getWallet().catch(() => null),
        getFocusBalance().catch(() => null),
        getNftTrophies().catch(() => []),
      ]);
      setWallet(w);
      setFocus(f);
      setTrophies(tr);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-bind when user connects via TonConnect
  useEffect(() => {
    if (!tonAddress) return;
    if (wallet?.address === tonAddress) return;
    (async () => {
      try {
        const account = tonUi.account;
        await bindWallet({
          address: tonAddress,
          chain: account?.chain === '-3' ? 'testnet' : 'mainnet',
          publicKey: account?.publicKey,
          walletInfo: tonUi.wallet
            ? { appName: tonUi.wallet.device?.appName, platform: tonUi.wallet.device?.platform }
            : null,
        });
        await refresh();
        setMessage({ kind: 'success', text: t('wallet_bound', 'Wallet bound — +25 $FOCUS') });
      } catch (e) {
        setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'wallet_bind_failed' });
      }
    })();
  }, [tonAddress, wallet?.address, tonUi, refresh, t]);

  const handleUnbind = async () => {
    try {
      await unbindWallet();
      await tonUi.disconnect();
      await refresh();
      setMessage({ kind: 'success', text: t('wallet_unbound', 'Wallet unbound') });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'unbind_failed' });
    }
  };

  const handleClaimFocus = async () => {
    if (!focus || focus.available <= 0) return;
    if (!wallet?.address) {
      setMessage({ kind: 'error', text: t('wallet_required', 'Connect wallet first') });
      return;
    }
    setClaimingFocus(true);
    try {
      const result = await claimFocus(focus.available);
      setMessage({
        kind: 'success',
        text: t('focus_claim_queued', `Claim queued for ${result.amount} $FOCUS to ${wallet.address.slice(0, 8)}…`),
      });
      WebApp.HapticFeedback?.notificationOccurred('success');
      await refresh();
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'claim_failed' });
    } finally {
      setClaimingFocus(false);
    }
  };

  const handleClaimTrophy = async (trophy: NftTrophyAward) => {
    if (!wallet?.address) {
      setMessage({ kind: 'error', text: t('wallet_required', 'Connect wallet first') });
      return;
    }
    setClaimingTrophy(trophy.id);
    try {
      await claimNftTrophy(trophy.id);
      WebApp.HapticFeedback?.notificationOccurred('success');
      setMessage({ kind: 'success', text: t('nft_claim_queued', 'NFT mint queued to your wallet') });
      await refresh();
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'nft_claim_failed' });
    } finally {
      setClaimingTrophy(null);
    }
  };

  const truncatedAddress = wallet?.address
    ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
    : null;

  if (loading) {
    return (
      <div className={clsx('w-full max-w-sm rounded-3xl p-5 border mb-6', panelClass)}>
        <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className={clsx('w-full max-w-sm space-y-4 mb-6')}>
      {/* Wallet card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={clsx('rounded-3xl border p-5', panelClass)}
      >
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={18} className="text-sky-400" />
          <h3 className={clsx('text-base font-bold', textPrimary)}>
            {t('web3_wallet', 'TON Wallet')}
          </h3>
        </div>
        {wallet?.address ? (
          <>
            <div className={clsx('text-xs font-mono break-all', textSecondary)}>
              {truncatedAddress}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 size={12} />
              {t('wallet_bound_short', 'Bound')} · {wallet.chain}
            </div>
            <button
              onClick={handleUnbind}
              className="mt-3 text-xs font-semibold text-red-400 hover:text-red-300"
            >
              {t('unbind_wallet', 'Unbind wallet')}
            </button>
          </>
        ) : (
          <>
            <p className={clsx('text-xs mb-3', textSecondary)}>
              {t('wallet_cta', 'Connect your TON wallet to earn $FOCUS jetton credits and claim NFT trophies.')}
            </p>
            <button
              onClick={() => tonUi.openModal()}
              className="w-full rounded-xl bg-sky-500 px-3 py-2.5 text-sm font-bold text-white hover:bg-sky-600 transition-colors"
            >
              {t('connect_wallet', 'Connect Wallet')}
            </button>
          </>
        )}
      </motion.div>

      {/* $FOCUS jetton card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={clsx('rounded-3xl border p-5', panelClass)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gem size={18} className="text-purple-400" />
            <h3 className={clsx('text-base font-bold', textPrimary)}>$FOCUS</h3>
          </div>
          <span className={clsx('text-xs', textSecondary)}>{t('jetton_on_ton', 'Jetton on TON')}</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className={clsx('text-3xl font-black', textPrimary)}>{focus?.balance ?? 0}</div>
            {focus && focus.lockedInPendingClaims > 0 && (
              <div className={clsx('mt-1 text-[11px]', textSecondary)}>
                {focus.lockedInPendingClaims} {t('locked_pending', 'locked in pending claims')}
              </div>
            )}
          </div>
          <button
            onClick={handleClaimFocus}
            disabled={!focus || focus.available <= 0 || !wallet?.address || claimingFocus}
            className="rounded-xl bg-purple-500 px-3 py-2 text-xs font-bold text-white disabled:bg-purple-900/40 disabled:text-purple-300/60 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors"
          >
            {claimingFocus ? '…' : t('claim_on_chain', 'Claim on-chain')}
          </button>
        </div>
        {/* On-chain balance row — appears once jetton is deployed + user bound a wallet */}
        {focus?.onChain && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-purple-400/20 bg-purple-500/5 px-3 py-2">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-purple-300/70">
                {t('on_chain_balance', 'On-chain')} · {focus.onChain.network}
              </span>
              <span className={clsx('text-sm font-bold', textPrimary)}>
                {focus.onChain.balance.toFixed(2)} $FOCUS
              </span>
            </div>
            {focus.onChain.explorer && (
              <a
                href={focus.onChain.explorer}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-purple-500/20 px-2 py-1 text-[10px] font-bold text-purple-200 hover:bg-purple-500/30"
              >
                <ExternalLink size={10} /> Tonviewer
              </a>
            )}
          </div>
        )}
        <p className={clsx('mt-3 text-[11px]', textSecondary)}>
          {t('focus_hint', 'Earn $FOCUS by completing daily workouts, winning tournaments, and binding your wallet. Claim on-chain once the jetton master is deployed.')}
        </p>
      </motion.div>

      {/* NFT trophies card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={clsx('rounded-3xl border p-5', panelClass)}
      >
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={18} className="text-amber-400" />
          <h3 className={clsx('text-base font-bold', textPrimary)}>
            {t('nft_trophies', 'NFT Trophies')}
          </h3>
        </div>
        {trophies.length === 0 ? (
          <p className={clsx('text-xs', textSecondary)}>
            {t('no_trophies_yet', 'No trophies yet. Win a tournament or complete special challenges to earn collectible NFTs on TON.')}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {trophies.map((trophy) => (
              <div
                key={trophy.id}
                className="rounded-xl border border-white/10 bg-black/30 p-2.5 flex flex-col gap-1.5"
              >
                <div className="text-xl">
                  {trophy.code === 'tournament_gold' && '🥇'}
                  {trophy.code === 'tournament_silver' && '🥈'}
                  {trophy.code === 'tournament_bronze' && '🥉'}
                  {trophy.code === 'brain_master' && '🧠'}
                  {trophy.code === 'early_supporter' && '⭐'}
                  {trophy.code === 'focus_whale' && '🐋'}
                </div>
                <div className={clsx('text-[11px] font-bold leading-tight', textPrimary)}>
                  {trophy.meta?.label || trophy.code}
                </div>
                <div className={clsx('text-[9px] uppercase font-bold', textSecondary)}>
                  {trophy.meta?.rarity || 'rare'}
                </div>
                {trophy.status === 'awarded' && (
                  <button
                    onClick={() => handleClaimTrophy(trophy)}
                    disabled={!wallet?.address || claimingTrophy === trophy.id}
                    className="mt-1 rounded-md bg-amber-500 px-2 py-1 text-[10px] font-bold text-black disabled:opacity-50"
                  >
                    {claimingTrophy === trophy.id ? '…' : 'Mint NFT'}
                  </button>
                )}
                {trophy.status === 'claim_requested' && (
                  <div className="mt-1 text-[10px] font-bold text-amber-300">
                    ⏳ Mint queued
                  </div>
                )}
                {trophy.status === 'minted' && (
                  <a
                    href={trophy.claimTx ? `https://tonscan.org/tx/${trophy.claimTx}` : '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300"
                  >
                    <ExternalLink size={10} /> tx
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {message && (
        <div
          className={clsx(
            'rounded-2xl border px-3 py-2 text-xs',
            message.kind === 'success'
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
              : 'border-red-400/40 bg-red-500/10 text-red-300'
          )}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
