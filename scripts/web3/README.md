# $FOCUS Jetton — Phase 1 (testnet) setup

Phase 1 goal: real on-chain `$FOCUS` jetton on TON **testnet**, real claim
flow (admin-approved transfers actually move jettons), real explorer links.
Zero mainnet cost. Reviewer sees a working Web3 layer.

## Prereq (one time)

- Node 22+ with the repo's `npm install` / `yarn install` already done.
- A second Telegram account to test wallet binding from (Tonkeeper or
  Telegram Wallet works, but switch each to **testnet** before binding).

## Steps

### 1. Generate the treasury wallet

```bash
node scripts/web3/1-generate-treasury.mjs
```

Output:
- 24-word mnemonic → paste into `.env` as `TREASURY_MNEMONIC="…"` (NEVER commit).
- Testnet address — copy this for the next step.

### 2. Top up treasury with testnet TON

Open https://t.me/testgiver_ton_bot and send the testnet address. It drops
~2 testnet TON to your wallet. We need ~0.5 TON for jetton deploy + per-claim gas.

Verify with:
```bash
node scripts/web3/2-deploy-focus-jetton.mjs
```

It prints the treasury balance. Once ≥1 TON, continue.

### 3. Deploy the jetton master on testnet via minter.ton.org

Follow the header instructions in `2-deploy-focus-jetton.mjs`. Summary:
1. Open https://minter.ton.org/ — switch to testnet.
2. Connect with Tonkeeper using the treasury mnemonic from step 1.
3. Mint with:
   - Name: `Focus Token`
   - Symbol: `FOCUS`
   - Decimals: `9`
   - Initial supply: `1000000000`
   - Image URL: `https://focus-game-omega.vercel.app/focus-token.png`
4. Confirm in Tonkeeper (~0.25 testnet TON).
5. Copy the Jetton Master address → paste into `.env`:
   ```env
   FOCUS_JETTON_MASTER_ADDRESS="EQA…"
   TON_NETWORK="testnet"
   ```

### 4. Add the same vars to Vercel

```bash
npx vercel env add TREASURY_MNEMONIC production
npx vercel env add FOCUS_JETTON_MASTER_ADDRESS production
npx vercel env add TON_NETWORK production
```

Then redeploy:
```bash
npx vercel --prod
```

### 5. Verify in the app

1. Open the Mini App from any account (Profile tab).
2. Connect a TON Connect wallet (Tonkeeper / Telegram Wallet on testnet).
3. The `$FOCUS` card should now show:
   - DB balance (top number, the gameplay-tracked credits)
   - On-chain row underneath: "On-chain · testnet 0.00 $FOCUS [Tonviewer →]"
   - "Claim on-chain" button enabled if you have available credits.

### 6. End-to-end test claim

1. As an admin, give yourself test credits:
   - Open `/admin` → `💎 $FOCUS` tab → "Credit" with reason=`onboarding_wallet_bind`, amount=`10`.
2. Back in the Mini App, press "Claim on-chain" — a row appears in
   `focus_claim_requests` with status=`pending`.
3. Back in admin → `💎 $FOCUS` → claims tab, press "✓ Approve (auto)" on the
   pending row. The server signs a jetton transfer from the treasury wallet
   to your bound wallet.
4. Within ~30s, your bound wallet receives the testnet $FOCUS. Verify by
   refreshing the Mini App — on-chain balance updates.

## Troubleshooting

- **`jetton_not_configured`** — `TREASURY_MNEMONIC` or `FOCUS_JETTON_MASTER_ADDRESS` missing in env.
- **`on_chain_send_failed`** — treasury out of TON for gas, or jetton master address wrong.
- **On-chain row never appears** — user hasn't bound a wallet, or `FOCUS_JETTON_MASTER_ADDRESS` not set on Vercel.
- **Balance shows 0 but admin sent OK** — check Tonviewer for the treasury's outgoing tx; the jetton transfer notification can take ~30-60s to propagate to Tonviewer.

## Going to mainnet (later)

When ready:
1. Repeat step 1 with a fresh wallet (NEVER reuse the testnet treasury mnemonic on mainnet).
2. Set `TON_NETWORK="mainnet"` in env.
3. Deploy via minter.ton.org with the mainnet toggle.
4. Buy real TON, top up the mainnet treasury.
5. Optional: list `$FOCUS/TON` pair on Ston.fi for liquidity.
