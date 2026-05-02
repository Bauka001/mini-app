import {
  createUser,
  getUserByTelegramId,
  isSupabaseConfigured,
  subscribeToUserChanges,
  updateUser,
  type DatabaseUser,
} from '../utils/supabase';
import { issueTicketRecord, submitFeedbackEntry } from '../utils/adminApi';
import type { Ticket, UserState } from './useStore';
import { normalizeBrainStats, toDateKey } from './analytics';
import { normalizeDailyQuest, normalizeWeeklyQuest } from './economy';

let supabaseChannel: ReturnType<typeof subscribeToUserChanges> | null = null;

const DAILY_WORKOUT_STORAGE_KEY = 'focus-daily-workout-v1';
const ONBOARDING_WORKOUT_TOAST_PREFIX = 'focus-onboarding-workout-toast-v1';

const WORKOUT_HISTORY_IDS_BY_SESSION_ID: Record<string, string[]> = {
  memory: ['memory'],
  schulte: ['schulte'],
  math: ['math'],
  pairs: ['pairs'],
  'odd-one': ['odd_one_out'],
  stroop: ['stroop'],
  tetris: ['tetris'],
  '2048': ['2048'],
};

type StoredWorkoutSession = {
  date: string;
  startedAt: number;
  gameIds: string[];
};

type StoreSetState = (
  partial: Partial<UserState> | ((state: UserState) => Partial<UserState>)
) => void;

type PersistedUserProfile = Pick<
  UserState['user'],
  'firstName' | 'lastName' | 'username' | 'photoUrl' | 'level' | 'xp'
>;

type PersistedStatePatch = Pick<
  UserState,
  | 'coins'
  | 'gems'
  | 'brainStats'
  | 'skinInventory'
  | 'activeSkin'
  | 'plan'
  | 'planExpiry'
  | 'hp'
  | 'maxHp'
  | 'fecBalance'
  | 'inventory'
  | 'dailyGoalMinutes'
  | 'streak'
  | 'dailyRewardStreak'
  | 'promotionEndISO'
  | 'dailyQuest'
  | 'weeklyQuest'
  | 'energy'
  | 'maxEnergy'
  | 'lastEnergyRegenTime'
  | 'streakProtection'
  | 'mysteryBoxAvailable'
  | 'mysteryBoxPrice'
> & {
  user: PersistedUserProfile;
};

const mergeClaimedDates = (
  currentClaimedDates: string[] | undefined,
  lastClaimDate: string | null
) =>
  Array.from(
    new Set([
      ...(Array.isArray(currentClaimedDates) ? currentClaimedDates : []),
      ...(typeof lastClaimDate === 'string' ? [lastClaimDate] : []),
    ])
  ).slice(-30);

export const mapDbUserToState = (dbUser: DatabaseUser): PersistedStatePatch => ({
  user: {
    firstName: dbUser.first_name,
    lastName: dbUser.last_name || '',
    username: dbUser.username || '',
    photoUrl: dbUser.photo_url || '',
    level: dbUser.level,
    xp: dbUser.xp,
  },
  coins: dbUser.coins,
  gems: dbUser.gems,
  brainStats: normalizeBrainStats(dbUser.brain_stats),
  skinInventory: dbUser.skin_inventory,
  activeSkin: dbUser.active_skin,
  plan: dbUser.plan,
  planExpiry: dbUser.plan_expiry,
  hp: dbUser.hp,
  maxHp: dbUser.max_hp,
  fecBalance: dbUser.fec_balance,
  inventory: dbUser.inventory,
  dailyGoalMinutes: dbUser.daily_goal_minutes,
  streak: dbUser.streak,
  dailyRewardStreak: {
    count: dbUser.daily_reward_streak,
    lastClaimDate: dbUser.last_daily_reward_date,
    claimedDates: typeof dbUser.last_daily_reward_date === 'string' ? [dbUser.last_daily_reward_date] : [],
  },
  promotionEndISO: dbUser.promotion_end_iso,
  dailyQuest: normalizeDailyQuest(dbUser.daily_quest),
  weeklyQuest: normalizeWeeklyQuest(dbUser.weekly_quest),
  energy: dbUser.energy,
  maxEnergy: dbUser.max_energy,
  lastEnergyRegenTime: dbUser.last_energy_regen_time,
  streakProtection: dbUser.streak_protection,
  mysteryBoxAvailable: dbUser.mystery_box_available,
  mysteryBoxPrice: dbUser.mystery_box_price,
});

