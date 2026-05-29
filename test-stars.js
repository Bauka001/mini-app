#!/usr/bin/env node
// ESM module (root package.json has "type": "module"). Node 18+ has global fetch.

/**
 * Telegram Stars Integration Test
 *
 * Usage: node test-stars.js
 *
 * Checks (read-only + one throwaway invoice link):
 *   1. Bot reachability (getMe)
 *   2. Webhook configuration (getWebhookInfo)
 *   3. Invoice creation (createInvoiceLink with currency=XTR)
 *   4. Recent Stars transactions (getStarTransactions)
 */

import { readFileSync } from 'node:fs';

// Minimal .env loader (no dependency) — reads BOT_TOKEN from ./.env
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

async function api(method, body = null) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

console.log('🚀 Telegram Stars Integration Test\n' + '='.repeat(50));
if (!BOT_TOKEN || BOT_TOKEN === 'your_telegram_bot_token_here') {
  console.error('❌ BOT_TOKEN is not configured in .env');
  process.exit(1);
}

// 1. Bot
console.log('🔍 Bot reachability…');
const me = await api('getMe');
if (!me.ok) { console.error('❌ getMe failed:', me.description); process.exit(1); }
console.log(`✅ ${me.result.first_name} (@${me.result.username}, id=${me.result.id})`);

// 2. Webhook
console.log('\n🔍 Webhook info…');
const wh = await api('getWebhookInfo');
if (wh.ok) {
  if (wh.result.url) {
    console.log(`✅ Webhook URL: ${wh.result.url}`);
    if (wh.result.allowed_updates?.length) console.log(`   allowed_updates: ${wh.result.allowed_updates.join(', ')}`);
    if (wh.result.pending_update_count) console.log(`   ⚠️  ${wh.result.pending_update_count} pending update(s)`);
    if (wh.result.last_error_message) console.log(`   ❌ last error: ${wh.result.last_error_message}`);
  } else {
    console.log('⚠️  No webhook. Run: node setup-webhook.js');
  }
}

// 3. Invoice
console.log('\n🔍 createInvoiceLink (currency=XTR, 1 Star)…');
const inv = await api('createInvoiceLink', {
  title: 'Stars Integration Test',
  description: 'Throwaway invoice — do not pay',
  payload: `test_${me.result.id}`,
  currency: 'XTR',
  prices: [{ label: 'Test', amount: 1 }],
  provider_token: '',
});
if (inv.ok) {
  console.log(`✅ Invoice link: ${inv.result}`);
  console.log('   → Stars is ENABLED on this bot.');
} else {
  console.error('❌ createInvoiceLink failed:', inv.description);
  console.error('   → Enable Stars in BotFather → Payments → Stars');
}

// 4. Transactions
console.log('\n🔍 Recent Stars transactions…');
const tx = await api('getStarTransactions');
if (tx.ok) {
  const txs = tx.result.transactions || [];
  console.log(`✅ ${txs.length} transaction(s)`);
  txs.slice(0, 5).forEach((t) => console.log(`   ${t.source ? '⬇️' : '⬆️'}  ${t.amount} XTR — ${t.id}`));
} else {
  console.error('❌ getStarTransactions failed:', tx.description);
}

console.log('\n' + '='.repeat(50));
console.log('✅ Done.');
