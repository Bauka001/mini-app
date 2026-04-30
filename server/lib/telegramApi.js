'use strict';

const https = require('https');

const callBotApi = (method, payload) => {
  const botToken = process.env.BOT_TOKEN || '';
  if (!botToken) {
    return Promise.reject(new Error('BOT_TOKEN is not configured'));
  }
  const data = JSON.stringify(payload);
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${botToken}/${method}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (!parsed.ok) {
            const err = new Error(`Telegram API ${method} failed: ${parsed.description || 'unknown'}`);
            err.statusCode = res.statusCode;
            err.response = parsed;
            return reject(err);
          }
          resolve(parsed.result);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

const sendMessage = (chatId, text, extra = {}) =>
  callBotApi('sendMessage', { chat_id: chatId, text, ...extra });

// Telegram Stars use the special "XTR" currency and `prices` is in stars (no /100).
// For non-stars currencies, prices use the standard *100 minor unit.
const sendInvoice = ({ chatId, title, description, payload, currency, prices, providerToken }) =>
  callBotApi('sendInvoice', {
    chat_id: chatId,
    title,
    description,
    payload,
    provider_token: currency === 'XTR' ? '' : providerToken,
    currency,
    prices,
  });

const answerPreCheckoutQuery = (preCheckoutQueryId, ok, errorMessage) =>
  callBotApi('answerPreCheckoutQuery', {
    pre_checkout_query_id: preCheckoutQueryId,
    ok,
    ...(ok ? {} : { error_message: errorMessage || 'Payment cannot be processed' }),
  });

const setWebhook = ({ url, secretToken, allowedUpdates }) =>
  callBotApi('setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: allowedUpdates || ['message', 'pre_checkout_query'],
    drop_pending_updates: true,
  });

module.exports = {
  callBotApi,
  sendMessage,
  sendInvoice,
  answerPreCheckoutQuery,
  setWebhook,
};
