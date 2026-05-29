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

export type StarsProductKind =
  | 'vip'
  | 'case'
  | 'revive'
  | 'ticket'
  | 'wheel_spin'
  | 'coins'
  | 'focus';

export interface StarsProduct {
  code: string;
  kind: StarsProductKind;
  amountStars: number;
  label: string;
  description: string;
  meta?: {
    tierCode?: string;
    caseId?: string;
    amount?: number;
    durationDays?: number;
  };
}

export interface StarsProductsResponse {
  products: StarsProduct[];
  configured: boolean;
}

export interface StarsPaymentIntent {
  paymentOrderId: string;
  productCode: string;
  kind: StarsProductKind;
  provider: 'telegram_stars';
  invoiceLink: string;
  amountStars: number;
  currency: 'XTR';
  memo: string;
  expiresAt: string;
  createdAt: string;
  status: 'created' | 'pending' | 'paid' | 'failed' | 'expired' | 'canceled' | 'pending_grant';
}

export interface StarsPaymentStatus {
  paymentOrderId: string;
  status: StarsPaymentIntent['status'];
  amountStars: number;
  currency: string;
  provider: string;
  paidAt: string | null;
  expiresAt: string;
  productCode: string | null;
  kind: StarsProductKind | null;
}

export const listStarsProducts = () =>
  getJson<StarsProductsResponse>('/payments/stars/products');

export const createStarsPayment = (productCode: string, promoCode?: string) =>
  postJson<StarsPaymentIntent>('/payments/stars/create', { productCode, ...(promoCode ? { promoCode } : {}) });

export const getStarsPaymentStatus = (paymentOrderId: string) =>
  getJson<StarsPaymentStatus>(`/payments/stars/${encodeURIComponent(paymentOrderId)}/status`);

/**
 * Open Telegram's Stars invoice in the WebApp and poll status until paid/expired.
 * Returns the final status.
 *
 * Caller is responsible for refreshing entitlements / inventory / balance after success.
 */
export async function payWithStars(productCode: string, opts: {
  signal?: AbortSignal;
  onStatusChange?: (status: StarsPaymentStatus['status']) => void;
  pollIntervalMs?: number;
  timeoutMs?: number;
  promoCode?: string;
} = {}): Promise<StarsPaymentStatus> {
  const intent = await createStarsPayment(productCode, opts.promoCode);

  // Open Telegram's invoice UI
  if (typeof WebApp.openInvoice === 'function') {
    WebApp.openInvoice(intent.invoiceLink);
  } else {
    // Fallback: open in browser tab if openInvoice isn't available (dev env)
    window.open(intent.invoiceLink, '_blank');
  }

  // Poll status until terminal
  const pollMs = opts.pollIntervalMs ?? 2500;
  const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000;
  const startedAt = Date.now();
  let lastStatus: StarsPaymentStatus['status'] = intent.status;

  while (Date.now() - startedAt < timeoutMs) {
    if (opts.signal?.aborted) {
      throw new Error('aborted');
    }
    await new Promise((r) => setTimeout(r, pollMs));
    try {
      const status = await getStarsPaymentStatus(intent.paymentOrderId);
      if (status.status !== lastStatus) {
        lastStatus = status.status;
        opts.onStatusChange?.(status.status);
      }
      if (status.status === 'paid') return status;
      if (status.status === 'expired' || status.status === 'failed' || status.status === 'canceled') {
        return status;
      }
    } catch (e) {
      // transient network errors — keep polling until timeout
      console.warn('[stars] status poll error:', e);
    }
  }
  throw new Error('payment_timeout');
}
