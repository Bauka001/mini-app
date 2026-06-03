/**
 * Telegram Stars payment module.
 *
 * Routes:
 *   POST /payments/stars/create   — create invoice link for any product in STARS_PRODUCT_CATALOG
 *   POST /payments/stars/webhook  — Telegram webhook (pre_checkout_query + successful_payment)
 *   GET  /payments/stars/products — public list of available Stars products
 *
 * Each successful payment is recorded in `payment_orders` (provider='telegram_stars')
 * and routed to a `kind`-specific grant handler:
 *   - vip      → user_entitlements (uses parent `applyPaidEntitlement`)
 *   - case     → user_inventory (mystery boxes count)
 *   - revive   → user_consumables (+1 revive)
 *   - ticket   → user_consumables (+1 tournament ticket)
 *   - wheel_spin → wheel_user_state (+1 paid spin)
 *   - coins    → users.coins
 *   - focus    → focus_token_ledger
 */

const crypto = require('crypto');

const STARS_PRODUCT_CATALOG = {
  // === VIP plans (yearly) ===
  vip_basic:    { kind: 'vip',      tierCode: 'basic',     durationDays: 365, amountStars: 140, label: 'BASIC Yearly',   description: 'BASIC VIP — 365 days' },
  vip_pro:      { kind: 'vip',      tierCode: 'pro',       durationDays: 365, amountStars: 180, label: 'PRO Yearly',     description: 'PRO VIP — 365 days' },
  vip_premium:  { kind: 'vip',      tierCode: 'premium',   durationDays: 365, amountStars: 200, label: 'PREMIUM Yearly', description: 'PREMIUM VIP — 365 days' },

  // === VIP plans (monthly) — lower barrier to entry; yearly shows "Save %" ===
  vip_basic_monthly:   { kind: 'vip', tierCode: 'basic',   durationDays: 30, amountStars: 15, label: 'BASIC Monthly',   description: 'BASIC VIP — 30 days' },
  vip_pro_monthly:     { kind: 'vip', tierCode: 'pro',     durationDays: 30, amountStars: 20, label: 'PRO Monthly',     description: 'PRO VIP — 30 days' },
  vip_premium_monthly: { kind: 'vip', tierCode: 'premium', durationDays: 30, amountStars: 25, label: 'PREMIUM Monthly', description: 'PREMIUM VIP — 30 days' },

  // === Family plan (yearly) — one purchase, owner + up to 3 linked members ===
  vip_family: { kind: 'vip', tierCode: 'premium', durationDays: 365, amountStars: 360, familySeats: 4, label: 'FAMILY Yearly', description: 'PREMIUM VIP for 4 (owner + 3) — 365 days, ~40% off per seat' },

  // === Mystery cases ===
  case_basic:     { kind: 'case', caseId: 'basic_case',     amountStars: 25,  label: 'Basic Case',     description: 'One Basic Mystery Case' },
  case_rare:      { kind: 'case', caseId: 'rare_case',      amountStars: 50,  label: 'Rare Case',      description: 'One Rare Mystery Case' },
  case_legendary: { kind: 'case', caseId: 'legendary_case', amountStars: 100, label: 'Legendary Case', description: 'One Legendary Mystery Case' },

  // === Single-use boosters ===
  revive:           { kind: 'revive', amount: 1, amountStars: 15, label: 'Revive',           description: 'One in-game revive' },
  tournament_ticket:{ kind: 'ticket', amount: 1, amountStars: 50, label: 'Tournament Ticket',description: 'One tournament entry' },
  wheel_spin:       { kind: 'wheel_spin', amount: 1, amountStars: 20, label: 'Extra Wheel Spin', description: 'One additional Wheel of Fortune spin' },

  // === Coin packs ===
  coins_500:  { kind: 'coins', amount: 500,  amountStars: 50,  label: '500 Coins',  description: 'In-game coin pack' },
  coins_1500: { kind: 'coins', amount: 1500, amountStars: 100, label: '1500 Coins', description: 'In-game coin pack (best value)' },
  coins_5000: { kind: 'coins', amount: 5000, amountStars: 250, label: '5000 Coins', description: 'In-game coin mega pack' },

  // === $FOCUS jetton packs (DB-tracked, claimable on-chain when jetton is deployed) ===
  focus_100: { kind: 'focus', amount: 100, amountStars: 75,  label: '100 $FOCUS', description: 'Earn $FOCUS jetton credits — claim on-chain once jetton goes live' },
  focus_500: { kind: 'focus', amount: 500, amountStars: 300, label: '500 $FOCUS', description: 'Big $FOCUS jetton pack with bonus' },

  // === Bundle deals (multi-grant: VIP + cases + $FOCUS at a single discounted price) ===
  // Discount vs buying each item individually is shown in the UI as savedStars.
  bundle_starter: {
    kind: 'bundle', amountStars: 220, label: 'Starter Pack',
    description: 'Basic VIP (1 year) + 1 Rare Case + 100 $FOCUS — ~17% off',
    grants: [
      { type: 'vip', tierCode: 'basic', durationDays: 365 },
      { type: 'case', caseId: 'rare_case', qty: 1 },
      { type: 'focus', amount: 100 },
    ],
  },
  bundle_pro: {
    kind: 'bundle', amountStars: 450, label: 'Pro Pack',
    description: 'Pro VIP (1 year) + 3 Rare Cases + 300 $FOCUS — ~19% off',
    grants: [
      { type: 'vip', tierCode: 'pro', durationDays: 365 },
      { type: 'case', caseId: 'rare_case', qty: 3 },
      { type: 'focus', amount: 300 },
    ],
  },
  bundle_legend: {
    kind: 'bundle', amountStars: 800, label: 'Legend Pack',
    description: 'Premium VIP (1 year) + 5 Legendary Cases + 500 $FOCUS — ~20% off',
    grants: [
      { type: 'vip', tierCode: 'premium', durationDays: 365 },
      { type: 'case', caseId: 'legendary_case', qty: 5 },
      { type: 'focus', amount: 500 },
    ],
  },
};