type SupabaseStoreState = Pick<
  UserState,
  | 'user'
  | 'coins'
  | 'gems'
  | 'brainStats'
  | 'skinInventory'
  | 'activeSkin'
  | 'plan'
  | 'planExpiry'
  | 'hp'
  | 'maxHp'
  | 'fecBalance'
  | 'inventory'
  | 'dailyGoalMinutes'
  | 'streak'
  | 'dailyRewardStreak'
  | 'promotionEndISO'
  | 'dailyQuest'
  | 'weeklyQuest'
  | 'energy'
  | 'maxEnergy'
  | 'lastEnergyRegenTime'
  | 'streakProtection'
  | 'mysteryBoxAvailable'
  | 'mysteryBoxPrice'
>;

export const mapStateToDbUser = (
  state: SupabaseStoreState,
  telegramId: number
): Parameters<typeof createUser>[0] => ({
  id: 0,
  telegram_id: telegramId,
  first_name: state.user.firstName,
  last_name: state.user.lastName,
  username: state.user.username,
  photo_url: state.user.photoUrl,
  coins: state.coins,
  gems: state.gems,
  xp: state.user.xp,
  level: state.user.level,
  brain_stats: state.brainStats,
  skin_inventory: state.skinInventory,
  active_skin: state.activeSkin,
  plan: state.plan,
  plan_expiry: state.planExpiry,
  hp: state.hp,
  max_hp: state.maxHp,
  fec_balance: state.fecBalance,
  inventory: state.inventory,
  daily_goal_minutes: state.dailyGoalMinutes,
  streak: state.streak,
  daily_reward_streak: state.dailyRewardStreak?.count ?? 0,
  last_daily_reward_date: state.dailyRewardStreak?.lastClaimDate ?? null,
  promotion_end_iso: state.promotionEndISO,
  daily_quest: state.dailyQuest,
  weekly_quest: state.weeklyQuest,
  energy: state.energy,
  max_energy: state.maxEnergy,
  last_energy_regen_time: state.lastEnergyRegenTime,
  streak_protection: state.streakProtection,
  mystery_box_available: state.mysteryBoxAvailable,
  mystery_box_price: state.mysteryBoxPrice,
});

export const syncUserToSupabase = async (state: SupabaseStoreState, telegramId: number) => {
  if (!isSupabaseConfigured) return;

  try {
    const dbData = mapStateToDbUser(state, telegramId);
    const existing = await getUserByTelegramId(telegramId);
    if (existing) {
      await updateUser(telegramId, dbData);
    } else {
      await createUser(dbData);
    }
  } catch (err) {
    console.error('[Supabase] Sync error:', err);
  }
};

export const subscribeToSupabaseChanges = (telegramId: number, setState: StoreSetState) => {
  if (!isSupabaseConfigured) return;

  if (supabaseChannel) {
    supabaseChannel.unsubscribe();
  }

  supabaseChannel = subscribeToUserChanges(telegramId, (dbUser) => {
    const mapped = mapDbUserToState(dbUser);
    setState((state) => ({
      coins: mapped.coins,
      gems: mapped.gems,
      user: {
        ...state.user,
        ...mapped.user,
      },
      brainStats: normalizeBrainStats(mapped.brainStats, state.history),
      skinInventory: mapped.skinInventory,
      activeSkin: mapped.activeSkin,
      plan: mapped.plan,
      planExpiry: mapped.planExpiry,
      hp: mapped.hp,
      maxHp: mapped.maxHp,
      fecBalance: mapped.fecBalance,
      inventory: mapped.inventory,
      dailyGoalMinutes: mapped.dailyGoalMinutes,
      streak: mapped.streak,
      dailyRewardStreak: {
        count: mapped.dailyRewardStreak.count,
        lastClaimDate: mapped.dailyRewardStreak.lastClaimDate,
        claimedDates: mergeClaimedDates(
          state.dailyRewardStreak?.claimedDates,
          mapped.dailyRewardStreak.lastClaimDate
        ),
      },
      promotionEndISO: mapped.promotionEndISO,
      dailyQuest: mapped.dailyQuest,
      weeklyQuest: mapped.weeklyQuest,
      energy: mapped.energy,
      maxEnergy: mapped.maxEnergy,
      lastEnergyRegenTime: mapped.lastEnergyRegenTime,
      streakProtection: mapped.streakProtection,
      mysteryBoxAvailable: mapped.mysteryBoxAvailable,
      mysteryBoxPrice: mapped.mysteryBoxPrice,
    }));
  });
};

