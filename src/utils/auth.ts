import { apiUrl as resolveApiUrl } from './env';
import { buildApiUrl } from './apiBase';

export async function verifyTelegramInitData(initData: string) {
  // Prefer the centralized buildApiUrl helper (upstream), fall back to resolveApiUrl for logging context.
  const url = buildApiUrl('/auth/verify') || `${resolveApiUrl()}/auth/verify`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    });

    if (!resp.ok) {
      console.warn('[auth] verify HTTP', resp.status, 'from', url);
    }

    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        reason: resp.ok ? 'non_json_response' : `http_${resp.status}`,
      };
    }

    const data = await resp.json();
    return data as { ok: boolean; userId?: number; reason?: string; mode?: string };
  } catch (err) {
    // Don't lose the diagnostic — Telegram users get stuck on the auth screen
    // when this swallows real errors. We log loudly and tag the reason.
    console.error('[auth] verify request failed:', err);
    return { ok: false, reason: 'network_error' };
  }
}
