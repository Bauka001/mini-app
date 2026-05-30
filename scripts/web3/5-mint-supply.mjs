#!/usr/bin/env node
/**
 * Mint 1B $FOCUS to treasury after deploy.
 *
 *   node scripts/web3/5-mint-supply.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mnemonicToWalletKey } from '@ton/crypto';
import {
  TonClient, WalletContractV4, Address, toNano,
  beginCell, internal, SendMode,
} from '@ton/ton';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '..', '.env');

const env = Object.fromEntries(
  fs.readFileSync(ENV_PATH, 'utf8').split('\n')
    .map((l) => /^([A-Z0-9_]+)=(.*)$/i.exec(l.trim()))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, '')])
);

const MNEMONIC = (env.TREASURY_MNEMONIC || '').trim().split(/\s+/).filter(Boolean);
const MASTER = env.FOCUS_JETTON_MASTER_ADDRESS;
const NETWORK = (env.TON_NETWORK || 'testnet').toLowerCase();
const IS_MAINNET = NETWORK === 'mainnet';

if (MNEMONIC.length !== 24) throw new Error('TREASURY_MNEMONIC missing');
if (!MASTER) throw new Error('FOCUS_JETTON_MASTER_ADDRESS missing — deploy first');

const key = await mnemonicToWalletKey(MNEMONIC);
const wallet = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey });
const masterAddr = Address.parse(MASTER);

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
      console.log(`  retry ${label} (${i+1}/${max}) in ${sec}s — ${(e.message||e).slice(0,80)}`);
      await new Promise((r) => setTimeout(r, sec * 1000));
    }
  }
  throw new Error(`${label}: gave up`);
}

console.log('=== Mint 1B $FOCUS to treasury ===');
console.log('Treasury:', wallet.address.toString({ testOnly: !IS_MAINNET, bounceable: false }));
console.log('Master:  ', MASTER);

// Build mint internal-transfer message:
//   op: 0x178d4519 (mint)
//   query_id: 0
//   to: treasury address
//   amount: 0.05 TON (forwarded with the internal transfer)
//   inner:
//     op: 0x178d4519 (internal-transfer)
//     query_id: 0
//     jetton_amount: 1B * 10^9
//     from: master
//     response: treasury
//     forward_ton: 0
//     forward_payload: null
const supplyUnits = 1_000_000_000n * 10n ** 9n;

const internalTransfer = beginCell()
  .storeUint(0x178d4519, 32)        // op
  .storeUint(0, 64)                 // query_id
  .storeCoins(supplyUnits)          // jetton amount
  .storeAddress(masterAddr)         // from
  .storeAddress(wallet.address)     // response
  .storeCoins(0n)                   // forward_ton_amount
  .storeBit(false)                  // no forward payload
  .endCell();

const mintBody = beginCell()
  .storeUint(21, 32)                // op: mint (standard jetton-minter v1)
  .storeUint(0, 64)                 // query_id
  .storeAddress(wallet.address)     // to
  .storeCoins(toNano('0.05'))       // amount to send to jetton wallet
  .storeRef(internalTransfer)
  .endCell();

const openedWallet = client.open(wallet);
const seqno = await withRetry(() => openedWallet.getSeqno(), 'getSeqno');
console.log('Wallet seqno:', seqno);

console.log('\nSending mint tx (treasury → master, 0.10 TON value)…');
await withRetry(() => openedWallet.sendTransfer({
  secretKey: key.secretKey,
  seqno,
  sendMode: SendMode.PAY_GAS_SEPARATELY,
  messages: [
    internal({
      to: masterAddr,
      value: toNano('0.1'),
      bounce: true,
      body: mintBody,
    }),
  ],
}), 'sendMint');
console.log('✓ Mint tx sent.');
console.log('\nWaiting ~30s…');
await new Promise((r) => setTimeout(r, 30_000));

console.log('\nDone. Check treasury\'s jetton wallet on Tonviewer:');
console.log('  https://' + (IS_MAINNET ? '' : 'testnet.') + 'tonviewer.com/' + MASTER);
