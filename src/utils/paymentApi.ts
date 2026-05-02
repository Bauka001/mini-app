import WebApp from '@twa-dev/sdk';
import { buildApiUrl } from './apiBase';

const getTelegramInitData = () => window.Telegram?.WebApp?.initData || WebApp?.initData || '';

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

export type TonPlanCode = 'basic' | 'pro' | 'premium';

export interface TonPaymentIntent {
  paymentOrderId: string;
  planCode: TonPlanCode;
  provider: 'ton';
  address: string;
  amountNano: number;
  amountTon: string;
  currency: 'TON';
  memo: string;
  expiresAt: string;
  createdAt: string;
  status: 'created' | 'pending' | 'paid' | 'failed' | 'expired' | 'canceled';
}

export interface PaymentStatusResponse {
  paymentOrderId: string;
  provider: 'ton';
  planCode: TonPlanCode;
  status: 'created' | 'pending' | 'paid' | 'failed' | 'expired' | 'canceled';
  amountNano: number;
  amountTon: string;
  currency: string;
  memo: string;
  paidAt: string | null;
  expiresAt: string;
  entitlement: null | {
    tierCode: TonPlanCode;
    status: 'active' | 'expired' | 'revoked';
    startsAt: string;
    endsAt: string;
  };
}

export const createTonPaymentIntent = (planCode: TonPlanCode) =>
  postJson<TonPaymentIntent>('/payments/ton/create', { planCode });

export const getPaymentStatus = (paymentOrderId: string) =>
  getJson<PaymentStatusResponse>(`/payments/${encodeURIComponent(paymentOrderId)}/status`);
