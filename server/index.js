// Local dev only: load .env from repo root or server/. On Render (and any
// prod host) env vars come from the platform, not a sibling file.
if (process.env.NODE_ENV !== 'production') {
  const path = require('path');
  try {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
    require('dotenv').config({ path: path.join(__dirname, '.env') });
  } catch {}
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const {
  requireString,
  optionalString,
  requireInt,
  optionalIsoDate,
  optionalHttpUrl,
  handleValidationError,
} = require('./lib/validate');
const { sendMessage, answerPreCheckoutQuery } = require('./lib/telegramApi');
const {
  PLAN_CATALOGUE,
  parseInvoicePayload,
  applyPaidPlanUpgrade,
} = require('./lib/payments');

const app = express();

// Render terminates TLS at a proxy — trust one hop so req.ip and the
// rate-limiter see the real client IP via X-Forwarded-For.
app.set('trust proxy', 1);
app.disable('x-powered-by');

const parseOriginList = (value = '') =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const allowedOrigins = parseOriginList(process.env.ALLOWED_ORIGINS || '');
const corsOptions = allowedOrigins.length
  ? {
      origin: (origin, callback) => {
        // Allow same-origin / server-to-server requests with no Origin header
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Deny silently: don't throw — that turns into a 500 with a stack
        // trace. Returning false makes cors omit the Allow-Origin header,
        // which causes the browser to block the response cleanly.
        return callback(null, false);
      },
    }
  : undefined;

// Request-id correlation: prefer an inbound x-request-id, fall back to
// Vercel's per-invocation x-vercel-id, otherwise generate one. Echo it
// back as a header so clients can quote it when reporting bugs, and
// stash it on res.locals so the error handler can tag log lines.
app.use((req, res, next) => {
  const incoming = req.headers['x-request-id'] || req.headers['x-vercel-id'];
  const requestId = typeof incoming === 'string' && incoming ? incoming : crypto.randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

// JSON-only API: disable CSP (no HTML served) and let CORS handle origins.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: '200kb' }));

// Per-route rate limits. Keys on req.ip (via trust proxy). standardHeaders
// surfaces RateLimit-* headers so clients can back off.
const makeLimiter = (max, windowMs = 60_000) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please retry shortly' },
  });

const authLimiter = makeLimiter(30);
const writeLimiter = makeLimiter(10);
const adminLimiter = makeLimiter(60);

const PORT = Number(process.env.PORT || 3001);
const isProduction = process.env.NODE_ENV === 'production';
const allowDevAuthBypass = !isProduction && process.env.ALLOW_DEV_AUTH_BYPASS === 'true';
const INIT_DATA_MAX_AGE_SEC = Number(process.env.INIT_DATA_MAX_AGE_SEC || 300);
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

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
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
  const ok = safeEqualHex(calculatedHash, hash);

  if (!ok) {
    return { ok: false, reason: 'hash_mismatch' };
  }

  // Replay-attack protection: require fresh auth_date within INIT_DATA_MAX_AGE_SEC
  const authDateRaw = urlParams.get('auth_date');
  const authDate = Number(authDateRaw);
  if (!Number.isFinite(authDate) || authDate <= 0) {
    return { ok: false, reason: 'missing_auth_date' };
  }
  const ageSec = Math.floor(Date.now() / 1000) - authDate;
  if (ageSec > INIT_DATA_MAX_AGE_SEC || ageSec < -60) {
    return { ok: false, reason: 'auth_date_expired' };
  }

  let userId = null;
  try {
    const userStr = urlParams.get('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      userId = user.id || null;
    }
  } catch {}

  return { ok: true, userId, reason: null };
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

  // Local development bypass — explicit opt-in via ALLOW_DEV_AUTH_BYPASS=true.
  // Never engages in production (isProduction guard) and never engages without explicit env opt-in.
  if (allowDevAuthBypass && !initData) {
    const fallbackUserId = bootstrapAdminIds[0] || 0;
    return { ok: true, mode: 'dev', userId: fallbackUserId };
  }

  if (!botToken) {
    if (isProduction) {
      return { ok: false, reason: 'bot_token_missing' };
    }

    if (!allowDevAuthBypass) {
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

// Telegram bot webhook. Telegram POSTs every update here when the webhook is
// registered with `setWebhook`. Auth is by `secret_token` — Telegram sends it
// in the X-Telegram-Bot-Api-Secret-Token header on every call. No initData,
// no rate limiter (Telegram retries naturally and we don't want to drop
// updates because of bursts). The handler is intentionally small: only the
// payment flow lives here. Conversational bot logic belongs in a separate
// process.
app.post('/telegram/webhook', async (req, res) => {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  const provided = req.headers['x-telegram-bot-api-secret-token'] || '';
  if (!expectedSecret || provided !== expectedSecret) {
    return res.status(401).json({ ok: false });
  }

  const update = req.body || {};

  // Always 200 to Telegram so it doesn't queue retries while we work. Errors
  // are logged here, not propagated, otherwise a transient failure can lock
  // the webhook into a retry storm.
  res.status(200).json({ ok: true });

  try {
    if (update.pre_checkout_query) {
      const q = update.pre_checkout_query;
      const parsed = parseInvoicePayload(q.invoice_payload);
      if (!parsed) {
        await answerPreCheckoutQuery(q.id, false, 'Invalid invoice');
        return;
      }
      // Light sanity: paying user must match the user the invoice was issued for.
      if (q.from?.id && q.from.id !== parsed.userId) {
        await answerPreCheckoutQuery(q.id, false, 'Invoice user mismatch');
        return;
      }
      await answerPreCheckoutQuery(q.id, true);
      return;
    }

    const successful = update.message?.successful_payment;
    if (successful) {
      const fromId = update.message.from?.id;
      const parsed = parseInvoicePayload(successful.invoice_payload);
      if (!parsed || !fromId) {
        console.warn('[telegram webhook] dropping successful_payment without valid payload');
        return;
      }

      if (!supabase) {
        console.error('[telegram webhook] supabase not configured — payment received but cannot apply');
        return;
      }

      const result = await applyPaidPlanUpgrade({
        supabase,
        telegramId: parsed.userId,
        plan: parsed.plan,
        durationDays: parsed.durationDays,
        totalAmount: successful.total_amount,
        currency: successful.currency,
        telegramPaymentChargeId: successful.telegram_payment_charge_id,
        providerPaymentChargeId: successful.provider_payment_charge_id,
        invoicePayload: successful.invoice_payload,
      });

      if (result.applied) {
        await sendMessage(
          parsed.userId,
          `Құттықтаймыз! ${PLAN_CATALOGUE[parsed.sku]?.title || 'Premium'} белсендірілді.`
        ).catch((err) => console.warn('[telegram webhook] sendMessage failed:', err.message));
      }
    }
  } catch (err) {
    console.error('[telegram webhook] handler error:', err);
  }
});

app.post('/auth/verify', authLimiter, async (req, res) => {
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

app.post('/admin/session', adminLimiter, async (req, res) => {
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

app.post('/feedback', writeLimiter, async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);

    if (!access) {
      return;
    }

    let text;
    let username;
    let userTelegramId;
    let imageUrl;
    try {
      text = requireString(req.body?.text, 'text', { min: 1, max: 5000 });
      username = optionalString(req.body?.username, 'username', { max: 64 }) || '';
      userTelegramId = requireInt(req.body?.userTelegramId, 'userTelegramId', { min: 1 });
      imageUrl = optionalHttpUrl(req.body?.imageUrl, 'imageUrl');
    } catch (error) {
      if (handleValidationError(error, res)) return;
      throw error;
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

    return res.json({ ok: true, feedbackId: data.id });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'feedback_create_error' });
  }
});

const KNOWN_GAME_IDS = new Set([
  'schulte',
  'math',
  'stroop',
  'memory',
  'odd_one_out',
  'pairs',
  'tetris',
  '2048',
  'agent_spot',
  'agent_sequence',
  'code_breaker',
]);

const GAME_SUBMIT_MAX_SCORE = 1_000_000;
const GAME_SUBMIT_MAX_COINS = 200;
const GAME_SUBMIT_MIN_GAP_MS = 1500;

const USER_READ_COLUMNS =
  'telegram_id, first_name, last_name, username, photo_url, coins, gems, xp, level, plan, plan_expiry, hp, max_hp, fec_balance, brain_stats, skin_inventory, active_skin, inventory, daily_goal_minutes, streak, daily_reward_streak, last_daily_reward_date, promotion_end_iso, daily_quest, is_blocked, blocked_at, block_reason, created_at, updated_at';

const PREMIUM_PLANS = new Set(['silver', 'gold', 'premium']);
const VIP_TOURNAMENT_PLAN = 'premium';

const isPlanActive = (row) => {
  if (!row || !PREMIUM_PLANS.has(row.plan)) return false;
  if (row.plan_expiry === null || row.plan_expiry === undefined) return true;
  const expiryMs = Number(row.plan_expiry);
  if (!Number.isFinite(expiryMs) || expiryMs <= 0) return true;
  return expiryMs > Date.now();
};

// Mirrors the client's tournament week-keying.
const getServerTournamentWeek = (now = new Date()) => {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0=Sun .. 6=Sat
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((day + 6) % 7))
  );
  return monday.toISOString().slice(0, 10);
};

app.post('/users/me', authLimiter, async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);
    if (!access) {
      return;
    }

    const userTelegramId = access.identity.userId;
    const { data, error } = await supabase
      .from('users')
      .select(USER_READ_COLUMNS)
      .eq('telegram_id', userTelegramId)
      .maybeSingle();

    if (error && !isMissingTableError(error)) {
      throw error;
    }

    if (!data) {
      return res.json({ ok: true, user: null });
    }

    if (data.is_blocked) {
      return res.status(403).json({
        error: 'User is blocked',
        reason: data.block_reason || null,
      });
    }

    return res.json({
      ok: true,
      user: {
        telegramId: data.telegram_id,
        firstName: data.first_name,
        lastName: data.last_name,
        username: data.username,
        photoUrl: data.photo_url,
        coins: Number(data.coins) || 0,
        gems: Number(data.gems) || 0,
        xp: Number(data.xp) || 0,
        level: Number(data.level) || 1,
        plan: data.plan,
        planExpiry: data.plan_expiry,
        planActive: isPlanActive(data),
        hp: data.hp,
        maxHp: data.max_hp,
        fecBalance: data.fec_balance,
        brainStats: data.brain_stats,
        skinInventory: data.skin_inventory,
        activeSkin: data.active_skin,
        inventory: data.inventory,
        dailyGoalMinutes: data.daily_goal_minutes,
        streak: data.streak,
        dailyRewardStreak: data.daily_reward_streak,
        lastDailyRewardDate: data.last_daily_reward_date,
        promotionEndISO: data.promotion_end_iso,
        dailyQuest: data.daily_quest,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'users_me_error',
    });
  }
});

