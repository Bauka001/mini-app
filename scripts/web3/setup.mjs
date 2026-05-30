#!/usr/bin/env node
/**
 * One-shot $FOCUS jetton setup wizard.
 *
 *   npm run web3:setup
 *
 * What it does:
 *   1. Generates a 24-word TON treasury wallet (or reuses one from .env).
 *   2. Writes TREASURY_MNEMONIC + TON_NETWORK=testnet to .env (preserves other keys).
 *   3. Opens https://t.me/testgiver_ton_bot in browser — asks you to deposit.
 *   4. Polls treasury balance until ≥1 testnet TON arrives.
 *   5. Opens https://minter.ton.org for jetton deploy walkthrough.
 *   6. Prompts for the deployed Jetton Master address.
 *   7. Writes FOCUS_JETTON_MASTER_ADDRESS to .env.
 *   8. (Optional) Pushes all 3 vars to Vercel and triggers `vercel --prod`.
 *
 * The script is idempotent — re-run it any time to repair a partial setup.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mnemonicNew, mnemonicToWalletKey } from '@ton/crypto';
import { TonClient, WalletContractV4, Address } from '@ton/ton';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const ENV_PATH = path.join(ROOT, '.env');

// ---------- Small helpers ----------
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const log = (msg) => console.log(msg);
const step = (n, msg) => console.log(`\n${C.bold}${C.cyan}━━━ Step ${n}: ${msg}${C.reset}\n`);
const ok = (msg) => console.log(`${C.green}✓${C.reset} ${msg}`);
const warn = (msg) => console.log(`${C.yellow}⚠${C.reset} ${msg}`);
const fail = (msg) => console.log(`${C.red}✗${C.reset} ${msg}`);

const rl = readline.createInterface({ input: stdin, output: stdout });
const ask = (q) => rl.question(`${C.bold}? ${q}${C.reset} `);

function readEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};
  const out = {};
  fs.readFileSync(ENV_PATH, 'utf8').split('\n').forEach((line) => {
    const m = /^([A-Z0-9_]+)=(.*)$/i.exec(line.trim());
    if (m) out[m[1]] = m[2].replace(/^"|"$/g, '');
  });
  return out;
}

function writeEnvVars(updates) {
  let lines = fs.existsSync(ENV_PATH)
    ? fs.readFileSync(ENV_PATH, 'utf8').split('\n')
    : [];
  for (const [key, value] of Object.entries(updates)) {
    const re = new RegExp(`^${key}=`);
    const newLine = `${key}="${value}"`;
    const idx = lines.findIndex((l) => re.test(l));
    if (idx >= 0) lines[idx] = newLine;
    else lines.push(newLine);
  }
  if (lines[lines.length - 1] !== '') lines.push('');
  fs.writeFileSync(ENV_PATH, lines.join('\n'));
}

function tryOpen(url) {
  const cmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  try { execSync(cmd, { stdio: 'ignore' }); ok(`Opened: ${url}`); }
  catch { warn(`Could not auto-open. Visit manually: ${url}`); }
}

// ---------- Main ----------
log(`${C.bold}╔════════════════════════════════════════╗${C.reset}`);
log(`${C.bold}║   $FOCUS Jetton — Phase 1 Wizard        ║${C.reset}`);
log(`${C.bold}╚════════════════════════════════════════╝${C.reset}`);

const env = readEnv();
const network = env.TON_NETWORK || 'testnet';
const isMainnet = network === 'mainnet';
const explorerBase = isMainnet ? 'https://tonviewer.com' : 'https://testnet.tonviewer.com';
const endpoint = isMainnet
  ? 'https://toncenter.com/api/v2/jsonRPC'
  : 'https://testnet.toncenter.com/api/v2/jsonRPC';

const client = new TonClient({ endpoint, apiKey: env.TON_API_KEY || undefined });

// ===== Step 1: Treasury wallet =====
step(1, 'Treasury wallet');

let mnemonic = (env.TREASURY_MNEMONIC || '').trim().split(/\s+/).filter(Boolean);
if (mnemonic.length === 24) {
  ok('Treasury mnemonic already in .env — reusing.');
} else {
  log('No treasury found. Generating a fresh 24-word wallet…');
  mnemonic = await mnemonicNew(24);
  writeEnvVars({ TREASURY_MNEMONIC: mnemonic.join(' '), TON_NETWORK: network });
  ok('Treasury mnemonic written to .env (NEVER commit this file).');
}

const key = await mnemonicToWalletKey(mnemonic);
const wallet = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey });
const addrFriendly = wallet.address.toString({ testOnly: !isMainnet, bounceable: false });
log(`\n  Network:  ${C.bold}${network}${C.reset}`);
log(`  Address:  ${C.bold}${addrFriendly}${C.reset}`);
log(`  Tonviewer: ${explorerBase}/${addrFriendly}`);

// ===== Step 2: Top up testnet TON =====
step(2, 'Top up treasury with testnet TON');

const opened = client.open(wallet);
let balance = 0n;
try { balance = await opened.getBalance(); } catch {}
const balanceTon = Number(balance) / 1e9;
log(`Current balance: ${C.bold}${balanceTon.toFixed(4)} TON${C.reset}`);

if (balance < 1_000_000_000n) {
  warn('Need ≥1 TON for deploy + claim gas.');
  log('\nOpening testnet faucet bot…');
  log(`Send your treasury address to:  ${C.bold}https://t.me/testgiver_ton_bot${C.reset}`);
  log(`Treasury address to send to:    ${C.bold}${addrFriendly}${C.reset}\n`);
  tryOpen('https://t.me/testgiver_ton_bot');
  await ask('Press ENTER once you\'ve sent the testnet TON…');

  // Poll for arrival
  process.stdout.write('Polling balance');
  for (let i = 0; i < 60; i++) {
    try { balance = await opened.getBalance(); } catch {}
    if (balance >= 1_000_000_000n) break;
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log('');
  if (balance < 1_000_000_000n) {
    fail('Balance still <1 TON. Re-run this script after the faucet drops the funds.');
    rl.close(); process.exit(1);
  }
  ok(`Treasury topped up: ${(Number(balance) / 1e9).toFixed(4)} TON`);
} else {
  ok('Already topped up.');
}

// ===== Step 3: Jetton master =====
step(3, 'Deploy $FOCUS jetton master');

let masterAddr = (env.FOCUS_JETTON_MASTER_ADDRESS || '').trim();
if (masterAddr.length > 40) {
  try {
    Address.parse(masterAddr);
    ok(`Jetton master already in .env: ${masterAddr}`);
  } catch {
    warn('FOCUS_JETTON_MASTER_ADDRESS in .env looks invalid — re-deploy.');
    masterAddr = '';
  }
}

if (!masterAddr) {
  log('\nDeploy via minter.ton.org (the canonical, audited Tonkeeper deployer).');
  log('Fill the form with:');
  log(`  • Name:           ${C.bold}Focus Token${C.reset}`);
  log(`  • Symbol:         ${C.bold}FOCUS${C.reset}`);
  log(`  • Decimals:       ${C.bold}9${C.reset}`);
  log(`  • Initial supply: ${C.bold}1000000000${C.reset}`);
  log(`  • Image URL:      ${C.bold}https://focus-game-omega.vercel.app/focus-token.png${C.reset}`);
  log(`\nIMPORTANT: switch to ${C.bold}TESTNET${C.reset} in the top-right toggle.`);
  log(`IMPORTANT: connect with the treasury wallet (import via mnemonic).`);
  log('\nOpening minter.ton.org…');
  tryOpen('https://minter.ton.org/');

  while (!masterAddr) {
    masterAddr = (await ask('Paste the deployed Jetton Master address (EQ… or kQ…):')).trim();
    if (!masterAddr) continue;
    try {
      Address.parse(masterAddr);
      ok(`Valid address: ${masterAddr}`);
    } catch (e) {
      fail(`Not a valid TON address: ${e.message}`);
      masterAddr = '';
    }
  }
  writeEnvVars({ FOCUS_JETTON_MASTER_ADDRESS: masterAddr });
  ok('FOCUS_JETTON_MASTER_ADDRESS written to .env');
}

log(`\nTonviewer: ${C.bold}${explorerBase}/${masterAddr}${C.reset}`);

// ===== Step 4: Vercel =====
step(4, 'Sync to Vercel production env');

const wantsVercel = (await ask('Push these 3 vars to Vercel and redeploy? [Y/n]:')).trim().toLowerCase();
if (wantsVercel === 'n' || wantsVercel === 'no') {
  warn('Skipping Vercel sync. You can run `npx vercel env add` manually later.');
} else {
  const vars = {
    TREASURY_MNEMONIC: mnemonic.join(' '),
    FOCUS_JETTON_MASTER_ADDRESS: masterAddr,
    TON_NETWORK: network,
  };
  for (const [name, value] of Object.entries(vars)) {
    log(`\nSyncing ${C.bold}${name}${C.reset}…`);
    // Remove existing (ignore failure if absent) then add
    try {
      execSync(`npx vercel env rm ${name} production --yes`, { cwd: ROOT, stdio: 'ignore' });
    } catch {}
    try {
      const child = spawn('npx', ['vercel', 'env', 'add', name, 'production'], {
        cwd: ROOT, stdio: ['pipe', 'inherit', 'inherit'], shell: true,
      });
      child.stdin.write(value + '\n');
      child.stdin.end();
      await new Promise((resolve, reject) => {
        child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`exit ${code}`)));
      });
      ok(`${name} synced`);
    } catch (e) {
      fail(`Failed to sync ${name}: ${e.message}`);
    }
  }

  log('\nTriggering production redeploy…');
  try {
    execSync('npx vercel --prod --yes', { cwd: ROOT, stdio: 'inherit' });
    ok('Production deploy complete.');
  } catch (e) {
    fail('Vercel deploy failed: ' + e.message);
  }
}

// ===== Done =====
step(5, 'Done!');
log(`${C.green}✓ Treasury:    ${addrFriendly}${C.reset}`);
log(`${C.green}✓ Jetton master: ${masterAddr}${C.reset}`);
log(`${C.green}✓ Network:       ${network}${C.reset}`);
log(`\nView jetton on Tonviewer: ${C.bold}${explorerBase}/${masterAddr}${C.reset}`);
log('\nNext: open the Mini App → Profile → connect a wallet → claim test $FOCUS.');
log('Admin path: /admin → 💎 $FOCUS → "Credit" + "Approve (auto)".');
log('\nFull walkthrough: scripts/web3/README.md');

rl.close();
