#!/usr/bin/env node

/**
 * Telegram Stars Test Script
 * 
 * Usage: node test-stars.js
 * 
 * This script tests the Telegram Stars payment integration.
 * It creates a test payment intent and checks the bot configuration.
 */

require('dotenv').config();
const https = require('https');

const BOT_TOKEN = process.env.BOT_TOKEN;

function makeApiRequest(endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`;
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${BOT_TOKEN}/${endpoint}`,
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testBotConnection() {
  try {
    console.log('🔍 Testing bot connection...');
    const response = await makeApiRequest('getMe');
    
    if (response.ok) {
      console.log(`✅ Bot connected successfully!`);
      console.log(`🤖 Bot name: ${response.result.first_name}`);
      console.log(`🆔 Bot username: @${response.result.username}`);
      console.log(`🔢 Bot ID: ${response.result.id}`);
      return true;
    } else {
      console.error('❌ Bot connection failed');
      console.error('Error:', response.description);
      return false;
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    return false;
  }
}

async function checkWebhookInfo() {
  try {
    console.log('\n🔍 Checking webhook information...');
    const response = await makeApiRequest('getWebhookInfo');
    
    if (response.ok) {
      const webhookUrl = response.result.url;
      if (webhookUrl) {
        console.log(`✅ Webhook is configured`);
        console.log(`🔗 Webhook URL: ${webhookUrl}`);
      } else {
        console.log('⚠️  No webhook configured');
      }
      return webhookUrl;
    }
    return false;
  } catch (error) {
    console.error('❌ Error checking webhook:', error.message);
    return false;
  }
}

async function testCreateInvoice() {
  try {
    console.log('\n🔍 Testing invoice creation...');
    
    const testPayload = {
      title: 'TEST PAYMENT',
      description: 'Test payment for Stars integration',
      payload: `test_${Date.now()}`,
      currency: 'XTR',
      prices: [{
        label: 'Test Item',
        amount: 10 // 10 Stars
      }],
      provider_token: '' // Empty for Stars
    };

    const response = await makeApiRequest('createInvoiceLink', testPayload);
    
    if (response.ok) {
      console.log('✅ Invoice created successfully!');
      console.log(`🔗 Invoice link: ${response.result}`);
      console.log('💡 You can open this link to test payment flow');
      return response.result;
    } else {
      console.error('❌ Invoice creation failed');
      console.error('Error:', response.description);
      return false;
    }
  } catch (error) {
    console.error('❌ Error creating invoice:', error.message);
    return false;
  }
}

async function checkStarsBalance() {
  try {
    console.log('\n🔍 Checking Stars transactions...');
    const response = await makeApiRequest('getStarTransactions');
    
    if (response.ok) {
      const transactions = response.result.transactions || [];
      console.log(`✅ Found ${transactions.length} transaction(s)`);
      
      if (transactions.length > 0) {
        console.log('\n📊 Recent transactions:');
        transactions.slice(0, 5).forEach(tx => {
          const type = tx.type === 'purchase' ? '💰' : '🔻';
          const amount = tx.amount / 1000000000; // Convert from nanostars to stars
          console.log(`  ${type} ${amount} XTR - ${tx.title || 'No title'}`);
        });
      }
      return transactions;
    }
    return false;
  } catch (error) {
    console.error('❌ Error checking transactions:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Telegram Stars Integration Test\n');
  console.log('=' .repeat(50));

  if (!BOT_TOKEN || BOT_TOKEN === 'your_telegram_bot_token_here') {
    console.error('❌ Error: BOT_TOKEN is not configured in .env file');
    console.log('Please set your Telegram Bot Token in the .env file');
    process.exit(1);
  }

  const botConnected = await testBotConnection();
  if (!botConnected) {
    console.log('\n❌ Cannot proceed with tests. Bot connection failed.');
    process.exit(1);
  }

  await checkWebhookInfo();

  console.log('\n' + '='.repeat(50));
  console.log('🧪 Starting payment flow tests...\n');

  await testCreateInvoice();
  await checkStarsBalance();

  console.log('\n' + '='.repeat(50));
  console.log('✅ Test completed!');
  console.log('\n💡 Next steps:');
  console.log('1. Make sure your server is running: npm run dev');
  console.log('2. Set up webhook: node setup-webhook.js');
  console.log('3. Test the payment flow in your mini app');
  console.log('4. Monitor Stars balance in BotFather');

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});