// Always-server-controlled columns. The client cannot write these even if it
// sends them — they're set elsewhere (/tickets/issue for plan, /admin/* for
// blocking). Coins/xp/level are also server-controlled by /games/submit but
// other client paths (skin purchases, daily rewards, ad rewards) legitimately
// adjust them, so we let those through with a per-sync delta cap below.
const USER_SYNC_FORBIDDEN_COLUMNS = new Set([
  'plan',
  'plan_expiry',
  'is_blocked',
  'blocked_at',
  'blocked_by',
  'block_reason',
  'created_at',
  'telegram_id',
  'id',
]);

const USER_SYNC_ALLOWED_COLUMNS = new Set([
  'first_name',
  'last_name',
  'username',
  'photo_url',
  'coins',
  'gems',
  'xp',
  'level',
  'brain_stats',
  'skin_inventory',
  'active_skin',
  'hp',
  'max_hp',
  'fec_balance',
  'inventory',
  'daily_goal_minutes',
  'streak',
  'daily_reward_streak',
  'last_daily_reward_date',
  'promotion_end_iso',
  'daily_quest',
  'weekly_quest',
  'energy',
  'max_energy',
  'last_energy_regen_time',
  'streak_protection',
  'mystery_box_available',
  'mystery_box_price',
]);

