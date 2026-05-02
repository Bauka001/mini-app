import { buildApiUrl } from './apiBase';

const getTelegramInitData = () =>
  window.Telegram?.WebApp?.initData || '';

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

export const fetchEntitlements = () =>
  getJson<EntitlementsResponse>('/me/entitlements');

export const fetchPlans = () =>
  getJson<PlansResponse>('/plans');
