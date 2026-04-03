export async function verifyTelegramInitData(initData: string) {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const resp = await fetch(`${apiUrl}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    });
    const data = await resp.json();
    return data as { ok: boolean; userId?: number; reason?: string; mode?: string };
  } catch (e) {
    return { ok: false, reason: 'network_error' };
  }
}