// Per-sync delta caps for monetary fields. The client legitimately adjusts
// these for skin purchases, daily rewards, ad views, etc., but a single sync
// shouldn't grow them by orders of magnitude. We compare against the current
// DB value and clamp to the existing value if the delta is implausible —
// keeping legitimate gameplay flowing while neutering the obvious "set
// coins=999999" attack.
const SYNC_DELTA_CAPS = {
  coins: 5_000,
  gems: 500,
  xp: 5_000,
  level: 5,
};

app.post('/users/sync', writeLimiter, async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);
    if (!access) {
      return;
    }

    const userTelegramId = access.identity.userId;
    const incoming = req.body?.user || {};

    // Filter to allow-listed columns and explicitly drop forbidden ones.
    const writableUpdate = {};
    for (const [key, value] of Object.entries(incoming)) {
      if (USER_SYNC_FORBIDDEN_COLUMNS.has(key)) continue;
      if (USER_SYNC_ALLOWED_COLUMNS.has(key)) {
        writableUpdate[key] = value;
      }
    }

    if (Object.keys(writableUpdate).length === 0) {
      return res.json({ ok: true, written: 0 });
    }

    // Sanity-check monetary deltas against the current DB row.
    const monetaryFields = Object.keys(SYNC_DELTA_CAPS).filter((f) => f in writableUpdate);
    const clampedFields = [];
    if (monetaryFields.length > 0) {
      const { data: currentRow, error: currentError } = await supabase
        .from('users')
        .select('coins, gems, xp, level')
        .eq('telegram_id', userTelegramId)
        .maybeSingle();

      if (currentError && !isMissingTableError(currentError)) {
        throw currentError;
      }

      if (currentRow) {
        for (const field of monetaryFields) {
          const proposed = Number(writableUpdate[field]);
          const current = Number(currentRow[field]) || 0;
          if (!Number.isFinite(proposed)) {
            delete writableUpdate[field];
            clampedFields.push(field);
            continue;
          }
          const delta = proposed - current;
          if (delta > SYNC_DELTA_CAPS[field]) {
            console.warn(
              `[Users Sync] Implausible ${field} delta from user ${userTelegramId}:`,
              { current, proposed, delta }
            );
            // Clamp: keep DB value, ignore client's claim.
            delete writableUpdate[field];
            clampedFields.push(field);
          }
        }
      }
    }

    writableUpdate.updated_at = new Date().toISOString();

    // Upsert keyed on telegram_id so the first sync after sign-in creates the
    // row. The created row only has the allow-listed columns and DB defaults
    // (plan='free', coins=100) — the user can never bootstrap into premium
    // via this endpoint.
    const upsertPayload = { ...writableUpdate, telegram_id: userTelegramId };
    const { error: upsertError } = await supabase
      .from('users')
      .upsert(upsertPayload, { onConflict: 'telegram_id' });

    if (upsertError && !isMissingTableError(upsertError)) {
      throw upsertError;
    }

    return res.json({
      ok: true,
      written: Object.keys(writableUpdate).length,
      ignoredKeys: Object.keys(incoming).filter(
        (k) => !USER_SYNC_ALLOWED_COLUMNS.has(k) || USER_SYNC_FORBIDDEN_COLUMNS.has(k)
      ),
      clampedFields,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'users_sync_error',
    });
  }
});

