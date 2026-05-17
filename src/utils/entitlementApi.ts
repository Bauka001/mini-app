import { buildApiUrl } from './apiBase';

const getTelegramInitData = () =>
  window.Telegram?.WebApp?.initData || '';
const isLocalDevHost = () =>
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

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

export interface ServerEntitlement {
  tierCode: string;
  status: string;
  startsAt: string;
  endsAt: string;
  sourcePaymentOrderId: string;
}

export interface EntitlementsResponse {
  userId: number;
  activeEntitlement: ServerEntitlement | null;
  plan: 'free' | 'basic' | 'pro' | 'premium';
  planExpiry: number | null;
  subscriptionDay: number;
}

export interface PlanInfo {
  code: string;
  tierCode: string;
  amountNano: number;
  displayAmount: string;
  durationDays: number;
}

export interface PlansResponse {
  plans: PlanInfo[];
}

export const fetchEntitlements = async () => {
  try {
    return await getJson<EntitlementsResponse>('/me/entitlements');
  } catch (error) {
    if (isLocalDevHost()) {
      return {
        userId: 0,
        activeEntitlement: null,
        plan: 'free',
        planExpiry: null,
      };
    }

    throw error;
  }
};

export const fetchPlans = () =>
  getJson<PlansResponse>('/plans');
