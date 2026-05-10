require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '200kb' }));

const PORT = Number(process.env.PORT || 3001);
const isProduction = process.env.NODE_ENV === 'production';
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const hasSupabase = Boolean(supabaseUrl && supabaseServiceRoleKey);
const supabase = hasSupabase ? createClient(supabaseUrl, supabaseServiceRoleKey) : null;

const parseIdList = (value = '') =>
  value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);

const bootstrapAdminIds = parseIdList(
  process.env.ADMIN_BOOTSTRAP_TELEGRAM_IDS || process.env.VITE_ADMIN_TELEGRAM_IDS || ''
);
const TON_WALLET_ADDRESS = `${process.env.TON_WALLET_ADDRESS || ''}`.trim();
const TONCENTER_RPC_ENDPOINT = `${process.env.TONCENTER_RPC_ENDPOINT || 'https://toncenter.com/api/v2/jsonRPC'}`.trim();
const TONCENTER_API_KEY = `${process.env.TONCENTER_API_KEY || ''}`.trim();
const TON_PAYMENT_TTL_MS = 15 * 60 * 1000;
const TON_MIN_CONFIRMATIONS = Math.max(1, Number(process.env.TON_MIN_CONFIRMATIONS || 1));
const TON_TOPUP_KZT_PER_TON = Math.max(1, Number(process.env.TON_TOPUP_KZT_PER_TON || 1000));
const TON_PLAN_CATALOG = {
  basic: { tierCode: 'basic', durationDays: 365, amountNano: 10_000_000_000, displayAmount: '10 TON' },
  pro: { tierCode: 'pro', durationDays: 365, amountNano: 12_500_000_000, displayAmount: '12.5 TON' },
  premium: { tierCode: 'premium', durationDays: 365, amountNano: 15_000_000_000, displayAmount: '15 TON' },
};
const DEFAULT_TON_PROMO_CODE_CATALOG = {
  FOCUS10: { code: 'FOCUS10', discountPercent: 10, planCodes: ['basic', 'pro', 'premium'] },
};
const WHEEL_TOPUP_PACKAGE_CATALOG = {
  starter: { packageId: 'starter', crystals: 300, amountKzt: 300 },
  wheel_boost: { packageId: 'wheel_boost', crystals: 1000, amountKzt: 1000 },
  power_pack: { packageId: 'power_pack', crystals: 2500, amountKzt: 2500 },
};

const isMissingTableError = (error) =>
  Boolean(error && (error.code === '42P01' || `${error.message || ''}`.includes('does not exist')));

const mapAuditLog = (row) => ({
  id: row.id,
  actorTelegramId: row.actor_telegram_id,
  actorRole: row.actor_role,
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  payload: row.payload || {},
  createdAt: row.created_at,
});