// Server-canonical skin catalog. The client sends only the skinId; the
// server looks up the price. Closes the "pass cost: 0" attack and the
// "buy a skin via tampered local coins" attack — balance is checked
// against the DB row, not against client state.
const SKIN_CATALOG = {
  neon_blue: { coins: 100 },
  royal_purple: { coins: 250 },
  matrix: { coins: 500 },
};

app.post('/skins/purchase', writeLimiter, async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);
    if (!access) {
      return;
    }

    const userTelegramId = access.identity.userId;
    const skinId = `${req.body?.skinId || ''}`.trim().slice(0, 64);

    if (!Object.prototype.hasOwnProperty.call(SKIN_CATALOG, skinId)) {
      return res.status(400).json({ error: 'Unknown skin' });
    }

    const price = SKIN_CATALOG[skinId].coins;

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('coins, skin_inventory, is_blocked')
      .eq('telegram_id', userTelegramId)
      .maybeSingle();

    if (userError && !isMissingTableError(userError)) {
      throw userError;
    }
    if (!userRow) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (userRow.is_blocked) {
      return res.status(403).json({ error: 'User is blocked' });
    }

    const currentCoins = Number(userRow.coins) || 0;
    const inventory = Array.isArray(userRow.skin_inventory) ? userRow.skin_inventory : [];

    if (inventory.includes(skinId)) {
      return res.status(409).json({ error: 'Skin already owned', reason: 'already_owned' });
    }
    if (currentCoins < price) {
      return res.status(402).json({
        error: 'Insufficient coins',
        reason: 'insufficient_coins',
        required: price,
        balance: currentCoins,
      });
    }

    const newCoins = currentCoins - price;
    const newInventory = [...inventory, skinId];

    const { error: updateError } = await supabase
      .from('users')
      .update({
        coins: newCoins,
        skin_inventory: newInventory,
        updated_at: new Date().toISOString(),
      })
      .eq('telegram_id', userTelegramId);

    if (updateError) {
      throw updateError;
    }

    const { error: txError } = await supabase.from('coin_transactions').insert({
      user_telegram_id: userTelegramId,
      currency: 'coins',
      amount: price,
      direction: 'debit',
      reason: 'skin_purchase',
      metadata: { skinId },
    });
    if (txError && !isMissingTableError(txError)) {
      console.error('[Skins] transaction log failed:', txError);
    }

    return res.json({
      ok: true,
      skinId,
      price,
      coins: newCoins,
      skinInventory: newInventory,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'skin_purchase_error',
    });
  }
});

