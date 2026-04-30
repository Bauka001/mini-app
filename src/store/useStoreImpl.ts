import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getTelegramUser, hapticFeedback } from '../utils/telegram';
import { telegramStorage } from './storage';
import { UserState, initialUserRaw, generateGameId, initialState, generateDailyChallenges, initialSocialTasks, Ticket, EventParticipant, Notification, TournamentState } from './useStore';
import { getUserByTelegramId, createUser, updateUser, subscribeToUserChanges, isSupabaseConfigured, DatabaseUser } from '../utils/supabase';
import {
  CanonicalUser,
  getUserMe,
  grantAdReward,
  grantLevelReward,
  issueTicketRecord,
  joinTournamentRecord,
  purchaseSkin,
  submitFeedbackEntry,
  submitGameResult,
  syncUserToServer,
} from '../utils/adminApi';
import { calculateBrainScoreMetrics } from '../utils/brainScore';

let supabaseChannel: ReturnType<typeof subscribeToUserChanges> | null = null;

const DEFAULT_BRAIN_STATS = {
  focus: 20,
  memory: 20,
  logic: 20,
  speed: 20,
  flexibility: 20,
};

const DEFAULT_DAILY_QUEST: UserState['dailyQuest'] = {
  id: 'daily_quest_3games',
  gamesPlayed: [],
  isCompleted: false,
  isClaimed: false,
  lastResetDate: null,
};

const DEFAULT_WEEKLY_QUEST: UserState['weeklyQuest'] = {
  id: 'weekly_quest_10games',
  gamesPlayed: 0,
  targetGames: 10,
  milestones: [
    { gamesRequired: 2, reward: { coins: 50, crystals: 0, energy: 0 }, isClaimed: false },
    { gamesRequired: 4, reward: { coins: 50, crystals: 2, energy: 0 }, isClaimed: false },
    { gamesRequired: 6, reward: { coins: 50, crystals: 0, energy: 10 }, isClaimed: false },
    { gamesRequired: 8, reward: { coins: 100, crystals: 0, energy: 0 }, isClaimed: false },
    { gamesRequired: 10, reward: { coins: 100, crystals: 5, energy: 20 }, isClaimed: false },
  ],
  lastResetDate: null,
};

const normalizeBrainStats = (brainStats: any, history: any[] = []) => {
  const safeStats = {
    focus: Number.isFinite(Number(brainStats?.focus)) ? Number(brainStats.focus) : DEFAULT_BRAIN_STATS.focus,
    memory: Number.isFinite(Number(brainStats?.memory)) ? Number(brainStats.memory) : DEFAULT_BRAIN_STATS.memory,
    logic: Number.isFinite(Number(brainStats?.logic)) ? Number(brainStats.logic) : DEFAULT_BRAIN_STATS.logic,
    speed: Number.isFinite(Number(brainStats?.speed)) ? Number(brainStats.speed) : DEFAULT_BRAIN_STATS.speed,
    flexibility: Number.isFinite(Number(brainStats?.flexibility)) ? Number(brainStats.flexibility) : DEFAULT_BRAIN_STATS.flexibility,
  };

  return {
    ...safeStats,
    ...calculateBrainScoreMetrics(history),
  };
};

const normalizeDailyQuest = (dailyQuest: any): UserState['dailyQuest'] => ({
  ...DEFAULT_DAILY_QUEST,
  ...(dailyQuest || {}),
  gamesPlayed: Array.isArray(dailyQuest?.gamesPlayed)
    ? dailyQuest.gamesPlayed.filter((gameId: unknown): gameId is string => typeof gameId === 'string')
    : [],
});

const normalizeWeeklyQuest = (weeklyQuest: any): UserState['weeklyQuest'] => ({
  ...DEFAULT_WEEKLY_QUEST,
  ...(weeklyQuest || {}),
  milestones: Array.isArray(weeklyQuest?.milestones) && weeklyQuest.milestones.length > 0
    ? weeklyQuest.milestones.map((milestone: any, index: number) => ({
        ...DEFAULT_WEEKLY_QUEST.milestones[Math.min(index, DEFAULT_WEEKLY_QUEST.milestones.length - 1)],
        ...(milestone || {}),
        reward: {
          ...DEFAULT_WEEKLY_QUEST.milestones[Math.min(index, DEFAULT_WEEKLY_QUEST.milestones.length - 1)].reward,
          ...(milestone?.reward || {}),
        },
      }))
    : DEFAULT_WEEKLY_QUEST.milestones,
});

const TOURNAMENT_ENTRY_FEE = 50;
const TOURNAMENT_GAMES_LIMIT = 3;
const VIP_TOURNAMENT_PLAN = 'premium';
const DAILY_WORKOUT_STORAGE_KEY = 'focus-daily-workout-v1';
const ONBOARDING_WORKOUT_TOAST_PREFIX = 'focus-onboarding-workout-toast-v1';
const VIP_ANALYTICS_DAY_RANGE = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type AnalyticsCategoryKey = 'focus' | 'memory' | 'logic' | 'speed' | 'flexibility';

const ANALYTICS_CATEGORY_LABELS: Record<AnalyticsCategoryKey, string> = {
  focus: 'Focus',
  memory: 'Memory',
  logic: 'Logic',
  speed: 'Speed',
  flexibility: 'Flexibility',
};

export const TELEGRAM_AVERAGE_BRAIN_PROFILE: Record<AnalyticsCategoryKey | 'overall', number> = {
  overall: 62,
  focus: 58,
  memory: 56,
  logic: 60,
  speed: 55,
  flexibility: 54,
};

const clampAnalyticsMetric = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)));

const toSafeNumber = (value: string | number | undefined | null) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : 0;
};

const buildAnalyticsDateLabel = (value: Date) =>
  `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}`;

const DAILY_ANALYTICS_REWARDS = [
  {
    day: 1,
    title: 'Ертеңгі нәтиже',
    description: 'Ертеңгі нәтижені көре аласыз',
  },
  {
    day: 7,
    title: 'Апталық график',
    description: 'Апталық график ашылады',
  },
  {
    day: 14,
    title: 'Орташа білім баласы',
    description: 'Орташа білім баласын көре аласыз',
  },
  {
    day: 30,
    title: 'Қоғамдық салыстырма',
    description: 'Айдан көпшілік салыстырма ашылады',
  },
] as const;

