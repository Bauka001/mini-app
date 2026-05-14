// =============================================================
// ADMIN PANEL V2  (browser-based: login/logout via username+password)
// All endpoints below live under /api/admin-v2/*
// =============================================================
'use strict';

const crypto = require('crypto');

function isMissingTableError(error) {
  return Boolean(
    error && (error.code === '42P01' || `${error.message || ''}`.includes('does not exist'))
  );
}

const generateAdminToken = () => crypto.randomBytes(32).toString('hex');
const generatePromoCode = (length = 8) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
};
const normalizeCodeValue = (value = '') =>
  `${value}`.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');

const mapPromoRow = (row) => ({
  code: row.code,
  discountPercent: row.discount_percent,
  planCodes: row.plan_codes || [],
  maxUses: row.max_uses,
  usedCount: row.used_count || 0,
  validUntil: row.valid_until,
  isActive: row.is_active,
  note: row.note || '',
  bloggerName: row.blogger_name || '',
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

function getBearerToken(req) {
  const auth = req.headers['authorization'] || '';
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  const headerToken = req.headers['x-admin-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }
  return '';
}

/**
 * Register all /api/admin-v2/* endpoints on the given Express app.
 * @param {import('express').Application} app
 * @param {object} deps
 * @param {import('@supabase/supabase-js').SupabaseClient} deps.supabase
 * @param {number[]} deps.bootstrapAdminIds
 * @param {(actorId:number,actorRole:string,action:string,entityType:string,entityId:string,payload:object)=>Promise<void>} [deps.writeAuditLog]
 */
const localStore = require('./admin-v2-store');
const { state: ls } = localStore;
const saveLocal = () => { try { localStore.save(); } catch (_) {} };

function registerAdminV2(app, deps) {
  const { supabase, bootstrapAdminIds = [] } = deps;
  const writeAuditLog = deps.writeAuditLog || (async () => {});

  const ADMIN_V2_LOGIN = `${process.env.ADMIN_PANEL_LOGIN || 'admin'}`.trim();
  const ADMIN_V2_PASSWORD = `${process.env.ADMIN_PANEL_PASSWORD || ''}`.trim();
  const ADMIN_V2_SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
  const ADMIN_V2_OWNER_TG_ID = Number(
    process.env.ADMIN_PANEL_OWNER_TG_ID || bootstrapAdminIds[0] || 0
  );

  // ---- In-memory fallback (used when Supabase has placeholder credentials) ----
  const inMemorySessions = new Map();
  function isSupabaseUsable() {
    const url = `${process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''}`;
    const key = `${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`;
    if (!supabase || !url || !key) return false;
    // Reject obvious placeholders
    if (url.includes('your-project') || key.includes('your-')) return false;
    return true;
  }

  function ensureSupabase(res) {
    if (isSupabaseUsable()) return true;
    if (res && typeof res.status === 'function') {
      res.status(503).json({ error: 'Supabase service role is not configured (Supabase placeholder credentials detected)' });
    }
    return false;
  }
  function getEffectivePassword() {
    // Stored password (set via UI) overrides env password
    const stored = ls.appSettings && ls.appSettings.admin_password;
    if (stored && typeof stored.value === 'string' && stored.value.length > 0) {
      return stored.value;
    }
    if (ADMIN_V2_PASSWORD) return ADMIN_V2_PASSWORD;
    return '';
  }
  function hasPasswordConfigured() {
    return getEffectivePassword().length > 0;
  }

  function ensureSupabaseForAuth() {
    // For auth, we allow in-memory fallback even without Supabase
    return true;
  }

  async function getAdminSession(token) {
    if (!token) return null;
    // 1) In-memory fallback
    const mem = inMemorySessions.get(token);
    if (mem) {
      if (new Date(mem.expires_at).getTime() < Date.now()) {
        inMemorySessions.delete(token);
        return null;
      }
      return mem;
    }
    // 2) Supabase
    if (!isSupabaseUsable()) return null;
    const { data, error } = await supabase
      .from('admin_sessions')
      .select('token, admin_telegram_id, admin_login, expires_at')
      .eq('token', token)
      .maybeSingle();
    if (error && !isMissingTableError(error)) throw error;
    if (!data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    await supabase
      .from('admin_sessions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token', token);
    return data;
  }

  async function requireAdminV2(req, res) {
    // Auth can work in-memory; data routes still require Supabase
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Login required' });
      return null;
    }
    try {
      const session = await getAdminSession(token);
      if (!session) {
        res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
        return null;
      }
      return session;
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'session_error' });
      return null;
    }
  }

  async function countRows(table, applyFilters) {
    if (!supabase) return 0;
    let query = supabase.from(table).select('*', { count: 'exact', head: true });
    if (applyFilters) query = applyFilters(query);
    const { count, error } = await query;
    if (error) {
      if (isMissingTableError(error)) return 0;
      throw error;
    }
    return count || 0;
  }



  async function getCurrentPromotionEnd() {
    // 1) Local store
    const local = ls.appSettings && ls.appSettings.promotion_end_iso;
    if (local && local.value) return local.value;
    // 2) Supabase
    if (isSupabaseUsable()) {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'promotion_end_iso')
          .maybeSingle();
        const raw = data?.value;
        if (raw) return typeof raw === 'string' ? raw : `${raw}`.replace(/^"|"$/g, '');
      } catch (_) {}
    }
    // 3) Default
    return '2026-04-26T08:00:00.000Z';
  }

  async function lookupPromoCode(code) {
    const norm = normalizeCodeValue(code);
    // 1) Local store
    const local = ls.promoCodes.find((c) => c.code === norm);
    if (local) return local;
    // 2) Supabase
    if (isSupabaseUsable()) {
      try {
        const { data } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('code', norm)
          .maybeSingle();
        if (data) return mapPromoRow(data);
      } catch (_) {}
    }
    return null;
  }

  // ---------- AUTH CONFIG (public) ----------
  app.get('/api/admin-v2/auth-config', (req, res) => {
    return res.json({
      ok: true,
      passwordRequired: hasPasswordConfigured(),
      login: ADMIN_V2_LOGIN || 'admin',
    });
  });


  // ---------- PUBLIC BRIDGE (Mini App пайдаланады, auth керек емес) ----------
  app.get('/api/admin-v2/public/promotion', async (req, res) => {
    try {
      const iso = await getCurrentPromotionEnd();
      return res.json({ ok: true, promotionEndIso: iso });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'promotion_public_error' });
    }
  });

  app.post('/api/admin-v2/public/validate-promo', async (req, res) => {
    try {
      const code = `${req.body?.code || ''}`.trim();
      const planCode = `${req.body?.planCode || ''}`.trim().toLowerCase();
      if (!code) return res.json({ ok: false, valid: false, reason: 'empty_code' });
      const promo = await lookupPromoCode(code);
      if (!promo) return res.json({ ok: true, valid: false, reason: 'not_found' });
      if (promo.isActive === false) return res.json({ ok: true, valid: false, reason: 'inactive' });
      if (promo.validUntil && new Date(promo.validUntil).getTime() < Date.now())
        return res.json({ ok: true, valid: false, reason: 'expired' });
      if (promo.maxUses && promo.usedCount >= promo.maxUses)
        return res.json({ ok: true, valid: false, reason: 'limit_reached' });
      if (planCode && Array.isArray(promo.planCodes) && promo.planCodes.length && !promo.planCodes.includes(planCode))
        return res.json({ ok: true, valid: false, reason: 'plan_not_supported' });
      return res.json({
        ok: true,
        valid: true,
        code: promo.code,
        discountPercent: promo.discountPercent,
        planCodes: promo.planCodes || [],
      });
    } catch (error) {
      return res.status(500).json({ ok: false, valid: false, error: error instanceof Error ? error.message : 'validate_error' });
    }
  });

  // ---------- AUTH ----------
  app.post('/api/admin-v2/login', async (req, res) => {
    try {
      if (!ensureSupabaseForAuth()) return;
      const login = `${req.body?.login || ''}`.trim() || ADMIN_V2_LOGIN || 'admin';
      const password = `${req.body?.password || ''}`;
      const effectivePassword = getEffectivePassword();
      if (effectivePassword) {
        // Password is configured — require it
        if (login !== ADMIN_V2_LOGIN || password !== effectivePassword) {
          return res.status(401).json({ error: 'Invalid login or password' });
        }
      }
      // Otherwise no password configured → allow login (open access)
      const token = generateAdminToken();
      const expiresAt = new Date(Date.now() + ADMIN_V2_SESSION_TTL_MS).toISOString();
      if (isSupabaseUsable()) {
        const { error } = await supabase.from('admin_sessions').insert({
          token,
          admin_telegram_id: ADMIN_V2_OWNER_TG_ID,
          admin_login: login,
          ip_address: req.ip || null,
          user_agent: `${req.headers['user-agent'] || ''}`.slice(0, 240) || null,
          expires_at: expiresAt,
        });
        if (error) throw error;
      } else {
        inMemorySessions.set(token, {
          token,
          admin_telegram_id: ADMIN_V2_OWNER_TG_ID,
          admin_login: login,
          expires_at: expiresAt,
        });
      }
      try {
        await writeAuditLog(
          ADMIN_V2_OWNER_TG_ID,
          'owner',
          'admin_v2_login',
          'admin_sessions',
          token.slice(0, 8),
          { login }
        );
      } catch (_) {}
      return res.json({ ok: true, token, expiresAt, login });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'login_error' });
    }
  });

  app.post('/api/admin-v2/logout', async (req, res) => {
    try {
      const token = getBearerToken(req);
      if (token) {
        inMemorySessions.delete(token);
        if (isSupabaseUsable()) {
          try { await supabase.from('admin_sessions').delete().eq('token', token); } catch (_) {}
        }
      }
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'logout_error' });
    }
  });

  app.get('/api/admin-v2/me', async (req, res) => {
    const session = await requireAdminV2(req, res);
    if (!session) return;
    return res.json({
      ok: true,
      login: session.admin_login,
      adminTelegramId: session.admin_telegram_id,
      expiresAt: session.expires_at,
    });
  });


  // ---------- SETTINGS — пароль қою/ауыстыру/жою ----------
  app.get('/api/admin-v2/settings', async (req, res) => {
    const session = await requireAdminV2(req, res);
    if (!session) return;
    return res.json({
      ok: true,
      passwordRequired: hasPasswordConfigured(),
      passwordSource: (ls.appSettings && ls.appSettings.admin_password && ls.appSettings.admin_password.value)
        ? 'local'
        : (ADMIN_V2_PASSWORD ? 'env' : 'none'),
      login: ADMIN_V2_LOGIN || 'admin',
    });
  });

  app.post('/api/admin-v2/settings/password', async (req, res) => {
    const session = await requireAdminV2(req, res);
    if (!session) return;
    try {
      const newPassword = `${req.body?.newPassword || ''}`;
      if (newPassword.length === 0) {
        // Clear local password (will fall back to env, or to no password if env also empty)
        if (ls.appSettings && ls.appSettings.admin_password) delete ls.appSettings.admin_password;
        saveLocal();
        try {
          await writeAuditLog(session.admin_telegram_id, 'owner', 'admin_password_clear', 'app_settings', 'admin_password', {});
        } catch (_) {}
        return res.json({ ok: true, passwordRequired: hasPasswordConfigured() });
      }
      if (newPassword.length < 1) {
        return res.status(400).json({ error: 'Пароль бос бола алмайды' });
      }
      ls.appSettings = ls.appSettings || {};
      ls.appSettings.admin_password = {
        value: newPassword,
        updatedAt: new Date().toISOString(),
        updatedBy: session.admin_telegram_id,
      };
      saveLocal();
      try {
        await writeAuditLog(session.admin_telegram_id, 'owner', 'admin_password_set', 'app_settings', 'admin_password', {});
      } catch (_) {}
      return res.json({ ok: true, passwordRequired: true });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'password_set_error' });
    }
  });

  // ---------- APP STATS ----------
  app.get('/api/admin-v2/stats', async (req, res) => {
    const session = await requireAdminV2(req, res);
    if (!session) return;
    try {
      let overview = null;
      if (isSupabaseUsable()) {
        try {
          const { data, error } = await supabase
            .from('admin_app_overview')
            .select('*')
            .maybeSingle();
          if (error && !isMissingTableError(error)) throw error;
          overview = data || null;
        } catch (_) {
          overview = null;
        }
      }

      if (!overview && isSupabaseUsable()) {
        const [
          usersTotal,
          usersPaid,
          usersBlocked,
          ticketsTotal,
          ticketsPending,
          ticketsVerified,
          feedbackNew,
          promosActive,
        ] = await Promise.all([
          countRows('users'),
          countRows('users', (q) => q.neq('plan', 'free')),
          countRows('users', (q) => q.eq('is_blocked', true)),
          countRows('tickets'),
          countRows('tickets', (q) => q.eq('status', 'pending')),
          countRows('tickets', (q) => q.eq('status', 'verified')),
          countRows('feedback_entries', (q) => q.eq('status', 'new')),
          countRows('promo_codes', (q) => q.eq('is_active', true)),
        ]);
        overview = {
          users_total: usersTotal,
          users_paid: usersPaid,
          users_new_24h: 0,
          users_new_7d: 0,
          users_blocked: usersBlocked,
          tickets_total: ticketsTotal,
          tickets_pending: ticketsPending,
          tickets_verified: ticketsVerified,
          feedback_new: feedbackNew,
          promo_codes_active: promosActive,
          promo_redemptions_total: 0,
        };
      }
      if (!overview) {
        overview = {
          users_total: 0, users_paid: 0, users_new_24h: 0, users_new_7d: 0, users_blocked: 0,
          tickets_total: 0, tickets_pending: 0, tickets_verified: 0, feedback_new: 0,
          promo_codes_active: 0, promo_redemptions_total: 0,
        };
      }

      let promotionEndIso = null;
      if (isSupabaseUsable()) {
        try {
          const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'promotion_end_iso')
            .maybeSingle();
          if (data?.value) {
            promotionEndIso =
              typeof data.value === 'string'
                ? data.value
                : JSON.stringify(data.value).replace(/^"|"$/g, '');
          }
        } catch (_) {}
      }

      let planBreakdown = [];
      if (isSupabaseUsable()) {
        try {
          const { data, error } = await supabase.from('users').select('plan');
          if (!error && Array.isArray(data)) {
            const map = new Map();
            data.forEach((row) => {
              const k = row.plan || 'free';
              map.set(k, (map.get(k) || 0) + 1);
            });
            planBreakdown = Array.from(map.entries()).map(([plan, count]) => ({ plan, count }));
          }
        } catch (_) {}
      }

      // Override promo counts with local store if Supabase unusable
      if (!isSupabaseUsable()) {
        overview.promo_codes_active = ls.promoCodes.filter((c) => c.isActive).length;
        overview.promo_redemptions_total = ls.promoCodes.reduce((acc, c) => acc + (c.usedCount || 0), 0);
      }
      // Override promotionEndIso from local store if Supabase unusable
      let promotionEndIsoLocal = null;
      if (!isSupabaseUsable()) {
        const ps = ls.appSettings['promotion_end_iso'];
        promotionEndIsoLocal = ps?.value || '2026-04-26T08:00:00.000Z';
      }

      return res.json({
        ok: true,
        overview: {
          usersTotal: Number(overview.users_total || 0),
          usersPaid: Number(overview.users_paid || 0),
          usersNew24h: Number(overview.users_new_24h || 0),
          usersNew7d: Number(overview.users_new_7d || 0),
          usersBlocked: Number(overview.users_blocked || 0),
          ticketsTotal: Number(overview.tickets_total || 0),
          ticketsPending: Number(overview.tickets_pending || 0),
          ticketsVerified: Number(overview.tickets_verified || 0),
          feedbackNew: Number(overview.feedback_new || 0),
          promoCodesActive: Number(overview.promo_codes_active || 0),
          promoRedemptionsTotal: Number(overview.promo_redemptions_total || 0),
        },
        promotionEndIso: promotionEndIso || promotionEndIsoLocal,
        planBreakdown,
        bootstrapAdminIds,
        adminTelegramId: session.admin_telegram_id,
      });
    } catch (error) {
      console.error('[admin-v2][stats]', error); return res.status(500).json({ error: error instanceof Error ? error.message : 'stats_error' });
    }
  });

  // ---------- PROMO CODES ----------
  app.get('/api/admin-v2/promo-codes', async (req, res) => {
    const session = await requireAdminV2(req, res);
    if (!session) return;
    try {
      if (isSupabaseUsable()) {
        const { data, error } = await supabase
          .from('promo_codes')
          .select('*')
          .order('created_at', { ascending: false });
        if (error && !isMissingTableError(error)) throw error;
        return res.json({ ok: true, codes: (data || []).map(mapPromoRow) });
      }
      // Local fallback
      const codes = [...ls.promoCodes].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return res.json({ ok: true, codes });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'list_error' });
    }
  });

  app.post('/api/admin-v2/promo-codes', async (req, res) => {
    const session = await requireAdminV2(req, res);
    if (!session) return;
    try {
      const discountPercent = Math.max(
        1,
        Math.min(100, Number(req.body?.discountPercent || 10))
      );
      const planCodes =
        Array.isArray(req.body?.planCodes) && req.body.planCodes.length
          ? req.body.planCodes.map((p) => `${p}`.trim().toLowerCase()).filter(Boolean)
          : ['basic', 'pro', 'premium'];
      const maxUses =
        req.body?.maxUses != null && req.body.maxUses !== ''
          ? Math.max(1, Number(req.body.maxUses))
          : null;
      const validUntil = req.body?.validUntil
        ? new Date(req.body.validUntil).toISOString()
        : null;
      const note = `${req.body?.note || ''}`.trim() || null;
      const bloggerName = `${req.body?.bloggerName || ''}`.trim() || null;

      let code = normalizeCodeValue(req.body?.code || '');
      if (!code) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const candidate = generatePromoCode(8);
          const { data: existing } = await supabase
            .from('promo_codes')
            .select('code')
            .eq('code', candidate)
            .maybeSingle();
          if (!existing) {
            code = candidate;
            break;
          }
        }
      }
      if (!code) {
        return res.status(400).json({ error: 'Failed to generate unique promo code' });
      }

      let savedRow = null;
      if (isSupabaseUsable()) {
        const { data, error } = await supabase
          .from('promo_codes')
          .insert({
            code,
            discount_percent: discountPercent,
            plan_codes: planCodes,
            max_uses: maxUses,
            valid_until: validUntil,
            note,
            blogger_name: bloggerName,
            created_by: session.admin_telegram_id,
          })
          .select('*')
          .single();
        if (error) {
          if (`${error.message || ''}`.toLowerCase().includes('duplicate')) {
            return res.status(409).json({ error: `Promo code "${code}" already exists` });
          }
          throw error;
        }
        savedRow = data;
      } else {
        if (ls.promoCodes.find((c) => c.code === code)) {
          return res.status(409).json({ error: `Promo code "${code}" already exists` });
        }
        const now = new Date().toISOString();
        const row = {
          code,
          discountPercent,
          planCodes,
          maxUses,
          usedCount: 0,
          validUntil,
          isActive: true,
          note,
          bloggerName,
          createdBy: session.admin_telegram_id,
          createdAt: now,
          updatedAt: now,
        };
        ls.promoCodes.push(row);
        saveLocal();
        return res.json({ ok: true, code: row });
      }

      try {
        await writeAuditLog(
          session.admin_telegram_id,
          'owner',
          'promo_code_create',
          'promo_codes',
          code,
          { discountPercent, planCodes, maxUses, validUntil, bloggerName }
        );
      } catch (_) {}

      return res.json({ ok: true, code: mapPromoRow(savedRow) });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'create_error' });
    }
  });

  app.patch('/api/admin-v2/promo-codes/:code', async (req, res) => {
    const session = await requireAdminV2(req, res);
    if (!session) return;
    try {
      const code = normalizeCodeValue(req.params.code);
      const updates = {};
      if (typeof req.body?.isActive === 'boolean') updates.is_active = req.body.isActive;
      if (req.body?.discountPercent != null) {
        updates.discount_percent = Math.max(
          1,
          Math.min(100, Number(req.body.discountPercent))
        );
      }
      if (Array.isArray(req.body?.planCodes)) {
        updates.plan_codes = req.body.planCodes
          .map((p) => `${p}`.trim().toLowerCase())
          .filter(Boolean);
      }
      if (req.body?.maxUses !== undefined) {
        updates.max_uses =
          req.body.maxUses === null || req.body.maxUses === ''
            ? null
            : Math.max(1, Number(req.body.maxUses));
      }
      if (req.body?.validUntil !== undefined) {
        updates.valid_until = req.body.validUntil
          ? new Date(req.body.validUntil).toISOString()
          : null;
      }
      if (req.body?.note !== undefined) updates.note = `${req.body.note || ''}`.trim() || null;
      if (req.body?.bloggerName !== undefined)
        updates.blogger_name = `${req.body.bloggerName || ''}`.trim() || null;

      if (!Object.keys(updates).length) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      let row = null;
      if (isSupabaseUsable()) {
        const { data, error } = await supabase
          .from('promo_codes')
          .update(updates)
          .eq('code', code)
          .select('*')
          .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Promo code not found' });
        row = mapPromoRow(data);
      } else {
        const idx = ls.promoCodes.findIndex((c) => c.code === code);
        if (idx === -1) return res.status(404).json({ error: 'Promo code not found' });
        // Translate snake to camel
        const camelUpdates = {};
        if (updates.is_active !== undefined) camelUpdates.isActive = updates.is_active;
        if (updates.discount_percent !== undefined) camelUpdates.discountPercent = updates.discount_percent;
        if (updates.plan_codes !== undefined) camelUpdates.planCodes = updates.plan_codes;
        if (updates.max_uses !== undefined) camelUpdates.maxUses = updates.max_uses;
        if (updates.valid_until !== undefined) camelUpdates.validUntil = updates.valid_until;
        if (updates.note !== undefined) camelUpdates.note = updates.note;
        if (updates.blogger_name !== undefined) camelUpdates.bloggerName = updates.blogger_name;
        ls.promoCodes[idx] = { ...ls.promoCodes[idx], ...camelUpdates, updatedAt: new Date().toISOString() };
        saveLocal();
        row = ls.promoCodes[idx];
      }

      try {
        await writeAuditLog(
          session.admin_telegram_id,
          'owner',
          'promo_code_update',
          'promo_codes',
          code,
          updates
        );
      } catch (_) {}
      return res.json({ ok: true, code: row });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'update_error' });
    }
  });

  app.delete('/api/admin-v2/promo-codes/:code', async (req, res) => {
    const session = await requireAdminV2(req, res);
    if (!session) return;
    try {
      const code = normalizeCodeValue(req.params.code);
      if (isSupabaseUsable()) {
        const { error } = await supabase.from('promo_codes').delete().eq('code', code);
        if (error) throw error;
      } else {
        const idx = ls.promoCodes.findIndex((c) => c.code === code);
        if (idx === -1) return res.status(404).json({ error: 'Promo code not found' });
        ls.promoCodes.splice(idx, 1);
        saveLocal();
      }
      try {
        await writeAuditLog(
          session.admin_telegram_id,
          'owner',
          'promo_code_delete',
          'promo_codes',
          code,
          {}
        );
      } catch (_) {}
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'delete_error' });
    }
  });

  // ---------- PROMOTION (АКЦИЯ) ----------
  app.get('/api/admin-v2/promotion', async (req, res) => {
    const session = await requireAdminV2(req, res);
    if (!session) return;
    try {
      if (isSupabaseUsable()) {
        const { data } = await supabase
          .from('app_settings')
          .select('value, updated_at, updated_by')
          .eq('key', 'promotion_end_iso')
          .maybeSingle();
        const raw = data?.value;
        const iso = raw
          ? typeof raw === 'string'
            ? raw
            : `${raw}`.replace(/^"|"$/g, '')
          : null;
        return res.json({
          ok: true,
          promotionEndIso: iso,
          updatedAt: data?.updated_at || null,
          updatedBy: data?.updated_by || null,
        });
      }
      // Local fallback
      const local = ls.appSettings['promotion_end_iso'];
      const localIso = local
        ? (typeof local.value === 'string' ? local.value : null)
        : '2026-04-26T08:00:00.000Z';
      return res.json({
        ok: true,
        promotionEndIso: localIso,
        updatedAt: local?.updatedAt || null,
        updatedBy: local?.updatedBy || null,
      });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'promotion_error' });
    }
  });

  app.post('/api/admin-v2/promotion', async (req, res) => {
    const session = await requireAdminV2(req, res);
    if (!session) return;
    try {
      let newIso = null;
      if (req.body?.absoluteIso) {
        const d = new Date(req.body.absoluteIso);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ error: 'Invalid absolute date' });
        }
        newIso = d.toISOString();
      } else if (req.body?.extendDays != null) {
        const days = Number(req.body.extendDays);
        if (!Number.isFinite(days) || days === 0) {
          return res.status(400).json({ error: 'Invalid extendDays' });
        }
        let currentIso = null;
        if (isSupabaseUsable()) {
          const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'promotion_end_iso')
            .maybeSingle();
          const currentRaw = data?.value;
          currentIso = currentRaw
            ? typeof currentRaw === 'string'
              ? currentRaw
              : `${currentRaw}`.replace(/^"|"$/g, '')
            : null;
        } else {
          const local = ls.appSettings['promotion_end_iso'];
          currentIso = local?.value || '2026-04-26T08:00:00.000Z';
        }
        const base = currentIso ? new Date(currentIso) : new Date();
        const start = base.getTime() < Date.now() ? new Date() : base;
        newIso = new Date(start.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      } else {
        return res.status(400).json({ error: 'Provide absoluteIso or extendDays' });
      }

      if (isSupabaseUsable()) {
        const { error } = await supabase.from('app_settings').upsert({
          key: 'promotion_end_iso',
          value: JSON.stringify(newIso),
          updated_by: session.admin_telegram_id,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } else {
        ls.appSettings['promotion_end_iso'] = {
          value: newIso,
          updatedAt: new Date().toISOString(),
          updatedBy: session.admin_telegram_id,
        };
        saveLocal();
      }

      try {
        await writeAuditLog(
          session.admin_telegram_id,
          'owner',
          'promotion_update',
          'app_settings',
          'promotion_end_iso',
          { newIso, extendDays: req.body?.extendDays, absoluteIso: req.body?.absoluteIso }
        );
      } catch (_) {}

      return res.json({ ok: true, promotionEndIso: newIso });
    } catch (error) {
      return res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'promotion_set_error' });
    }
  });


  // ---------- TICKETS (билеттер ақпараты) ----------
  app.get('/api/admin-v2/tickets', async (req, res) => {
    const session = await requireAdminV2(req, res);
    if (!session) return;
    if (!isSupabaseUsable()) {
      return res.json({
        ok: true,
        tickets: [],
        stats: { total: 0, pending: 0, verified: 0, used: 0 },
        note: 'Билеттер Supabase-те сақталады. Көру үшін VITE_SUPABASE_URL мен SUPABASE_SERVICE_ROLE_KEY қойыңыз.',
      });
    }
    try {
      const status = `${req.query.status || ''}`.trim();
      const search = `${req.query.search || ''}`.trim();
      const limit = Math.max(1, Math.min(500, Number(req.query.limit || 200)));

      let query = supabase
        .from('tickets')
        .select('*')
        .order('ticket_number', { ascending: false })
        .limit(limit);
      if (status && ['pending', 'verified', 'used', 'cancelled'].includes(status)) {
        query = query.eq('status', status);
      }
      if (search) {
        if (/^\d+$/.test(search)) {
          // Could be ticket_number or telegram_id
          query = query.or(`ticket_number.eq.${search},user_telegram_id.eq.${search}`);
        } else {
          query = query.ilike('user_name', `%${search}%`);
        }
      }
      const { data, error } = await query;
      if (error && !isMissingTableError(error)) throw error;

      const tickets = (data || []).map((row) => ({
        id: row.id,
        ticketNumber: row.ticket_number,
        userTelegramId: row.user_telegram_id,
        userName: row.user_name,
        eventName: row.event_name,
        eventDate: row.event_date,
        price: row.price,
        purchaseDate: row.purchase_date,
        status: row.status,
        verifiedAt: row.verified_at,
        verifiedBy: row.verified_by,
        source: row.source,
      }));

      const stats = {
        total: tickets.length,
        pending: tickets.filter((t) => t.status === 'pending').length,
        verified: tickets.filter((t) => t.status === 'verified').length,
        used: tickets.filter((t) => t.status === 'used').length,
      };

      return res.json({ ok: true, tickets, stats });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'tickets_error' });
    }
  });

  app.post('/api/admin-v2/tickets/:ticketNumber/verify', async (req, res) => {
    const session = await requireAdminV2(req, res);
    if (!session) return;
    if (!isSupabaseUsable()) {
      return res.status(503).json({ error: 'Билеттерді растау үшін Supabase қажет' });
    }
    try {
      const ticketNumber = Number(req.params.ticketNumber);
      if (!Number.isInteger(ticketNumber) || ticketNumber <= 0) {
        return res.status(400).json({ error: 'Invalid ticket number' });
      }
      const { data, error } = await supabase
        .from('tickets')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: session.admin_telegram_id,
        })
        .eq('ticket_number', ticketNumber)
        .eq('status', 'pending')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Билет табылмады немесе бұрын расталған' });

      try {
        await writeAuditLog(
          session.admin_telegram_id,
          'owner',
          'ticket_verify_v2',
          'tickets',
          String(ticketNumber),
          {}
        );
      } catch (_) {}
      return res.json({
        ok: true,
        ticket: {
          id: data.id,
          ticketNumber: data.ticket_number,
          userTelegramId: data.user_telegram_id,
          userName: data.user_name,
          eventName: data.event_name,
          status: data.status,
          verifiedAt: data.verified_at,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'verify_error' });
    }
  });

  // ---------- USERS (light list) ----------
  app.get('/api/admin-v2/users', async (req, res) => {
    const session = await requireAdminV2(req, res);
    if (!session) return;
    if (!isSupabaseUsable()) {
      return res.json({ ok: true, users: [], note: 'Supabase configured қажет: VITE_SUPABASE_URL және SUPABASE_SERVICE_ROLE_KEY' });
    }
    try {
      const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
      const search = `${req.query.search || ''}`.trim();
      let query = supabase
        .from('users')
        .select(
          'telegram_id, username, first_name, last_name, plan, plan_expiry, coins, level, is_blocked, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(limit);
      if (search) {
        if (/^\d+$/.test(search)) {
          query = query.eq('telegram_id', Number(search));
        } else {
          query = query.or(
            `username.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
          );
        }
      }
      const { data, error } = await query;
      if (error && !isMissingTableError(error)) throw error;
      const users = (data || []).map((u) => ({
        telegramId: u.telegram_id,
        username: u.username,
        firstName: u.first_name,
        lastName: u.last_name,
        plan: u.plan,
        planExpiry: u.plan_expiry,
        coins: u.coins,
        level: u.level,
        isBlocked: u.is_blocked,
        createdAt: u.created_at,
      }));
      return res.json({ ok: true, users });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'users_error' });
    }
  });
}

module.exports = registerAdminV2;
