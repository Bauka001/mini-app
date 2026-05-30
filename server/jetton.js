// $FOCUS jetton on-chain helpers — used by /api/web3 admin claim approval.
//
// Resolves the treasury wallet from TREASURY_MNEMONIC, queries jetton wallet
// addresses via the master, and signs `transfer` (op 0xf8a7ea5) messages to
// pay out user claims. Designed to fail soft when env is missing so the
// rest of the server keeps working in mock mode.
//
// Env required for real transfers:
//   TREASURY_MNEMONIC=word1 word2 … word24
//   FOCUS_JETTON_MASTER_ADDRESS=EQA…           (testnet bounceable form)
//   TON_NETWORK=testnet|mainnet                (default: testnet)
//   TON_API_KEY=…                              (optional, raises rate limit)

const { mnemonicToWalletKey } = require('@ton/crypto');
const {
  TonClient,
  WalletContractV4,
  Address,
  beginCell,
  toNano,
  internal,
  SendMode,
} = require('@ton/ton');

const NETWORK = (process.env.TON_NETWORK || 'testnet').toLowerCase();
const IS_MAINNET = NETWORK === 'mainnet';
const FOCUS_DECIMALS = 9;

function getEndpoint() {
  return IS_MAINNET
    ? 'https://toncenter.com/api/v2/jsonRPC'
    : 'https://testnet.toncenter.com/api/v2/jsonRPC';
}

function getExplorerBase() {
  return IS_MAINNET
    ? 'https://tonviewer.com'
    : 'https://testnet.tonviewer.com';
}

let cachedClient = null;
let cachedTreasury = null;

function getClient() {
  if (cachedClient) return cachedClient;
  cachedClient = new TonClient({
    endpoint: getEndpoint(),
    apiKey: process.env.TON_API_KEY || undefined,
  });
  return cachedClient;
}

async function getTreasury() {
  if (cachedTreasury) return cachedTreasury;
  const mnemonic = (process.env.TREASURY_MNEMONIC || '').trim().split(/\s+/).filter(Boolean);
  if (mnemonic.length !== 24) throw new Error('TREASURY_MNEMONIC must be 24 words');
  const key = await mnemonicToWalletKey(mnemonic);
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey });
  cachedTreasury = { key, wallet, address: wallet.address };
  return cachedTreasury;
}

function isConfigured() {
  const mnemonic = (process.env.TREASURY_MNEMONIC || '').trim().split(/\s+/).filter(Boolean);
  const master = (process.env.FOCUS_JETTON_MASTER_ADDRESS || '').trim();
  return mnemonic.length === 24 && master.length > 40;
}

function toFocusUnits(amountWhole) {
  // amountWhole is a number like 100 (= 100 $FOCUS), convert to nano units.
  const bi = BigInt(Math.floor(Number(amountWhole) * 1e3)); // sub-units of 0.001
  return bi * 10n ** BigInt(FOCUS_DECIMALS - 3);
}

function explorerTx(hash) {
  return `${getExplorerBase()}/transaction/${hash}`;
}

function explorerAddr(addr) {
  return `${getExplorerBase()}/${addr}`;
}

/**
 * Resolve the jetton-wallet address for a given owner (the treasury's wallet,
 * or any user's wallet). Calls `get_wallet_address(slice owner)` on the master.
 */
async function getJettonWalletAddress(ownerAddress) {
  const master = Address.parse(process.env.FOCUS_JETTON_MASTER_ADDRESS);
  const client = getClient();
  const result = await client.runMethod(master, 'get_wallet_address', [
    { type: 'slice', cell: beginCell().storeAddress(ownerAddress).endCell() },
  ]);
  return result.stack.readAddress();
}

/**
 * Send `amountWhole` $FOCUS from the treasury to the user's wallet.
 * Returns { ok, txHash, explorer } or { ok: false, reason }.
 */
