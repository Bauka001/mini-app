#!/usr/bin/env node

/**
 * Telegram Webhook Setup Script
 * 
 * Usage: node setup-webhook.js
 * 
 * This script sets up the Telegram Stars webhook for payment notifications.
 * Make sure your .env file contains a valid BOT_TOKEN.
 */

require('dotenv').config();
const https = require('https');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-domain.com/payments/stars/webhook';

if (!BOT_TOKEN || BOT_TOKEN === 'your_telegram_bot_token_here') {
  console.error('❌ Error: BOT_TOKEN is not configured in .env file');
  console.log('Please set your Telegram Bot Token in the .env file');
  process.exit(1);
}

function setupWebhook() {
  const webhookData = JSON.stringify({
    url: WEBHOOK_URL,
    drop_pending_updates: true
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${BOT_TOKEN}/setWebhook`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(webhookData)
    }
  };

  console.log('🚀 Setting up Telegram Stars webhook...');
  console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.ok) {
          console.log('✅ Webhook set up successfully!');
          console.log(`🔗 Webhook URL: ${response.result.url}`);
          console.log('📱 Payment notifications will now be sent to your server');
        } else {
          console.error('❌ Failed to set up webhook');
          console.error('Error:', response.description);
        }
      } catch (error) {
        console.error('❌ Failed to parse response:', error);
        console.error('Response:', data);
      }
      process.exit(0);
    });
  });

  req.on('error', (error) => {
    console.error('❌ Failed to set up webhook:', error.message);
    process.exit(1);
  });

  req.write(webhookData);
  req.end();
}

setupWebhook();