const mapUserRow = (row) => ({
  telegramId: row.telegram_id,
  firstName: row.first_name,
  lastName: row.last_name,
  username: row.username,
  photoUrl: row.photo_url,
  level: row.level,
  xp: row.xp,
  coins: row.coins,
  gems: row.gems,
  plan: row.plan,
  isBlocked: row.is_blocked,
  blockedAt: row.blocked_at,
  blockedBy: row.blocked_by,
  blockReason: row.block_reason,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapChatReportRow = (row) => ({
  id: row.id,
  reporterTelegramId: row.reporter_telegram_id,
  reportedUserTelegramId: row.reported_user_telegram_id,
  username: row.username,
  groupId: row.group_id,
  groupName: row.group_name,
  messageId: row.message_id,
  messageText: row.message_text,
  status: row.status,
  reportCount: row.report_count,
  metadata: row.metadata || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapTicketRow = (row) => ({
  id: row.id,
  ticketNumber: row.ticket_number,
  userTelegramId: row.user_telegram_id,
  userName: row.user_name,
  eventName: row.event_name,
  eventDate: row.event_date,
  price: row.price,
  purchaseDate: row.purchase_date,
  status: row.status,
  source: row.source,
  verifiedAt: row.verified_at,
  verifiedBy: row.verified_by,
});

const normalizePlanCode = (value = '') => {
  const normalized = `${value}`.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(TON_PLAN_CATALOG, normalized) ? normalized : null;
};

const normalizePromoCode = (value = '') => `${value}`.trim().toUpperCase();

const formatTonAmount = (amountNano) =>
  `${(Number(amountNano) / 1_000_000_000).toFixed(6).replace(/\.?0+$/, '')} TON`;

const buildTonMemo = (paymentOrderId) => `FOCUS:${paymentOrderId}`;
const buildWheelTopupMemo = (topupId) => `WHEEL:${topupId}`;

function parseTonPromoCodeCatalog(rawValue = '') {
  if (!rawValue) {
    return DEFAULT_TON_PROMO_CODE_CATALOG;
  }

  try {
    const parsed = JSON.parse(rawValue);
    const entries = Array.isArray(parsed)
      ? parsed.map((item) => [item?.code, item])
      : Object.entries(parsed || {}).map(([code, value]) => [code, value]);

    const catalog = entries.reduce((accumulator, [rawCode, rawConfig]) => {
      const code = normalizePromoCode(rawCode);
      if (!code) {
        return accumulator;
      }

      const config = typeof rawConfig === 'number'
        ? { discountPercent: rawConfig }
        : rawConfig || {};
      const discountPercent = Math.max(1, Math.min(90, Number(config.discountPercent || 0)));

      if (!Number.isFinite(discountPercent) || discountPercent <= 0) {
        return accumulator;
      }

      const planCodes = Array.isArray(config.planCodes)
        ? config.planCodes.map(normalizePlanCode).filter(Boolean)
        : ['basic', 'pro', 'premium'];

      accumulator[code] = {
        code,
        discountPercent,
        planCodes: planCodes.length ? planCodes : ['basic', 'pro', 'premium'],
      };

      return accumulator;
    }, {});

    return Object.keys(catalog).length ? catalog : DEFAULT_TON_PROMO_CODE_CATALOG;
  } catch (error) {
    console.warn('[TON] Failed to parse promo catalog, using defaults:', error instanceof Error ? error.message : error);
    return DEFAULT_TON_PROMO_CODE_CATALOG;
  }
}

const TON_PROMO_CODE_CATALOG = parseTonPromoCodeCatalog(process.env.TON_PROMO_CODES || '');

function getTonPromoOffer(planCode, promoCode) {
  const normalizedPlanCode = normalizePlanCode(planCode);
  const normalizedPromoCode = normalizePromoCode(promoCode);

  if (!normalizedPlanCode || !normalizedPromoCode) {
    return null;
  }

  const promoOffer = TON_PROMO_CODE_CATALOG[normalizedPromoCode];
  if (!promoOffer) {
    return null;
  }

  return promoOffer.planCodes.includes(normalizedPlanCode) ? promoOffer : null;
}

function applyDiscountToNano(amountNano, discountPercent = 0) {
  const normalizedAmount = Number(amountNano || 0);
  const normalizedDiscount = Math.max(0, Math.min(90, Number(discountPercent || 0)));

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0 || normalizedDiscount <= 0) {
    return normalizedAmount;
  }

  return Math.max(1, Math.round(normalizedAmount * ((100 - normalizedDiscount) / 100)));
}

const getTonPayloadHeaders = () => ({
  'Content-Type': 'application/json',
  ...(TONCENTER_API_KEY ? { 'X-API-Key': TONCENTER_API_KEY } : {}),
});

async function getTonPlanOffer(planCode) {
  const normalizedPlanCode = normalizePlanCode(planCode);

  if (!normalizedPlanCode) {
    return null;
  }

  const fallbackOffer = TON_PLAN_CATALOG[normalizedPlanCode];

  if (!supabase) {
    return fallbackOffer;
  }

  try {
    const { data, error } = await supabase
      .from('plan_prices')
      .select('amount_nano, display_amount')
      .eq('plan_code', normalizedPlanCode)
      .eq('provider', 'ton')
      .eq('currency', 'TON')
      .eq('is_active', true)
      .maybeSingle();

    if (error && !isMissingTableError(error)) {
      throw error;
    }

    if (!data?.amount_nano) {
      return fallbackOffer;
    }

    const amountNano = Number(data.amount_nano);

    return {
      ...fallbackOffer,
      amountNano,
      displayAmount: data.display_amount || formatTonAmount(amountNano),
    };
  } catch (error) {
    console.warn('[TON] Falling back to in-code price map:', error instanceof Error ? error.message : error);
    return fallbackOffer;
  }
}

function getWheelTopupPackage(packageId) {
  const normalizedPackageId = `${packageId || ''}`.trim();
  return Object.prototype.hasOwnProperty.call(WHEEL_TOPUP_PACKAGE_CATALOG, normalizedPackageId)
    ? WHEEL_TOPUP_PACKAGE_CATALOG[normalizedPackageId]
    : null;
}

function convertKztToTonNano(amountKzt) {
  const normalizedAmount = Number(amountKzt || 0);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return 0;
  }

  return Math.max(1, Math.round((normalizedAmount / TON_TOPUP_KZT_PER_TON) * 1_000_000_000));
}

async function writeTonPaymentCheck(checkPayload) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('ton_payment_checks').insert(checkPayload);
  if (error && !isMissingTableError(error)) {
    throw error;
  }
}

async function fetchRecentTonTransactions(address) {
  if (!TONCENTER_RPC_ENDPOINT) {
    return [];
  }

  const response = await fetch(TONCENTER_RPC_ENDPOINT, {
    method: 'POST',
    headers: getTonPayloadHeaders(),
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'focus-ton-get-transactions',
      method: 'getTransactions',
      params: {
        address,
        limit: 25,
        to_lt: 0,
        archival: false,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`TON RPC responded with ${response.status}`);
  }

  const payload = await response.json();
  if (payload?.error) {
    throw new Error(payload.error?.message || 'TON RPC returned an error');
  }

  return Array.isArray(payload?.result) ? payload.result : [];
}

function extractTonMessageComment(inMsg = {}) {
  const directMessage = typeof inMsg.message === 'string' ? inMsg.message.trim() : '';
  if (directMessage) {
    return directMessage;
  }

  const msgDataText = typeof inMsg.msg_data?.text === 'string' ? inMsg.msg_data.text.trim() : '';
  if (msgDataText) {
    return msgDataText;
  }

  const messageBody = typeof inMsg.message_content?.body === 'string' ? inMsg.message_content.body.trim() : '';
  if (messageBody) {
    return messageBody;
  }

  return '';
}

async function applyPaidEntitlement(paymentOrder, verificationPayload = {}) {
  if (!supabase) {
    throw new Error('Supabase service role is not configured');
  }

  const planOffer = await getTonPlanOffer(paymentOrder.plan_code);

  if (!planOffer) {
    throw new Error('Unknown plan for entitlement apply');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const userTelegramId = Number(paymentOrder.user_telegram_id);
  const paymentOrderId = `${paymentOrder.id}`;
  const activeEntitlementQuery = await supabase
    .from('user_entitlements')
    .select('ends_at')
    .eq('user_telegram_id', userTelegramId)
    .eq('status', 'active')
    .gte('ends_at', nowIso)
    .order('ends_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeEntitlementQuery.error && !isMissingTableError(activeEntitlementQuery.error)) {
    throw activeEntitlementQuery.error;
  }

  const carryForwardEndsAt = activeEntitlementQuery.data?.ends_at
    ? Date.parse(activeEntitlementQuery.data.ends_at)
    : 0;
  const entitlementStartMs = Math.max(Date.now(), carryForwardEndsAt || 0);
  const entitlementEndMs =
    entitlementStartMs + planOffer.durationDays * 24 * 60 * 60 * 1000;
  const entitlementStartIso = new Date(entitlementStartMs).toISOString();
  const entitlementEndIso = new Date(entitlementEndMs).toISOString();

  const paymentPayload = {
    ...(paymentOrder.provider_payload || {}),
    verification: verificationPayload,
  };

  const { error: paymentUpdateError } = await supabase
    .from('payment_orders')
    .update({
      status: 'paid',
      paid_at: nowIso,
      updated_at: nowIso,
      provider_charge_id: verificationPayload.txHash || paymentOrder.provider_charge_id || null,
      provider_payload: paymentPayload,
    })
    .eq('id', paymentOrderId)
    .in('status', ['created', 'pending']);

  if (paymentUpdateError) {
    throw paymentUpdateError;
  }

  const { error: entitlementError } = await supabase
    .from('user_entitlements')
    .upsert(
      {
        id: `ent-${paymentOrderId}`,
        user_telegram_id: userTelegramId,
        tier_code: planOffer.tierCode,
        status: 'active',
        starts_at: entitlementStartIso,
        ends_at: entitlementEndIso,
        source_payment_order_id: paymentOrderId,
        metadata: {
          provider: paymentOrder.provider,
          verification: verificationPayload,
        },
        updated_at: nowIso,
      },
      { onConflict: 'source_payment_order_id' }
    );

  if (entitlementError) {
    throw entitlementError;
  }

  const { error: userUpdateError } = await supabase
    .from('users')
    .update({
      plan: planOffer.tierCode,
      plan_expiry: entitlementEndMs,
      updated_at: nowIso,
    })
    .eq('telegram_id', userTelegramId);

  if (userUpdateError && !isMissingTableError(userUpdateError)) {
    throw userUpdateError;
  }

  sendTelegramMessage(
    userTelegramId,
    `TON payment расталды. Сіздің ${planOffer.tierCode.toUpperCase()} жоспарыңыз ${new Date(entitlementEndMs).toLocaleDateString('en-GB')} дейін белсенді.`
  );

  return {
    status: 'paid',
    paidAt: nowIso,
    tierCode: planOffer.tierCode,
    endsAt: entitlementEndIso,
  };
}

async function tryVerifyTonPayment(paymentOrder) {
  if (!supabase) {
    return { matched: false, reason: 'supabase_missing' };
  }

  if (!TON_WALLET_ADDRESS) {
    return { matched: false, reason: 'ton_wallet_missing' };
  }

  const now = Date.now();
  const expiresAtMs = Date.parse(paymentOrder.expires_at || '');

  if (Number.isFinite(expiresAtMs) && expiresAtMs > 0 && expiresAtMs < now) {
    const { error: expireError } = await supabase
      .from('payment_orders')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentOrder.id)
      .in('status', ['created', 'pending']);

    if (expireError) {
      throw expireError;
    }

    return { matched: false, reason: 'expired', status: 'expired' };
  }

  const expectedAmountNano = Number(paymentOrder.amount_nano || 0);
  const expectedMemo = `${paymentOrder.memo || ''}`.trim();
  const createdAtMs = Date.parse(paymentOrder.created_at || '');
  const transactions = await fetchRecentTonTransactions(TON_WALLET_ADDRESS);

  const matchedTransaction = transactions.find((tx) => {
    const inMsg = tx?.in_msg || {};
    const destination = `${inMsg.destination || ''}`.trim();
    const valueNano = Number(inMsg.value || 0);
    const txTimestampMs = Number(tx?.utime || tx?.now || 0) * 1000;
    const comment = extractTonMessageComment(inMsg);

    const matchesDestination = !destination || destination === TON_WALLET_ADDRESS;
    const matchesAmount = valueNano === expectedAmountNano;
    const matchesMemo = expectedMemo ? comment.includes(expectedMemo) : true;
    const matchesTimeWindow =
      (!Number.isFinite(createdAtMs) || txTimestampMs >= createdAtMs - 60_000) &&
      (!Number.isFinite(expiresAtMs) || txTimestampMs <= expiresAtMs + 10 * 60_000);

    return matchesDestination && matchesAmount && matchesMemo && matchesTimeWindow;
  });

  if (!matchedTransaction) {
    await writeTonPaymentCheck({
      payment_order_id: paymentOrder.id,
      amount_nano: expectedAmountNano,
      destination_address: TON_WALLET_ADDRESS,
      memo: expectedMemo,
      confirmations: 0,
      check_status: 'not_found',
      raw_payload: {},
    });

    return { matched: false, reason: 'not_found' };
  }

  const verificationPayload = {
    txHash:
      matchedTransaction?.transaction_id?.hash ||
      matchedTransaction?.hash ||
      matchedTransaction?.in_msg?.hash ||
      null,
    txLt: matchedTransaction?.transaction_id?.lt || matchedTransaction?.lt || null,
    sourceAddress: matchedTransaction?.in_msg?.source || null,
    destinationAddress: matchedTransaction?.in_msg?.destination || TON_WALLET_ADDRESS,
    amountNano: Number(matchedTransaction?.in_msg?.value || expectedAmountNano),
    memo: extractTonMessageComment(matchedTransaction?.in_msg || {}),
    confirmations: TON_MIN_CONFIRMATIONS,
    rawPayload: matchedTransaction,
  };

  await writeTonPaymentCheck({
    payment_order_id: paymentOrder.id,
    tx_hash: verificationPayload.txHash,
    tx_lt: verificationPayload.txLt,
    source_address: verificationPayload.sourceAddress,
    destination_address: verificationPayload.destinationAddress,
    amount_nano: verificationPayload.amountNano,
    memo: verificationPayload.memo,
    confirmations: verificationPayload.confirmations,
    check_status: verificationPayload.confirmations >= TON_MIN_CONFIRMATIONS ? 'matched' : 'pending',
    raw_payload: verificationPayload.rawPayload,
  });

  if (verificationPayload.confirmations < TON_MIN_CONFIRMATIONS) {
    return { matched: false, reason: 'confirmations_pending' };
  }

  const applied = await applyPaidEntitlement(paymentOrder, verificationPayload);
  return { matched: true, ...applied };
}

function validateTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return { ok: false, reason: 'missing_initdata_or_token' };
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  if (!hash) return { ok: false, reason: 'missing_hash' };
  urlParams.delete('hash');
  // Build data_check_string
  const pairs = [];
  for (const [key, value] of urlParams.entries()) {
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  const ok = calculatedHash === hash;

  let userId = null;
  try {
    const userStr = urlParams.get('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      userId = user.id || null;
    }
  } catch {}

  return { ok, userId, reason: ok ? null : 'hash_mismatch' };
}

function extractUserFromInitData(initData) {
  try {
    const urlParams = new URLSearchParams(initData || '');
    const userStr = urlParams.get('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

async function resolveIdentity(initData) {
  const botToken = process.env.BOT_TOKEN || '';

  // Local development fallback for empty initData
  if (!isProduction && !initData) {
    const fallbackUserId = bootstrapAdminIds[0] || 0;
    return { ok: true, mode: 'dev', userId: fallbackUserId };
  }

  if (!botToken) {
    if (isProduction) {
      return { ok: false, reason: 'bot_token_missing' };
    }

    const user = extractUserFromInitData(initData);
    const fallbackUserId = user?.id || bootstrapAdminIds[0] || 0;

    return { ok: true, mode: 'dev', userId: fallbackUserId };
  }

  return {
    ...validateTelegramInitData(initData, botToken),
    mode: 'telegram',
  };
}

const getInitData = (req) => req.body?.initData || req.headers['x-telegram-init-data'] || '';

function sendTelegramMessage(chatId, text) {
  const botToken = process.env.BOT_TOKEN || '';
  if (!botToken || !chatId) return;

  const data = JSON.stringify({
    chat_id: chatId,
    text: text,
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${botToken}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  };

  const req = https.request(options, (res) => {
    res.on('data', () => {}); // Consume data to free up memory
  });

  req.on('error', (e) => {
    console.error('Failed to send Telegram message:', e.message);
  });

  req.write(data);
  req.end();
}

async function getAdminMembership(telegramId) {
  const bootstrapAdmin = bootstrapAdminIds.includes(telegramId);

  if (!telegramId) {
    return {
      isAdmin: false,
      role: null,
      canManageAdmins: false,
      source: 'none',
    };
  }

  if (!supabase) {
    return bootstrapAdmin
      ? {
          isAdmin: true,
          role: 'owner',
          canManageAdmins: true,
          source: 'bootstrap',
        }
      : {
          isAdmin: false,
          role: null,
          canManageAdmins: false,
          source: 'none',
        };
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('telegram_id, role, is_active, created_at, created_by')
    .eq('telegram_id', telegramId)
    .eq('is_active', true)
    .maybeSingle();

  if (error && !isMissingTableError(error)) {
    throw error;
  }

  if (data) {
    return {
      isAdmin: true,
      role: data.role,
      canManageAdmins: data.role === 'owner',
      source: 'database',
    };
  }

  if (bootstrapAdmin) {
    return {
      isAdmin: true,
      role: 'owner',
      canManageAdmins: true,
      source: 'bootstrap',
    };
  }

  return {
    isAdmin: false,
    role: null,
    canManageAdmins: false,
    source: 'none',
  };
}

async function resolveRequestAccess(req, res, options = {}) {
  const { adminOnly = false, ownerOnly = false } = options;
  const identity = await resolveIdentity(getInitData(req));

  if (!identity.ok || !identity.userId) {
    res.status(401).json({ error: 'Telegram authentication failed', reason: identity.reason || null });
    return null;
  }

  const membership = await getAdminMembership(identity.userId);

  if (ownerOnly && !membership.canManageAdmins) {
    res.status(403).json({ error: 'Owner access required' });
    return null;
  }

  if (adminOnly && !membership.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }

  return { identity, membership };
}

function ensureSupabase(res) {
  if (supabase) {
    return true;
  }

  res.status(503).json({ error: 'Supabase service role is not configured' });
  return false;
}

async function writeAuditLog(actorTelegramId, actorRole, action, entityType, entityId, payload = {}) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('audit_logs').insert({
    actor_telegram_id: actorTelegramId,
    actor_role: actorRole,
    action,
    entity_type: entityType,
    entity_id: entityId,
    payload,
  });

  if (error && !isMissingTableError(error)) {
    throw error;
  }
}

async function writeModerationAction({
  adminTelegramId,
  reportId = null,
  targetUserTelegramId = null,
  actionType,
  reason = null,
  payload = {},
}) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('moderation_actions').insert({
    admin_telegram_id: adminTelegramId,
    report_id: reportId,
    target_user_telegram_id: targetUserTelegramId,
    action_type: actionType,
    reason,
    payload,
  });

  if (error && !isMissingTableError(error)) {
    throw error;
  }
}

async function countRows(table, applyFilters) {
  if (!supabase) {
    return 0;
  }

  let query = supabase.from(table).select('*', { count: 'exact', head: true });

  if (applyFilters) {
    query = applyFilters(query);
  }

  const { count, error } = await query;

  if (error) {
    if (isMissingTableError(error)) {
      return 0;
    }

    throw error;
  }

  return count || 0;
}

async function listAdminMembers() {
  const databaseMembers = [];

  if (supabase) {
    const { data, error } = await supabase
      .from('admin_users')
      .select('telegram_id, role, is_active, created_at, created_by')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error && !isMissingTableError(error)) {
      throw error;
    }

    if (Array.isArray(data)) {
      data.forEach((row) => {
        databaseMembers.push({
          telegramId: row.telegram_id,
          role: row.role,
          isActive: row.is_active,
          source: 'database',
          createdAt: row.created_at,
          createdBy: row.created_by,
        });
      });
    }
  }

  const seenIds = new Set(databaseMembers.map((member) => member.telegramId));

  bootstrapAdminIds.forEach((telegramId) => {
    if (!seenIds.has(telegramId)) {
      databaseMembers.push({
        telegramId,
        role: 'owner',
        isActive: true,
        source: 'bootstrap',
        createdAt: null,
        createdBy: null,
      });
    }
  });

  return databaseMembers.sort((left, right) => {
    if (left.role === right.role) {
      return left.telegramId - right.telegramId;
    }

    return left.role === 'owner' ? -1 : 1;
  });
}

async function listFeedbacks(limit = 50) {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('feedback_entries')
    .select('id, user_telegram_id, username, text, image_url, status, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }

    throw error;
  }

  if (!data.length) {
    return [];
  }

  const feedbackIds = data.map((item) => item.id);
  const { data: replyRows, error: replyError } = await supabase
    .from('feedback_replies')
    .select('id, feedback_id, admin_telegram_id, reply, created_at')
    .in('feedback_id', feedbackIds)
    .order('created_at', { ascending: false });

  if (replyError && !isMissingTableError(replyError)) {
    throw replyError;
  }

  const latestReplyByFeedbackId = new Map();

  (replyRows || []).forEach((replyRow) => {
    if (!latestReplyByFeedbackId.has(replyRow.feedback_id)) {
      latestReplyByFeedbackId.set(replyRow.feedback_id, {
        id: replyRow.id,
        adminTelegramId: replyRow.admin_telegram_id,
        reply: replyRow.reply,
        createdAt: replyRow.created_at,
      });
    }
  });

  return data.map((row) => ({
    id: row.id,
    userTelegramId: row.user_telegram_id,
    username: row.username,
    text: row.text,
    imageUrl: row.image_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestReply: latestReplyByFeedbackId.get(row.id) || null,
  }));
}

async function getFeedbackById(feedbackId) {
  const feedbacks = await listFeedbacks(200);
  return feedbacks.find((item) => item.id === feedbackId) || null;
}

app.post('/auth/verify', async (req, res) => {
  try {
    const identity = await resolveIdentity(req.body?.initData || '');
    const membership = await getAdminMembership(identity.userId || 0);
    return res.json({
      ok: identity.ok,
      reason: identity.reason || null,
      mode: identity.mode,
      userId: identity.userId || 0,
      isAdmin: membership.isAdmin,
      role: membership.role,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      reason: error instanceof Error ? error.message : 'auth_error',
    });
  }
});

app.post('/admin/session', async (req, res) => {
  try {
    const access = await resolveRequestAccess(req, res, { adminOnly: true });

    if (!access) {
      return;
    }

    return res.json({
      userId: access.identity.userId,
      isAdmin: access.membership.isAdmin,
      role: access.membership.role,
      canManageAdmins: access.membership.canManageAdmins,
      source: access.membership.source,
      authMode: access.identity.mode,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'session_error' });
  }
});

app.post('/feedback', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);

    if (!access) {
      return;
    }

    const text = `${req.body?.text || ''}`.trim();
    const username = `${req.body?.username || ''}`.trim();
    const userTelegramId = Number(req.body?.userTelegramId);
    const imageUrl = `${req.body?.imageUrl || ''}`.trim() || null;

    if (!text) {
      return res.status(400).json({ error: 'Feedback text is required' });
    }

    if (userTelegramId !== access.identity.userId) {
      return res.status(403).json({ error: 'Feedback identity mismatch' });
    }

    const { data, error } = await supabase
      .from('feedback_entries')
      .insert({
        user_telegram_id: userTelegramId,
        username: username || `user_${userTelegramId}`,
        text,
        image_url: imageUrl,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }
    
    // Notify admin
    for (const adminId of bootstrapAdminIds) {
       const message = `🚨 <b>Жаңа шағым/ұсыныс түсті!</b>\n\n<b>Пайдаланушы:</b> ${username || `user_${userTelegramId}`}\n<b>ID:</b> ${userTelegramId}\n<b>Мәтін:</b>\n${text}`;
       sendTelegramMessage(adminId, message);
    }

    return res.json({ ok: true, feedbackId: data.id });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'feedback_create_error' });
  }
});

