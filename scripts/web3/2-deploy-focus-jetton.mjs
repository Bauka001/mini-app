#!/usr/bin/env node
/**
 * Step 2 — Deploy the $FOCUS jetton master on TON via minter.ton.org.
 *
 * Why a guide instead of a script?
 *   Deploying a TEP-74 jetton master requires either the compiled FunC
 *   contract BoC (large + we'd have to vendor a build) or a hosted tool.
 *   minter.ton.org is the canonical, audited Tonkeeper-supported deployer
 *   and is faster + safer for a single one-shot deploy.
 *
 * Steps (5-10 minutes):
 *
 *   1. Open https://minter.ton.org/
 *   2. Switch network to TESTNET (top-right toggle).
 *   3. Click "Connect Wallet" → pick "Tonkeeper" or "Telegram Wallet".
 *      IMPORTANT: connect with the TREASURY wallet (the one whose mnemonic
 *      step 1 generated). NOT your personal wallet.
 *      - In Tonkeeper: Settings → Add Wallet → Import existing → paste the
 *        24-word mnemonic from step 1.
 *   4. Click "Mint your token" with the following fields:
 *      - Name:           Focus Token
 *      - Symbol:         FOCUS
 *      - Decimals:       9
 *      - Initial supply: 1000000000   (1 billion — 9 zeros)
 *      - Description:    Focus Mini-App utility token. Earned through
 *                        gameplay, redeemable in-app for VIP / cases / NFTs.
 *      - Image URL:      https://focus-game-omega.vercel.app/focus-token.png
 *
 *   5. Confirm the tx in Tonkeeper (~0.25 testnet TON gas).
 *   6. Once deployed, minter.ton.org shows the Jetton Master address. Copy it.
 *   7. Paste into .env:
 *        FOCUS_JETTON_MASTER_ADDRESS="EQA…"   (testnet bounceable form)
 *        TON_NETWORK="testnet"
 *
 *   8. Verify on Tonviewer:
 *        https://testnet.tonviewer.com/<FOCUS_JETTON_MASTER_ADDRESS>
 *      You should see Symbol=FOCUS, Decimals=9, Total Supply=1,000,000,000.
 *
 *   9. Run step 3 (`node scripts/web3/3-verify-treasury.mjs`) to confirm
 *      the treasury holds the full supply ready for user claims.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mnemonicToWalletKey } from '@ton/crypto';
import { TonClient, WalletContractV4, Address } from '@ton/ton';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = /^([A-Z0-9_]+)=(.*)$/i.exec(line.trim());
    if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  });
}

const MNEMONIC = (process.env.TREASURY_MNEMONIC || '').trim().split(/\s+/).filter(Boolean);
if (MNEMONIC.length !== 24) {
  console.log('TREASURY_MNEMONIC not in .env — see this file\'s header for setup.');
  process.exit(0);
}

const NETWORK = process.env.TON_NETWORK || 'testnet';
const endpoint = NETWORK === 'mainnet'
  ? 'https://toncenter.com/api/v2/jsonRPC'
  : 'https://testnet.toncenter.com/api/v2/jsonRPC';
const client = new TonClient({ endpoint, apiKey: process.env.TON_API_KEY || undefined });

const key = await mnemonicToWalletKey(MNEMONIC);
const wallet = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey });

const addrFriendly = wallet.address.toString({ testOnly: NETWORK !== 'mainnet', bounceable: false });
console.log('\n=== Treasury Status ===');
console.log('Network:', NETWORK);
console.log('Address:', addrFriendly);
console.log('Tonviewer:', NETWORK === 'mainnet'
  ? `https://tonviewer.com/${addrFriendly}`
  : `https://testnet.tonviewer.com/${addrFriendly}`);

try {
  const opened = client.open(wallet);
  const balance = await opened.getBalance();
  console.log('Balance:', (Number(balance) / 1e9).toFixed(4), 'TON');
  if (balance < 1_000_000_000n) {
    console.log('\n⚠️  Balance < 1 TON. Top up at https://t.me/testgiver_ton_bot (testnet) before deploying jetton.');
  } else {
    console.log('\n✅ Ready for jetton deploy via https://minter.ton.org/');
  }
} catch (e) {
  console.log('Balance: (unable to query — wallet may not be deployed yet, that\'s fine)');
}

console.log('\nFollow the instructions in this file\'s header to deploy via minter.ton.org.');