export const loadUserFromSupabase = async (telegramId: number, setState: StoreSetState) => {
  if (!isSupabaseConfigured) return;

  try {
    const dbUser = await getUserByTelegramId(telegramId);
    if (dbUser) {
      const mapped = mapDbUserToState(dbUser);
      setState((state) => ({
        ...mapped,
        user: {
          ...state.user,
          ...mapped.user,
        },
        dailyRewardStreak: {
          count: mapped.dailyRewardStreak.count,
          lastClaimDate: mapped.dailyRewardStreak.lastClaimDate,
          claimedDates: mergeClaimedDates(
            state.dailyRewardStreak?.claimedDates,
            mapped.dailyRewardStreak.lastClaimDate
          ),
        },
        brainStats: normalizeBrainStats(mapped.brainStats, state.history),
      }));
    }
  } catch (err) {
    console.error('[Supabase] Load error:', err);
  }
};

export const persistFeedbackEntry = async (
  feedback: { userId: number; username: string; text: string; imageUrl?: string }
) => {
  try {
    await submitFeedbackEntry({
      userTelegramId: feedback.userId,
      username: feedback.username,
      text: feedback.text,
      imageUrl: feedback.imageUrl,
    });
  } catch (error) {
    console.error('[Admin API] Feedback sync error:', error);
  }
};

export const persistTicket = async (ticket: Ticket, source: 'plan_upgrade' | 'ticket_purchase') => {
  try {
    await issueTicketRecord({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userTelegramId: ticket.userId,
      userName: ticket.userName,
      eventName: ticket.eventName,
      eventDate: ticket.eventDate,
      price: ticket.price,
      purchaseDate: ticket.purchaseDate,
      source,
    });
  } catch (error) {
    console.error('[Admin API] Ticket sync error:', error);
  }
};

export const readStoredWorkoutSession = (): StoredWorkoutSession | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(DAILY_WORKOUT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredWorkoutSession>;
    if (
      !parsed.date ||
      typeof parsed.startedAt !== 'number' ||
      !Array.isArray(parsed.gameIds) ||
      parsed.gameIds.length === 0
    ) {
      return null;
    }

    return {
      date: parsed.date,
      startedAt: parsed.startedAt,
      gameIds: parsed.gameIds.filter((gameId): gameId is string => typeof gameId === 'string').slice(0, 3),
    };
  } catch (error) {
    console.warn('Workout session read error:', error);
    return null;
  }
};

export const shouldShowFirstWorkoutNotification = (userId: number, gameId: string, playedAt: number) => {
  const session = readStoredWorkoutSession();
  if (!session) return false;

  const firstSessionGameId = session.gameIds[0];
  const firstGameHistoryIds = WORKOUT_HISTORY_IDS_BY_SESSION_ID[firstSessionGameId] || [];
  if (!firstGameHistoryIds.includes(gameId) || playedAt < session.startedAt) {
    return false;
  }

  const toastKey = `${ONBOARDING_WORKOUT_TOAST_PREFIX}-${userId}-${session.date}`;
  if (typeof window === 'undefined' || localStorage.getItem(toastKey) === '1') {
    return false;
  }

  localStorage.setItem(toastKey, '1');
  return true;
};

export const getWeekendEvent = (now: Date, userId: number) => {
  const day = now.getDay();
  if (day !== 6 && day !== 0) {
    return { weekendKey: null, isActive: false, multiplier: 1 };
  }

  const saturday = new Date(now);
  saturday.setHours(0, 0, 0, 0);
  if (day === 0) {
    saturday.setDate(saturday.getDate() - 1);
  }

  const weekendKey = toDateKey(saturday);
  const seed = `${userId || 0}-${weekendKey}`;
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const roll = (hash >>> 0) % 100;
  const isActive = roll < 50;
  return { weekendKey, isActive, multiplier: isActive ? 2 : 1 };
};
