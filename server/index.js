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

    // Send confirmation message to the user via Telegram Bot
    const isPlanUpgrade = req.body?.source !== 'ticket_purchase';
    if (userTelegramId) {
      const messageText = "Құттықтаймыз! Төлеміңіз қабылданды. Сіздің Premium статусыңыз қосылды";
      sendTelegramMessage(userTelegramId, messageText);
    }

    return res.json({ ok: true, ticketId: data.id });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'ticket_issue_error' });
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
