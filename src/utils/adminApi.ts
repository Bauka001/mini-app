import WebApp from '@twa-dev/sdk';
import { buildApiUrl } from './apiBase';

export interface AdminSession {
  userId: number;
  isAdmin: boolean;
  role: 'owner' | 'admin' | null;
  canManageAdmins: boolean;
  source: 'database' | 'bootstrap' | 'none';
  authMode?: 'telegram' | 'dev';
}

export interface AdminDashboardStats {
  totalUsers: number;
  blockedUsers: number;
  activeAdmins: number;
  totalFeedbacks: number;
  pendingFeedbacks: number;
  totalTickets: number;
  pendingTickets: number;
  pendingChatReports: number;
}

export interface AdminDashboardFeedback {
  id: number;
  userTelegramId: number;
  username: string;
  text: string;
  imageUrl: string | null;
  status: 'new' | 'read' | 'resolved';
  createdAt: string;
  updatedAt: string;
  latestReply: {
    id: number;
    adminTelegramId: number;
    reply: string;
    createdAt: string;
  } | null;
}

export interface AdminAuditLog {
  id: number;
  actorTelegramId: number;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AdminDashboardResponse {
  stats: AdminDashboardStats;
  feedbacks: AdminDashboardFeedback[];
  auditLogs: AdminAuditLog[];
}

export interface AdminManagedUser {
  telegramId: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  level: number;
  xp: number;
  coins: number;
  gems: number;
  plan: string;
  isBlocked: boolean;
  blockedAt: string | null;
  blockedBy: number | null;
  blockReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUsersResponse {
  users: AdminManagedUser[];
  stats: {
    total: number;
    active: number;
    blocked: number;
    totalCoins: number;
    totalXp: number;
  };
}

export interface AdminChatReport {
  id: number;
  reporterTelegramId: number | null;
  reportedUserTelegramId: number | null;
  username: string | null;
  groupId: string | null;
  groupName: string | null;
  messageId: string | null;
  messageText: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'hidden';
  reportCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminChatResponse {
  reports: AdminChatReport[];
  stats: {
    totalReports: number;
    pendingReports: number;
    hiddenReports: number;
    dismissedReports: number;
  };
}

export interface AdminRoleMember {
  telegramId: number;
  role: 'owner' | 'admin';
  isActive: boolean;
  source: 'database' | 'bootstrap';
  createdAt: string | null;
  createdBy: number | null;
}

export interface AdminSettingsResponse {
  currentUserRole: 'owner' | 'admin' | null;
  canManageAdmins: boolean;
  admins: AdminRoleMember[];
  auditLogs: AdminAuditLog[];
}

export interface AdminTicketRecord {
  id: string;
  ticketNumber: number;
  userTelegramId: number;
  userName: string;
  eventName: string;
  eventDate: string;
  price: number;
  purchaseDate: string;
  status: 'pending' | 'verified' | 'used' | 'cancelled';
  source: string;
  verifiedAt: string | null;
  verifiedBy: number | null;
}

export interface AdminTicketsResponse {
  tickets: AdminTicketRecord[];
  stats: {
    total: number;
    pending: number;
    verified: number;
    used: number;
  };
}

export interface FeedbackSubmissionPayload {
  userTelegramId: number;
  username: string;
  text: string;
  imageUrl?: string;
}

export interface CanonicalUser {
  telegramId: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  coins: number;
  gems: number;
  xp: number;
  level: number;
  plan: 'free' | 'silver' | 'gold' | 'premium';
  planExpiry: number | null;
  planActive: boolean;
  hp: number;
  maxHp: number;
  fecBalance: number;
  brainStats: { focus: number; memory: number; logic: number; speed: number; flexibility: number };
  skinInventory: string[];
  activeSkin: string;
  inventory: { freezes: number; hints: number; shields: number };
  dailyGoalMinutes: number;
  streak: number;
  dailyRewardStreak: number;
  lastDailyRewardDate: string | null;
  promotionEndISO: string | null;
  dailyQuest: {
    id: string;
    games_played: string[];
    is_completed: boolean;
    is_claimed: boolean;
    last_reset_date: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UsersMeResponse {
  ok: true;
  user: CanonicalUser | null;
}

export interface TournamentJoinResponse {
  ok: true;
  weekKey: string;
  paymentMethod: 'vip' | 'stars' | 'ton';
}

export interface UsersSyncResponse {
  ok: true;
  written: number;
  ignoredKeys?: string[];
}

export interface TournamentLeaderboardEntry {
  userTelegramId: number;
  firstName: string | null;
  username: string | null;
  photoUrl: string | null;
  score: number;
  gamesPlayed: number;
  rank: number;
}

export interface TournamentLeaderboardResponse {
  ok: true;
  weekKey: string;
  leaderboard: TournamentLeaderboardEntry[];
}

export interface GameSubmitPayload {
  gameId: string;
  score: number | string;
  coinsEarned: number;
}

export interface GameSubmitResponse {
  ok: boolean;
  awarded: number;
  coins?: number;
  xp?: number;
  level?: number;
  reason?: 'rate_limited';
}

export interface TicketIssuePayload {
  userTelegramId: number;
  userName: string;
  eventName: string;
  eventDate: string;
  price: number;
  purchaseDate: string;
  // Union of HEAD ('plan_upgrade'/'ticket_purchase') and upstream ('case_reward').
  source: 'plan_upgrade' | 'ticket_purchase' | 'case_reward';
  targetPlan?: 'silver' | 'gold' | 'premium';
}

export interface TicketIssueResponse {
  ok: true;
  ticketId: string;
  ticketNumber: number;
  ticket: AdminTicketRecord;
  plan: { plan: string; planExpiry: number | null } | null;
}

const getTelegramInitData = () => {
  return window.Telegram?.WebApp?.initData || WebApp?.initData || '';
};

async function postJson<T>(path: string, body: Record<string, any> = {}): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      initData: getTelegramInitData(),
      ...body,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Request failed';
    throw new Error(message);
  }