app.post('/tickets/issue', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);

    if (!access) {
      return;
    }

    const ticketId = `${req.body?.id || ''}`.trim();
    const ticketNumber = Number(req.body?.ticketNumber);
    const userTelegramId = Number(req.body?.userTelegramId);

    if (!ticketId || !Number.isInteger(ticketNumber) || ticketNumber <= 0) {
      return res.status(400).json({ error: 'Invalid ticket payload' });
    }

    if (userTelegramId !== access.identity.userId) {
      return res.status(403).json({ error: 'Ticket identity mismatch' });
    }

    const { data, error } = await supabase
      .from('tickets')
      .upsert(
        {
          id: ticketId,
          ticket_number: ticketNumber,
          user_telegram_id: userTelegramId,
          user_name: `${req.body?.userName || ''}`.trim() || `user_${userTelegramId}`,
          event_name: `${req.body?.eventName || ''}`.trim() || 'Premium Event',
          event_date: req.body?.eventDate,
          price: Number(req.body?.price || 0),
          purchase_date: req.body?.purchaseDate,
          source: req.body?.source === 'ticket_purchase' ? 'ticket_purchase' : 'plan_upgrade',
        },
        { onConflict: 'id' }
      )
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    // Never send a premium success message from this endpoint.
    const isPlanUpgrade = req.body?.source !== 'ticket_purchase';
    if (userTelegramId && !isPlanUpgrade) {
      const messageText = 'Құттықтаймыз! Сіздің билетті сатып алу төлеміңіз тіркелді.';
      sendTelegramMessage(userTelegramId, messageText);
    }
    
    // Notify admin about the purchase
    for (const adminId of bootstrapAdminIds) {
       const userName = `${req.body?.userName || ''}`.trim() || `user_${userTelegramId}`;
       const eventName = `${req.body?.eventName || ''}`.trim() || 'Premium Event';
       const price = Number(req.body?.price || 0);
       const sourceText = isPlanUpgrade ? 'Тарифті жаңарту (Premium)' : 'Билет сатып алу';
       
       const message = `💰 <b>Жаңа төлем түсті!</b>\n\n<b>Пайдаланушы:</b> ${userName}\n<b>ID:</b> ${userTelegramId}\n<b>Түрі:</b> ${sourceText}\n<b>Атауы:</b> ${eventName}\n<b>Бағасы:</b> ${price} сома`;
       sendTelegramMessage(adminId, message);
    }

    return res.json({ ok: true, ticketId: data.id });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'ticket_issue_error' });
  }
});

