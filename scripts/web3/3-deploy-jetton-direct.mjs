#!/usr/bin/env node
/**
 * Direct $FOCUS jetton deploy — no UI, no Tonkeeper, no minter.ton.org.
 *
 *   node scripts/web3/3-deploy-jetton-direct.mjs
 *
 * Requires .env:
 *   TREASURY_MNEMONIC="… 24 words …"
 *   TON_NETWORK=testnet     (or "mainnet")
 *
 * What it does:
 *   1. Loads the V4 wallet from TREASURY_MNEMONIC.
 *   2. Deploys the canonical TEP-74 jetton-minter from @ton-community/assets-sdk.
 *   3. Mints 1,000,000,000 $FOCUS to the treasury.
 *   4. Writes FOCUS_JETTON_MASTER_ADDRESS to .env.
 *
 * Cost: ~0.5 testnet TON (deploy + mint).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mnemonicToWalletKey } from '@ton/crypto';
import { TonClient, TonClient4, WalletContractV4, Address, toNano } from '@ton/ton';
import { AssetsSDK, NoopStorage } from '@ton-community/assets-sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '..', '.env');

// ---------- Load .env ----------
function readEnv() {
  const out = {};
  if (!fs.existsSync(ENV_PATH)) return out;
  fs.readFileSync(ENV_PATH, 'utf8').split('\n').forEach((line) => {
    const m = /^([A-Z0-9_]+)=(.*)$/i.exec(line.trim());
    if (m) out[m[1]] = m[2].replace(/^"|"$/g, '');
  });
  return out;
}
function writeEnv(updates) {
  let lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
  for (const [k, v] of Object.entries(updates)) {
    const re = new RegExp(`^${k}=`);
    const newLine = `${k}="${v}"`;
    const idx = lines.findIndex((l) => re.test(l));
    if (idx >= 0) lines[idx] = newLine;
    else lines.push(newLine);
  }
  if (lines[lines.length - 1] !== '') lines.push('');
  fs.writeFileSync(ENV_PATH, lines.join('\n'));
}

const env = readEnv();
const MNEMONIC = (env.TREASURY_MNEMONIC || '').trim().split(/\s+/).filter(Boolean);
const NETWORK = (env.TON_NETWORK || 'testnet').toLowerCase();
const IS_MAINNET = NETWORK === 'mainnet';

if (MNEMONIC.length !== 24) {
  console.error('✗ TREASURY_MNEMONIC missing in .env. Run npm run web3:treasury first.');
  process.exit(1);
}

const log = (m) => console.log(m);
const ok = (m) => console.log('\x1b[32m✓\x1b[0m ' + m);
const explorer = (addr) => `https://${IS_MAINNET ? '' : 'testnet.'}tonviewer.com/${addr}`;

log('\n=== Direct $FOCUS Jetton Deploy ===');
log('Network: ' + NETWORK);

// ---------- Wallet + client ----------
const key = await mnemonicToWalletKey(MNEMONIC);
const wallet = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey });
const addrFriendly = wallet.address.toString({ testOnly: !IS_MAINNET, bounceable: false });
log('Treasury (V4): ' + addrFriendly);
log('  Tonviewer:   ' + explorer(addrFriendly));

// TonClient4 — Tonhub's higher-throughput backend that uses TON liteservers.
// Rate-limit-free for individual users, much more reliable than toncenter v2.
const ENDPOINT = IS_MAINNET
  ? 'https://mainnet-v4.tonhubapi.com'
  : 'https://testnet-v4.tonhubapi.com';
const tonClient = new TonClient4({ endpoint: ENDPOINT, timeout: 60_000 });
log('RPC endpoint: ' + ENDPOINT);

async function withRetry(fn, label, max = 8) {
  for (let i = 0; i < max; i++) {
    try { return await fn(); }
    catch (e) {
      const sec = Math.min(60, 4 + i * 4);
      console.log(`  retry ${label} (${i+1}/${max}) in ${sec}s — ${e.message?.slice(0, 80) || e}`);
      await new Promise((r) => setTimeout(r, sec * 1000));
    }
  }
  throw new Error(`${label}: exhausted retries`);
}

// TonClient4 uses getAccountLite — not getBalance — so we wrap it.
const balance = await withRetry(async () => {
  const last = await tonClient.getLastBlock();
  const acct = await tonClient.getAccountLite(last.last.seqno, wallet.address);
  return BigInt(acct.account.balance.coins);
}, 'getBalance');
log('Balance:       ' + (Number(balance) / 1e9).toFixed(4) + ' TON');
if (balance < toNano('0.5')) {
  console.error('✗ Need ≥0.5 TON for deploy. Top up first.');
  process.exit(1);
}

// ---------- AssetsSDK with V4 sender, using our own TonClient ----------
// (assets-sdk's createApi defaults to @orbs-network/ton-access which is
// broken for testnet — we use the direct toncenter RPC client instead.)
log('\nDeploying jetton-minter contract…');
const sender = tonClient.open(wallet).sender(key.secretKey);
const sdk = AssetsSDK.create({
  api: tonClient,
  storage: new NoopStorage(),
  sender,
});

// Metadata — uses our /public/focus-jetton.json off-chain
const METADATA_URL = 'https://focus-game-omega.vercel.app/focus-jetton.json';
const IMAGE_URL = 'https://focus-game-omega.vercel.app/focus-token.png';

// Deploy first (no premint — keeps it one tx, less state-fetching),
// then mint in a separate step.
const jetton = await withRetry(() => sdk.deployJetton({
  name: 'Focus Token',
  description: 'Focus Mini-App utility token. Earned through gameplay, redeemable for VIP plans, mystery cases, and limited-edition NFT trophies.',
  image: IMAGE_URL,
  symbol: 'FOCUS',
  decimals: 9,
}, {
  adminAddress: wallet.address,
  onchainContent: true,
}), 'deployJetton');

const masterAddrRaw = jetton.address;
const masterAddrFriendly = masterAddrRaw.toString({ testOnly: !IS_MAINNET, bounceable: true });
ok('Jetton master deployed: ' + masterAddrFriendly);
log('  Tonviewer: ' + explorer(masterAddrFriendly));

// ---------- Wait for active state + mint ----------
log('\nWaiting ~25s for contract to settle…');
await new Promise((r) => setTimeout(r, 25_000));

log('\nMinting 1,000,000,000 $FOCUS to treasury…');
try {
  const supplyUnits = 1_000_000_000n * 10n ** 9n; // 1B with 9 decimals
  const minter = sdk.openJetton(masterAddrRaw);
  // sendMint(sender, recipient, amount, options?)
  await withRetry(() => minter.sendMint(sender, wallet.address, supplyUnits), 'sendMint');
  ok('Mint sent.');
} catch (e) {
  console.error('⚠ Mint failed — you can mint manually later via admin tools.');
  console.error('  Error:', e.message);
}

// ---------- Persist + done ----------
writeEnv({ FOCUS_JETTON_MASTER_ADDRESS: masterAddrFriendly });
ok('FOCUS_JETTON_MASTER_ADDRESS written to .env');

log('\n=== DONE ===');
log('Jetton on Tonviewer: ' + explorer(masterAddrFriendly));
log('\nNext: re-run with --vercel-sync to push the new vars to production,');
log('  OR run:  npx vercel env add FOCUS_JETTON_MASTER_ADDRESS production');
