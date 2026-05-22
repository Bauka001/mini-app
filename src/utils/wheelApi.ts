import WebApp from '@twa-dev/sdk';
import { buildApiUrl } from './apiBase';
import { useStore } from '../store/useStoreImpl';

const getTelegramInitData = () => window.Telegram?.WebApp?.initData || WebApp?.initData || '';
const DEV_WHEEL_STATE_KEY = 'wheel-dev-state-v1';
const isLocalDevHost = () => ['localhost', '127.0.0.1'].includes(window.location.hostname);

async function postJson<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      initData: getTelegramInitData(),
      ...body,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Request failed';
    throw new Error(message);
  }

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

  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Request failed';
    throw new Error(message);
  }

  return data as T;
}

export type WheelPrizeType = 'balance' | 'physical';
export type WheelRewardKind = 'coins' | 'crystals' | 'physical';
export type WheelPrizeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type WheelPrizeStatus = 'waiting_review' | 'granted' | 'used' | 'cancelled';

export interface WheelPrize {
  id: string;
  title: string;
  type: WheelPrizeType;
  rewardKind: WheelRewardKind;
  value: number;
  rarity: WheelPrizeRarity;
  probability: number;
  status: 'active' | 'hidden' | 'out_of_stock' | 'archived';
  createdAt: string;
  accentColor?: string | null;
  displayOrder?: number;
}

export interface WheelHistoryItem {
  id: string;
  spinSource: 'free' | 'paid' | 'promo' | 'admin';
  costCrystals: number;
  createdAt: string;
  claimedAt: string | null;
  prize: WheelPrize;
  status: WheelPrizeStatus;
}

export interface WheelOverviewResponse {
  campaign: {
    id: string;
    title: string;
    spinCostCrystals: number;
    topupFreeSpinThresholdKzt: number;
    dailySpinLimit: number | null;
    suspenseMinMs: number;
    suspenseMaxMs: number;
  };
  balance: {
    crystals: number;
    freeSpins: number;
    totalTopupKzt: number;
    spinsToday: number;
    dailySpinLimit: number | null;
  };
  prizes: WheelPrize[];
  history: WheelHistoryItem[];
}

export interface WheelSpinResponse {
  spin: WheelHistoryItem & {
    suspenseMs: number;
    crystalsBefore: number;
    crystalsAfter: number;
    coinsBefore?: number;
    coinsAfter?: number;
    freeSpinsBefore: number;
    freeSpinsAfter: number;
  };
}

export interface WheelTopupApplyResponse {
  topup: {
    id: string;
    amountKzt: number;
    crystalsAdded: number;
    freeSpinsAwarded: number;
    status: 'pending' | 'applied' | 'failed';
    createdAt: string;
  };
  balance: WheelOverviewResponse['balance'];
}