app.post('/payments/ton/create', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);
    if (!access) {
      return;
    }

    if (!TON_WALLET_ADDRESS) {
      return res.status(503).json({ error: 'TON wallet receiver is not configured' });
    }

    const planCode = normalizePlanCode(req.body?.planCode);
    if (!planCode) {
      return res.status(400).json({ error: 'Unsupported plan code' });
    }

    const planOffer = await getTonPlanOffer(planCode);
    if (!planOffer) {
      return res.status(404).json({ error: 'Plan offer not found' });
    }

    const requestedPromoCode = normalizePromoCode(req.body?.promoCode);
    const promoOffer = requestedPromoCode ? getTonPromoOffer(planCode, requestedPromoCode) : null;
    if (requestedPromoCode && !promoOffer) {
      return res.status(400).json({ error: 'Promo code is invalid or not available for this plan' });
    }

    const baseAmountNano = Number(planOffer.amountNano);
    const discountedBaseAmountNano = applyDiscountToNano(baseAmountNano, promoOffer?.discountPercent || 0);
    const discountAmountNano = Math.max(0, baseAmountNano - discountedBaseAmountNano);
    const paymentOrderId = crypto.randomUUID();
    const amountNano = discountedBaseAmountNano + crypto.randomInt(1_000, 950_000);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + TON_PAYMENT_TTL_MS);
    const memo = buildTonMemo(paymentOrderId);

    const { data, error } = await supabase
      .from('payment_orders')
      .insert({
        id: paymentOrderId,
        user_telegram_id: access.identity.userId,
        provider: 'ton',
        plan_code: planCode,
        currency: 'TON',
        amount_nano: amountNano,
        status: 'pending',
        memo,
        provider_payload: {
          receiverAddress: TON_WALLET_ADDRESS,
          baseAmountNano,
          discountedBaseAmountNano,
          discountAmountNano,
          discountPercent: promoOffer?.discountPercent || 0,
          promoCode: promoOffer?.code || null,
          displayAmount: planOffer.displayAmount,
        },
        expires_at: expiresAt.toISOString(),
      })
      .select('id, plan_code, amount_nano, currency, status, memo, expires_at, created_at')
      .single();

    if (error) {
      throw error;
    }

    return res.json({
      paymentOrderId: data.id,
      planCode: data.plan_code,
      provider: 'ton',
      address: TON_WALLET_ADDRESS,
      amountNano: Number(data.amount_nano),
      amountTon: formatTonAmount(data.amount_nano),
      baseAmountNano,
      baseAmountTon: formatTonAmount(baseAmountNano),
      promoCode: promoOffer?.code || null,
      discountPercent: promoOffer?.discountPercent || 0,
      discountAmountNano,
      discountAmountTon: formatTonAmount(discountAmountNano),
      currency: data.currency,
      memo: data.memo,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      status: data.status,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'ton_payment_create_error' });
  }
});

app.get('/payments/:paymentOrderId/status', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);
    if (!access) {
      return;
    }

    const paymentOrderId = `${req.params?.paymentOrderId || ''}`.trim();
    if (!paymentOrderId) {
      return res.status(400).json({ error: 'Payment order id is required' });
    }

    const { data: paymentOrder, error } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('id', paymentOrderId)
      .eq('user_telegram_id', access.identity.userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Payment order not found' });
      }
      throw error;
    }

    let resolvedPaymentOrder = paymentOrder;

    if (resolvedPaymentOrder.provider === 'ton' && ['created', 'pending'].includes(resolvedPaymentOrder.status)) {
      const verification = await tryVerifyTonPayment(resolvedPaymentOrder);

      if (verification.status === 'paid' || verification.status === 'expired') {
        const refreshed = await supabase
          .from('payment_orders')
          .select('*')
          .eq('id', paymentOrderId)
          .single();

        if (refreshed.error) {
          throw refreshed.error;
        }

        resolvedPaymentOrder = refreshed.data;
      }
    }

    const entitlementQuery = await supabase
      .from('user_entitlements')
      .select('tier_code, status, starts_at, ends_at')
      .eq('source_payment_order_id', paymentOrderId)
      .maybeSingle();

    if (entitlementQuery.error && !isMissingTableError(entitlementQuery.error)) {
      throw entitlementQuery.error;
    }

    return res.json({
      paymentOrderId: resolvedPaymentOrder.id,
      provider: resolvedPaymentOrder.provider,
      planCode: resolvedPaymentOrder.plan_code,
      status: resolvedPaymentOrder.status,
      amountNano: Number(resolvedPaymentOrder.amount_nano),
      amountTon: formatTonAmount(resolvedPaymentOrder.amount_nano),
      currency: resolvedPaymentOrder.currency,
      memo: resolvedPaymentOrder.memo,
      paidAt: resolvedPaymentOrder.paid_at,
      expiresAt: resolvedPaymentOrder.expires_at,
      entitlement: entitlementQuery.data
        ? {
            tierCode: entitlementQuery.data.tier_code,
            status: entitlementQuery.data.status,
            startsAt: entitlementQuery.data.starts_at,
            endsAt: entitlementQuery.data.ends_at,
          }
        : null,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'payment_status_error' });
  }
});

app.post('/admin/dashboard', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res, { adminOnly: true });

    if (!access) {
      return;
    }

    const [
      totalUsers,
      blockedUsers,
      totalFeedbacks,
      pendingFeedbacks,
      totalTickets,
      pendingTickets,
      pendingChatReports,
      admins,
      feedbacks,
      auditRows,
    ] = await Promise.all([
      countRows('users'),
      countRows('users', (query) => query.eq('is_blocked', true)),
      countRows('feedback_entries'),
      countRows('feedback_entries', (query) => query.in('status', ['new', 'read'])),
      countRows('tickets'),
      countRows('tickets', (query) => query.eq('status', 'pending')),
      countRows('chat_reports', (query) => query.eq('status', 'pending')),
      listAdminMembers(),
      listFeedbacks(24),
      supabase
        .from('audit_logs')
        .select('id, actor_telegram_id, actor_role, action, entity_type, entity_id, payload, created_at')
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

    const auditLogs = auditRows.error && isMissingTableError(auditRows.error)
      ? []
      : auditRows.error
        ? (() => {
            throw auditRows.error;
          })()
        : auditRows.data.map(mapAuditLog);

    return res.json({
      stats: {
        totalUsers,
        blockedUsers,
        activeAdmins: admins.length,
        totalFeedbacks,
        pendingFeedbacks,
        totalTickets,
        pendingTickets,
        pendingChatReports,
      },
      feedbacks,
      auditLogs,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'dashboard_error' });
  }
});

app.post('/admin/users', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res, { adminOnly: true });

    if (!access) {
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('telegram_id, first_name, last_name, username, photo_url, level, xp, coins, gems, plan, is_blocked, blocked_at, blocked_by, block_reason, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(250);

    if (error) {
      throw error;
    }

    const users = data.map(mapUserRow);

    return res.json({
      users,
      stats: {
        total: users.length,
        active: users.filter((user) => !user.isBlocked).length,
        blocked: users.filter((user) => user.isBlocked).length,
        totalCoins: users.reduce((sum, user) => sum + Number(user.coins || 0), 0),
        totalXp: users.reduce((sum, user) => sum + Number(user.xp || 0), 0),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'users_error' });
  }
});

app.post('/admin/users/block', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res, { adminOnly: true });

    if (!access) {
      return;
    }

    const telegramId = Number(req.body?.telegramId);
    const blocked = Boolean(req.body?.blocked);
    const reason = `${req.body?.reason || ''}`.trim() || null;

    if (!Number.isInteger(telegramId) || telegramId <= 0) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (telegramId === access.identity.userId) {
      return res.status(400).json({ error: 'Self blocking is not allowed' });
    }

    const updatePayload = blocked
      ? {
          is_blocked: true,
          blocked_at: new Date().toISOString(),
          blocked_by: access.identity.userId,
          block_reason: reason,
        }
      : {
          is_blocked: false,
          blocked_at: null,
          blocked_by: null,
          block_reason: null,
        };

    const { data, error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('telegram_id', telegramId)
      .select('telegram_id, first_name, last_name, username, photo_url, level, xp, coins, gems, plan, is_blocked, blocked_at, blocked_by, block_reason, created_at, updated_at')
      .single();

    if (error) {
      throw error;
    }

    await writeModerationAction({
      adminTelegramId: access.identity.userId,
      targetUserTelegramId: telegramId,
      actionType: blocked ? 'user_blocked' : 'user_unblocked',
      reason,
      payload: { blocked },
    });
    await writeAuditLog(
      access.identity.userId,
      access.membership.role,
      blocked ? 'user_blocked' : 'user_unblocked',
      'user',
      `${telegramId}`,
      { blocked, reason }
    );

    return res.json({ user: mapUserRow(data) });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'user_block_error' });
  }
});

app.post('/admin/chat/reports', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res, { adminOnly: true });

    if (!access) {
      return;
    }

    const { data, error } = await supabase
      .from('chat_reports')
      .select('id, reporter_telegram_id, reported_user_telegram_id, username, group_id, group_name, message_id, message_text, status, report_count, metadata, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(250);

    if (error) {
      if (isMissingTableError(error)) {
        return res.json({
          reports: [],
          stats: {
            totalReports: 0,
            pendingReports: 0,
            hiddenReports: 0,
            dismissedReports: 0,
          },
        });
      }

      throw error;
    }

    const reports = data.map(mapChatReportRow);

    return res.json({
      reports,
      stats: {
        totalReports: reports.length,
        pendingReports: reports.filter((report) => report.status === 'pending').length,
        hiddenReports: reports.filter((report) => report.status === 'hidden').length,
        dismissedReports: reports.filter((report) => report.status === 'dismissed').length,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'chat_reports_error' });
  }
});

app.post('/admin/chat/reports/action', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res, { adminOnly: true });

    if (!access) {
      return;
    }

    const reportId = Number(req.body?.reportId);
    const action = `${req.body?.action || ''}`;
    const reason = `${req.body?.reason || ''}`.trim() || null;

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ error: 'Invalid report id' });
    }

    if (!['reviewed', 'dismissed', 'hidden'].includes(action)) {
      return res.status(400).json({ error: 'Invalid moderation action' });
    }

    const { data, error } = await supabase
      .from('chat_reports')
      .update({
        status: action,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select('id, reporter_telegram_id, reported_user_telegram_id, username, group_id, group_name, message_id, message_text, status, report_count, metadata, created_at, updated_at')
      .single();

    if (error) {
      throw error;
    }

    await writeModerationAction({
      adminTelegramId: access.identity.userId,
      reportId,
      targetUserTelegramId: data.reported_user_telegram_id,
      actionType: `report_${action}`,
      reason,
      payload: {
        groupId: data.group_id,
        messageId: data.message_id,
      },
    });
    await writeAuditLog(
      access.identity.userId,
      access.membership.role,
      `report_${action}`,
      'chat_report',
      `${reportId}`,
      { reason }
    );

    return res.json({ report: mapChatReportRow(data) });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'chat_report_action_error' });
  }
});