async function sendFocus(toUserAddress, amountWhole, { comment = 'Focus claim' } = {}) {
  if (!isConfigured()) {
    return { ok: false, reason: 'jetton_not_configured' };
  }
  if (!toUserAddress) {
    return { ok: false, reason: 'missing_recipient' };
  }

  const treasury = await getTreasury();
  const client = getClient();
  const opened = client.open(treasury.wallet);

  // Treasury jetton wallet — where the $FOCUS supply sits.
  const treasuryJW = await getJettonWalletAddress(treasury.address);

  // Build the TEP-74 transfer body:
  //   op: 0xf8a7ea5
  //   query_id: random
  //   amount: amount of jettons
  //   destination: user's owner address
  //   response_destination: treasury (for excess)
  //   custom_payload: null
  //   forward_ton_amount: 0.000000001 (1 nanoton — triggers notification)
  //   forward_payload: text-comment cell
  const recipient = Address.parse(toUserAddress);
  const queryId = BigInt(Math.floor(Date.now()));
  const amountUnits = toFocusUnits(amountWhole);

  const forwardPayload = beginCell()
    .storeUint(0, 32)                         // op = 0 → text comment
    .storeStringTail(String(comment).slice(0, 120))
    .endCell();

  const transferBody = beginCell()
    .storeUint(0xf8a7ea5, 32)                 // op: transfer
    .storeUint(queryId, 64)
    .storeCoins(amountUnits)                  // jetton amount
    .storeAddress(recipient)                  // destination owner
    .storeAddress(treasury.address)           // response destination
    .storeBit(false)                          // no custom payload
    .storeCoins(1n)                           // forward_ton_amount = 1 nanoton
    .storeBit(true)                           // forward_payload as ref
    .storeRef(forwardPayload)
    .endCell();

  const seqno = await opened.getSeqno();
  await opened.sendTransfer({
    secretKey: treasury.key.secretKey,
    seqno,
    sendMode: SendMode.PAY_GAS_SEPARATELY,
    messages: [
      internal({
        to: treasuryJW,
        value: toNano('0.06'),                // gas for jetton transfer
        bounce: true,
        body: transferBody,
      }),
    ],
  });

  // We don't have the exact tx hash without waiting/polling, but we can
  // surface the treasury address and let UI link to it.
  return {
    ok: true,
    queryId: queryId.toString(),
    treasuryAddr: treasury.address.toString({ testOnly: !IS_MAINNET, bounceable: false }),
    treasuryExplorer: explorerAddr(treasury.address.toString({ testOnly: !IS_MAINNET, bounceable: false })),
    network: NETWORK,
  };
}

/**
 * Read a user's on-chain $FOCUS balance (read-only — safe to call without
 * the mnemonic, only needs FOCUS_JETTON_MASTER_ADDRESS).
 * Returns { ok, balance: number, balanceUnits: string } or { ok: false }.
 */
async function getOnChainBalance(userAddressStr) {
  const master = (process.env.FOCUS_JETTON_MASTER_ADDRESS || '').trim();
  if (!master) return { ok: false, reason: 'jetton_not_configured' };
  if (!userAddressStr) return { ok: false, reason: 'missing_address' };

  try {
    const userAddr = Address.parse(userAddressStr);
    const userJW = await getJettonWalletAddress(userAddr);
    const client = getClient();

    // get_wallet_data returns (balance, owner, master, code)
    const result = await client.runMethod(userJW, 'get_wallet_data');
    const balanceUnits = result.stack.readBigNumber();
    const balance = Number(balanceUnits) / 10 ** FOCUS_DECIMALS;
    return {
      ok: true,
      balance,
      balanceUnits: balanceUnits.toString(),
      walletAddress: userJW.toString({ testOnly: !IS_MAINNET, bounceable: true }),
      explorer: explorerAddr(userJW.toString({ testOnly: !IS_MAINNET, bounceable: true })),
    };
  } catch (e) {
    // Most likely: user has never received any $FOCUS — their jetton wallet
    // doesn't exist yet, so get_wallet_data returns an exit code. That's a
    // "0 balance", not an error.
    return { ok: true, balance: 0, balanceUnits: '0', note: 'no_wallet_deployed' };
  }
}

module.exports = {
  isConfigured,
  getTreasury,
  getOnChainBalance,
  sendFocus,
  explorerTx,
  explorerAddr,
  NETWORK,
  IS_MAINNET,
};