app.post('/tournaments/leaderboard', authLimiter, async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);
    if (!access) {
      return;
    }

    // Allow callers to ask for a specific past week, defaulting to the current.
    const requestedWeek =
      typeof req.body?.weekKey === 'string' && req.body.weekKey.length <= 16
        ? req.body.weekKey
        : null;
    const weekKey = requestedWeek || getServerTournamentWeek();

    const { data: scoreRows, error: scoresError } = await supabase
      .from('tournament_scores')
      .select('user_telegram_id, game_id, score')
      .eq('week_key', weekKey);

    if (scoresError) {
      if (isMissingTableError(scoresError)) {
        return res.json({ ok: true, weekKey, leaderboard: [] });
      }
      throw scoresError;
    }

    if (!scoreRows || scoreRows.length === 0) {
      return res.json({ ok: true, weekKey, leaderboard: [] });
    }

    // Aggregate per user. Tournament score is the sum of per-game scores
    // (capped at 3 games per user per week by /games/submit).
    const aggregated = new Map();
    for (const row of scoreRows) {
      const id = row.user_telegram_id;
      const score = Number(row.score) || 0;
      const cur = aggregated.get(id) || { score: 0, games: 0 };
      cur.score += score;
      cur.games += 1;
      aggregated.set(id, cur);
    }

    const userIds = [...aggregated.keys()];
    const { data: userRows, error: usersError } = await supabase
      .from('users')
      .select('telegram_id, first_name, username, photo_url')
      .in('telegram_id', userIds);

    if (usersError && !isMissingTableError(usersError)) {
      throw usersError;
    }

    const usersById = new Map();
    for (const row of userRows || []) {
      usersById.set(row.telegram_id, row);
    }

    const leaderboard = [...aggregated.entries()]
      .map(([id, agg]) => {
        const user = usersById.get(id);
        return {
          userTelegramId: id,
          firstName: user?.first_name ?? null,
          username: user?.username ?? null,
          photoUrl: user?.photo_url ?? null,
          score: agg.score,
          gamesPlayed: agg.games,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return res.json({ ok: true, weekKey, leaderboard });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'tournaments_leaderboard_error',
    });
  }
});

app.post('/tournaments/join', writeLimiter, async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);
    if (!access) {
      return;
    }

    const userTelegramId = access.identity.userId;
    const paymentMethod =
      req.body?.paymentMethod === 'vip'
        ? 'vip'
        : req.body?.paymentMethod === 'ton'
          ? 'ton'
          : req.body?.paymentMethod === 'stars'
            ? 'stars'
            : null;

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Invalid paymentMethod' });
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('telegram_id, plan, plan_expiry, is_blocked')
      .eq('telegram_id', userTelegramId)
      .maybeSingle();

    if (userError && !isMissingTableError(userError)) {
      throw userError;
    }

    if (!userRow) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userRow.is_blocked) {
      return res.status(403).json({ error: 'User is blocked' });
    }

    const weekKey = getServerTournamentWeek();

    if (paymentMethod === 'vip') {
      if (userRow.plan !== VIP_TOURNAMENT_PLAN || !isPlanActive(userRow)) {
        return res.status(403).json({
          error: 'VIP free entry requires an active premium plan',
          reason: 'plan_inactive',
        });
      }

      const { data: existing, error: existingError } = await supabase
        .from('tournament_entries')
        .select('id')
        .eq('user_telegram_id', userTelegramId)
        .eq('week_key', weekKey)
        .eq('payment_method', 'vip')
        .maybeSingle();

      if (existingError && !isMissingTableError(existingError)) {
        throw existingError;
      }
      if (existing) {
        return res.status(409).json({
          error: 'VIP free entry already used for this week',
          reason: 'already_joined',
        });
      }

      const { error: insertError } = await supabase.from('tournament_entries').insert({
        user_telegram_id: userTelegramId,
        week_key: weekKey,
        payment_method: 'vip',
      });

      if (insertError && !isMissingTableError(insertError)) {
        throw insertError;
      }

      return res.json({ ok: true, weekKey, paymentMethod: 'vip' });
    }

    // Paid methods (stars/ton): record the entry. Settlement is out of scope —
    // a separate payment webhook would mark it confirmed.
    const { error: insertError } = await supabase.from('tournament_entries').insert({
      user_telegram_id: userTelegramId,
      week_key: weekKey,
      payment_method: paymentMethod,
    });

    if (insertError && !isMissingTableError(insertError)) {
      throw insertError;
    }

    return res.json({ ok: true, weekKey, paymentMethod });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'tournaments_join_error',
    });
  }
});

