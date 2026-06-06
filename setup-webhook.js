#!/usr/bin/env node
// ESM module (root package.json has "type": "module"). Node 18+ has global fetch.

/**
 * Telegram Webhook Setup Script
 *
 * Usage: node setup-webhook.js
 *
 * Required .env vars:
 *   BOT_TOKEN     — token from BotFather
 *   WEBHOOK_URL   — public HTTPS URL pointing at /payments/stars/webhook
 */

import { readFileSync } from 'node:fs';

// Minimal .env loader (no dependency)
function loadEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
    const content = readFileSync(new URL('./.env', import.meta.url), 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* ignore */ }
  return undefined;
}

const BOT_TOKEN = loadEnv('BOT_TOKEN');
const WEBHOOK_URL = loadEnv('WEBHOOK_URL') || '';

if (!BOT_TOKEN || BOT_TOKEN === 'your_telegram_bot_token_here') {
  console.error('❌ BOT_TOKEN is not configured in .env file');
  process.exit(1);
}
if (!WEBHOOK_URL) {
  console.error('❌ WEBHOOK_URL is not configured in .env file');
  console.error('   Example: WEBHOOK_URL=https://your-domain.com/payments/stars/webhook');
  process.exit(1);
}

console.log('🚀 Setting up Telegram webhook…');
console.log(`📡 URL: ${WEBHOOK_URL}`);

try {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      drop_pending_updates: true,
      allowed_updates: ['pre_checkout_query', 'message', 'callback_query'],
    }),
  });
  const data = await res.json();
  if (data.ok) {
    console.log('✅ Webhook configured');
    console.log('💡 Test a Stars purchase — pre_checkout_query and successful_payment should hit this URL.');
  } else {
    console.error('❌ setWebhook failed:', data.description);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Network error:', error.message);
  process.exit(1);
}

// Persistent "Launch game" menu button — the button next to the message input
// that every user sees; tapping it opens the Mini App directly.
const MINI_APP_URL = loadEnv('MINI_APP_URL') || '';
if (MINI_APP_URL) {
  try {
    const mb = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: { type: 'web_app', text: '🎮 Ойнау', web_app: { url: MINI_APP_URL } },
      }),
    });
    const mbData = await mb.json();
    if (mbData.ok) {
      console.log(`✅ Menu button set → "🎮 Ойнау" opens ${MINI_APP_URL}`);
    } else {
      console.error('❌ setChatMenuButton failed:', mbData.description);
    }
  } catch (error) {
    console.error('❌ Menu button network error:', error.message);
  }
} else {
  console.warn('⚠️  MINI_APP_URL not set — skipping persistent menu button');
}
