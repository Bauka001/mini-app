// Register the Telegram bot webhook so Telegram POSTs updates to our server.
// Run once after deploy (or whenever you change the URL/secret):
//   node server/scripts/register-webhook.js
//
// Env required: BOT_TOKEN, TELEGRAM_WEBHOOK_URL, TELEGRAM_WEBHOOK_SECRET
// On success, prints the registered URL. Telegram caches it until you call again.

const path = require('path');

if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  } catch {}
}

const { setWebhook } = require('../lib/telegramApi');

(async () => {
  const url = process.env.TELEGRAM_WEBHOOK_URL || '';
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  if (!url || !secretToken) {
    console.error('Missing TELEGRAM_WEBHOOK_URL or TELEGRAM_WEBHOOK_SECRET');
    process.exit(1);
  }
  if (!process.env.BOT_TOKEN) {
    console.error('Missing BOT_TOKEN');
    process.exit(1);
  }
  try {
    const result = await setWebhook({
      url,
      secretToken,
      allowedUpdates: ['message', 'pre_checkout_query'],
    });
    console.log('setWebhook OK:', JSON.stringify(result));
  } catch (err) {
    console.error('setWebhook failed:', err.message);
    process.exit(1);
  }
})();