const getDateDiffInDays = (fromDateKey: string, toDateKey: string) => {
  const from = new Date(`${fromDateKey}T00:00:00`);
  const to = new Date(`${toDateKey}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / DAY_IN_MS);
};

const isVipDailyRewardGraceActive = (
  plan: UserState['plan'],
  planExpiry: UserState['planExpiry']
) => plan === 'premium' && (!planExpiry || planExpiry > Date.now());

const getAnalyticsRewardForStreak = (streak: number) => {
  const exactReward = DAILY_ANALYTICS_REWARDS.find((entry) => entry.day === streak);
  const nextReward = DAILY_ANALYTICS_REWARDS.find((entry) => entry.day > streak) || null;

  if (exactReward) {
    return {
      analyticsDay: streak,
      analyticsTitle: exactReward.title,
      analyticsDescription: exactReward.description,
      nextUnlockDay: nextReward?.day || null,
      isNewUnlock: true,
    };
  }

  return {
    analyticsDay: streak,
    analyticsTitle: nextReward ? `${nextReward.day}-күнге қадам` : 'Барлық аналитика ашық',
    analyticsDescription: nextReward
      ? `${nextReward.day}-күнге жетсеңіз, ${nextReward.title.toLowerCase()} ашылады`
      : 'Analytics бөліміндегі барлық daily unlock ашылып тұр',
    nextUnlockDay: nextReward?.day || null,
    isNewUnlock: false,
  };
};

export const buildVipAnalyticsSnapshot = (
  history: UserState['history'] = [],
  brainStats: UserState['brainStats']
) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const dailyBuckets = Array.from({ length: VIP_ANALYTICS_DAY_RANGE }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (VIP_ANALYTICS_DAY_RANGE - 1 - index));
    return {
      key: toDateKey(date),
      label: buildAnalyticsDateLabel(date),
      total: 0,
      sessions: 0,
    };
  });

  const bucketMap = new Map(dailyBuckets.map((bucket) => [bucket.key, bucket]));
  const windowStart = dailyBuckets[0] ? new Date(`${dailyBuckets[0].key}T00:00:00`).getTime() : Date.now();

  const windowHistory = [...history]
    .filter((entry) => toSafeNumber(entry.timestamp) >= windowStart)
    .sort((left, right) => toSafeNumber(left.timestamp) - toSafeNumber(right.timestamp));

  const gameBreakdownMap = new Map<
    string,
    { gameId: string; plays: number; totalScore: number; bestScore: number; lastScore: number }
  >();

  windowHistory.forEach((entry) => {
    const entryTimestamp = toSafeNumber(entry.timestamp) || Date.now();
    const performanceScore = clampAnalyticsMetric(toSafeNumber(entry.coinsEarned) * 10);
    const entryDateKey = toDateKey(new Date(entryTimestamp));
    const bucket = bucketMap.get(entryDateKey);

    if (bucket) {
      bucket.total += performanceScore;
      bucket.sessions += 1;
    }

    const existingGame = gameBreakdownMap.get(entry.gameId) || {
      gameId: entry.gameId,
      plays: 0,
      totalScore: 0,
      bestScore: 0,
      lastScore: 0,
    };

    gameBreakdownMap.set(entry.gameId, {
      gameId: entry.gameId,
      plays: existingGame.plays + 1,
      totalScore: existingGame.totalScore + performanceScore,
      bestScore: Math.max(existingGame.bestScore, performanceScore),
      lastScore: performanceScore,
    });
  });

  const midpointTimestamp = windowStart + Math.floor(VIP_ANALYTICS_DAY_RANGE / 2) * DAY_IN_MS;
  const previousWindowHistory = windowHistory.filter((entry) => toSafeNumber(entry.timestamp) < midpointTimestamp);
  const currentWindowMetrics = calculateBrainScoreMetrics(windowHistory);
  const previousWindowMetrics = calculateBrainScoreMetrics(previousWindowHistory);

  return {
    dayRange: VIP_ANALYTICS_DAY_RANGE,
    dailySeries: dailyBuckets.map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      value: bucket.sessions > 0 ? clampAnalyticsMetric(bucket.total / bucket.sessions) : 0,
      sessions: bucket.sessions,
    })),
    totalSessions: windowHistory.length,
    activeDays: dailyBuckets.filter((bucket) => bucket.sessions > 0).length,
    currentBrainScore: currentWindowMetrics.combinedScore,
    brainScoreChange: currentWindowMetrics.combinedScore - previousWindowMetrics.combinedScore,
    telegramAverage: TELEGRAM_AVERAGE_BRAIN_PROFILE.overall,
    comparison: (Object.keys(ANALYTICS_CATEGORY_LABELS) as AnalyticsCategoryKey[]).map((key) => {
      const userValue = clampAnalyticsMetric(toSafeNumber(brainStats?.[key]));
      const telegramValue = TELEGRAM_AVERAGE_BRAIN_PROFILE[key];

      return {
        key,
        label: ANALYTICS_CATEGORY_LABELS[key],
        userValue,
        telegramValue,
        difference: userValue - telegramValue,
      };
    }),
    gameBreakdown: Array.from(gameBreakdownMap.values())
      .map((entry) => ({
        gameId: entry.gameId,
        plays: entry.plays,
        averageScore: clampAnalyticsMetric(entry.totalScore / entry.plays),
        bestScore: entry.bestScore,
        lastScore: entry.lastScore,
      }))
      .sort((left, right) => right.averageScore - left.averageScore || right.plays - left.plays),
  };
};

const WORKOUT_HISTORY_IDS_BY_SESSION_ID: Record<string, string[]> = {
  memory: ['memory'],
  schulte: ['schulte'],
  math: ['math'],
  pairs: ['pairs'],
  'odd-one': ['odd_one_out'],
  'agent-spot': ['agent_spot'],
  'agent-sequence': ['agent_sequence'],
  'code-breaker': ['code_breaker'],
  stroop: ['stroop'],
  tetris: ['tetris'],
  '2048': ['2048'],
};

type StoredWorkoutSession = {
  date: string;
  startedAt: number;
  gameIds: string[];
};

const toDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTournamentSchedule = (now = new Date()) => {
  const friday = new Date(now);
  friday.setHours(0, 0, 0, 0);
  friday.setDate(friday.getDate() - ((friday.getDay() + 2) % 7));

  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);

  const nextFriday = new Date(now);
  nextFriday.setHours(0, 0, 0, 0);
  nextFriday.setDate(nextFriday.getDate() + (((5 - now.getDay() + 7) % 7) || 7));

  return {
    weekKey: toDateKey(friday),
    isOpen: now >= friday && now <= sunday,
    startsAtISO: friday.toISOString(),
    endsAtISO: sunday.toISOString(),
    nextStartsAtISO: nextFriday.toISOString(),
  };
};

const readStoredWorkoutSession = (): StoredWorkoutSession | null => {
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

const shouldShowFirstWorkoutNotification = (userId: number, gameId: string, playedAt: number) => {
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

const normalizeTournamentState = (tournament: any): TournamentState => ({
  weekKey: typeof tournament?.weekKey === 'string' ? tournament.weekKey : null,
  joinedAt: typeof tournament?.joinedAt === 'string' ? tournament.joinedAt : null,
  paymentMethod:
    tournament?.paymentMethod === 'stars' ||
    tournament?.paymentMethod === 'ton' ||
    tournament?.paymentMethod === 'vip'
      ? tournament.paymentMethod
      : null,
  games: Array.isArray(tournament?.games)
    ? tournament.games
        .filter((game: any) => typeof game?.gameId === 'string')
        .map((game: any) => ({
          gameId: game.gameId,
          score: typeof game.score === 'number' || typeof game.score === 'string' ? game.score : 0,
          playedAt: typeof game.playedAt === 'string' ? game.playedAt : new Date().toISOString(),
          tournamentBrainScore: Number.isFinite(Number(game.tournamentBrainScore))
            ? Number(game.tournamentBrainScore)
            : 0,
        }))
    : [],
  score: Number.isFinite(Number(tournament?.score)) ? Number(tournament.score) : 0,
  vipFreeEntryWeek: typeof tournament?.vipFreeEntryWeek === 'string' ? tournament.vipFreeEntryWeek : null,
});

const isVipTournamentEligible = (plan: UserState['plan']) => plan === VIP_TOURNAMENT_PLAN;

const calculateTournamentScoreProgress = (games: TournamentState['games']) =>
  games.map((game, index) => {
    const nextScore = calculateBrainScoreMetrics(
      games.slice(0, index + 1).map((entry) => ({
        gameId: entry.gameId,
        score: entry.score,
        timestamp: Date.parse(entry.playedAt) || Date.now(),
        coinsEarned: 0,
      }))
    ).combinedScore;

    return {
      ...game,
      tournamentBrainScore: nextScore,
    };
  });

const mapDbUserToState = (dbUser: DatabaseUser) => ({
  coins: dbUser.coins,
  gems: dbUser.gems,
  xp: dbUser.xp,
  level: dbUser.level,
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
  dailyRewardStreak: dbUser.daily_reward_streak,
  lastDailyRewardDate: dbUser.last_daily_reward_date,
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

// NOTE: `plan` and `plan_expiry` are intentionally omitted. The frontend uses
// the Supabase anon key, so any column we include here is something the client
// can write. Plan changes must flow through the Node backend (POST /tickets/issue),
// which uses the service-role key and bases the update on the issued ticket row.
const mapStateToDbUser = (state: any, telegramId: number) => ({
  telegram_id: telegramId,
  first_name: state.user.firstName,
  last_name: state.user.lastName,
  username: state.user.username,
  photo_url: state.user.photoUrl,
  coins: state.coins,
  gems: state.gems,
  xp: state.xp,
  level: state.level,
  brain_stats: state.brainStats,
  skin_inventory: state.skinInventory,
  active_skin: state.activeSkin,
  hp: state.hp,
  max_hp: state.maxHp,
  fec_balance: state.fecBalance,
  inventory: state.inventory,
  daily_goal_minutes: state.dailyGoalMinutes,
  streak: state.streak,
  daily_reward_streak: state.dailyRewardStreak,
  last_daily_reward_date: state.lastDailyRewardDate,
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

const syncUserToSupabase = async (state: any, telegramId: number) => {
  if (!isSupabaseConfigured) return;
  // Browser/PWA guest — id is 0, no Telegram identity. Local-only mode.
  if (!telegramId) return;

  const dbData = mapStateToDbUser(state, telegramId);

  // Prefer the server-routed /users/sync endpoint. The backend uses the
  // service-role key (so it bypasses the broken JWT-claim RLS) and applies
  // a column allow-list — it will silently drop attempts to write
  // plan / coins / xp / level even if the client tries.
  try {
    await syncUserToServer(dbData);
    return;
  } catch (serverErr) {
    console.warn('[Users] /users/sync unavailable, falling back to anon-key write:', serverErr);
  }

  const attempt = async () => {
    const existing = await getUserByTelegramId(telegramId);
    if (existing) {
      const ok = await updateUser(telegramId, dbData);
      if (!ok) throw new Error('updateUser returned false');
    } else {
      const created = await createUser({ ...dbData, id: 0 } as any);
      if (!created) throw new Error('createUser returned null');
    }
  };

  try {
    await attempt();
  } catch (firstError) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    try {
      await attempt();
    } catch (secondError) {
      console.error('[Supabase] Sync failed after retry:', {
        first: firstError,
        second: secondError,
      });
    }
  }
};

const subscribeToSupabaseChanges = (telegramId: number, setState: (partial: any) => void) => {
  if (!isSupabaseConfigured) return;
  if (!telegramId) return;

  if (supabaseChannel) {
    supabaseChannel.unsubscribe();
  }

  supabaseChannel = subscribeToUserChanges(telegramId, (dbUser) => {
    const mapped = mapDbUserToState(dbUser);
    setState((state: any) => ({
      coins: mapped.coins,
      gems: mapped.gems,
      xp: mapped.xp,
      level: mapped.level,
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
      dailyRewardStreak: mapped.dailyRewardStreak,
      lastDailyRewardDate: mapped.lastDailyRewardDate,
      promotionEndISO: mapped.promotionEndISO,
      dailyQuest: mapped.dailyQuest,
    }));
  });
};

const mapCanonicalUserToState = (user: CanonicalUser) => ({
  coins: user.coins,
  gems: user.gems,
  xp: user.xp,
  level: user.level,
  brainStats: normalizeBrainStats(user.brainStats),
  skinInventory: user.skinInventory,
  activeSkin: user.activeSkin,
  plan: user.plan,
  planExpiry: user.planExpiry,
  hp: user.hp,
  maxHp: user.maxHp,
  fecBalance: user.fecBalance,
  inventory: user.inventory,
  dailyGoalMinutes: user.dailyGoalMinutes,
  streak: user.streak,
  dailyRewardStreak: user.dailyRewardStreak,
  lastDailyRewardDate: user.lastDailyRewardDate,
  promotionEndISO: user.promotionEndISO,
  dailyQuest: normalizeDailyQuest(user.dailyQuest),
});

const loadUserFromSupabase = async (telegramId: number, setState: (partial: any) => void) => {
  if (!isSupabaseConfigured) return;
  if (!telegramId) return;

  // Prefer the server-routed /users/me endpoint. The Node backend uses the
  // service-role key, so it bypasses the JWT-claim RLS on the users table that
  // silently blocks anon-key reads. Fall back to the direct anon-key path only
  // if the server endpoint isn't reachable (older deployment, network blip).
  try {
    const response = await getUserMe();
    if (response?.user) {
      const mapped = mapCanonicalUserToState(response.user);
      setState((state: any) => ({
        ...mapped,
        brainStats: normalizeBrainStats(mapped.brainStats, state.history),
      }));
      return;
    }
    // No row yet — let downstream code call createUser via syncUserToSupabase.
    return;
  } catch (serverErr) {
    console.warn('[Users] /users/me unavailable, falling back to anon-key read:', serverErr);
  }

  try {
    const dbUser = await getUserByTelegramId(telegramId);
    if (dbUser) {
      const mapped = mapDbUserToState(dbUser);
      setState((state: any) => ({
        ...mapped,
        brainStats: normalizeBrainStats(mapped.brainStats, state.history),
      }));
    }
  } catch (err) {
    console.error('[Supabase] Load error:', err);
  }
};

const persistFeedbackEntry = async (
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

const persistTicket = async (
  ticket: Ticket,
  source: 'plan_upgrade' | 'ticket_purchase',
  targetPlan?: 'silver' | 'gold' | 'premium'
): Promise<{
  ticketId: string;
  ticketNumber: number;
  plan: { plan: string; planExpiry: number | null } | null;
} | null> => {
  try {
    const response = await issueTicketRecord({
      userTelegramId: ticket.userId,
      userName: ticket.userName,
      eventName: ticket.eventName,
      eventDate: ticket.eventDate,
      price: ticket.price,
      purchaseDate: ticket.purchaseDate,
      source,
      targetPlan,
    });
    return {
      ticketId: response.ticketId,
      ticketNumber: response.ticketNumber,
      plan: response.plan ?? null,
    };
  } catch (error) {
    console.error('[Admin API] Ticket sync error:', error);
    return null;
  }
};


export const useStore = create<UserState>()(
  persist(
    (set, get) => ({
      language: 'ru',
      soundEnabled: true,
      theme: 'claude',

      brainStats: normalizeBrainStats(DEFAULT_BRAIN_STATS),

      user: {
        id: initialUserRaw.id || 0,
        gameId: initialUserRaw.id ? generateGameId() : `G-${Math.floor(Math.random() * 1000000)}`,
        firstName: initialUserRaw.first_name || 'Guest',
        lastName: initialUserRaw.last_name || '',
        username: initialUserRaw.username || '',
        photoUrl: initialUserRaw.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${initialUserRaw.first_name || 'Guest'}`,
        level: 1,
        xp: 0,
        achievements: []
      },

      syncUserFromTelegram: () => {
        const currentUser = getTelegramUser();
        if (currentUser) {
          set((state) => {
            const isDifferentUser = state.user.id !== 0 && state.user.id !== currentUser.id;

            if (isDifferentUser) {
              console.log('[Store] User switch detected, resetting state');
              if (isSupabaseConfigured) {
                loadUserFromSupabase(currentUser.id, set);
                subscribeToSupabaseChanges(currentUser.id, set);
              }
              return {
                ...initialState,
                brainStats: normalizeBrainStats(initialState.brainStats, []),
                user: {
                  id: currentUser.id,
                  gameId: generateGameId(),
                  firstName: currentUser.first_name,
                  lastName: currentUser.last_name,
                  username: currentUser.username,
                  photoUrl: currentUser.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.first_name}`,
                  level: 1,
                  xp: 0,
                  achievements: []
                }
              };
            } else {
              if (isSupabaseConfigured) {
                loadUserFromSupabase(currentUser.id, set);
                subscribeToSupabaseChanges(currentUser.id, set);
              }

              return {
                user: {
                  ...state.user,
                  id: currentUser.id,
                  gameId: state.user.id === 0 ? generateGameId() : state.user.gameId,
                  firstName: currentUser.first_name,
                  lastName: currentUser.last_name,
                  username: currentUser.username,
                  photoUrl: currentUser.photo_url || state.user.photoUrl
                }
              };
            }
          });
        }
      },

      coins: 100,
      gems: 0,
      fecBalance: 0,
      skinInventory: ['default'],
      activeSkin: 'default',
      unclaimedLevelRewards: [],
      usedPromocodes: [],

      dailyGoalMinutes: 10,
      streak: 0,
      history: [],
      lastDailyGoalClaimDate: null,
      challenges: generateDailyChallenges(),
      lastChallengeDate: new Date().toISOString().split('T')[0],

      socialTasks: initialSocialTasks,

      feedbacks: [],
      notifications: [],

      plan: 'free',
      planExpiry: null,
      hp: 100,
      maxHp: 100,

      dailyRewardStreak: 0,
      lastDailyRewardDate: null,

      tickets: [],
      eventParticipants: [],
      promotionEndISO: '2026-04-26T08:00:00.000Z',
      tournament: { ...initialState.tournament },

      dailyQuest: { ...DEFAULT_DAILY_QUEST },
      weeklyQuest: { ...DEFAULT_WEEKLY_QUEST },
      energy: 100,
      maxEnergy: 100,
      lastEnergyRegenTime: Date.now(),
      streakProtection: 0,
      mysteryBoxAvailable: true,
      mysteryBoxPrice: 500,
      setLanguage: (lang) => set({ language: lang }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      setTheme: (nextTheme) => set({ theme: nextTheme }),
      claimDailyReward: (amount) =>
        set((state) => ({ coins: state.coins + (Number(amount) || 0) })),
      updateUserProfile: (data) => set((state) => ({
        user: { ...state.user, ...data }
      })),

      addGameResult: (result) => {
        // Sanitize input. Anyone can call addGameResult, so clamp the credit a single
        // submission can grant. Real games award well under this cap.
        const MAX_COINS_PER_SUBMISSION = 200;
        const MIN_RESUBMIT_GAP_MS = 1500;
        const rawCoins = Number(result?.coinsEarned);
        const sanitizedCoins = Number.isFinite(rawCoins)
          ? Math.max(0, Math.min(MAX_COINS_PER_SUBMISSION, Math.floor(rawCoins)))
          : 0;
        const rawScoreNum = Number(result?.score);
        const sanitizedScore: string | number = Number.isFinite(rawScoreNum)
          ? rawScoreNum
          : typeof result?.score === 'string'
            ? result.score
            : 0;
        const gameId = String(result?.gameId || '').slice(0, 64);
        if (!gameId) return;

        // Reject double-submits for the same gameId within the throttle window.
        const preState = get();
        const lastForGame = [...preState.history].reverse().find((entry) => entry.gameId === gameId);
        if (lastForGame && Date.now() - (lastForGame.timestamp || 0) < MIN_RESUBMIT_GAP_MS) {
          return;
        }

        const userIdForSubmit = preState.user.id;

        set((state) => {
        const sanitizedResult = { ...result, gameId, score: sanitizedScore, coinsEarned: sanitizedCoins };
        const safeDailyQuest = normalizeDailyQuest(state.dailyQuest);
        const safeWeeklyQuest = normalizeWeeklyQuest(state.weeklyQuest);
        const xpGained = sanitizedCoins;
        const newXp = state.user.xp + xpGained;
        const newLevel = Math.floor(newXp / 1000) + 1;

        const newStats = { ...state.brainStats };
        const increment = 1;

        switch (gameId) {
          case 'schulte':
          case 'odd_one_out':
          case 'agent_spot':
            newStats.focus = Math.min(100, newStats.focus + increment);
            newStats.speed = Math.min(100, newStats.speed + increment);
            break;
          case 'memory':
          case 'pairs':
          case 'agent_sequence':
            newStats.memory = Math.min(100, newStats.memory + increment);
            newStats.logic = Math.min(100, newStats.logic + increment);
            break;
          case 'math':
          case '2048':
          case 'code_breaker':
            newStats.logic = Math.min(100, newStats.logic + increment);
            newStats.speed = Math.min(100, newStats.speed + increment);
            break;
          case 'stroop':
          case 'tetris':
            newStats.flexibility = Math.min(100, newStats.flexibility + increment);
            newStats.focus = Math.min(100, newStats.focus + increment);
            break;
          default:
            break;
        }

        const newUnclaimedRewards = [...(state.unclaimedLevelRewards || [])];
        if (newLevel > state.user.level) {
          for (let l = state.user.level + 1; l <= newLevel; l++) {
            if (!newUnclaimedRewards.includes(l)) {
              newUnclaimedRewards.push(l);
            }
          }
        }

        const newAchievements = [...(state.user.achievements || [])];
        const gameCount = state.history.length + 1;

        if (gameCount >= 1 && !newAchievements.includes('first_game')) {
          newAchievements.push('first_game');
        }
        if (gameCount >= 10 && !newAchievements.includes('gamer_10')) {
          newAchievements.push('gamer_10');
        }
        if (gameCount >= 50 && !newAchievements.includes('pro_gamer')) {
          newAchievements.push('pro_gamer');
        }
        if (newXp >= 5000 && !newAchievements.includes('xp_master')) {
          newAchievements.push('xp_master');
        }

        const updatedChallenges = state.challenges.map(ch => {
          if (ch.isClaimed) return ch;
          if (ch.type === 'play_count') return { ...ch, current: ch.current + 1 };
          if (ch.type === 'total_coins') return { ...ch, current: ch.current + sanitizedCoins };
          return ch;
        });

        const today = new Date().toISOString().split('T')[0];
        const needsReset = safeDailyQuest.lastResetDate !== today;
        const newGamesPlayed = needsReset
          ? [gameId]
          : [...safeDailyQuest.gamesPlayed, gameId];
        const uniqueGames = new Set(newGamesPlayed);
        const isNowComplete = uniqueGames.size >= 3;

        let finalDailyQuest = safeDailyQuest;
        if (needsReset) {
          finalDailyQuest = {
            id: 'daily_quest_3games',
            gamesPlayed: [gameId],
            isCompleted: uniqueGames.size >= 3,
            isClaimed: false,
            lastResetDate: today
          };
        } else {
          finalDailyQuest = {
            ...safeDailyQuest,
            gamesPlayed: [...safeDailyQuest.gamesPlayed, gameId],
            isCompleted: safeDailyQuest.isCompleted || isNowComplete
          };
        }

        const energyCost = 5 + Math.floor(Math.random() * 5);
        const newEnergy = Math.max(0, state.energy - energyCost);

        const now = new Date();
        const weekNumber = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
        const lastResetWeek = safeWeeklyQuest.lastResetDate 
          ? Math.floor(new Date(safeWeeklyQuest.lastResetDate).getTime() / (7 * 24 * 60 * 60 * 1000))
          : -1;

        let finalWeeklyQuest = safeWeeklyQuest;
        if (weekNumber !== lastResetWeek) {
          finalWeeklyQuest = {
            ...DEFAULT_WEEKLY_QUEST,
            gamesPlayed: 1,
            lastResetDate: new Date().toISOString()
          };
        } else {
          finalWeeklyQuest = {
            ...safeWeeklyQuest,
            gamesPlayed: safeWeeklyQuest.gamesPlayed + 1
          };
        }

        const playedAt = new Date().toISOString();
        const playedAtTimestamp = Date.now();
        const nextHistoryEntry = {
          ...sanitizedResult,
          date: playedAt.split('T')[0],
          timestamp: playedAtTimestamp,
        };
        const updatedHistory = [...state.history, nextHistoryEntry];
        const schedule = getTournamentSchedule(new Date(playedAt));
        const isCurrentTournamentRun = Boolean(
          state.tournament.joinedAt &&
          state.tournament.weekKey === schedule.weekKey &&
          state.tournament.games.length < TOURNAMENT_GAMES_LIMIT
        );

        let nextTournament = state.tournament;
        if (schedule.isOpen && isCurrentTournamentRun) {
          const tournamentGames = calculateTournamentScoreProgress([
            ...state.tournament.games,
            {
              gameId,
              score: sanitizedScore,
              playedAt,
              tournamentBrainScore: 0,
            },
          ]);

          nextTournament = {
            ...state.tournament,
            games: tournamentGames,
            score: tournamentGames[tournamentGames.length - 1]?.tournamentBrainScore || state.tournament.score,
          };
        }

        const shouldAddWorkoutNotification =
          Boolean(state.user.id) &&
          shouldShowFirstWorkoutNotification(state.user.id, gameId, playedAtTimestamp);

        const onboardingNotification: Notification | null = shouldAddWorkoutNotification
          ? {
              id: Math.random().toString(36).substr(2, 9),
              title: 'Great start',
              message: 'Your memory speed is high!',
              date: new Date().toISOString(),
              isRead: false,
              type: 'success',
            }
          : null;

        const newState = {
          coins: state.coins + sanitizedCoins,
          history: updatedHistory,
          user: {
            ...state.user,
            xp: newXp,
            level: newLevel,
            achievements: newAchievements
          },
          challenges: updatedChallenges,
          unclaimedLevelRewards: newUnclaimedRewards,
          brainStats: normalizeBrainStats(newStats, updatedHistory),
          dailyQuest: finalDailyQuest,
          energy: newEnergy,
          lastEnergyRegenTime: Date.now(),
          weeklyQuest: finalWeeklyQuest,
          notifications: onboardingNotification
            ? [onboardingNotification, ...state.notifications]
            : state.notifications,
          tournament: nextTournament
        };

        if (isSupabaseConfigured && state.user.id) {
          syncUserToSupabase(newState, state.user.id);
        }

        return newState;
        });

        // Server-side validation & authoritative coin/xp/level credit. The local
        // state above is optimistic; reconcile it with the server's response so
        // a tampered local state can't outpace the canonical balance.
        if (isSupabaseConfigured && userIdForSubmit) {
          void submitGameResult({
            gameId,
            score: sanitizedScore,
            coinsEarned: sanitizedCoins,
          })
            .then((response) => {
              if (response?.reason === 'rate_limited') {
                // Server treated this as a duplicate; refund the optimistic credit.
                set((state) => ({
                  coins: Math.max(0, state.coins - sanitizedCoins),
                  user: {
                    ...state.user,
                    xp: Math.max(0, state.user.xp - sanitizedCoins),
                  },
                }));
                return;
              }
              if (typeof response?.coins === 'number') {
                set((state) => ({
                  coins: response.coins!,
                  user: {
                    ...state.user,
                    xp: typeof response.xp === 'number' ? response.xp : state.user.xp,
                    level: typeof response.level === 'number' ? response.level : state.user.level,
                  },
                }));
              }
            })
            .catch((err) => {
              console.error('[Game Submit] sync error:', err);
            });
        }
      },

      upgradePlan: (plan, days) => {
        const state = get();
        const currentPlan = state.plan;
        const currentExpiry = state.planExpiry || Date.now();
        const newExpiry =
          plan !== currentPlan
            ? Date.now() + days * 24 * 60 * 60 * 1000
            : currentExpiry + days * 24 * 60 * 60 * 1000;

        const localId = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const eventName = plan === 'premium' ? 'VIP Tournament Access' : 'VIP Access Event';
        const optimisticTicket: Ticket = {
          id: localId,
          ticketNumber: 0, // placeholder until server issues canonical number
          eventName,
          eventDate: new Date(newExpiry).toISOString(),
          price: 0,
          purchaseDate: new Date().toISOString(),
          userId: state.user.id,
          userName: state.user.firstName,
          isUsed: false,
        };

        const optimisticParticipant: EventParticipant = {
          ticketId: localId,
          ticketNumber: 0,
          userId: state.user.id,
          userName: state.user.firstName,
          userPhoto: state.user.photoUrl,
          purchaseDate: optimisticTicket.purchaseDate,
          isVerified: false,
        };

        const newState = {
          plan,
          planExpiry: newExpiry,
          hp: state.maxHp,
          tickets: [...state.tickets, optimisticTicket],
          eventParticipants: [...state.eventParticipants, optimisticParticipant],
        };

        set(newState);

        if (isSupabaseConfigured) {
          syncUserToSupabase(newState, state.user.id);
        }

        // Reconcile with server-issued ticket id + number, and adopt the
        // server-canonical plan/plan_expiry. The server is now the only writer
        // for those fields — local optimistic values get overwritten here.
        void persistTicket(optimisticTicket, 'plan_upgrade', plan).then((issued) => {
          set((current) => {
            if (!issued) {
              // Server failed: drop the optimistic ticket and revert plan to what it was.
              return {
                plan: currentPlan,
                planExpiry: state.planExpiry,
                tickets: current.tickets.filter((t) => t.id !== localId),
                eventParticipants: current.eventParticipants.filter((p) => p.ticketId !== localId),
              };
            }
            const patch: any = {
              tickets: current.tickets.map((t) =>
                t.id === localId ? { ...t, id: issued.ticketId, ticketNumber: issued.ticketNumber } : t
              ),
              eventParticipants: current.eventParticipants.map((p) =>
                p.ticketId === localId
                  ? { ...p, ticketId: issued.ticketId, ticketNumber: issued.ticketNumber }
                  : p
              ),
            };
            if (issued.plan?.plan) {
              patch.plan = issued.plan.plan;
              patch.planExpiry = issued.plan.planExpiry ?? null;
            }
            return patch;
          });
        });
      },

      buySkin: (skinId, cost) => {
        const { coins, skinInventory } = get();
        // Local pre-check is just for UX (don't even attempt if obviously
        // underfunded). The server is authoritative on price + balance.
        if (coins < cost || skinInventory.includes(skinId)) {
          return false;
        }

        const optimisticCoins = coins - cost;
        const optimisticInventory = [...skinInventory, skinId];
        set({ coins: optimisticCoins, skinInventory: optimisticInventory });

        // Server-validated purchase: server looks up the canonical price
        // (client `cost` is ignored), checks balance against the DB row,
        // and either commits or rejects. We reconcile the local state
        // with whatever the server says.
        if (isSupabaseConfigured) {
          void purchaseSkin(skinId)
            .then((response) => {
              set({
                coins: response.coins,
                skinInventory: response.skinInventory,
              });
            })
            .catch((err) => {
              console.error('[Skins] purchase rejected:', err);
              // Revert the optimistic update so the user sees the real state.
              set((current) => ({
                coins: current.coins + cost,
                skinInventory: current.skinInventory.filter((s) => s !== skinId),
                notifications: [
                  {
                    id: Math.random().toString(36).slice(2, 11),
                    title: 'Purchase rejected',
                    message: err instanceof Error ? err.message : 'Skin purchase failed',
                    date: new Date().toISOString(),
                    isRead: false,
                    type: 'error',
                  },
                  ...current.notifications,
                ],
              }));
            });
        }
        return true;
      },

      equipSkin: (skinId) => set({ activeSkin: skinId }),

      inventory: {
        freezes: 0,
        hints: 0,
        shields: 0
      },

      buyBooster: (type, cost) => {
        const state = get();
        if (state.coins >= cost) {
          const newState = {
            coins: state.coins - cost,
            inventory: {
              ...state.inventory,
              [type]: state.inventory[type] + 1
            }
          };
          set(newState);
          if (isSupabaseConfigured) {
            syncUserToSupabase(newState, get().user.id);
          }
          return true;
        }
        return false;
      },

      consumeBooster: (type) => {
        const state = get();
        if (state.inventory[type] > 0) {
          set({
            inventory: {
              ...state.inventory,
              [type]: state.inventory[type] - 1
            }
          });
          return true;
        }
        return false;
      },

      redeemPromocode: (code) => {
        const { usedPromocodes, coins } = get();
        const normalizedCode = code.trim().toUpperCase();

        if (usedPromocodes.includes(normalizedCode)) {
          return { success: false, message: 'Promocode already used' };
        }

        if (normalizedCode === 'STARTUP') {
          set((state) => {
            const currentPlan = state.plan;
            const currentExpiry = state.planExpiry || Date.now();
            let newExpiry = currentExpiry;
            let newPlan = currentPlan;

            if (currentPlan === 'free') {
              newPlan = 'silver';
              newExpiry = Date.now() + (3 * 24 * 60 * 60 * 1000);
            } else {
              newExpiry = currentExpiry + (3 * 24 * 60 * 60 * 1000);
            }

            return {
              coins: coins + 500,
              plan: newPlan,
              planExpiry: newExpiry,
              usedPromocodes: [...usedPromocodes, normalizedCode]
            };
          });
          return { success: true, message: 'Startup Bonus: 500 Coins + 3 Days Silver!' };
        }

        return { success: false, message: 'Invalid promocode' };
      },

      claimDailyLoginReward: () => {
        const { lastDailyRewardDate, dailyRewardStreak, user, plan, planExpiry } = get();
        const today = new Date().toISOString().split('T')[0];

        if (lastDailyRewardDate === today) {
          return { success: false, reward: { coins: 0, gems: 0, xp: 0 } };
        }

        let newStreak = 1;
        let streakPreservedByVip = false;

        if (lastDailyRewardDate) {
          const gapInDays = getDateDiffInDays(lastDailyRewardDate, today);

          if (gapInDays === 1) {
            newStreak = dailyRewardStreak + 1;
          } else if (gapInDays === 2 && isVipDailyRewardGraceActive(plan, planExpiry)) {
            newStreak = dailyRewardStreak + 1;
            streakPreservedByVip = true;
          }
        }

        const analyticsRewardMeta = getAnalyticsRewardForStreak(newStreak);
        const reward = {
          coins: 0,
          gems: 0,
          xp: 0,
          ...analyticsRewardMeta,
          streakPreservedByVip,
        } as {
          coins: number;
          gems: number;
          xp: number;
        } & {
          analyticsDay: number;
          analyticsTitle: string;
          analyticsDescription: string;
          nextUnlockDay: number | null;
          isNewUnlock: boolean;
          streakPreservedByVip: boolean;
        };

        const newState = {
          user,
          dailyRewardStreak: newStreak,
          lastDailyRewardDate: today,
        };

        set(newState);

        if (isSupabaseConfigured && user.id) {
          syncUserToSupabase({ ...get(), ...newState }, user.id);
        }

        return { success: true, reward };
      },

      joinTournament: (paymentMethod) => {
        const state = get();
        const schedule = getTournamentSchedule();

        if (!schedule.isOpen) {
          return { success: false, message: 'Турнир тек жұма мен жексенбі аралығында ашық болады.' };
        }

        if (state.tournament.weekKey === schedule.weekKey && state.tournament.joinedAt) {
          return { success: false, message: 'Сіз осы аптаның турниріне кіріп қойғансыз.' };
        }

        if (paymentMethod === 'vip') {
          if (!isVipTournamentEligible(state.plan)) {
            return { success: false, message: 'VIP тегін кіру premium жоспарымен ғана ашылады.' };
          }

          if (state.tournament.vipFreeEntryWeek === schedule.weekKey) {
            return { success: false, message: 'Осы аптадағы VIP тегін кіру әлдеқашан қолданылған.' };
          }
        }

        const previousTournament = state.tournament;
        const newTournament = {
          weekKey: schedule.weekKey,
          joinedAt: new Date().toISOString(),
          paymentMethod,
          games: [],
          score: 0,
          vipFreeEntryWeek:
            paymentMethod === 'vip' ? schedule.weekKey : state.tournament.vipFreeEntryWeek,
        };

        set({ tournament: newTournament });

        // Server-side gate: VIP-tier check + once-per-week dedup happen in the
        // backend with service-role auth. If the server rejects, revert the
        // optimistic local join and surface the reason.
        if (isSupabaseConfigured && state.user.id) {
          void joinTournamentRecord(paymentMethod)
            .catch((err) => {
              console.error('[Tournaments] Join rejected by server:', err);
              const message = err instanceof Error ? err.message : 'Tournament join rejected';
              set((current) => ({
                tournament: previousTournament,
                notifications: [
                  {
                    id: Math.random().toString(36).slice(2, 11),
                    title: 'Tournament join rejected',
                    message,
                    date: new Date().toISOString(),
                    isRead: false,
                    type: 'error',
                  },
                  ...current.notifications,
                ],
              }));
            });
        }

        if (paymentMethod === 'vip') {
          return { success: true, message: 'VIP тегін кіру белсендірілді. Енді 3 ойын ойнап, нәтиже жинаңыз.' };
        }

        return {
          success: true,
          message: `${TOURNAMENT_ENTRY_FEE} ${paymentMethod === 'stars' ? 'Stars' : 'TON'} арқылы кіру дайын. Енді 3 ойын ойнаңыз.`,
        };
      },

      refreshChallenges: () => {
        const today = new Date().toISOString().split('T')[0];
        const { lastChallengeDate } = get();
        if (lastChallengeDate !== today) {
          set({
            challenges: generateDailyChallenges(),
            lastChallengeDate: today
          });
        }
      },

      claimChallengeReward: (challengeId) => set((state) => {
        const challenge = state.challenges.find(c => c.id === challengeId);
        if (!challenge || challenge.isClaimed || challenge.current < challenge.target) return state;

        return {
          coins: state.coins + challenge.reward,
          challenges: state.challenges.map(c => c.id === challengeId ? { ...c, isClaimed: true } : c
          )
        };
      }),

      watchAd: (reward) => {
        // Optimistic local credit so the UI gives instant feedback. The server
        // is authoritative on the actual amount and the daily cap (5/day,
        // 10c each) — we reconcile from the response. The `reward` arg is now
        // ignored on the wire; it stays in the signature for callers' UI use.
        set((state) => ({ coins: state.coins + reward }));

        if (isSupabaseConfigured) {
          void grantAdReward()
            .then((response) => {
              if (typeof response.coins === 'number') {
                set({ coins: response.coins });
              }
            })
            .catch((err) => {
              // Roll back optimistic credit and surface the reason. Common
              // case: daily cap (HTTP 429) — we revert the visible amount.
              set((current) => ({
                coins: Math.max(0, current.coins - reward),
                notifications: [
                  {
                    id: Math.random().toString(36).slice(2, 11),
                    title: 'Reward declined',
                    message: err instanceof Error ? err.message : 'Ad reward unavailable',
                    date: new Date().toISOString(),
                    isRead: false,
                    type: 'error',
                  },
                  ...current.notifications,
                ],
              }));
            });
        }
      },

      claimSocialReward: (taskId) => set((state) => {
        const task = state.socialTasks.find(t => t.id === taskId);
        if (!task || task.isClaimed) return state;

        return {
          gems: (state.gems || 0) + task.reward,
          socialTasks: state.socialTasks.map(t => t.id === taskId ? { ...t, isClaimed: true } : t
          )
        };
      }),

      addCoins: (amount) => {
        const newState = { coins: (get().coins || 0) + amount };
        set(newState);
        if (isSupabaseConfigured) {
          syncUserToSupabase(newState, get().user.id);
        }
      },

      addFec: (amount) => set((state) => ({
        fecBalance: (state.fecBalance || 0) + amount
      })),

      spendCoins: (amount) => {
        const { coins } = get();
        if (coins >= amount) {
          const newState = { coins: coins - amount };
          set(newState);
          if (isSupabaseConfigured) {
            syncUserToSupabase(newState, get().user.id);
          }
          return true;
        }
        return false;
      },
      claimLevelReward: (level) => {
        const previous = get();
        // Optimistic update: drop from unclaimed list and add the canonical
        // 100c + 5g locally. Server validates user.level >= claimedLevel and
        // dedups via coin_transactions metadata; on rejection we revert.
        set({
          unclaimedLevelRewards: previous.unclaimedLevelRewards.filter(l => l !== level),
          coins: previous.coins + 100,
          gems: (previous.gems || 0) + 5,
        });

        if (isSupabaseConfigured) {
          void grantLevelReward(level)
            .then((response) => {
              if (typeof response.coins === 'number' && typeof response.gems === 'number') {
                set({ coins: response.coins, gems: response.gems });
              }
            })
            .catch((err) => {
              console.error('[Rewards] level reward rejected:', err);
              // Revert: put the level back in unclaimed and undo the credit.
              set((current) => ({
                unclaimedLevelRewards: current.unclaimedLevelRewards.includes(level)
                  ? current.unclaimedLevelRewards
                  : [...current.unclaimedLevelRewards, level],
                coins: Math.max(0, current.coins - 100),
                gems: Math.max(0, (current.gems || 0) - 5),
                notifications: [
                  {
                    id: Math.random().toString(36).slice(2, 11),
                    title: 'Level reward declined',
                    message: err instanceof Error ? err.message : 'Reward unavailable',
                    date: new Date().toISOString(),
                    isRead: false,
                    type: 'error',
                  },
                  ...current.notifications,
                ],
              }));
            });
        }
      },
      decrementHp: () => {
        const { hp } = get();
        if (hp > 0) {
          set({ hp: hp - 1 });
          return true;
        }
        return false;
      },
      restoreHp: (amount) => set((state) => ({
        hp: Math.min(state.hp + amount, state.maxHp)
      })),

      addFeedback: (feedback) => {
        const nextFeedback = {
          ...feedback,
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString(),
          status: 'new' as const
        };

        set((state) => ({
          feedbacks: [
            ...state.feedbacks,
            nextFeedback
          ]
        }));

        void persistFeedbackEntry(feedback);
      },

      updateFeedbackStatus: (id, status) => set((state) => ({
        feedbacks: state.feedbacks.map(f => f.id === id ? { ...f, status } : f
        )
      })),

      replyToFeedback: (feedbackId, reply) => set((state) => {
        const feedback = state.feedbacks.find(f => f.id === feedbackId);
        if (!feedback) return state;

        const newNotification: Notification = {
          id: Math.random().toString(36).substr(2, 9),
          title: 'Админ жауабы',
          message: `"${feedback.text.substring(0, 20)}..." хабарламаңызға жауаб: ${reply}`,
          date: new Date().toISOString(),
          isRead: false,
          type: 'success'
        };

        return {
          feedbacks: state.feedbacks.map(f => f.id === feedbackId ? { ...f, status: 'resolved', adminReply: reply, replyDate: new Date().toISOString() } : f
          ),
          notifications: [newNotification, ...state.notifications]
        };
      }),

      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n
        )
      })),
      updateBrainStats: (gameId, score) => set((state) => {
        const newStats = { ...state.brainStats };
        const increment = Math.min(5, Math.floor(score / 100));

        switch (gameId) {
          case 'schulte':
          case 'odd_one':
          case 'agent_spot':
            newStats.focus = Math.min(100, newStats.focus + increment);
            newStats.speed = Math.min(100, newStats.speed + increment);
            break;
          case 'memory':
          case 'pairs':
          case 'agent_sequence':
            newStats.memory = Math.min(100, newStats.memory + increment);
            newStats.logic = Math.min(100, newStats.logic + increment);
            break;
          case 'math':
          case 'code_breaker':
            newStats.logic = Math.min(100, newStats.logic + increment);
            break;
          case 'stroop':
            newStats.flexibility = Math.min(100, newStats.flexibility + increment);
            break;
        }

        return { brainStats: normalizeBrainStats(newStats, state.history) };
      }),

      addNotification: (notification) => {
        const t = notification.type;
        if (t === 'success' || t === 'warning' || t === 'error') {
          hapticFeedback.notification(t);
        } else {
          hapticFeedback.impact('light');
        }
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: Math.random().toString(36).substr(2, 9),
              date: new Date().toISOString(),
              isRead: false,
            },
            ...state.notifications,
          ],
        }));
      },

      markAllNotificationsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true }))
      })),

      clearNotifications: () => set({ notifications: [] }),

      purchaseTicket: (eventName, eventDate, price) => {
        const state = get();
        if (state.coins < price) {
          return { success: false };
        }

        const localId = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const optimisticTicket: Ticket = {
          id: localId,
          ticketNumber: 0,
          eventName,
          eventDate,
          price,
          purchaseDate: new Date().toISOString(),
          userId: state.user.id,
          userName: state.user.firstName,
          isUsed: false,
        };

        const optimisticParticipant: EventParticipant = {
          ticketId: localId,
          ticketNumber: 0,
          userId: state.user.id,
          userName: state.user.firstName,
          userPhoto: state.user.photoUrl,
          purchaseDate: optimisticTicket.purchaseDate,
          isVerified: false,
        };

        set((s) => ({
          coins: s.coins - price,
          tickets: [...s.tickets, optimisticTicket],
          eventParticipants: [...s.eventParticipants, optimisticParticipant],
        }));

        void persistTicket(optimisticTicket, 'ticket_purchase').then((issued) => {
          set((current) => {
            if (!issued) {
              // Refund and remove optimistic entries on server failure.
              return {
                coins: current.coins + price,
                tickets: current.tickets.filter((t) => t.id !== localId),
                eventParticipants: current.eventParticipants.filter((p) => p.ticketId !== localId),
              };
            }
            return {
              tickets: current.tickets.map((t) =>
                t.id === localId ? { ...t, id: issued.ticketId, ticketNumber: issued.ticketNumber } : t
              ),
              eventParticipants: current.eventParticipants.map((p) =>
                p.ticketId === localId
                  ? { ...p, ticketId: issued.ticketId, ticketNumber: issued.ticketNumber }
                  : p
              ),
            };
          });
        });

        return { success: true };
      },

      verifyTicket: (ticketNumber) => {
        const state = get();
        const ticket = state.tickets.find(t => t.ticketNumber === ticketNumber);

        if (!ticket || ticket.isUsed) {
          return false;
        }

        set((state) => ({
          tickets: state.tickets.map(t => t.ticketNumber === ticketNumber ? { ...t, isUsed: true } : t
          ),
          eventParticipants: state.eventParticipants.map(p => p.ticketNumber === ticketNumber ? { ...p, isVerified: true } : p
          )
        }));

        return true;
      },

      getEventParticipants: () => {
        return get().eventParticipants;
      },

      updateTicketsEventDate: (newDateISO) => set((state) => {
        const allSame = state.tickets.every(t => t.eventDate === newDateISO);
        if (allSame) return state;
        return {
          tickets: state.tickets.map(t => ({ ...t, eventDate: newDateISO }))
        };
      }),

      setPromotionEndISO: (newDateISO) => set((state) => {
        if (state.promotionEndISO === newDateISO) return state;
        return { promotionEndISO: newDateISO };
      }),

      extendPromotionEnd: (days, hour) => set((state) => {
        const base = state.promotionEndISO ? new Date(state.promotionEndISO) : new Date();
        const extended = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
        if (typeof hour === 'number') {
          extended.setHours(hour, 0, 0, 0);
        }
        const newISO = extended.toISOString();
        const ticketsAllSame = state.tickets.every(t => t.eventDate === newISO);
        return {
          promotionEndISO: newISO,
          tickets: ticketsAllSame ? state.tickets : state.tickets.map(t => ({ ...t, eventDate: newISO }))
        };
      }),

      checkDailyQuestComplete: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        
        const safeDailyQuest = normalizeDailyQuest(state.dailyQuest);

        if (safeDailyQuest.lastResetDate !== today) {
          set({
            dailyQuest: {
              ...DEFAULT_DAILY_QUEST,
              lastResetDate: today
            }
          });
          return false;
        }
        
        const uniqueGames = new Set(safeDailyQuest.gamesPlayed);
        const isComplete = uniqueGames.size >= 3;
        
        if (isComplete && !safeDailyQuest.isCompleted) {
          set((s) => ({
            dailyQuest: { ...normalizeDailyQuest(s.dailyQuest), isCompleted: true }
          }));
          return true;
        }
        
        return isComplete;
      },

      claimDailyQuestReward: () => set((state) => {
        const safeDailyQuest = normalizeDailyQuest(state.dailyQuest);
        if (!safeDailyQuest.isCompleted || safeDailyQuest.isClaimed) return state;
        
        const uniqueGames = new Set(safeDailyQuest.gamesPlayed);
        if (uniqueGames.size < 3) return state;
        
        return {
          coins: state.coins + 50,
          dailyQuest: { ...safeDailyQuest, isClaimed: true }
        };
      }),

      logout: () => set(() => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('focus-storage-v17');
        }

        return {
          language: 'ru',
          soundEnabled: true,
          theme: 'claude',
          brainStats: normalizeBrainStats(DEFAULT_BRAIN_STATS, []),
          user: {
            id: 0,
            firstName: 'Guest',
            lastName: '',
            username: '',
            photoUrl: '',
            level: 1,
            xp: 0,
            achievements: []
          },
          coins: 100,
          gems: 0,
          fecBalance: 0,
          skinInventory: ['default'],
          activeSkin: 'default',
          unclaimedLevelRewards: [],
          usedPromocodes: [],
          dailyGoalMinutes: 10,
          streak: 0,
          history: [],
          lastDailyRewardDate: null,
          challenges: generateDailyChallenges(),
          lastChallengeDate: new Date().toISOString().split('T')[0],
          socialTasks: initialSocialTasks,
          feedbacks: [],
          notifications: [],
          plan: 'free',
          planExpiry: null,
          hp: 100,
          maxHp: 100,
          dailyRewardStreak: 0,
          tickets: [],
          eventParticipants: [],
          promotionEndISO: '2026-04-26T08:00:00.000Z',
          tournament: { ...initialState.tournament },
          dailyQuest: { ...DEFAULT_DAILY_QUEST },
          inventory: { freezes: 0, hints: 0, shields: 0 },
          weeklyQuest: { ...DEFAULT_WEEKLY_QUEST },
          energy: 100,
          maxEnergy: 100,
          lastEnergyRegenTime: Date.now(),
          streakProtection: 0,
          mysteryBoxAvailable: true,
          mysteryBoxPrice: 500
        };
      }),

      consumeEnergy: (amount) => {
        const state = get();
        if (state.energy < amount) return false;
        set({ energy: state.energy - amount, lastEnergyRegenTime: Date.now() });
        return true;
      },

      addEnergy: (amount) => set((state) => ({
        energy: Math.min(state.maxEnergy, state.energy + amount),
        lastEnergyRegenTime: Date.now()
      })),

      buyEnergyPack: () => {
        const state = get();
        if (state.coins < 100) return false;
        set((s) => ({
          coins: s.coins - 100,
          energy: Math.min(s.maxEnergy, s.energy + 20)
        }));
        return true;
      },

      getEnergyRegenRate: () => {
        const plan = get().plan;
        return plan === 'premium' ? 2 : 1;
      },

      updateEnergyRegen: () => {
        const state = get();
        if (state.energy >= state.maxEnergy) return;

        const regenRate = state.getEnergyRegenRate();
        const now = Date.now();
        const elapsed = (now - (state.lastEnergyRegenTime || now)) / 1000;
        const regenPerSecond = regenRate / 300;

        const regenAmount = Math.floor(elapsed * regenPerSecond);
        if (regenAmount > 0) {
          set((s) => ({
            energy: Math.min(s.maxEnergy, s.energy + regenAmount),
            lastEnergyRegenTime: now
          }));
        }
      },

      useStreakProtection: () => {
        const state = get();
        if (state.streakProtection <= 0) return false;
        set((s) => ({
          streakProtection: s.streakProtection - 1,
          dailyRewardStreak: s.dailyRewardStreak
        }));
        return true;
      },

      buyStreakProtection: () => {
        const state = get();
        if (state.coins < 200) return false;
        if (state.streakProtection >= 3) return false;
        set((s) => ({
          coins: s.coins - 200,
          streakProtection: s.streakProtection + 1
        }));
        return true;
      },

      openMysteryBox: () => {
        const state = get();
        if (!state.mysteryBoxAvailable || state.coins < state.mysteryBoxPrice) return null;

        const rand = Math.random();
        const mysteryBox: any = { id: Date.now().toString() };
        const price = state.mysteryBoxPrice;

        if (rand > 0.9) {
          mysteryBox.type = 'skin';
          mysteryBox.amount = 1;
          mysteryBox.skinId = 'neon_blue';
          set((s) => ({ coins: s.coins - price }));
        } else if (rand > 0.75) {
          mysteryBox.type = 'crystals';
          mysteryBox.amount = Math.floor(Math.random() * 10) + 5;
          set((s) => ({ coins: s.coins - price, gems: s.gems + mysteryBox.amount }));
        } else if (rand > 0.6) {
          mysteryBox.type = 'booster';
          mysteryBox.amount = 3;
          mysteryBox.boosterType = 'hints';
          set((s) => ({ coins: s.coins - price, inventory: { ...s.inventory, hints: s.inventory.hints + 3 } }));
        } else if (rand > 0.4) {
          mysteryBox.type = 'fec';
          mysteryBox.amount = Number((Math.random() * 1.5 + 0.5).toFixed(2));
          set((s) => ({ coins: s.coins - price, fecBalance: s.fecBalance + mysteryBox.amount }));
        } else {
          mysteryBox.type = 'coins';
          mysteryBox.amount = Math.floor(Math.random() * 200) + 100;
          set((s) => ({ coins: s.coins - price + mysteryBox.amount }));
        }

        return mysteryBox;
      },

      setMysteryBoxAvailable: (available) => set({ mysteryBoxAvailable: available }),

      updateWeeklyQuest: () => {
        const state = get();
        const now = new Date();
        const weekNumber = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
        const safeWeeklyQuest = normalizeWeeklyQuest(state.weeklyQuest);
        const lastResetWeek = safeWeeklyQuest.lastResetDate 
          ? Math.floor(new Date(safeWeeklyQuest.lastResetDate).getTime() / (7 * 24 * 60 * 60 * 1000))
          : -1;

        if (weekNumber !== lastResetWeek) {
          set({
            weeklyQuest: {
              ...DEFAULT_WEEKLY_QUEST,
              lastResetDate: new Date().toISOString()
            }
          });
        }
      },

      claimWeeklyQuestMilestone: (milestoneIndex) => {
        const state = get();
        const safeWeeklyQuest = normalizeWeeklyQuest(state.weeklyQuest);
        const milestone = safeWeeklyQuest.milestones[milestoneIndex];
        
        if (!milestone || milestone.isClaimed || safeWeeklyQuest.gamesPlayed < milestone.gamesRequired) {
          return false;
        }

        set((s) => {
          const currentWeeklyQuest = normalizeWeeklyQuest(s.weeklyQuest);
          const newMilestones = [...currentWeeklyQuest.milestones];
          newMilestones[milestoneIndex] = { ...newMilestones[milestoneIndex], isClaimed: true };

          return {
            coins: s.coins + milestone.reward.coins,
            gems: s.gems + milestone.reward.crystals,
            energy: Math.min(s.maxEnergy, s.energy + milestone.reward.energy),
            weeklyQuest: { ...currentWeeklyQuest, milestones: newMilestones }
          };
        });

        return true;
      },
    }),
    {
      name: `focus-app-v31-prod`,
      version: 1,
      // One-shot bump so existing users land on the new Claude theme on first
      // load post-deploy. Preserve every other field — only `theme` is
      // overridden, and only when the persisted state pre-dates v1.
      migrate: (persistedState: unknown, version: number) => {
        if (version < 1 && persistedState && typeof persistedState === 'object') {
          return { ...(persistedState as object), theme: 'claude' };
        }
        return persistedState as object;
      },
      storage: createJSONStorage(() => telegramStorage),
      merge: (persistedState, currentState) => {
        const mergedState = {
          ...currentState,
          ...(persistedState as object),
        } as any;

        return {
          ...mergedState,
          brainStats: normalizeBrainStats(mergedState.brainStats, mergedState.history || []),
          dailyQuest: normalizeDailyQuest(mergedState.dailyQuest),
          weeklyQuest: normalizeWeeklyQuest(mergedState.weeklyQuest),
          tournament: normalizeTournamentState(mergedState.tournament),
        };
      },
    }
  )
);
