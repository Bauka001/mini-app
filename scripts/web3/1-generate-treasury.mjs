#!/usr/bin/env node
/**
 * Step 1 — Generate a new TON treasury wallet (24-word mnemonic).
 *
 *   node scripts/web3/1-generate-treasury.mjs
 *
 * Prints:
 *   - 24-word mnemonic (KEEP SECRET — paste into .env as TREASURY_MNEMONIC=…)
 *   - testnet address (deposit testnet TON from https://t.me/testgiver_ton_bot)
 *   - mainnet address (for when you graduate to Phase 3)
 *
 * The treasury holds the $FOCUS jetton master mint authority + a stash of
 * jettons used to fulfil user claims. NEVER reuse a personal wallet.
 */
import { mnemonicNew, mnemonicToWalletKey } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';

const mnemonic = await mnemonicNew(24);
const key = await mnemonicToWalletKey(mnemonic);
const wallet = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey });

const testnetAddr = wallet.address.toString({ testOnly: true, bounceable: false });
const mainnetAddr = wallet.address.toString({ testOnly: false, bounceable: false });

console.log('\n=== FOCUS TREASURY WALLET ===\n');
console.log('Mnemonic (24 words — PASTE INTO .env, NEVER COMMIT):');
console.log('  TREASURY_MNEMONIC="' + mnemonic.join(' ') + '"\n');
console.log('Testnet address (deposit testnet TON here):');
console.log('  ' + testnetAddr);
console.log('  Tonviewer: https://testnet.tonviewer.com/' + testnetAddr + '\n');
console.log('Mainnet address (Phase 3):');
console.log('  ' + mainnetAddr + '\n');
console.log('Next: paste TREASURY_MNEMONIC into .env, then top up the testnet');
console.log('address from https://t.me/testgiver_ton_bot (gives 2 testnet TON).');
console.log('Then run: node scripts/web3/2-deploy-focus-jetton.mjs');
