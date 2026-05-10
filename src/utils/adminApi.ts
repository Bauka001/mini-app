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

export interface TicketIssuePayload {
  id: string;
  ticketNumber: number;
  userTelegramId: number;
  userName: string;
  eventName: string;
  eventDate: string;
  price: number;
  purchaseDate: string;
  source: 'plan_upgrade' | 'ticket_purchase' | 'case_reward';
}

const getTelegramInitData = () => {
  return window.Telegram?.WebApp?.initData || WebApp?.initData || '';
};

async function postJson<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
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

export const issueTicketRecord = (payload: TicketIssuePayload) =>
  postJson<{ ok: true; ticketId: string }>('/tickets/issue', payload);

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
