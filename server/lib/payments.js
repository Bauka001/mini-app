'use strict';

const crypto = require('crypto');

// Plan catalogue. Update durations / titles here, not in scattered places.
// Stars amounts must match what `sendInvoice` charges.
const PLAN_CATALOGUE = {
  premium_monthly: {
    plan: 'premium',
    durationDays: 30,
    title: 'Focus Premium — 1 month',
    starsAmount: 150,
  },
  premium_yearly: {
    plan: 'premium',
    durationDays: 365,
    title: 'Focus Premium — 1 year',
    starsAmount: 1200,
  },
};

const PAYLOAD_VERSION = 'v1';

// Invoice payload format: v1:<sku>:<userId>:<nonce>
// The nonce isn't security — HMAC isn't used because Telegram already authenticates
// the webhook via secret_token. Nonce just prevents accidental cross-user reuse.
const buildInvoicePayload = (sku, userId) => {
  const nonce = crypto.randomBytes(8).toString('hex');
  return `${PAYLOAD_VERSION}:${sku}:${userId}:${nonce}`;
};

const parseInvoicePayload = (payload) => {
  if (typeof payload !== 'string') return null;
  const parts = payload.split(':');
  if (parts.length !== 4) return null;
  const [version, sku, userIdStr] = parts;
  if (version !== PAYLOAD_VERSION) return null;
  const userId = Number(userIdStr);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  if (!PLAN_CATALOGUE[sku]) return null;
  return { sku, userId, plan: PLAN_CATALOGUE[sku].plan, durationDays: PLAN_CATALOGUE[sku].durationDays };
};

// Apply a paid plan upgrade. Idempotent on telegram_payment_charge_id —
// if a row in payment_charges already exists, we no-op.
const applyPaidPlanUpgrade = async ({
  supabase,
  telegramId,
  plan,
  durationDays,
  totalAmount,
  currency,
  telegramPaymentChargeId,
  providerPaymentChargeId,
  invoicePayload,
}) => {
  if (!supabase) {
    throw new Error('Supabase service-role client not configured');
  }

  // Idempotency check first.
  const { data: existing, error: existingErr } = await supabase
    .from('payment_charges')
    .select('telegram_payment_charge_id')
    .eq('telegram_payment_charge_id', telegramPaymentChargeId)
    .maybeSingle();

  if (existingErr && existingErr.code !== '42P01' && existingErr.code !== 'PGRST116') {
    throw existingErr;
  }
  if (existing) {
    return { applied: false, reason: 'duplicate_charge' };
  }

  // Read current expiry; if user is on the same plan and not expired, extend.
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('plan, plan_expiry')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (userErr && userErr.code !== 'PGRST116') {
    throw userErr;
  }

  const now = Date.now();
  const currentExpiry = Number(userRow?.plan_expiry) || 0;
  const baseFromExpiry = userRow?.plan === plan && currentExpiry > now ? currentExpiry : now;
  const newExpiry = baseFromExpiry + durationDays * 24 * 60 * 60 * 1000;

  // Update plan + expiry. Service role bypasses RLS.
  const { error: updateErr } = await supabase
    .from('users')
    .update({ plan, plan_expiry: newExpiry })
    .eq('telegram_id', telegramId);
  if (updateErr) {
    throw updateErr;
  }

  // Record the charge for idempotency + audit. The table can be missing during
  // bootstrap; if so, we still apply the upgrade but log a warning.
  const { error: insertErr } = await supabase.from('payment_charges').insert({
    telegram_payment_charge_id: telegramPaymentChargeId,
    provider_payment_charge_id: providerPaymentChargeId || null,
    telegram_id: telegramId,
    plan,
    duration_days: durationDays,
    amount: totalAmount,
    currency,
    invoice_payload: invoicePayload,
  });
  if (insertErr && insertErr.code !== '42P01') {
    // Non-fatal — log via the caller. Plan was already applied.
    console.warn('[payments] payment_charges insert failed:', insertErr.message);
  }

  return { applied: true, plan, planExpiry: newExpiry };
};

module.exports = {
  PLAN_CATALOGUE,
  buildInvoicePayload,
  parseInvoicePayload,
  applyPaidPlanUpgrade,
};