const STARS_PAYMENT_TTL_MS = 15 * 60 * 1000;
const STARS_PAYLOAD_PREFIX = 'stars';

function buildStarsPayload(productCode, paymentOrderId) {
  return `${STARS_PAYLOAD_PREFIX}:${productCode}:${paymentOrderId}`;
}

function parseStarsPayload(payload) {
  if (typeof payload !== 'string') return null;
  const parts = payload.split(':');
  if (parts.length !== 3) return null;
  if (parts[0] !== STARS_PAYLOAD_PREFIX) return null;
  return { productCode: parts[1], paymentOrderId: parts[2] };
}

async function callTelegramApi(botToken, method, body) {
  if (!botToken) throw new Error('BOT_TOKEN is not configured');
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { ok: false, description: text }; }
  if (!response.ok || !data.ok) {
    const err = new Error(`Telegram API ${method} failed: ${data.description || response.statusText}`);
    err.telegramResponse = data;
    throw err;
  }
  return data.result;
}

function registerStars(app, deps) {
  const {
    supabase,
    resolveRequestAccess,
    ensureSupabase,
    applyPaidEntitlement,
    sendTelegramMessage,
    isMissingTableError,
  } = deps;

  const BOT_TOKEN = process.env.BOT_TOKEN || '';

  // === Public product listing ===
  app.get('/payments/stars/products', (_req, res) => {
    const products = Object.entries(STARS_PRODUCT_CATALOG).map(([code, p]) => ({
      code,
      kind: p.kind,
      amountStars: p.amountStars,
      label: p.label,
      description: p.description,
      meta: {
        tierCode: p.tierCode,
        caseId: p.caseId,
        amount: p.amount,
        durationDays: p.durationDays,
      },
    }));
    res.json({ products, configured: Boolean(BOT_TOKEN) });
  });

  // === Create invoice ===
  app.post('/payments/stars/create', async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;
      const access = await resolveRequestAccess(req, res);
      if (!access) return;

      if (!BOT_TOKEN) {
        return res.status(503).json({ error: 'Bot token is not configured. Set BOT_TOKEN in .env.' });
      }

      const productCode = `${req.body?.productCode || req.body?.planCode || ''}`.trim();
      const product = STARS_PRODUCT_CATALOG[productCode];
      if (!product) {
        return res.status(400).json({ error: 'Unknown Stars product code', productCode });
      }

      // === Promo code support (with auto-first-buy + flash sale stacking) ===
      // Resolution order: explicit user promo → flash sale → first-buy auto.
      // We pick the BEST single discount (not stacked) so customers can't
      // combine multiple promos.
      let promoCodeRaw = `${req.body?.promoCode || ''}`.trim().toUpperCase();
      let appliedPromo = null;
      let amountStars = product.amountStars;

      // If no explicit promo, check first-buy eligibility: user with zero
      // prior paid orders gets FIRSTBUY auto-applied.
      if (!promoCodeRaw && supabase) {
        try {
          const { count: paidCount } = await supabase
            .from('payment_orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_telegram_id', access.identity.userId)
            .eq('status', 'paid');
          if ((paidCount || 0) === 0) {
            promoCodeRaw = 'FIRSTBUY';
          }
        } catch (_) { /* ignore — first-buy is best-effort */ }
      }

      // Active flash sale for this product wins if its discount beats the
      // user's promo. (Same discount → keep user's promo for clearer UX.)
      if (supabase) {
        try {
          const nowIso = new Date().toISOString();
          const { data: fs } = await supabase
            .from('flash_sales')
            .select('product_code, discount_percent, ends_at')
            .eq('product_code', productCode)
            .eq('is_active', true)
            .lte('starts_at', nowIso)
            .gte('ends_at', nowIso)
            .order('discount_percent', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (fs && fs.discount_percent > 0) {
            // promo will be looked up below — let promoCodeRaw fight,
            // and we override if flash sale is stronger after lookup.
            req._flashSale = fs;
          }
        } catch (_) {}
      }

      if (promoCodeRaw && supabase) {
        try {
          const { data: pc } = await supabase
            .from('promo_codes')
            .select('code, discount_percent, plan_codes, valid_until, is_active, max_uses, used_count')
            .eq('code', promoCodeRaw)
            .maybeSingle();
          if (pc && pc.is_active !== false) {
            const expired = pc.valid_until && new Date(pc.valid_until) < new Date();
            const exhausted = pc.max_uses && pc.used_count >= pc.max_uses;
            const applicable = !pc.plan_codes || pc.plan_codes.length === 0
              || pc.plan_codes.includes(product.tierCode || productCode)
              || pc.plan_codes.includes(productCode);
            if (!expired && !exhausted && applicable && pc.discount_percent > 0) {
              const discount = Math.min(95, Math.max(1, Number(pc.discount_percent)));
              amountStars = Math.max(1, Math.round(product.amountStars * (100 - discount) / 100));
              appliedPromo = { code: pc.code, discountPercent: discount, originalStars: product.amountStars };
            }
          }
        } catch (e) {
          console.warn('[stars] promo lookup failed:', e.message);
        }
      }

      // Flash sale beats user promo if its discount is strictly larger.
      if (req._flashSale && req._flashSale.discount_percent > (appliedPromo?.discountPercent || 0)) {
        const fsDiscount = Math.min(95, Math.max(1, Number(req._flashSale.discount_percent)));
        amountStars = Math.max(1, Math.round(product.amountStars * (100 - fsDiscount) / 100));
        appliedPromo = { code: 'FLASH_SALE', discountPercent: fsDiscount, originalStars: product.amountStars, flashSale: true };
      }

      const paymentOrderId = crypto.randomUUID();
      const payload = buildStarsPayload(productCode, paymentOrderId);

      const invoiceTitle = appliedPromo
        ? `${product.label} (-${appliedPromo.discountPercent}%)`
        : product.label;

      const invoiceLink = await callTelegramApi(BOT_TOKEN, 'createInvoiceLink', {
        title: invoiceTitle,
        description: product.description,
        payload,
        currency: 'XTR',
        prices: [{ label: invoiceTitle, amount: amountStars }],
        provider_token: '',
      });

      const { data, error } = await supabase
        .from('payment_orders')
        .insert({
          id: paymentOrderId,
          user_telegram_id: access.identity.userId,
          provider: 'telegram_stars',
          plan_code: product.kind === 'vip' ? product.tierCode : productCode,
          currency: 'XTR',
          amount_nano: amountStars,
          status: 'created',
          memo: payload,
          provider_payload: {
            invoiceLink,
            productCode,
            kind: product.kind,
            productMeta: product,
            promoCode: appliedPromo?.code || null,
            discountPercent: appliedPromo?.discountPercent || 0,
            originalStars: product.amountStars,
          },
          expires_at: new Date(Date.now() + STARS_PAYMENT_TTL_MS).toISOString(),
        })
        .select('id, plan_code, amount_nano, currency, status, memo, expires_at, created_at')
        .single();

      if (error) throw error;

      return res.json({
        paymentOrderId: data.id,
        productCode,
        kind: product.kind,
        provider: 'telegram_stars',
        invoiceLink,
        amountStars,                       // final (discounted) amount actually charged
        originalStars: product.amountStars, // original list price for UI hint
        promoCode: appliedPromo?.code || null,
        discountPercent: appliedPromo?.discountPercent || 0,
        currency: data.currency,
        memo: data.memo,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        status: data.status,
      });
    } catch (error) {
      console.error('[Stars] create error:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'stars_create_error' });
    }
  });

  // === Webhook ===
  app.post('/payments/stars/webhook', async (req, res) => {
    try {
      const update = req.body || {};

      // pre_checkout_query
      if (update.pre_checkout_query) {
        const q = update.pre_checkout_query;
        const reject = async (msg) => {
          await callTelegramApi(BOT_TOKEN, 'answerPreCheckoutQuery', {
            pre_checkout_query_id: q.id, ok: false, error_message: msg,
          }).catch((e) => console.error('[Stars] answer reject error:', e?.message));
          return res.status(200).json({ ok: true });
        };

        if (q.currency !== 'XTR') return reject('Invalid currency');
        const parsed = parseStarsPayload(q.invoice_payload);
        if (!parsed) return reject('Invalid payload');

        const product = STARS_PRODUCT_CATALOG[parsed.productCode];
        if (!product) return reject('Unknown product');

        // Verify amount against the persisted payment_order (handles promo discounts).
        // Without DB we fall back to the catalog list price.
        if (supabase) {
          const { data: order } = await supabase
            .from('payment_orders')
            .select('id, status, expires_at, amount_nano')
            .eq('id', parsed.paymentOrderId)
            .maybeSingle();
          if (!order) return reject('Payment order not found');
          if (order.status === 'paid') return reject('Payment already processed');
          if (order.expires_at && Date.parse(order.expires_at) < Date.now()) return reject('Payment expired');
          if (Number(order.amount_nano) !== Number(q.total_amount)) return reject('Invalid amount');
        } else if (product.amountStars !== q.total_amount) {
          return reject('Invalid amount');
        }

        await callTelegramApi(BOT_TOKEN, 'answerPreCheckoutQuery', {
          pre_checkout_query_id: q.id, ok: true,
        });
        return res.status(200).json({ ok: true });
      }

      // successful_payment may arrive as `message.successful_payment` (newer flow)
      const sp = update.successful_payment
        || update.message?.successful_payment
        || null;

      if (sp) {
        const parsed = parseStarsPayload(sp.invoice_payload);
        if (!parsed) {
          console.warn('[Stars] Invalid payload in successful_payment');
          return res.status(200).json({ ok: true });
        }
        if (!supabase) {
          console.warn('[Stars] Supabase not configured, skipping grant');
          return res.status(200).json({ ok: true });
        }
        const product = STARS_PRODUCT_CATALOG[parsed.productCode];
        if (!product) {
          console.warn('[Stars] Unknown product in successful_payment');
          return res.status(200).json({ ok: true });
        }

        const { data: paymentOrder, error: orderError } = await supabase
          .from('payment_orders')
          .select('*')
          .eq('id', parsed.paymentOrderId)
          .single();

        if (orderError || !paymentOrder) {
          console.warn('[Stars] Payment order not found');
          return res.status(200).json({ ok: true });
        }
        if (paymentOrder.status === 'paid') {
          console.log('[Stars] Already processed', paymentOrder.id);
          return res.status(200).json({ ok: true });
        }

        const verificationPayload = {
          telegramPaymentChargeId: sp.telegram_payment_charge_id,
          providerPaymentId: sp.provider_payment_charge_id,
          currency: sp.currency,
          totalAmount: sp.total_amount,
          productCode: parsed.productCode,
          kind: product.kind,
        };

        try {
          await grantStarsProduct({
            supabase,
            applyPaidEntitlement,
            sendTelegramMessage,
            isMissingTableError,
            paymentOrder,
            product,
            verificationPayload,
          });
          // Referral reward: if this user was referred and the referral is
          // still 'pending', mark it rewarded and credit BOTH parties 100 $FOCUS.
          try {
            await processReferralReward(supabase, paymentOrder.user_telegram_id, sendTelegramMessage);
          } catch (e) { console.warn('[Stars] referral reward error:', e.message); }
        } catch (grantError) {
          console.error('[Stars] grant error:', grantError);
          // Mark order as paid_pending_grant so admin can retry
          await supabase
            .from('payment_orders')
            .update({
              status: 'pending_grant',
              updated_at: new Date().toISOString(),
              provider_payload: {
                ...(paymentOrder.provider_payload || {}),
                verification: verificationPayload,
                grantError: grantError instanceof Error ? grantError.message : String(grantError),
              },
            })
            .eq('id', paymentOrder.id)
            .in('status', ['created', 'pending']);
        }

        return res.status(200).json({ ok: true });
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('[Stars] webhook error:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'webhook_error' });
    }
  });

  // === Manual status poll (client-side fallback) ===
  app.get('/payments/stars/:paymentOrderId/status', async (req, res) => {
    try {
      if (!ensureSupabase(res)) return;
      const access = await resolveRequestAccess(req, res);
      if (!access) return;

      const { data, error } = await supabase
        .from('payment_orders')
        .select('id, status, amount_nano, currency, provider, paid_at, expires_at, provider_payload')
        .eq('id', req.params.paymentOrderId)
        .eq('user_telegram_id', access.identity.userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Payment order not found' });

      return res.json({
        paymentOrderId: data.id,
        status: data.status,
        amountStars: data.amount_nano,
        currency: data.currency,
        provider: data.provider,
        paidAt: data.paid_at,
        expiresAt: data.expires_at,
        productCode: data.provider_payload?.productCode || null,
        kind: data.provider_payload?.kind || null,
      });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'stars_status_error' });
    }
  });

  console.log('[stars] routes mounted (BOT_TOKEN ' + (BOT_TOKEN ? 'configured' : 'MISSING') + ')');
}

// Mark a pending referral as 'rewarded' and credit BOTH parties 100 $FOCUS.
// Idempotent: only fires when the referee has a 'pending' referral row.
async function processReferralReward(supabase, refereeId, sendTelegramMessage) {
  if (!supabase || !refereeId) return;
  const { data: ref } = await supabase
    .from('referrals')
    .select('id, referrer_telegram_id, status')
    .eq('referee_telegram_id', Number(refereeId))
    .eq('status', 'pending')
    .maybeSingle();
  if (!ref) return;
  const referrerId = Number(ref.referrer_telegram_id);
  const nowIso = new Date().toISOString();
  await supabase
    .from('referrals')
    .update({ status: 'rewarded', rewarded_at: nowIso })
    .eq('id', ref.id);
  // Credit 100 $FOCUS to both
  await supabase.from('focus_token_ledger').insert([
    { user_telegram_id: referrerId, delta: 100, reason: 'referral_reward', reference_id: `referee:${refereeId}`, created_at: nowIso },
    { user_telegram_id: refereeId,  delta: 100, reason: 'referral_signup_bonus', reference_id: `referrer:${referrerId}`, created_at: nowIso },
  ]).catch(() => {});
  // Notify both
  if (sendTelegramMessage) {
    sendTelegramMessage(referrerId, `🎉 Сіздің достарыңыз сатып алу жасады — +100 $FOCUS!`);
    sendTelegramMessage(refereeId, `🎁 Бонус: +100 $FOCUS (сіз сілтеме арқылы кірдіңіз)`);
  }
}

async function grantStarsProduct({
  supabase,
  applyPaidEntitlement,
  sendTelegramMessage,
  isMissingTableError,
  paymentOrder,
  product,
  verificationPayload,
}) {
  const nowIso = new Date().toISOString();
  const userTelegramId = Number(paymentOrder.user_telegram_id);

  if (product.kind === 'vip') {
    // Delegate to existing applyPaidEntitlement (handles entitlements + user plan + notification)
    const result = await applyPaidEntitlement(paymentOrder, verificationPayload);
    // Family plan: create a family group so the owner can invite up to
    // (familySeats - 1) members who each get premium until the group expires.
    if (product.familySeats && product.familySeats > 1) {
      try {
        const endsMs = Date.now() + (product.durationDays || 365) * 86_400_000;
        await supabase.from('family_groups').upsert({
          owner_telegram_id: userTelegramId,
          seats: product.familySeats,
          ends_at: new Date(endsMs).toISOString(),
          source_payment_order_id: paymentOrder.id,
          updated_at: nowIso,
        }, { onConflict: 'owner_telegram_id' });
        if (typeof sendTelegramMessage === 'function') {
          const botUser = (process.env.BOT_USERNAME || 'Focus_game_bot').replace(/^@/, '');
          sendTelegramMessage(
            userTelegramId,
            `👨‍👩‍👧‍👦 <b>FAMILY PREMIUM іске қосылды!</b>\n\n`
            + `Сіз + 3 адам PREMIUM пайдаланады.\n`
            + `Отбасы мүшелерін шақыру сілтемесі:\n`
            + `https://t.me/${botUser}?startapp=fam_${userTelegramId}\n\n`
            + `Әр мүше осы сілтемемен кіріп, PREMIUM-ды бірден алады.`,
          );
        }
      } catch (e) {
        if (!isMissingTableError || !isMissingTableError(e)) {
          console.warn('[stars] family group create failed:', e && e.message ? e.message : e);
        }
      }
    }
    return result;
  }

  // For non-VIP products, mark order paid first, then grant.
  const paymentPayload = {
    ...(paymentOrder.provider_payload || {}),
    verification: verificationPayload,
  };
  const { error: updateError } = await supabase
    .from('payment_orders')
    .update({
      status: 'paid',
      paid_at: nowIso,
      updated_at: nowIso,
      provider_charge_id: verificationPayload.telegramPaymentChargeId || paymentOrder.provider_charge_id || null,
      provider_payload: paymentPayload,
    })
    .eq('id', paymentOrder.id)
    .in('status', ['created', 'pending']);
  if (updateError) throw updateError;

  // Always record a generic grant entry in `stars_grants` (for audit + idempotency)
  const grantInsert = await supabase
    .from('stars_grants')
    .insert({
      payment_order_id: paymentOrder.id,
      user_telegram_id: userTelegramId,
      product_code: verificationPayload.productCode,
      kind: product.kind,
      amount_stars: product.amountStars,
      payload: verificationPayload,
      created_at: nowIso,
    });
  if (grantInsert.error && !isMissingTableError(grantInsert.error)) {
    console.warn('[Stars] stars_grants insert failed (non-fatal):', grantInsert.error.message);
  }

  // Kind-specific grant
  switch (product.kind) {
    case 'case': {
      // Increment user_inventory.mystery_boxes for the given case
      const { data: existing } = await supabase
        .from('user_inventory')
        .select('mystery_boxes')
        .eq('user_telegram_id', userTelegramId)
        .eq('case_id', product.caseId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_inventory')
          .update({ mystery_boxes: (existing.mystery_boxes || 0) + 1, updated_at: nowIso })
          .eq('user_telegram_id', userTelegramId)
          .eq('case_id', product.caseId);
      } else {
        await supabase.from('user_inventory').insert({
          user_telegram_id: userTelegramId,
          case_id: product.caseId,
          mystery_boxes: 1,
          updated_at: nowIso,
        });
      }
      sendTelegramMessage(userTelegramId, `⭐ Stars төлемі қабылданды: +1 ${product.label}`);
      break;
    }

    case 'revive': {
      const { error: reviveError } = await supabase.from('user_consumables').insert({
        user_telegram_id: userTelegramId, kind: 'revive', amount: product.amount || 1, source: 'stars_grant', created_at: nowIso,
      });
      if (reviveError) throw reviveError;
      sendTelegramMessage(userTelegramId, `⭐ +${product.amount || 1} Revive`);
      break;
    }

    case 'ticket': {
      const { error: ticketError } = await supabase.from('user_consumables').insert({
        user_telegram_id: userTelegramId, kind: 'tournament_ticket', amount: product.amount || 1, source: 'stars_grant', created_at: nowIso,
      });
      if (ticketError) throw ticketError;
      sendTelegramMessage(userTelegramId, `⭐ +${product.amount || 1} Tournament Ticket`);
      break;
    }

    case 'wheel_spin': {
      // Increment paid_spin_remaining on wheel_user_state
      const { data: ws } = await supabase
        .from('wheel_user_state')
        .select('paid_spins_remaining')
        .eq('user_telegram_id', userTelegramId)
        .maybeSingle();
      if (ws) {
        await supabase
          .from('wheel_user_state')
          .update({ paid_spins_remaining: (ws.paid_spins_remaining || 0) + (product.amount || 1), updated_at: nowIso })
          .eq('user_telegram_id', userTelegramId);
      } else {
        const { error: wsError } = await supabase.from('wheel_user_state').insert({
          user_telegram_id: userTelegramId,
          paid_spins_remaining: product.amount || 1,
          updated_at: nowIso,
        });
        if (wsError && !isMissingTableError(wsError)) throw wsError;
      }
      sendTelegramMessage(userTelegramId, `⭐ +${product.amount || 1} Wheel Spin`);
      break;
    }

    case 'coins': {
      const { data: u } = await supabase
        .from('users')
        .select('coins')
        .eq('telegram_id', userTelegramId)
        .maybeSingle();
      const newCoins = Number(u?.coins || 0) + Number(product.amount || 0);
      await supabase
        .from('users')
        .update({ coins: newCoins, updated_at: nowIso })
        .eq('telegram_id', userTelegramId);
      sendTelegramMessage(userTelegramId, `⭐ +${product.amount} Coins`);
      break;
    }

    case 'focus': {
      // Credit DB-tracked $FOCUS balance (jetton claimable later on-chain)
      const { error: focusError } = await supabase.from('focus_token_ledger').insert({
        user_telegram_id: userTelegramId,
        delta: product.amount || 0,
        reason: 'stars_purchase',
        reference_id: paymentOrder.id,
        metadata: { productCode: verificationPayload.productCode, stars: product.amountStars },
        created_at: nowIso,
      });
      if (focusError) throw focusError;
      sendTelegramMessage(
        userTelegramId,
        `⭐ +${product.amount} $FOCUS — claim on-chain once jetton goes live`
      );
      break;
    }

    case 'bundle': {
      // Multi-grant: apply each entry in product.grants[].
      const grants = Array.isArray(product.grants) ? product.grants : [];
      for (const g of grants) {
        try {
          if (g.type === 'vip') {
            // Reuse applyPaidEntitlement by constructing a synthetic order
            const tierCode = g.tierCode || 'basic';
            const durationDays = g.durationDays || 365;
            await applyPaidEntitlement(
              { ...paymentOrder, plan_code: tierCode, provider_payload: { ...(paymentOrder.provider_payload || {}), bundleTier: tierCode, durationDays } },
              { ...verificationPayload, bundleGrant: 'vip', tierCode }
            ).catch((e) => console.warn('[bundle] vip grant failed:', e.message));
          } else if (g.type === 'case') {
            const qty = Math.max(1, Number(g.qty || 1));
            const { data: existing } = await supabase
              .from('user_inventory')
              .select('mystery_boxes')
              .eq('user_telegram_id', userTelegramId).eq('case_id', g.caseId).maybeSingle();
            if (existing) {
              await supabase.from('user_inventory')
                .update({ mystery_boxes: (existing.mystery_boxes || 0) + qty, updated_at: nowIso })
                .eq('user_telegram_id', userTelegramId).eq('case_id', g.caseId);
            } else {
              await supabase.from('user_inventory').insert({
                user_telegram_id: userTelegramId, case_id: g.caseId, mystery_boxes: qty, updated_at: nowIso,
              });
            }
          } else if (g.type === 'focus') {
            const amount = Math.max(0, Number(g.amount || 0));
            if (amount > 0) {
              await supabase.from('focus_token_ledger').insert({
                user_telegram_id: userTelegramId, delta: amount, reason: 'stars_bundle',
                reference_id: paymentOrder.id,
                metadata: { productCode: verificationPayload.productCode, stars: product.amountStars, bundleGrant: 'focus' },
                created_at: nowIso,
              });
            }
          }
        } catch (e) {
          console.warn('[bundle] grant', g.type, 'failed:', e.message);
        }
      }
      sendTelegramMessage(userTelegramId, `🎁 ${product.label} unlocked — VIP + cases + $FOCUS credited`);
      break;
    }

    default:
      console.warn('[Stars] unknown product kind:', product.kind);
  }

  return { status: 'paid', kind: product.kind, productCode: verificationPayload.productCode };
}

/**
 * Handle a Stars webhook update for MY payload format (`stars:<product>:<order>`).
 * Returns true if this update was a Stars-module payload (and was handled),
 * false if the payload is not ours (caller should fall through to its own logic).
 *
 * Lets the unified /telegram/webhook delegate non-plan Stars products
 * (cases, revive, coins, $FOCUS, tickets, wheel spins) to this module.
 */
async function handleStarsWebhookUpdate(update, deps) {
  const { supabase, applyPaidEntitlement, sendTelegramMessage, isMissingTableError, answerPreCheckoutQuery } = deps;
  const BOT_TOKEN = process.env.BOT_TOKEN || '';

  // pre_checkout_query
  if (update.pre_checkout_query) {
    const q = update.pre_checkout_query;
    const parsed = parseStarsPayload(q.invoice_payload);
    if (!parsed) return false; // not our payload
    const product = STARS_PRODUCT_CATALOG[parsed.productCode];

    // Validation: currency + product + amount.
    // Amount check pulls the actual stored amount from payment_orders so promo
    // discounts (FIRSTBUY, ENERGY, STARTUP, flash sale) line up. Catalog list
    // price is only the fallback when the order can't be loaded.
    let ok = Boolean(product) && q.currency === 'XTR';
    let rejectReason = null;
    if (!product) rejectReason = 'Invalid Stars product';
    else if (q.currency !== 'XTR') rejectReason = 'Invalid currency';
    else if (supabase) {
      try {
        const { data: order } = await supabase
          .from('payment_orders')
          .select('id, status, expires_at, amount_nano')
          .eq('id', parsed.paymentOrderId)
          .maybeSingle();
        if (!order) { ok = false; rejectReason = 'Payment order not found'; }
        else if (order.status === 'paid') { ok = false; rejectReason = 'Already processed'; }
        else if (order.expires_at && Date.parse(order.expires_at) < Date.now()) { ok = false; rejectReason = 'Payment expired'; }
        else if (Number(order.amount_nano) !== Number(q.total_amount)) { ok = false; rejectReason = 'Invalid amount'; }
      } catch (e) {
        ok = false; rejectReason = 'Order lookup failed: ' + e.message;
      }
    } else if (product.amountStars !== q.total_amount) {
      ok = false; rejectReason = 'Invalid amount';
    }

    if (typeof answerPreCheckoutQuery === 'function') {
      await answerPreCheckoutQuery(q.id, ok, ok ? undefined : rejectReason).catch(() => {});
    } else if (BOT_TOKEN) {
      await callTelegramApi(BOT_TOKEN, 'answerPreCheckoutQuery', {
        pre_checkout_query_id: q.id, ok, ...(ok ? {} : { error_message: rejectReason || 'Invalid Stars product' }),
      }).catch(() => {});
    }
    return true;
  }

  // successful_payment
  const sp = update.successful_payment || update.message?.successful_payment || null;
  if (sp) {
    const parsed = parseStarsPayload(sp.invoice_payload);
    if (!parsed) return false; // not our payload
    if (!supabase) return true;
    const product = STARS_PRODUCT_CATALOG[parsed.productCode];
    if (!product) return true;

    const { data: paymentOrder, error } = await supabase
      .from('payment_orders').select('*').eq('id', parsed.paymentOrderId).single();
    if (error || !paymentOrder) return true;
    if (paymentOrder.status === 'paid') return true;

    const verificationPayload = {
      telegramPaymentChargeId: sp.telegram_payment_charge_id,
      providerPaymentId: sp.provider_payment_charge_id,
      currency: sp.currency,
      totalAmount: sp.total_amount,
      productCode: parsed.productCode,
      kind: product.kind,
    };
    try {
      await grantStarsProduct({ supabase, applyPaidEntitlement, sendTelegramMessage, isMissingTableError, paymentOrder, product, verificationPayload });
    } catch (e) {
      console.error('[stars] unified grant error:', e);
    }
    return true;
  }

  return false;
}

module.exports = registerStars;
module.exports.STARS_PRODUCT_CATALOG = STARS_PRODUCT_CATALOG;
module.exports.parseStarsPayload = parseStarsPayload;
module.exports.buildStarsPayload = buildStarsPayload;
module.exports.grantStarsProduct = grantStarsProduct;
module.exports.handleStarsWebhookUpdate = handleStarsWebhookUpdate;