app.post('/admin/settings', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res, { adminOnly: true });

    if (!access) {
      return;
    }

    const admins = await listAdminMembers();
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, actor_telegram_id, actor_role, action, entity_type, entity_id, payload, created_at')
      .order('created_at', { ascending: false })
      .limit(12);

    if (error && !isMissingTableError(error)) {
      throw error;
    }

    return res.json({
      currentUserRole: access.membership.role,
      canManageAdmins: access.membership.canManageAdmins,
      admins,
      auditLogs: (data || []).map(mapAuditLog),
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'settings_error' });
  }
});

app.post('/admin/settings/admins/add', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res, { ownerOnly: true });

    if (!access) {
      return;
    }

    const telegramId = Number(req.body?.telegramId);
    const role = req.body?.role === 'owner' ? 'owner' : 'admin';

    if (!Number.isInteger(telegramId) || telegramId <= 0) {
      return res.status(400).json({ error: 'Invalid admin id' });
    }

    const { data, error } = await supabase
      .from('admin_users')
      .upsert(
        {
          telegram_id: telegramId,
          role,
          is_active: true,
          created_by: access.identity.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'telegram_id' }
      )
      .select('telegram_id, role, is_active, created_at, created_by')
      .single();

    if (error) {
      throw error;
    }

    await writeAuditLog(
      access.identity.userId,
      access.membership.role,
      'admin_granted',
      'admin_user',
      `${telegramId}`,
      { role }
    );

    return res.json({
      admin: {
        telegramId: data.telegram_id,
        role: data.role,
        isActive: data.is_active,
        source: 'database',
        createdAt: data.created_at,
        createdBy: data.created_by,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'admin_add_error' });
  }
});

app.post('/admin/settings/admins/remove', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res, { ownerOnly: true });

    if (!access) {
      return;
    }

    const telegramId = Number(req.body?.telegramId);

    if (!Number.isInteger(telegramId) || telegramId <= 0) {
      return res.status(400).json({ error: 'Invalid admin id' });
    }

    if (bootstrapAdminIds.includes(telegramId)) {
      return res.status(400).json({ error: 'Bootstrap owners cannot be removed from settings' });
    }

    if (telegramId === access.identity.userId) {
      return res.status(400).json({ error: 'Self removal is disabled' });
    }

    const { error } = await supabase
      .from('admin_users')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('telegram_id', telegramId);

    if (error) {
      throw error;
    }

    await writeAuditLog(
      access.identity.userId,
      access.membership.role,
      'admin_revoked',
      'admin_user',
      `${telegramId}`,
      {}
    );

    return res.json({ removed: true });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'admin_remove_error' });
  }
});

app.post('/admin/tickets', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res, { adminOnly: true });

    if (!access) {
      return;
    }

    const { data, error } = await supabase
      .from('tickets')
      .select('id, ticket_number, user_telegram_id, user_name, event_name, event_date, price, purchase_date, status, source, verified_at, verified_by')
      .order('purchase_date', { ascending: false })
      .limit(250);

    if (error) {
      throw error;
    }

    const tickets = data.map(mapTicketRow);

    return res.json({
      tickets,
      stats: {
        total: tickets.length,
        pending: tickets.filter((ticket) => ticket.status === 'pending').length,
        verified: tickets.filter((ticket) => ticket.status === 'verified').length,
        used: tickets.filter((ticket) => ticket.status === 'used').length,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'tickets_error' });
  }
});

app.post('/admin/tickets/verify', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res, { adminOnly: true });

    if (!access) {
      return;
    }

    const ticketNumber = Number(req.body?.ticketNumber);

    if (!Number.isInteger(ticketNumber) || ticketNumber <= 0) {
      return res.status(400).json({ error: 'Invalid ticket number' });
    }

    const { data: ticketRow, error: lookupError } = await supabase
      .from('tickets')
      .select('id, ticket_number, user_telegram_id, user_name, event_name, event_date, price, purchase_date, status, source, verified_at, verified_by')
      .eq('ticket_number', ticketNumber)
      .single();

    if (lookupError) {
      throw lookupError;
    }

    if (ticketRow.status !== 'pending') {
      return res.status(400).json({ error: 'Ticket is already processed' });
    }

    const verifiedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('tickets')
      .update({
        status: 'verified',
        verified_at: verifiedAt,
        verified_by: access.identity.userId,
      })
      .eq('id', ticketRow.id)
      .select('id, ticket_number, user_telegram_id, user_name, event_name, event_date, price, purchase_date, status, source, verified_at, verified_by')
      .single();

    if (error) {
      throw error;
    }

    const { error: verificationError } = await supabase.from('ticket_verifications').insert({
      ticket_id: data.id,
      ticket_number: data.ticket_number,
      user_telegram_id: data.user_telegram_id,
      verified_by: access.identity.userId,
      status: 'verified',
    });

    if (verificationError && !isMissingTableError(verificationError)) {
      throw verificationError;
    }

    await writeAuditLog(
      access.identity.userId,
      access.membership.role,
      'ticket_verified',
      'ticket',
      `${data.id}`,
      { ticketNumber: data.ticket_number }
    );

    return res.json({ ticket: mapTicketRow(data) });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'ticket_verify_error' });
  }
});

app.post('/admin/feedback/status', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res, { adminOnly: true });

    if (!access) {
      return;
    }

    const feedbackId = Number(req.body?.feedbackId);
    const status = req.body?.status === 'resolved' ? 'resolved' : 'read';

    if (!Number.isInteger(feedbackId) || feedbackId <= 0) {
      return res.status(400).json({ error: 'Invalid feedback id' });
    }

    const { error } = await supabase
      .from('feedback_entries')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId);

    if (error) {
      throw error;
    }

    await writeAuditLog(
      access.identity.userId,
      access.membership.role,
      'feedback_status_updated',
      'feedback',
      `${feedbackId}`,
      { status }
    );

    const feedback = await getFeedbackById(feedbackId);

    return res.json({ feedback });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'feedback_status_error' });
  }
});

app.post('/admin/feedback/reply', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res, { adminOnly: true });

    if (!access) {
      return;
    }

    const feedbackId = Number(req.body?.feedbackId);
    const reply = `${req.body?.reply || ''}`.trim();

    if (!Number.isInteger(feedbackId) || feedbackId <= 0) {
      return res.status(400).json({ error: 'Invalid feedback id' });
    }

    if (!reply) {
      return res.status(400).json({ error: 'Reply text is required' });
    }

    const { error: replyError } = await supabase.from('feedback_replies').insert({
      feedback_id: feedbackId,
      admin_telegram_id: access.identity.userId,
      reply,
    });

    if (replyError) {
      throw replyError;
    }

    const { error: feedbackError } = await supabase
      .from('feedback_entries')
      .update({
        status: 'resolved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId);

    if (feedbackError) {
      throw feedbackError;
    }

    await writeAuditLog(
      access.identity.userId,
      access.membership.role,
      'feedback_replied',
      'feedback',
      `${feedbackId}`,
      { replyLength: reply.length }
    );

    const feedback = await getFeedbackById(feedbackId);

    return res.json({ feedback });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'feedback_reply_error' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const access = await resolveRequestAccess(req, res);
    if (!access) return;

    const { data: tasks, error: tasksError } = await supabase
      .from('social_tasks')
      .select('id, platform, url, reward, is_active')
      .eq('is_active', true);

    if (tasksError) throw tasksError;

    const { data: userTasks, error: userTasksError } = await supabase
      .from('user_social_tasks')
      .select('task_id')
      .eq('user_telegram_id', access.identity.userId);

    if (userTasksError) throw userTasksError;

    const claimedTaskIds = new Set(userTasks.map((ut) => ut.task_id));

    const result = tasks.map((task) => ({
      ...task,
      isClaimed: claimedTaskIds.has(task.id),
    }));

    return res.json({ tasks: result });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'tasks_error' });
  }
});

app.post('/api/tasks/claim', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const access = await resolveRequestAccess(req, res);
    if (!access) return;

    const taskId = `${req.body?.taskId || ''}`.trim();
    if (!taskId) return res.status(400).json({ error: 'Task ID is required' });

    // Check if task exists and is active
    const { data: task, error: taskError } = await supabase
      .from('social_tasks')
      .select('id, reward, is_active')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return res.status(400).json({ error: 'Task not found or not active' });
    }

    if (!task.is_active) {
      return res.status(400).json({ error: 'Task is no longer active' });
    }

    // Insert claim record (fails if already claimed due to UNIQUE constraint)
    const { error: claimError } = await supabase
      .from('user_social_tasks')
      .insert({
        user_telegram_id: access.identity.userId,
        task_id: taskId,
      });

    if (claimError) {
      if (claimError.code === '23505') {
        return res.status(400).json({ error: 'Task already claimed' });
      }
      throw claimError;
    }

    // Add gems/coins to user (Assuming gems as per old logic: `gems: (state.gems || 0) + task.reward`)
    // The previous frontend logic added `gems` for socialTasks. Wait, `reward` is usually `gems`. 
    // Let's add gems to user table.
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('gems')
      .eq('telegram_id', access.identity.userId)
      .single();

    if (!userError && userData) {
      await supabase
        .from('users')
        .update({ gems: Number(userData.gems || 0) + task.reward })
        .eq('telegram_id', access.identity.userId);
    }

    return res.json({ ok: true, reward: task.reward });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'task_claim_error' });
  }
});

app.post('/api/admin/tasks', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const access = await resolveRequestAccess(req, res, { adminOnly: true });
    if (!access) return;

    const { data, error } = await supabase
      .from('social_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ tasks: data });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'admin_tasks_error' });
  }
});

app.post('/api/admin/tasks/add', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const access = await resolveRequestAccess(req, res, { adminOnly: true });
    if (!access) return;

    const { id, platform, url, reward, is_active } = req.body;

    if (!id || !platform || !url || typeof reward !== 'number') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('social_tasks')
      .insert({
        id,
        platform,
        url,
        reward,
        is_active: is_active !== false, // default true
      })
      .select()
      .single();

    if (error) throw error;

    await writeAuditLog(
      access.identity.userId,
      access.membership.role,
      'task_added',
      'social_task',
      id,
      { platform, reward }
    );

    return res.json({ task: data });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'admin_task_add_error' });
  }
});