app.post('/games/submit', writeLimiter, async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);
    if (!access) {
      return;
    }

    const userTelegramId = access.identity.userId;
    const gameId = `${req.body?.gameId || ''}`.trim().slice(0, 64);
    if (!KNOWN_GAME_IDS.has(gameId)) {
      return res.status(400).json({ error: 'Unknown game' });
    }

    const rawScore = Number(req.body?.score);
    const safeScore = Number.isFinite(rawScore)
      ? Math.max(0, Math.min(GAME_SUBMIT_MAX_SCORE, rawScore))
      : 0;

    const rawCoins = Number(req.body?.coinsEarned);
    const safeCoins = Number.isFinite(rawCoins)
      ? Math.max(0, Math.min(GAME_SUBMIT_MAX_COINS, Math.floor(rawCoins)))
      : 0;

    // Dedup: reject if the user submitted the same game inside the gap window.
    const { data: lastRow, error: lastError } = await supabase
      .from('game_results')
      .select('submitted_at')
      .eq('user_telegram_id', userTelegramId)
      .eq('game_id', gameId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastError && !isMissingTableError(lastError)) {
      throw lastError;
    }

    if (lastRow?.submitted_at) {
      const lastMs = new Date(lastRow.submitted_at).getTime();
      if (Number.isFinite(lastMs) && Date.now() - lastMs < GAME_SUBMIT_MIN_GAP_MS) {
        return res.json({ ok: true, awarded: 0, reason: 'rate_limited' });
      }
    }

    const { error: insertError } = await supabase.from('game_results').insert({
      user_telegram_id: userTelegramId,
      game_id: gameId,
      score: safeScore,
      coins_awarded: safeCoins,
    });

    if (insertError && !isMissingTableError(insertError)) {
      throw insertError;
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('coins, xp, level')
      .eq('telegram_id', userTelegramId)
      .maybeSingle();

    if (userError && !isMissingTableError(userError)) {
      throw userError;
    }

    if (!userRow) {
      return res.json({ ok: true, awarded: safeCoins });
    }

    const newCoins = (Number(userRow.coins) || 0) + safeCoins;
    const newXp = (Number(userRow.xp) || 0) + safeCoins;
    const newLevel = Math.floor(newXp / 1000) + 1;

    const { error: updateError } = await supabase
      .from('users')
      .update({
        coins: newCoins,
        xp: newXp,
        level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('telegram_id', userTelegramId);

    if (updateError) {
      throw updateError;
    }

    // Tournament scoring: if the user has an active entry for the current
    // tournament week, record this game as a tournament-attributed score
    // (server-canonical — bypasses client tampering). Cap at 3 games per
    // week per user to match client behavior. The unique index on
    // (user, week, game) means re-playing the same game during a week is
    // a no-op insert.
    const TOURNAMENT_GAMES_PER_WEEK_LIMIT = 3;
    let tournamentRecorded = false;
    try {
      const weekKey = getServerTournamentWeek();
      const { data: tournamentEntry, error: entryError } = await supabase
        .from('tournament_entries')
        .select('id')
        .eq('user_telegram_id', userTelegramId)
        .eq('week_key', weekKey)
        .maybeSingle();

      if (entryError && !isMissingTableError(entryError)) {
        console.error('[Tournaments] entry lookup failed:', entryError);
      } else if (tournamentEntry) {
        const { count, error: countError } = await supabase
          .from('tournament_scores')
          .select('*', { count: 'exact', head: true })
          .eq('user_telegram_id', userTelegramId)
          .eq('week_key', weekKey);

        if (countError && !isMissingTableError(countError)) {
          console.error('[Tournaments] score count failed:', countError);
        } else if ((count ?? 0) < TOURNAMENT_GAMES_PER_WEEK_LIMIT) {
          const { error: scoreInsertError } = await supabase
            .from('tournament_scores')
            .insert({
              user_telegram_id: userTelegramId,
              week_key: weekKey,
              game_id: gameId,
              score: safeScore,
            });

          // 23505 = unique violation: same game already counted this week.
          // Treat as a no-op rather than an error.
          if (
            scoreInsertError &&
            scoreInsertError.code !== '23505' &&
            !isMissingTableError(scoreInsertError)
          ) {
            console.error('[Tournaments] score insert failed:', scoreInsertError);
          } else if (!scoreInsertError) {
            tournamentRecorded = true;
          }
        }
      }
    } catch (tournamentError) {
      // Tournament recording is best-effort. Don't fail the whole submit
      // because a side-effect failed.
      console.error('[Tournaments] best-effort recording threw:', tournamentError);
    }

    return res.json({
      ok: true,
      awarded: safeCoins,
      coins: newCoins,
      xp: newXp,
      level: newLevel,
      tournamentRecorded,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'game_submit_error',
    });
  }
});

