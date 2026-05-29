import WebApp from '@twa-dev/sdk';
import { buildApiUrl } from './apiBase';

const getTelegramInitData = () =>
  (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData
  || WebApp?.initData
  || '';

async function postJson<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: getTelegramInitData(), ...body }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Request failed');
  return data as T;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-init-data': getTelegramInitData(),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Request failed');
  return data as T;
}

// ===== Wallet =====
export interface WalletBinding {
  address: string;
  chain: string;
  publicKey?: string | null;
  verifiedAt?: string | null;
  updatedAt?: string;
}

export const getWallet = () =>
  getJson<{ wallet: WalletBinding | null }>('/api/web3/wallet').then((r) => r.wallet);

export const bindWallet = (params: {
  address: string;
  chain?: string;
  publicKey?: string;
  tonProof?: unknown;
  walletInfo?: unknown;
}) =>
  postJson<{ ok: true; address: string; chain: string; verified: boolean; onboardingReward: number }>(
    '/api/web3/wallet/bind',
    params as Record<string, unknown>
  );

export const unbindWallet = () => postJson<{ ok: true }>('/api/web3/wallet/unbind');

// ===== $FOCUS jetton (DB-backed mock, ready for on-chain swap) =====
export interface FocusBalance {
  balance: number;
  available: number;
  lockedInPendingClaims: number;
}

export interface FocusLedgerEntry {
  id: number;
  delta: number;
  reason: string;
  reference_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const getFocusBalance = () => getJson<FocusBalance>('/api/web3/focus/balance');
export const getFocusLedger = (limit = 25) =>
  getJson<{ entries: FocusLedgerEntry[] }>(`/api/web3/focus/ledger?limit=${limit}`).then((r) => r.entries);

export type FocusEarnReason =
  | 'daily_workout_complete'
  | 'tournament_top1'
  | 'tournament_top3'
  | 'referral_wallet_bind'
  | 'onboarding_wallet_bind';

export const earnFocus = (reason: FocusEarnReason, referenceId?: string, metadata?: Record<string, unknown>) =>
  postJson<{ ok: true; credited: number; reason: string }>('/api/web3/focus/earn', {
    reason,
    referenceId,
    metadata,
  });

export const claimFocus = (amount: number) =>
  postJson<{ claimId: string; status: 'pending'; amount: number; walletAddress: string; message: string }>(
    '/api/web3/focus/claim',
    { amount }
  );

// ===== NFT trophies =====
export interface NftTrophyMeta {
  rarity: string;
  label: string;
  description: string;
  imageUrl: string;
}

export interface NftTrophyAward {
  id: string;
  code: string;
  status: 'awarded' | 'claim_requested' | 'minted' | 'failed';
  awardedAt: string;
  claimedAt: string | null;
  claimTx: string | null;
  reference: string | null;
  meta: NftTrophyMeta | null;
}

export const getNftCatalog = () =>
  getJson<{ catalog: Array<{ code: string } & NftTrophyMeta> }>('/api/web3/nft/catalog').then((r) => r.catalog);

export const getNftTrophies = () =>
  getJson<{ trophies: NftTrophyAward[] }>('/api/web3/nft/trophies').then((r) => r.trophies);

export const claimNftTrophy = (trophyId: string) =>
  postJson<{ ok: true; trophyId: string; status: 'claim_requested'; message: string }>(
    '/api/web3/nft/trophies/claim',
    { trophyId }
  );