app.post('/api/admin/tasks/update', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const access = await resolveRequestAccess(req, res, { adminOnly: true });
    if (!access) return;

    const { id, platform, url, reward, is_active } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    const { data, error } = await supabase
      .from('social_tasks')
      .update({
        platform,
        url,
        reward,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await writeAuditLog(
      access.identity.userId,
      access.membership.role,
      'task_updated',
      'social_task',
      id,
      { platform, reward, is_active }
    );

    return res.json({ task: data });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'admin_task_update_error' });
  }
});

app.post('/api/admin/tasks/delete', async (req, res) => {
  try {
    if (!ensureSupabase(res)) return;

    const access = await resolveRequestAccess(req, res, { adminOnly: true });
    if (!access) return;

    const id = req.body?.id;

    if (!id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    const { error } = await supabase
      .from('social_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await writeAuditLog(
      access.identity.userId,
      access.membership.role,
      'task_deleted',
      'social_task',
      id,
      {}
    );

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'admin_task_delete_error' });
  }
});

const WHEEL_BIG_PRIZE_RARITIES = new Set(['rare', 'epic', 'legendary']);

const WHEEL_PRIZE_CATALOG = [
  {
    id: 'wheel-iphone',
    title: 'iPhone 17 Pro Max 1TB',
    type: 'physical',
    value: 1,
    rarity: 'legendary',
    probability: 0.0004,
    weight: 4,
    accentColor: '#fde047',
    metadata: { card: 'gold', rewardKind: 'physical', displayOrder: 1 },
  },
  {
    id: 'wheel-balance-200',
    title: '1000 монета',
    type: 'balance',
    value: 1000,
    rarity: 'common',
    probability: 0.24,
    weight: 2400,
    accentColor: '#f59e0b',
    metadata: { card: 'amber', rewardKind: 'coins', displayOrder: 2 },
  },
  {
    id: 'wheel-smartwatch',
    title: 'Смарт сағат',
    type: 'physical',
    value: 1,
    rarity: 'epic',
    probability: 0.0018,
    weight: 18,
    accentColor: '#c084fc',
    metadata: { card: 'purple', rewardKind: 'physical', displayOrder: 3 },
  },
  {
    id: 'wheel-balance-100',
    title: '50 кристалл',
    type: 'balance',
    value: 50,
    rarity: 'common',
    probability: 0.34,
    weight: 3400,
    accentColor: '#22d3ee',
    metadata: { card: 'cyan', rewardKind: 'crystals', displayOrder: 4 },
  },
  {
    id: 'wheel-airpods',
    title: 'AirPods',
    type: 'physical',
    value: 1,
    rarity: 'rare',
    probability: 0.003,
    weight: 30,
    accentColor: '#f8fafc',
    metadata: { card: 'silver', rewardKind: 'physical', displayOrder: 5 },
  },
  {
    id: 'wheel-balance-500',
    title: '2500 монета',
    type: 'balance',
    value: 2500,
    rarity: 'uncommon',
    probability: 0.17,
    weight: 1700,
    accentColor: '#fb7185',
    metadata: { card: 'rose', rewardKind: 'coins', displayOrder: 6 },
  },
  {
    id: 'wheel-balance-1000',
    title: '100 кристалл',
    type: 'balance',
    value: 100,
    rarity: 'rare',
    probability: 0.08,
    weight: 800,
    accentColor: '#60a5fa',
    metadata: { card: 'sky', rewardKind: 'crystals', displayOrder: 7 },
  },
  {
    id: 'wheel-powerbank',
    title: '5000 монета',
    type: 'balance',
    value: 5000,
    rarity: 'rare',
    probability: 0.005,
    weight: 50,
    accentColor: '#f97316',
    metadata: { card: 'orange', rewardKind: 'coins', displayOrder: 8 },
  },
  {
    id: 'wheel-balance-2000',
    title: '250 кристалл',
    type: 'balance',
    value: 250,
    rarity: 'epic',
    probability: 0.03,
    weight: 300,
    accentColor: '#818cf8',
    metadata: { card: 'violet', rewardKind: 'crystals', displayOrder: 9 },
  },
  {
    id: 'wheel-balance-5000',
    title: '10000 монета',
    type: 'balance',
    value: 10000,
    rarity: 'epic',
    probability: 0.008,
    weight: 80,
    accentColor: '#ef4444',
    metadata: { card: 'red', rewardKind: 'coins', displayOrder: 10 },
  },
];

const getWheelPrizeRewardKind = (prizeRow = {}) => {
  if (prizeRow.type === 'physical') {
    return 'physical';
  }

  return prizeRow.metadata?.rewardKind === 'coins' ? 'coins' : 'crystals';
};

const getWheelPrizeDisplayOrder = (prizeRow = {}) => {
  const displayOrder = Number(prizeRow.metadata?.displayOrder || 999);
  return Number.isFinite(displayOrder) ? displayOrder : 999;
};

const mapWheelPrizeRow = (row) => ({
  id: row.id,
  title: row.title,
  type: row.type,
  rewardKind: getWheelPrizeRewardKind(row),
  value: Number(row.value || 0),
  rarity: row.rarity,
  probability: Number(row.probability || 0),
  status: row.status,
  createdAt: row.created_at,
  accentColor: row.accent_color || null,
  displayOrder: getWheelPrizeDisplayOrder(row),
});

const mapWheelSpinRow = (row) => {
  const prize = row.prize_snapshot || {};

  return {
    id: row.id,
    spinSource: row.spin_source,
    costCrystals: Number(row.cost_gems || 0),
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
    status: row.status,
    prize: {
      id: prize.id || row.prize_id || '',
      title: prize.title || 'Prize',
      type: prize.type || 'physical',
      rewardKind: prize.rewardKind || (prize.type === 'balance' ? 'crystals' : 'physical'),
      value: Number(prize.value || 0),
      rarity: prize.rarity || 'common',
      probability: Number(prize.probability || 0),
      status: prize.status || 'active',
      createdAt: prize.createdAt || row.created_at,
      accentColor: prize.accentColor || null,
      displayOrder: Number(prize.displayOrder || 999),
    },
  };
};

async function getActiveWheelCampaign() {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('wheel_campaigns')
    .select('*')
    .eq('status', 'active')
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Active wheel campaign not found');
  }

  return data;
}