  return data as T;
}

export const getAdminSession = () => postJson<AdminSession>('/admin/session');

export const getAdminDashboard = () => postJson<AdminDashboardResponse>('/admin/dashboard');

export interface AdminVisitorRow {
  visitorKey: string;
  telegramId: number | null;
  isVerified: boolean;
  username: string | null;
  firstName: string | null;
  languageCode: string | null;
  platform: string | null;
  appVersion: string | null;
  startParam: string | null;
  isPremium: boolean | null;
  visitCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface AdminVisitorsResponse {
  ok: boolean;
  stats: {
    totalVisitors: number;
    verified: number;
    anonymous: number;
    registeredUsers: number;
    active24: number;
    active7: number;
  };
  recent: AdminVisitorRow[];
}

export const getAdminVisitors = () => postJson<AdminVisitorsResponse>('/admin/visitors');

// Best-effort app-entry ping (fire-and-forget). initData is attached by
// postJson, so the server can verify the Telegram identity when present.
export const trackAppVisit = (payload: Record<string, unknown>) =>
  postJson<{ ok: boolean }>('/track/visit', payload);

export const getAdminUsers = () => postJson<AdminUsersResponse>('/admin/users');

export const setUserBlockedState = (telegramId: number, blocked: boolean, reason?: string) =>
  postJson<{ user: AdminManagedUser }>('/admin/users/block', {
    telegramId,
    blocked,
    reason,
  });

export const getAdminChatReports = () => postJson<AdminChatResponse>('/admin/chat/reports');

export const updateAdminChatReport = (
  reportId: number,
  action: 'reviewed' | 'dismissed' | 'hidden',
  reason?: string
) =>
  postJson<{ report: AdminChatReport }>('/admin/chat/reports/action', {
    reportId,
    action,
    reason,
  });

export const getAdminSettings = () => postJson<AdminSettingsResponse>('/admin/settings');

export const addAdminMember = (telegramId: number, role: 'owner' | 'admin') =>
  postJson<{ admin: AdminRoleMember }>('/admin/settings/admins/add', {
    telegramId,
    role,
  });

export const removeAdminMember = (telegramId: number) =>
  postJson<{ removed: true }>('/admin/settings/admins/remove', {
    telegramId,
  });

export const getAdminTickets = () => postJson<AdminTicketsResponse>('/admin/tickets');

export const verifyAdminTicket = (ticketNumber: number) =>
  postJson<{ ticket: AdminTicketRecord }>('/admin/tickets/verify', {
    ticketNumber,
  });

export const updateAdminFeedbackStatus = (
  feedbackId: number,
  status: 'read' | 'resolved'
) =>
  postJson<{ feedback: AdminDashboardFeedback }>('/admin/feedback/status', {
    feedbackId,
    status,
  });

export const replyAdminFeedback = (feedbackId: number, reply: string) =>
  postJson<{ feedback: AdminDashboardFeedback }>('/admin/feedback/reply', {
    feedbackId,
    reply,
  });

export const submitFeedbackEntry = (payload: FeedbackSubmissionPayload) =>
  postJson<{ ok: true; feedbackId: number }>('/feedback', payload);

export const submitGameResult = (payload: GameSubmitPayload) =>
  postJson<GameSubmitResponse>('/games/submit', payload);

export const getUserMe = () => postJson<UsersMeResponse>('/users/me');

export const joinTournamentRecord = (paymentMethod: 'vip' | 'stars' | 'ton' | 'free') =>
  postJson<TournamentJoinResponse>('/tournaments/join', { paymentMethod });

export const syncUserToServer = (user: Record<string, any>) =>
  postJson<UsersSyncResponse>('/users/sync', { user });

export interface SkinPurchaseResponse {
  ok: true;
  skinId: string;
  price: number;
  coins: number;
  skinInventory: string[];
}

export const purchaseSkin = (skinId: string) =>
  postJson<SkinPurchaseResponse>('/skins/purchase', { skinId });

export interface RewardGrantResponse {
  ok: true;
  reason: 'ad' | 'level' | 'social' | 'challenge';
  level?: number;
  taskId?: string;
  challengeId?: string;
  granted: { coins: number; gems: number };
  coins?: number;
  gems?: number;
  remainingToday?: number;
  clamped?: boolean;
}

export const grantAdReward = () =>
  postJson<RewardGrantResponse>('/rewards/grant', { reason: 'ad' });

export const grantLevelReward = (level: number) =>
  postJson<RewardGrantResponse>('/rewards/grant', { reason: 'level', level });

export const grantSocialReward = (taskId: string) =>
  postJson<RewardGrantResponse>('/rewards/grant', { reason: 'social', taskId });

export const grantChallengeReward = (challengeId: string, amount: number) =>
  postJson<RewardGrantResponse>('/rewards/grant', {
    reason: 'challenge',
    challengeId,
    amount,
  });

export type MysteryBoxReward =
  | { type: 'skin'; skinId: string; amount: number }
  | { type: 'crystals'; amount: number }
  | { type: 'booster'; boosterType: 'hints'; amount: number }
  | { type: 'fec'; amount: number }
  | { type: 'coins'; amount: number };

export interface MysteryBoxOpenResponse {
  ok: true;
  reward: MysteryBoxReward;
  price: number;
  coins: number;
  gems: number;
  fecBalance: number;
  inventory: { freezes: number; hints: number; shields: number };
  skinInventory: string[];
}

export const openMysteryBoxOnServer = () =>
  postJson<MysteryBoxOpenResponse>('/mystery-box/open', {});

// Re-export for store action consumers; the store action returns this same
// shape (mapped to the existing MysteryBox UI type) on success.


export const getTournamentLeaderboard = (weekKey?: string) =>
  postJson<TournamentLeaderboardResponse>('/tournaments/leaderboard', weekKey ? { weekKey } : {});

export const issueTicketRecord = (payload: TicketIssuePayload) =>
  postJson<TicketIssueResponse>('/tickets/issue', payload);

export interface AdminSocialTask {
  id: string;
  platform: 'youtube' | 'telegram' | 'instagram' | 'twitter' | 'other';
  url: string;
  reward: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const getAdminTasks = () =>
  postJson<{ tasks: AdminSocialTask[] }>('/api/admin/tasks');

export const addAdminTask = (payload: Omit<AdminSocialTask, 'created_at' | 'updated_at'>) =>
  postJson<{ task: AdminSocialTask }>('/api/admin/tasks/add', payload);

export const updateAdminTask = (payload: Omit<AdminSocialTask, 'created_at' | 'updated_at'>) =>
  postJson<{ task: AdminSocialTask }>('/api/admin/tasks/update', payload);

export const deleteAdminTask = (id: string) =>
  postJson<{ ok: true }>('/api/admin/tasks/delete', { id });
