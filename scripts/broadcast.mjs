#!/usr/bin/env node
/**
 * Broadcast the launch message (with a "🚀 Запустить" button) to every bot user.
 *
 *   node scripts/broadcast.mjs          # send to everyone
 *   node scripts/broadcast.mjs --pin    # send AND pin in each chat (stays on top)
 *   node scripts/broadcast.mjs --dry    # just list recipients, send nothing
 *
 * Notes:
 *  - Reaches only users who have STARTED the bot. Telegram forbids bots from
 *    messaging users who never pressed Start (those return 403 → counted as
 *    "blocked/unreachable").
 *  - Rate-limited to ~16 msg/sec, well under Telegram's ~30/sec global limit,
 *    with a one-shot retry on 429.
 */
import { readFileSync } from 'node:fs';

const flags = new Set(process.argv.slice(2));
const PIN = flags.has('--pin');
const DRY = flags.has('--dry');

const env = (key) => {
  if (process.env[key]) return process.env[key];
  try {
    for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '').trim();
    }
  } catch { /* ignore */ }
  return '';
};

const BOT_TOKEN = env('BOT_TOKEN');
const SUPABASE_URL = env('SUPABASE_URL');
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const MINI_APP_URL = env('MINI_APP_URL_PUBLIC') || 'https://focus-game-omega.vercel.app';

if (!BOT_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing BOT_TOKEN / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// ── the broadcast content (edit freely) ──
const MESSAGE = [
  '🧠 <b>Focus</b> — миыңды күнде 5 минут жаттықтыр!',
  '',
  '🎯 10 ойын · 🏆 Чемпиондар лигасы (iPhone 17 жүлде!)',
  '🎁 Күн сайын тегін монета · 🔥 Streak жина',
  '',
  'Ойнауды баста 👇',
].join('\n');
const KEYBOARD = { inline_keyboard: [[{ text: '🚀 Запустить', web_app: { url: MINI_APP_URL } }]] };

const tg = async (method, payload) => {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return r.json();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchIds = async () => {
  const ids = new Set();
  const pull = async (path) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (r.ok) for (const row of await r.json()) if (row.telegram_id) ids.add(String(row.telegram_id));
  };
  await pull('users?select=telegram_id');
  await pull('app_visitors?select=telegram_id&is_verified=eq.true');
  return [...ids];
};

const send = async (id) => {
  const res = await tg('sendMessage', { chat_id: id, text: MESSAGE, parse_mode: 'HTML', reply_markup: KEYBOARD });
  if (res.ok) {
    if (PIN && res.result?.message_id) {
      await tg('pinChatMessage', { chat_id: id, message_id: res.result.message_id, disable_notification: true }).catch(() => {});
    }
    return 'sent';
  }
  if (res.error_code === 403) return 'blocked';
  if (res.error_code === 429) {
    await sleep(((res.parameters && res.parameters.retry_after) || 1) * 1000);
    const retry = await tg('sendMessage', { chat_id: id, text: MESSAGE, parse_mode: 'HTML', reply_markup: KEYBOARD });
    return retry.ok ? 'sent' : 'failed';
  }
  return 'failed';
};

(async () => {
  const ids = await fetchIds();
  console.log(`📢 Broadcast → ${ids.length} user(s)${DRY ? ' [DRY RUN]' : ''}${PIN ? ' [+pin]' : ''}`);
  if (DRY) { console.log(ids.join(', ') || '(none)'); return; }

  const tally = { sent: 0, blocked: 0, failed: 0 };
  for (const id of ids) {
    try { tally[await send(id)]++; } catch { tally.failed++; }
    await sleep(60);
  }
  console.log(`✅ Done — sent=${tally.sent}  unreachable=${tally.blocked}  failed=${tally.failed}`);
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