async function getWheelUserState(userTelegramId) {
  const { data, error } = await supabase
    .from('wheel_user_state')
    .select('*')
    .eq('user_telegram_id', userTelegramId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const insertPayload = {
    user_telegram_id: userTelegramId,
    free_spins: 0,
    total_spins: 0,
    paid_spins: 0,
    total_topup_kzt: 0,
    daily_spin_count: 0,
    daily_spin_date: null,
    last_rare_win_at: null,
  };

  const inserted = await supabase
    .from('wheel_user_state')
    .insert(insertPayload)
    .select('*')
    .single();

  if (inserted.error) {
    throw inserted.error;
  }

  return inserted.data;
}

async function getUserCrystalBalance(userTelegramId) {
  const { data, error } = await supabase
    .from('users')
    .select('gems')
    .eq('telegram_id', userTelegramId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Number(data?.gems || 0);
}

async function getUserEconomyBalance(userTelegramId) {
  const { data, error } = await supabase
    .from('users')
    .select('gems, coins')
    .eq('telegram_id', userTelegramId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    gems: Number(data?.gems || 0),
    coins: Number(data?.coins || 0),
  };
}

async function listWheelPrizes(campaignId) {
  const catalogRows = WHEEL_PRIZE_CATALOG.map((prize) => ({
    id: prize.id,
    campaign_id: campaignId,
    title: prize.title,
    type: prize.type,
    value: prize.value,
    rarity: prize.rarity,
    probability: prize.probability,
    weight: prize.weight,
    status: 'active',
    accent_color: prize.accentColor,
    metadata: prize.metadata,
  }));

  const syncResult = await supabase.from('wheel_prizes').upsert(catalogRows, { onConflict: 'id' });
  if (syncResult.error) {
    throw syncResult.error;
  }

  const { data, error } = await supabase
    .from('wheel_prizes')
    .select('*')
    .eq('campaign_id', campaignId)
    .in('status', ['active', 'out_of_stock'])
    .order('weight', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

function buildWheelPrizeSnapshot(prizeRow, spinStatus) {
  return {
    id: prizeRow.id,
    title: prizeRow.title,
    type: prizeRow.type,
    rewardKind: getWheelPrizeRewardKind(prizeRow),
    value: Number(prizeRow.value || 0),
    rarity: prizeRow.rarity,
    probability: Number(prizeRow.probability || 0),
    status: prizeRow.status,
    createdAt: prizeRow.created_at,
    accentColor: prizeRow.accent_color || null,
    displayOrder: getWheelPrizeDisplayOrder(prizeRow),
    claimStatus: spinStatus,
  };
}

function isWithinHours(value, hours) {
  if (!value) return false;
  const diffMs = Date.now() - Date.parse(value);
  return Number.isFinite(diffMs) && diffMs >= 0 && diffMs < hours * 60 * 60 * 1000;
}

function getWheelDailySpinCount(stateRow) {
  const today = new Date().toISOString().split('T')[0];
  return stateRow?.daily_spin_date === today ? Number(stateRow.daily_spin_count || 0) : 0;
}

function pickWeightedWheelPrize(prizes, userState, campaign) {
  const cooldownHours = Math.max(1, Number(campaign.settings?.bigPrizeCooldownHours || 72));
  const cooldownActive = isWithinHours(userState?.last_rare_win_at, cooldownHours);

  const weightedEntries = prizes
    .filter((prize) => prize.status === 'active')
    .filter((prize) => prize.stock_remaining === null || prize.stock_remaining === undefined || Number(prize.stock_remaining) > 0)
    .map((prize) => {
      let effectiveWeight = Math.max(1, Number(prize.weight || 1));

      if (cooldownActive && prize.rarity === 'rare') {
        effectiveWeight = Math.max(1, Math.floor(effectiveWeight * 0.35));
      }

      if (cooldownActive && prize.rarity === 'epic') {
        effectiveWeight = Math.max(1, Math.floor(effectiveWeight * 0.18));
      }

      if (cooldownActive && prize.rarity === 'legendary') {
        effectiveWeight = Math.max(1, Math.floor(effectiveWeight * 0.02));
      }

      return {
        prize,
        effectiveWeight,
      };
    });

  if (!weightedEntries.length) {
    throw new Error('No active wheel prizes available');
  }

  const totalWeight = weightedEntries.reduce((sum, entry) => sum + entry.effectiveWeight, 0);
  let cursor = crypto.randomInt(0, totalWeight);

  for (const entry of weightedEntries) {
    if (cursor < entry.effectiveWeight) {
      return entry.prize;
    }
    cursor -= entry.effectiveWeight;
  }

  return weightedEntries[weightedEntries.length - 1].prize;
}

function randomSuspenseMs(campaign) {
  const min = Math.max(2500, Number(campaign.suspense_min_ms || 5200));
  const max = Math.max(min, Number(campaign.suspense_max_ms || 7600));
  return min === max ? min : crypto.randomInt(min, max + 1);
}

app.get('/wheel/fortune', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);
    if (!access) {
      return;
    }

    const campaign = await getActiveWheelCampaign();
    const [userState, economyBalance, prizeRows, historyRows] = await Promise.all([
      getWheelUserState(access.identity.userId),
      getUserEconomyBalance(access.identity.userId),
      listWheelPrizes(campaign.id),
      supabase
        .from('wheel_spins')
        .select('*')
        .eq('user_telegram_id', access.identity.userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (historyRows.error) {
      throw historyRows.error;
    }

    return res.json({
      campaign: {
        id: campaign.id,
        title: campaign.title,
        spinCostCrystals: Number(campaign.spin_cost_gems || 100),
        topupFreeSpinThresholdKzt: Number(campaign.topup_free_spin_threshold_kzt || 1000),
        dailySpinLimit: campaign.daily_spin_limit ? Number(campaign.daily_spin_limit) : null,
        suspenseMinMs: Number(campaign.suspense_min_ms || 5200),
        suspenseMaxMs: Number(campaign.suspense_max_ms || 7600),
      },
      balance: {
        crystals: economyBalance.gems,
        freeSpins: Number(userState.free_spins || 0),
        totalTopupKzt: Number(userState.total_topup_kzt || 0),
        spinsToday: getWheelDailySpinCount(userState),
        dailySpinLimit: campaign.daily_spin_limit ? Number(campaign.daily_spin_limit) : null,
      },
      prizes: prizeRows.filter((row) => row.status !== 'hidden').map(mapWheelPrizeRow),
      history: (historyRows.data || []).map(mapWheelSpinRow),
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'wheel_overview_error' });
  }
});

app.post('/wheel/spin', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);
    if (!access) {
      return;
    }

    const campaign = await getActiveWheelCampaign();
    const [userState, economyBalance, prizeRows] = await Promise.all([
      getWheelUserState(access.identity.userId),
      getUserEconomyBalance(access.identity.userId),
      listWheelPrizes(campaign.id),
    ]);

    const crystalsBefore = economyBalance.gems;
    const coinsBefore = economyBalance.coins;
    const dailyLimitEnabled = Boolean(campaign.settings?.dailyLimitEnabled);
    const spinsToday = getWheelDailySpinCount(userState);
    const dailyLimit = campaign.daily_spin_limit ? Number(campaign.daily_spin_limit) : null;

    if (dailyLimitEnabled && dailyLimit && spinsToday >= dailyLimit) {
      return res.status(400).json({ error: 'Daily spin limit reached' });
    }

    const freeSpinsBefore = Number(userState.free_spins || 0);
    const spinCost = Number(campaign.spin_cost_gems || 100);
    const spinSource = freeSpinsBefore > 0 ? 'free' : 'paid';
    const costGems = spinSource === 'free' ? 0 : spinCost;

    if (spinSource === 'paid' && crystalsBefore < costGems) {
      return res.status(400).json({ error: 'Not enough crystals for a paid spin' });
    }

    const selectedPrize = pickWeightedWheelPrize(prizeRows, userState, campaign);
    const prizeStatus = selectedPrize.type === 'balance' ? 'used' : 'waiting_review';
    const prizeSnapshot = buildWheelPrizeSnapshot(selectedPrize, prizeStatus);
    const freeSpinsAfter = spinSource === 'free' ? freeSpinsBefore - 1 : freeSpinsBefore;
    const rewardKind = getWheelPrizeRewardKind(selectedPrize);
    const prizeCrystalValue = rewardKind === 'crystals' ? Number(selectedPrize.value || 0) : 0;
    const prizeCoinValue = rewardKind === 'coins' ? Number(selectedPrize.value || 0) : 0;
    const crystalsAfter = crystalsBefore - costGems + prizeCrystalValue;
    const coinsAfter = coinsBefore + prizeCoinValue;
    const suspenseMs = randomSuspenseMs(campaign);
    const spinId = crypto.randomUUID();
    const resolvedAt = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];
    const nextDailySpinCount = getWheelDailySpinCount(userState) + 1;
    const wonRarePrize = WHEEL_BIG_PRIZE_RARITIES.has(selectedPrize.rarity);

    const insertSpin = await supabase
      .from('wheel_spins')
      .insert({
        id: spinId,
        campaign_id: campaign.id,
        user_telegram_id: access.identity.userId,
        prize_id: selectedPrize.id,
        spin_source: spinSource,
        cost_gems: costGems,
        gems_before: crystalsBefore,
        gems_after: crystalsAfter,
        free_spins_before: freeSpinsBefore,
        free_spins_after: freeSpinsAfter,
        status: prizeStatus,
        prize_snapshot: prizeSnapshot,
        result_seed: crypto.randomUUID(),
        suspense_ms: suspenseMs,
        resolved_at: resolvedAt,
        claimed_at: prizeStatus === 'used' ? resolvedAt : null,
      })
      .select('*')
      .single();

    if (insertSpin.error) {
      throw insertSpin.error;
    }

    const userUpdate = await supabase
      .from('users')
      .update({
        gems: crystalsAfter,
        coins: coinsAfter,
        updated_at: resolvedAt,
      })
      .eq('telegram_id', access.identity.userId);

    if (userUpdate.error) {
      throw userUpdate.error;
    }

    const wheelStateUpdate = await supabase
      .from('wheel_user_state')
      .update({
        free_spins: freeSpinsAfter,
        total_spins: Number(userState.total_spins || 0) + 1,
        paid_spins: Number(userState.paid_spins || 0) + (spinSource === 'paid' ? 1 : 0),
        daily_spin_count: nextDailySpinCount,
        daily_spin_date: today,
        last_rare_win_at: wonRarePrize ? resolvedAt : userState.last_rare_win_at,
        updated_at: resolvedAt,
      })
      .eq('user_telegram_id', access.identity.userId);

    if (wheelStateUpdate.error) {
      throw wheelStateUpdate.error;
    }

    if (selectedPrize.stock_remaining !== null && selectedPrize.stock_remaining !== undefined) {
      const nextStock = Math.max(0, Number(selectedPrize.stock_remaining || 0) - 1);
      const nextPrizeStatus = nextStock > 0 ? selectedPrize.status : 'out_of_stock';
      const prizeUpdate = await supabase
        .from('wheel_prizes')
        .update({
          stock_remaining: nextStock,
          status: nextPrizeStatus,
          updated_at: resolvedAt,
        })
        .eq('id', selectedPrize.id);

      if (prizeUpdate.error) {
        throw prizeUpdate.error;
      }
    }

    await writeAuditLog(
      access.identity.userId,
      access.membership.role,
      'wheel_spin_created',
      'wheel_spin',
      spinId,
      {
        campaignId: campaign.id,
        prizeId: selectedPrize.id,
        spinSource,
        costGems,
      }
    );

    const mappedSpin = mapWheelSpinRow(insertSpin.data);

    return res.json({
      spin: {
        ...mappedSpin,
        suspenseMs,
        crystalsBefore,
        crystalsAfter,
        coinsBefore,
        coinsAfter,
        freeSpinsBefore,
        freeSpinsAfter,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'wheel_spin_error' });
  }
});

app.post('/wheel/topups/ton/create', async (req, res) => {
  try {
    const access = await resolveRequestAccess(req, res);
    if (!access) {
      return;
    }

    if (!TON_WALLET_ADDRESS) {
      return res.status(503).json({ error: 'TON wallet receiver is not configured' });
    }

    const packageOffer = getWheelTopupPackage(req.body?.packageId);
    if (!packageOffer) {
      return res.status(400).json({ error: 'Unsupported crystal package' });
    }

    const topupId = crypto.randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + TON_PAYMENT_TTL_MS);
    const amountNano = convertKztToTonNano(packageOffer.amountKzt);
    const memo = buildWheelTopupMemo(topupId);

    return res.json({
      topupId,
      provider: 'ton',
      packageId: packageOffer.packageId,
      crystals: packageOffer.crystals,
      amountKzt: packageOffer.amountKzt,
      address: TON_WALLET_ADDRESS,
      amountNano,
      amountTon: formatTonAmount(amountNano),
      currency: 'TON',
      memo,
      expiresAt: expiresAt.toISOString(),
      createdAt: createdAt.toISOString(),
      metadata: {
        conversionRateKztPerTon: TON_TOPUP_KZT_PER_TON,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'wheel_topup_ton_create_error' });
  }
});

app.post('/wheel/topups/apply', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);
    if (!access) {
      return;
    }

    const topupId = `${req.body?.topupId || ''}`.trim();
    const amountKzt = Number(req.body?.amountKzt || 0);
    const source = ['manual', 'ton', 'telegram_stars', 'admin'].includes(req.body?.source)
      ? req.body.source
      : 'manual';
    const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};

    if (!topupId) {
      return res.status(400).json({ error: 'Top-up id is required' });
    }

    if (!Number.isInteger(amountKzt) || amountKzt <= 0) {
      return res.status(400).json({ error: 'Top-up amount must be a positive integer' });
    }

    const existingTopup = await supabase
      .from('wheel_topups')
      .select('*')
      .eq('id', topupId)
      .eq('user_telegram_id', access.identity.userId)
      .maybeSingle();

    if (existingTopup.error) {
      throw existingTopup.error;
    }

    const campaign = await getActiveWheelCampaign();
    const userState = await getWheelUserState(access.identity.userId);
    const freeSpinsAwarded = amountKzt >= Number(campaign.topup_free_spin_threshold_kzt || 1000) ? 1 : 0;
    const crystalsAdded = amountKzt;
    const processedAt = new Date().toISOString();

    if (!existingTopup.data) {
      const crystalsBefore = await getUserCrystalBalance(access.identity.userId);
      const crystalsAfter = crystalsBefore + crystalsAdded;

      const insertTopup = await supabase
        .from('wheel_topups')
        .insert({
          id: topupId,
          user_telegram_id: access.identity.userId,
          source,
          amount_kzt: amountKzt,
          crystals_added: crystalsAdded,
          free_spins_awarded: freeSpinsAwarded,
          status: 'applied',
          metadata,
          processed_at: processedAt,
        })
        .select('*')
        .single();

      if (insertTopup.error) {
        throw insertTopup.error;
      }

      const userUpdate = await supabase
        .from('users')
        .update({
          gems: crystalsAfter,
          updated_at: processedAt,
        })
        .eq('telegram_id', access.identity.userId);

      if (userUpdate.error) {
        throw userUpdate.error;
      }

      const wheelStateUpdate = await supabase
        .from('wheel_user_state')
        .update({
          free_spins: Number(userState.free_spins || 0) + freeSpinsAwarded,
          total_topup_kzt: Number(userState.total_topup_kzt || 0) + amountKzt,
          updated_at: processedAt,
        })
        .eq('user_telegram_id', access.identity.userId);

      if (wheelStateUpdate.error) {
        throw wheelStateUpdate.error;
      }

      await writeAuditLog(
        access.identity.userId,
        access.membership.role,
        'wheel_topup_applied',
        'wheel_topup',
        topupId,
        {
          amountKzt,
          crystalsAdded,
          freeSpinsAwarded,
          source,
        }
      );
    }

    const [finalState, finalCrystals, finalTopup] = await Promise.all([
      getWheelUserState(access.identity.userId),
      getUserCrystalBalance(access.identity.userId),
      supabase
        .from('wheel_topups')
        .select('*')
        .eq('id', topupId)
        .eq('user_telegram_id', access.identity.userId)
        .single(),
    ]);

    if (finalTopup.error) {
      throw finalTopup.error;
    }

    return res.json({
      topup: {
        id: finalTopup.data.id,
        amountKzt: Number(finalTopup.data.amount_kzt || 0),
        crystalsAdded: Number(finalTopup.data.crystals_added || 0),
        freeSpinsAwarded: Number(finalTopup.data.free_spins_awarded || 0),
        status: finalTopup.data.status,
        createdAt: finalTopup.data.created_at,
      },
      balance: {
        crystals: finalCrystals,
        freeSpins: Number(finalState.free_spins || 0),
        totalTopupKzt: Number(finalState.total_topup_kzt || 0),
        spinsToday: getWheelDailySpinCount(finalState),
        dailySpinLimit: campaign.daily_spin_limit ? Number(campaign.daily_spin_limit) : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'wheel_topup_apply_error' });
  }
});