const devPrizes: WheelPrize[] = [
  { id: 'wheel-iphone', title: 'iPhone 17 Pro Max 1TB', type: 'physical', rewardKind: 'physical', value: 1, rarity: 'legendary', probability: 0.0004, status: 'active', createdAt: '2026-01-01T00:00:00.000Z', accentColor: '#fde047', displayOrder: 1 },
  { id: 'wheel-balance-200', title: '1000 монета', type: 'balance', rewardKind: 'coins', value: 1000, rarity: 'common', probability: 0.24, status: 'active', createdAt: '2026-01-01T00:00:00.000Z', accentColor: '#f59e0b', displayOrder: 2 },
  { id: 'wheel-smartwatch', title: 'Смарт сағат', type: 'physical', rewardKind: 'physical', value: 1, rarity: 'epic', probability: 0.0018, status: 'active', createdAt: '2026-01-01T00:00:00.000Z', accentColor: '#c084fc', displayOrder: 3 },
  { id: 'wheel-balance-100', title: '50 кристалл', type: 'balance', rewardKind: 'crystals', value: 50, rarity: 'common', probability: 0.34, status: 'active', createdAt: '2026-01-01T00:00:00.000Z', accentColor: '#22d3ee', displayOrder: 4 },
  { id: 'wheel-airpods', title: 'AirPods', type: 'physical', rewardKind: 'physical', value: 1, rarity: 'rare', probability: 0.003, status: 'active', createdAt: '2026-01-01T00:00:00.000Z', accentColor: '#f8fafc', displayOrder: 5 },
  { id: 'wheel-balance-500', title: '2500 монета', type: 'balance', rewardKind: 'coins', value: 2500, rarity: 'uncommon', probability: 0.17, status: 'active', createdAt: '2026-01-01T00:00:00.000Z', accentColor: '#fb7185', displayOrder: 6 },
  { id: 'wheel-balance-1000', title: '100 кристалл', type: 'balance', rewardKind: 'crystals', value: 100, rarity: 'rare', probability: 0.08, status: 'active', createdAt: '2026-01-01T00:00:00.000Z', accentColor: '#60a5fa', displayOrder: 7 },
  { id: 'wheel-powerbank', title: '5000 монета', type: 'balance', rewardKind: 'coins', value: 5000, rarity: 'rare', probability: 0.005, status: 'active', createdAt: '2026-01-01T00:00:00.000Z', accentColor: '#f97316', displayOrder: 8 },
  { id: 'wheel-balance-2000', title: '250 кристалл', type: 'balance', rewardKind: 'crystals', value: 250, rarity: 'epic', probability: 0.03, status: 'active', createdAt: '2026-01-01T00:00:00.000Z', accentColor: '#818cf8', displayOrder: 9 },
  { id: 'wheel-balance-5000', title: '10000 монета', type: 'balance', rewardKind: 'coins', value: 10000, rarity: 'epic', probability: 0.008, status: 'active', createdAt: '2026-01-01T00:00:00.000Z', accentColor: '#ef4444', displayOrder: 10 },
];

