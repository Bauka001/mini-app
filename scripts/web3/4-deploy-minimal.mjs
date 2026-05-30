#!/usr/bin/env node
/**
 * MINIMAL jetton deploy — no SDK provider, no ContractProvider, just V4 wallet
 * sending a deploy + init tx directly. Designed to work around TonClient4
 * provider quirks.
 *
 *   node scripts/web3/4-deploy-minimal.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mnemonicToWalletKey } from '@ton/crypto';
import {
  TonClient, WalletContractV4, Address, toNano,
  beginCell, contractAddress, internal, SendMode, Cell, Dictionary,
} from '@ton/ton';
import { createHash } from 'node:crypto';
import { JettonMinter, jettonContentToInternal } from '@ton-community/assets-sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '..', '.env');

const env = Object.fromEntries(
  (fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '')
    .split('\n')
    .map((l) => /^([A-Z0-9_]+)=(.*)$/i.exec(l.trim()))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, '')])
);

const MNEMONIC = (env.TREASURY_MNEMONIC || '').trim().split(/\s+/).filter(Boolean);
const NETWORK = (env.TON_NETWORK || 'testnet').toLowerCase();
const IS_MAINNET = NETWORK === 'mainnet';
if (MNEMONIC.length !== 24) throw new Error('TREASURY_MNEMONIC missing');

const log = (m) => console.log(m);
const ok = (m) => console.log('\x1b[32m✓\x1b[0m ' + m);
const explorer = (a) => `https://${IS_MAINNET ? '' : 'testnet.'}tonviewer.com/${a}`;

// Build snake-encoded on-chain content cell (TEP-64)
// Format: prefix(0x00) + dict<sha256(key), value-cell>
function onchainContentCell({ name, symbol, description, decimals, image }) {
  const dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
  const setStr = (key, value) => {
    const cell = beginCell().storeUint(0, 8).storeStringTail(value).endCell();
    dict.set(BigInt('0x' + sha256Hex(key)), cell);
  };
  setStr('name', name);
  setStr('symbol', symbol);
  setStr('description', description);
  setStr('decimals', String(decimals));
  setStr('image', image);
  return beginCell().storeUint(0x00, 8).storeDict(dict).endCell();
}

function sha256Hex(s) {
  return createHash('sha256').update(s).digest('hex');
}

// ---------- Setup ----------
log('\n=== Minimal Jetton Deploy ===');
log('Network: ' + NETWORK);

const key = await mnemonicToWalletKey(MNEMONIC);
const wallet = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey });
const treasuryFriendly = wallet.address.toString({ testOnly: !IS_MAINNET, bounceable: false });
log('Treasury (V4): ' + treasuryFriendly);

// TonClient v2 with optional API key (works without if calls are sparse).
const client = new TonClient({
  endpoint: IS_MAINNET
    ? 'https://toncenter.com/api/v2/jsonRPC'
    : 'https://testnet.toncenter.com/api/v2/jsonRPC',
  apiKey: env.TON_API_KEY || undefined,
  timeout: 90_000,
});

async function withRetry(fn, label, max = 6) {
  for (let i = 0; i < max; i++) {
    try { return await fn(); }
    catch (e) {
      const sec = 6 + i * 6;
      console.log(`  retry ${label} (${i+1}/${max}) in ${sec}s — ${(e.message || e).slice(0, 80)}`);
      await new Promise((r) => setTimeout(r, sec * 1000));
    }
  }
  throw new Error(`${label}: gave up`);
}

const balance = await withRetry(() => client.getBalance(wallet.address), 'getBalance');
log('Balance: ' + (Number(balance) / 1e9).toFixed(4) + ' TON');
if (balance < toNano('0.5')) throw new Error('Need ≥0.5 TON');

// ---------- Build jetton master init ----------
const adminAddr = wallet.address;
const content = onchainContentCell({
  name: 'Focus Token',
  symbol: 'FOCUS',
  description: 'Focus Mini-App utility token. Earned through gameplay, redeemable for VIP, cases, and limited-edition NFT trophies.',
  decimals: 9,
  image: 'https://focus-game-omega.vercel.app/focus-token.png',
});

const jm = JettonMinter.createFromConfig(
  { admin: adminAddr, content },
  JettonMinter.code,
  0,
);
const masterAddr = jm.address;
const masterFriendly = masterAddr.toString({ testOnly: !IS_MAINNET, bounceable: true });
log('Jetton Master (predicted): ' + masterFriendly);
log('  Tonviewer: ' + explorer(masterFriendly));

// ---------- Send deploy tx from V4 wallet ----------
const init = jm.init; // { code, data }

const openedWallet = client.open(wallet);
const seqno = await withRetry(() => openedWallet.getSeqno(), 'getSeqno');
log('Wallet seqno: ' + seqno);

log('\nSending deploy tx (treasury → predicted master, 0.15 TON, with state init)…');
await withRetry(() => openedWallet.sendTransfer({
  secretKey: key.secretKey,
  seqno,
  sendMode: SendMode.PAY_GAS_SEPARATELY,
  messages: [
    internal({
      to: masterAddr,
      value: toNano('0.15'),
      init,
      body: beginCell().endCell(),
      bounce: false,
    }),
  ],
}), 'sendDeploy');
ok('Deploy tx sent.');

log('\nWaiting ~25s for chain to settle…');
await new Promise((r) => setTimeout(r, 25_000));

// Verify deploy succeeded
const state = await withRetry(() => client.getContractState(masterAddr), 'verifyState');
log('Master state: ' + state.state);

// Persist
let lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
const k = 'FOCUS_JETTON_MASTER_ADDRESS';
const newLine = `${k}="${masterFriendly}"`;
const idx = lines.findIndex(l => new RegExp(`^${k}=`).test(l));
if (idx >= 0) lines[idx] = newLine; else lines.push(newLine);
if (lines[lines.length-1] !== '') lines.push('');
fs.writeFileSync(ENV_PATH, lines.join('\n'));
ok('FOCUS_JETTON_MASTER_ADDRESS written to .env');

log('\n=== DEPLOY DONE ===');
log('Tonviewer: ' + explorer(masterFriendly));
log('\nNext: send mint tx (separate step). Or use admin claim flow to start sending.');
