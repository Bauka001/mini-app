/**
 * Rewarded-ad integration for the Telegram Mini App, via Adsgram
 * (https://adsgram.ai) — the most common rewarded-video network for Telegram
 * Mini Apps. Register a "Rewarded" block at adsgram.ai, then put its Block ID
 * in VITE_ADSGRAM_BLOCK_ID.
 *
 * showRewardedAd() resolves { done: true } ONLY when the user actually watched
 * the ad to the reward point (so callers can safely grant the reward), and
 * { done: false } when the ad was skipped / closed early / errored.
 *
 * If no block id is configured yet, it resolves { done: true, shown: false } so
 * the surrounding reward flow keeps working — real ads start gating the reward
 * the moment VITE_ADSGRAM_BLOCK_ID is set (the backend already caps ad rewards
 * at 5/day, so the interim "no-ad" window can't be farmed).
 */

const BLOCK_ID = `${import.meta.env.VITE_ADSGRAM_BLOCK_ID || ''}`.trim();
const SDK_URL = 'https://sad.adsgram.ai/js/sad.min.js';

type AdsgramController = { show: () => Promise<unknown> };

declare global {
  interface Window {
    Adsgram?: { init: (opts: { blockId: string }) => AdsgramController };
  }
}

export const isAdsConfigured = (): boolean => Boolean(BLOCK_ID);

let sdkPromise: Promise<boolean> | null = null;
function loadSdk(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Adsgram) return Promise.resolve(true);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<boolean>((resolve) => {
    try {
      const existing = document.querySelector(`script[src="${SDK_URL}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(Boolean(window.Adsgram)));
        existing.addEventListener('error', () => resolve(false));
        if (window.Adsgram) resolve(true);
        return;
      }
      const s = document.createElement('script');
      s.src = SDK_URL;
      s.async = true;
      s.onload = () => resolve(Boolean(window.Adsgram));
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    } catch {
      resolve(false);
    }
  });
  return sdkPromise;
}

let controller: AdsgramController | null = null;
async function getController(): Promise<AdsgramController | null> {
  if (!BLOCK_ID) return null;
  if (controller) return controller;
  const ok = await loadSdk();
  if (!ok || !window.Adsgram) return null;
  try {
    controller = window.Adsgram.init({ blockId: BLOCK_ID });
    return controller;
  } catch {
    return null;
  }
}

/** Optionally warm up the SDK so the first ad shows instantly. Safe no-op when unconfigured. */
export function preloadAds(): void {
  if (BLOCK_ID) void getController();
}

export type AdResult = { done: boolean; shown: boolean; reason?: string };

export async function showRewardedAd(): Promise<AdResult> {
  // Not wired to a network yet — let the reward flow proceed (interim).
  if (!BLOCK_ID) return { done: true, shown: false, reason: 'not_configured' };

  const ctrl = await getController();
  if (!ctrl) return { done: false, shown: false, reason: 'sdk_unavailable' };

  try {
    // Adsgram's show() resolves when the reward is earned and rejects on
    // close/skip/error — exactly the gate we want.
    await ctrl.show();
    return { done: true, shown: true };
  } catch (e) {
    return { done: false, shown: false, reason: e instanceof Error ? e.message : 'ad_dismissed' };
  }
}