app.get('/me/entitlements', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);
    if (!access) {
      return;
    }

    const nowIso = new Date().toISOString();

    const { data: entitlements, error } = await supabase
      .from('user_entitlements')
      .select('tier_code, status, starts_at, ends_at, source_payment_order_id')
      .eq('user_telegram_id', access.identity.userId)
      .eq('status', 'active')
      .gte('ends_at', nowIso)
      .order('ends_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && !isMissingTableError(error)) {
      throw error;
    }

    const activeEntitlement = entitlements
      ? {
          tierCode: entitlements.tier_code,
          status: entitlements.status,
          startsAt: entitlements.starts_at,
          endsAt: entitlements.ends_at,
          sourcePaymentOrderId: entitlements.source_payment_order_id,
        }
      : null;

    return res.json({
      userId: access.identity.userId,
      activeEntitlement,
      plan: activeEntitlement ? activeEntitlement.tierCode : 'free',
      planExpiry: activeEntitlement ? Date.parse(activeEntitlement.endsAt) : null,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'entitlements_error' });
  }
});

app.get('/plans', async (_req, res) => {
  try {
    const plans = Object.entries(TON_PLAN_CATALOG).map(([code, offer]) => ({
      code,
      tierCode: offer.tierCode,
      amountNano: offer.amountNano,
      displayAmount: offer.displayAmount,
      durationDays: offer.durationDays,
    }));

    return res.json({ plans });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'plans_error' });
  }
});

const STARS_PLAN_CATALOG = {
  basic: { tierCode: 'basic', durationDays: 365, amountStars: 140 },
  pro: { tierCode: 'pro', durationDays: 365, amountStars: 175 },
  premium: { tierCode: 'premium', durationDays: 365, amountStars: 205 },
};

app.post('/payments/stars/create', async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);
    if (!access) {
      return;
    }

    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      return res.status(503).json({ error: 'Bot token is not configured' });
    }

    const planCode = normalizePlanCode(req.body?.planCode);
    if (!planCode) {
      return res.status(400).json({ error: 'Unsupported plan code' });
    }

    const planOffer = STARS_PLAN_CATALOG[planCode];
    if (!planOffer) {
      return res.status(404).json({ error: 'Plan offer not found' });
    }

    const paymentOrderId = crypto.randomUUID();
    const payload = `stars_${planCode}_${paymentOrderId}`;

    const invoiceData = {
      title: `${planOffer.tierCode.toUpperCase()} Yearly`,
      description: `VIP membership: ${planOffer.tierCode.toUpperCase()} tier for ${planOffer.durationDays} days`,
      payload,
      currency: 'XTR',
      prices: [
        {
          label: planOffer.tierCode.toUpperCase(),
          amount: planOffer.amountStars,
        },
      ],
      provider_token: '',
    };

    const invoiceResponse = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData),
    });

    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text();
      console.error('[Stars] Telegram API error:', errorText);
      return res.status(500).json({ error: 'Failed to create invoice link' });
    }

    const invoiceResult = await invoiceResponse.json();
    if (!invoiceResult.ok) {
      console.error('[Stars] Invoice creation failed:', invoiceResult);
      return res.status(500).json({ error: 'Invoice creation failed' });
    }

    const { data, error } = await supabase
      .from('payment_orders')
      .insert({
        id: paymentOrderId,
        user_telegram_id: access.identity.userId,
        provider: 'telegram_stars',
        plan_code: planCode,
        currency: 'XTR',
        amount_nano: planOffer.amountStars,
        status: 'created',
        memo: payload,
        provider_payload: {
          invoiceLink: invoiceResult.result,
        },
        expires_at: new Date(Date.now() + TON_PAYMENT_TTL_MS).toISOString(),
      })
      .select('id, plan_code, amount_nano, currency, status, memo, expires_at, created_at')
      .single();

    if (error) {
      throw error;
    }

    return res.json({
      paymentOrderId: data.id,
      planCode: data.plan_code,
      provider: 'telegram_stars',
      invoiceLink: invoiceResult.result,
      amountStars: planOffer.amountStars,
      currency: data.currency,
      memo: data.memo,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      status: data.status,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'stars_payment_create_error' });
  }
});

app.post('/payments/stars/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    if (!update || !update.pre_checkout_query && !update.successful_payment) {
      return res.status(200).json({ ok: true });
    }

    if (update.pre_checkout_query) {
      const { id: queryId, invoice_payload: payload, total_amount: totalAmount, currency } = update.pre_checkout_query;
      
      if (currency !== 'XTR') {
        await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerPreCheckoutQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: queryId,
            ok: false,
            error_message: 'Invalid currency',
          }),
        });
        return res.status(200).json({ ok: true });
      }

      if (!payload || !payload.startsWith('stars_')) {
        await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerPreCheckoutQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: queryId,
            ok: false,
            error_message: 'Invalid payload',
          }),
        });
        return res.status(200).json({ ok: true });
      }

      const match = payload.match(/stars_(.+)_(.+)/);
      if (!match) {
        await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerPreCheckoutQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: queryId,
            ok: false,
            error_message: 'Invalid payload format',
          }),
        });
        return res.status(200).json({ ok: true });
      }

      const [, planCode, paymentOrderId] = match;
      
      if (!supabase) {
        await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerPreCheckoutQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: queryId,
            ok: true,
          }),
        });
        return res.status(200).json({ ok: true });
      }

      const { data: paymentOrder, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('id', paymentOrderId)
        .single();

      if (orderError || !paymentOrder) {
        await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerPreCheckoutQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: queryId,
            ok: false,
            error_message: 'Payment order not found',
          }),
        });
        return res.status(200).json({ ok: true });
      }

      const planOffer = STARS_PLAN_CATALOG[planCode];
      if (!planOffer || planOffer.amountStars !== totalAmount) {
        await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerPreCheckoutQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: queryId,
            ok: false,
            error_message: 'Invalid amount',
          }),
        });
        return res.status(200).json({ ok: true });
      }

      await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: queryId,
          ok: true,
        }),
      });

      return res.status(200).json({ ok: true });
    }

    if (update.successful_payment) {
      const payment = update.successful_payment;
      const payload = payment.invoice_payload;
      
      if (!payload || !payload.startsWith('stars_')) {
        console.warn('[Stars] Invalid payload in successful_payment');
        return res.status(200).json({ ok: true });
      }

      const match = payload.match(/stars_(.+)_(.+)/);
      if (!match) {
        console.warn('[Stars] Invalid payload format in successful_payment');
        return res.status(200).json({ ok: true });
      }

      const [, planCode, paymentOrderId] = match;
      
      if (!supabase) {
        console.warn('[Stars] Supabase not configured');
        return res.status(200).json({ ok: true });
      }

      const { data: paymentOrder, error: orderError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('id', paymentOrderId)
        .single();

      if (orderError || !paymentOrder) {
        console.warn('[Stars] Payment order not found for successful_payment');
        return res.status(200).json({ ok: true });
      }

      if (paymentOrder.status === 'paid') {
        console.log('[Stars] Payment already processed, skipping');
        return res.status(200).json({ ok: true });
      }

      const verificationPayload = {
        telegramPaymentChargeId: payment.telegram_payment_charge_id,
        providerPaymentId: payment.provider_payment_charge_id,
        currency: payment.currency,
        totalAmount: payment.total_amount,
      };

      await applyPaidEntitlement(paymentOrder, verificationPayload);

      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[Stars] Webhook error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'webhook_error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
