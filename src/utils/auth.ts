import { apiUrl as resolveApiUrl } from './env';

export async function verifyTelegramInitData(initData: string) {
  const url = `${resolveApiUrl()}/auth/verify`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    });
    if (!resp.ok) {
      console.warn('[auth] verify HTTP', resp.status, 'from', url);
      return { ok: false, reason: `http_${resp.status}` };
    }
    return (await resp.json()) as { ok: boolean; userId?: number; reason?: string; mode?: string };
  } catch (err) {
    // Don't lose the diagnostic — Telegram users get stuck on the auth screen
    // when this swallows real errors. We log loudly and tag the reason.
    console.error('[auth] verify request failed:', err);
    return { ok: false, reason: 'network_error' };
  }
}