function generateTicketId() {
  return `tkt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

function generateTicketNumber() {
  // 8-digit: 10000000 .. 99999999
  return Math.floor(Math.random() * 90000000) + 10000000;
}

app.post('/tickets/issue', writeLimiter, async (req, res) => {
  try {
    if (!ensureSupabase(res)) {
      return;
    }

    const access = await resolveRequestAccess(req, res);

    if (!access) {
      return;
    }

    let userTelegramId;
    let userName;
    let eventName;
    let eventDate;
    let price;
    let purchaseDate;
    try {
      userTelegramId = requireInt(req.body?.userTelegramId, 'userTelegramId', { min: 1 });
      userName = optionalString(req.body?.userName, 'userName', { max: 128 }) || `user_${userTelegramId}`;
      eventName = optionalString(req.body?.eventName, 'eventName', { max: 128 }) || 'Premium Event';
      eventDate = optionalIsoDate(req.body?.eventDate, 'eventDate');
      price = requireInt(req.body?.price ?? 0, 'price', { min: 0, max: 1_000_000 });
      purchaseDate = optionalIsoDate(req.body?.purchaseDate, 'purchaseDate') || new Date().toISOString();
    } catch (error) {
      if (handleValidationError(error, res)) return;
      throw error;
    }

    if (userTelegramId !== access.identity.userId) {
      return res.status(403).json({ error: 'Ticket identity mismatch' });
    }

    const source = req.body?.source === 'ticket_purchase' ? 'ticket_purchase' : 'plan_upgrade';
    const ALLOWED_PLANS = ['silver', 'gold', 'premium'];
    const targetPlan = ALLOWED_PLANS.includes(req.body?.targetPlan) ? req.body.targetPlan : 'premium';

    // Plan upgrades grant a paid entitlement. This endpoint has no payment proof —
    // the only legitimate writers are admins (moderation) and the bot/payment-webhook
    // (writing directly via the service-role key after verifying a Telegram Stars or
    // TON payment). Reject user-direct plan_upgrade calls.
    if (source === 'plan_upgrade' && !access.membership.isAdmin) {
      return res.status(403).json({
        error: 'plan_upgrade tickets must be issued by the bot or an admin',
      });
    }

    // Server is authoritative for id and ticket_number. Retry on the unique constraint
    // race (DB enforces uniqueness on ticket_number).
    let inserted = null;
    let lastError = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = {
        id: generateTicketId(),
        ticket_number: generateTicketNumber(),
        user_telegram_id: userTelegramId,
        user_name: userName,
        event_name: eventName,
        event_date: eventDate,
        price,
        purchase_date: purchaseDate,
        source,
      };

      const { data, error } = await supabase
        .from('tickets')
        .insert(candidate)
        .select('id, ticket_number, user_telegram_id, user_name, event_name, event_date, price, purchase_date, status, source, verified_at, verified_by')
        .single();

      if (!error) {
        inserted = data;
        break;
      }
      lastError = error;
      if (error.code !== '23505') {
        // not a unique-violation — don't retry
        break;
      }
    }

    if (!inserted) {
      throw lastError || new Error('Could not allocate ticket');
    }

    // Server is authoritative for plan changes. The frontend never gets to
    // write users.plan / users.plan_expiry — only this endpoint does, and only
    // after a ticket row was successfully created (the audit trail of "what
    // the user paid for"). Failure here is logged but does not roll back the
    // ticket — the user has the ticket as proof of purchase regardless.
    let planResult = null;
    if (source === 'plan_upgrade') {
      const planExpiryMs = inserted.event_date ? new Date(inserted.event_date).getTime() : null;
      const safePlanExpiry = Number.isFinite(planExpiryMs) ? planExpiryMs : null;

      const { data: planRow, error: planError } = await supabase
        .from('users')
        .update({
          plan: targetPlan,
          plan_expiry: safePlanExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq('telegram_id', userTelegramId)
        .select('plan, plan_expiry')
        .maybeSingle();

      if (planError && !isMissingTableError(planError)) {
        console.error('[Tickets] Plan update failed:', planError);
      } else if (planRow) {
        planResult = { plan: planRow.plan, planExpiry: planRow.plan_expiry };
      }
    }

    if (userTelegramId) {
      const messageText = "Құттықтаймыз! Төлеміңіз қабылданды. Сіздің Premium статусыңыз қосылды";
      sendTelegramMessage(userTelegramId, messageText);
    }

    return res.json({
      ok: true,
      ticketId: inserted.id,
      ticketNumber: inserted.ticket_number,
      ticket: mapTicketRow(inserted),
      plan: planResult,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'ticket_issue_error' });
  }
});

app.post('/admin/dashboard', adminLimiter, async (req, res) => {
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

app.post('/admin/users', adminLimiter, async (req, res) => {
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

app.post('/admin/users/block', adminLimiter, async (req, res) => {
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

app.post('/admin/chat/reports', adminLimiter, async (req, res) => {
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

app.post('/admin/chat/reports/action', adminLimiter, async (req, res) => {
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

app.post('/admin/settings', adminLimiter, async (req, res) => {
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

app.post('/admin/settings/admins/add', adminLimiter, async (req, res) => {
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

app.post('/admin/settings/admins/remove', adminLimiter, async (req, res) => {
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

app.post('/admin/tickets', adminLimiter, async (req, res) => {
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

app.post('/admin/tickets/verify', adminLimiter, async (req, res) => {
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

app.post('/admin/feedback/status', adminLimiter, async (req, res) => {
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

app.post('/admin/feedback/reply', adminLimiter, async (req, res) => {
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

// Cheap health check — no DB hit. Used by Render's health check and
// any external warm-up pinger.
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    hasSupabase,
    env: process.env.NODE_ENV || 'development',
  });
});

// Final error handler — must be registered after all routes. Never leaks
// stack traces to clients; logs server-side instead.
 
app.use((err, _req, res, _next) => {
  const requestId = (res.locals && res.locals.requestId) || '?';
  console.error(`[err] requestId=${requestId}:`, err && err.stack ? err.stack : err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal error', requestId });
});

const checkEnv = () => {
  const required = ['BOT_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter((key) => {
    if (key === 'SUPABASE_URL') return !(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
      return !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
    }
    return !process.env[key];
  });
  if (missing.length === 0) return;
  const message = `Missing env vars: ${missing.join(', ')}`;
  // Only hard-exit when running as a standalone Node process (local dev,
  // VPS, container). On Vercel this file is `require()`'d by the function
  // wrapper, so process.exit would kill the lambda — instead log fatally
  // and let the route handlers fail closed (they already do).
  if (isProduction && require.main === module) {
    console.error(`[fatal] ${message}`);
    process.exit(1);
  }
  console.warn(`[env] ${message} (routes will fail closed)`);
};

checkEnv();

// Run the HTTP listener only when invoked directly (`node server/index.js`).
// Under Vercel the file is `require()`'d for its `app` export and Vercel's
// runtime owns the listener.
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Graceful shutdown for any host that sends SIGTERM (Docker, systemd,
  // Render, fly.io, etc.). Vercel never invokes this path.
  const shutdown = (signal) => {
    console.log(`Received ${signal}, shutting down`);
    const force = setTimeout(() => {
      console.error('Force-exit after 25s shutdown timeout');
      process.exit(1);
    }, 25_000);
    force.unref();

    server.close((err) => {
      if (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