type DevWheelState = {
  freeSpins: number;
  totalTopupKzt: number;
  spinsToday: number;
  lastSpinDate: string | null;
  history: WheelHistoryItem[];
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getDefaultDevState = (): DevWheelState => ({
  freeSpins: 0,
  totalTopupKzt: 0,
  spinsToday: 0,
  lastSpinDate: null,
  history: [],
});

const readDevState = (): DevWheelState => {
  try {
    const raw = window.localStorage.getItem(DEV_WHEEL_STATE_KEY);
    if (!raw) return getDefaultDevState();
    const parsed = JSON.parse(raw) as Partial<DevWheelState>;
    const today = getTodayKey();
    return {
      freeSpins: Number(parsed.freeSpins || 0),
      totalTopupKzt: Number(parsed.totalTopupKzt || 0),
      spinsToday: parsed.lastSpinDate === today ? Number(parsed.spinsToday || 0) : 0,
      lastSpinDate: parsed.lastSpinDate || null,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return getDefaultDevState();
  }
};

const writeDevState = (state: DevWheelState) => {
  window.localStorage.setItem(DEV_WHEEL_STATE_KEY, JSON.stringify(state));
};

const pickDevPrize = () => {
  const total = devPrizes.reduce((sum, prize) => sum + prize.probability, 0);
  let cursor = Math.random() * total;
  for (const prize of devPrizes) {
    if (cursor <= prize.probability) return prize;
    cursor -= prize.probability;
  }
  return devPrizes[0];
};

const getDevOverview = (): WheelOverviewResponse => {
  const state = readDevState();
  return {
    campaign: {
      id: 'wheel-main-dev',
      title: 'Wheel of Fortune',
      spinCostCrystals: 100,
      topupFreeSpinThresholdKzt: 1000,
      dailySpinLimit: null,
      suspenseMinMs: 5200,
      suspenseMaxMs: 7600,
    },
    balance: {
      crystals: useStore.getState().gems,
      freeSpins: state.freeSpins,
      totalTopupKzt: state.totalTopupKzt,
      spinsToday: state.spinsToday,
      dailySpinLimit: null,
    },
    prizes: devPrizes,
    history: state.history,
  };
};

const applyDevTopup = (payload: {
  topupId: string;
  amountKzt: number;
  source?: 'manual' | 'ton' | 'telegram_stars' | 'admin';
  metadata?: Record<string, unknown>;
}): WheelTopupApplyResponse => {
  const state = readDevState();
  const nextFreeSpins = state.freeSpins + (payload.amountKzt >= 1000 ? 1 : 0);
  const nextState: DevWheelState = {
    ...state,
    freeSpins: nextFreeSpins,
    totalTopupKzt: state.totalTopupKzt + payload.amountKzt,
  };
  const nextCrystals = useStore.getState().gems + payload.amountKzt;
  useStore.setState({ gems: nextCrystals });
  writeDevState(nextState);

  return {
    topup: {
      id: payload.topupId,
      amountKzt: payload.amountKzt,
      crystalsAdded: payload.amountKzt,
      freeSpinsAwarded: payload.amountKzt >= 1000 ? 1 : 0,
      status: 'applied',
      createdAt: new Date().toISOString(),
    },
    balance: {
      crystals: nextCrystals,
      freeSpins: nextState.freeSpins,
      totalTopupKzt: nextState.totalTopupKzt,
      spinsToday: nextState.spinsToday,
      dailySpinLimit: null,
    },
  };
};

const spinDevWheel = (): WheelSpinResponse => {
  const state = readDevState();
  const currentStore = useStore.getState();
  const crystalsBefore = currentStore.gems;
  const coinsBefore = currentStore.coins;
  const freeSpinsBefore = state.freeSpins;
  const usingFreeSpin = freeSpinsBefore > 0;

  if (!usingFreeSpin && crystalsBefore < 100) {
    throw new Error('Not enough crystals for a paid spin');
  }

  const prize = pickDevPrize();
  const crystalReward = prize.rewardKind === 'crystals' ? prize.value : 0;
  const coinReward = prize.rewardKind === 'coins' ? prize.value : 0;
  const crystalsAfter = crystalsBefore - (usingFreeSpin ? 0 : 100) + crystalReward;
  const coinsAfter = coinsBefore + coinReward;
  const freeSpinsAfter = usingFreeSpin ? freeSpinsBefore - 1 : freeSpinsBefore;
  const now = new Date().toISOString();
  const spin: WheelSpinResponse['spin'] = {
    id: `dev-spin-${Date.now()}`,
    spinSource: usingFreeSpin ? 'free' : 'paid',
    costCrystals: usingFreeSpin ? 0 : 100,
    createdAt: now,
    claimedAt: prize.type === 'balance' ? now : null,
    status: prize.type === 'balance' ? 'used' : 'waiting_review',
    prize,
    suspenseMs: 6200,
    crystalsBefore,
    crystalsAfter,
    coinsBefore,
    coinsAfter,
    freeSpinsBefore,
    freeSpinsAfter,
  };

  const today = getTodayKey();
  const nextState: DevWheelState = {
    freeSpins: freeSpinsAfter,
    totalTopupKzt: state.totalTopupKzt,
    spinsToday: state.lastSpinDate === today ? state.spinsToday + 1 : 1,
    lastSpinDate: today,
    history: [spin, ...state.history].slice(0, 20),
  };

  useStore.setState({ gems: crystalsAfter, coins: coinsAfter });
  writeDevState(nextState);
  return { spin };
};

export const fetchWheelOverview = async () => {
  try {
    return await getJson<WheelOverviewResponse>('/wheel/fortune');
  } catch (error) {
    if (isLocalDevHost()) {
      return getDevOverview();
    }
    throw error;
  }
};

export const spinWheel = async () => {
  try {
    return await postJson<WheelSpinResponse>('/wheel/spin');
  } catch (error) {
    if (isLocalDevHost()) {
      return spinDevWheel();
    }
    throw error;
  }
};

export const applyWheelTopup = (payload: {
  topupId: string;
  amountKzt: number;
  source?: 'manual' | 'ton' | 'telegram_stars' | 'admin';
  metadata?: Record<string, unknown>;
}) =>
  postJson<WheelTopupApplyResponse>('/wheel/topups/apply', payload).catch((error) => {
    if (isLocalDevHost()) {
      return applyDevTopup(payload);
    }
    throw error;
  });
