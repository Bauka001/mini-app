import type { MysteryBox, UserState } from './useStore';
import { toDateKey } from './analytics';

export const DEFAULT_DAILY_QUEST: UserState['dailyQuest'] = {
  id: 'daily_quest_3games',
  gamesPlayed: [],
  isCompleted: false,
  isClaimed: false,
  lastResetDate: null,
};

export const DEFAULT_WEEKLY_QUEST: UserState['weeklyQuest'] = {
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

export const DAILY_ANALYTICS_REWARDS = [
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

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

export const normalizeDailyQuest = (
  dailyQuest?: Partial<UserState['dailyQuest']> | null
): UserState['dailyQuest'] => ({
  ...DEFAULT_DAILY_QUEST,
  ...(dailyQuest || {}),
  gamesPlayed: Array.isArray(dailyQuest?.gamesPlayed)
    ? dailyQuest.gamesPlayed.filter((gameId): gameId is string => typeof gameId === 'string')
    : [],
});

export const normalizeWeeklyQuest = (
  weeklyQuest?: Partial<UserState['weeklyQuest']> | null
): UserState['weeklyQuest'] => ({
  ...DEFAULT_WEEKLY_QUEST,
  ...(weeklyQuest || {}),
  milestones: Array.isArray(weeklyQuest?.milestones) && weeklyQuest.milestones.length > 0
    ? weeklyQuest.milestones.map((milestone, index) => ({
        ...DEFAULT_WEEKLY_QUEST.milestones[Math.min(index, DEFAULT_WEEKLY_QUEST.milestones.length - 1)],
        ...(milestone || {}),
        reward: {
          ...DEFAULT_WEEKLY_QUEST.milestones[Math.min(index, DEFAULT_WEEKLY_QUEST.milestones.length - 1)].reward,
          ...(milestone?.reward || {}),
        },
      }))
    : DEFAULT_WEEKLY_QUEST.milestones,
});

export const getWeekKeyMonday = (now = new Date()) => {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  const diff = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - diff);
  return toDateKey(monday);
};

export const getDateDiffInDays = (fromDateKey: string, toDateKeyValue: string) => {
  const from = new Date(`${fromDateKey}T00:00:00`);
  const to = new Date(`${toDateKeyValue}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
};

export const isVipDailyRewardGraceActive = (
  plan: UserState['plan'],
  planExpiry: UserState['planExpiry']
) => plan === 'premium' && (!planExpiry || planExpiry > Date.now());

export const getAnalyticsRewardForStreak = (streak: number) => {
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

export const buildDailyQuestAfterGame = (
  dailyQuest: UserState['dailyQuest'],
  gameId: string,
  todayKey: string
) => {
  const safeDailyQuest = normalizeDailyQuest(dailyQuest);
  const needsReset = safeDailyQuest.lastResetDate !== todayKey;
  const newGamesPlayed = needsReset ? [gameId] : [...safeDailyQuest.gamesPlayed, gameId];
  const uniqueGames = new Set(newGamesPlayed);
  const isNowComplete = uniqueGames.size >= 3;

  if (needsReset) {
    return {
      id: DEFAULT_DAILY_QUEST.id,
      gamesPlayed: [gameId],
      isCompleted: isNowComplete,
      isClaimed: false,
      lastResetDate: todayKey,
    };
  }

  return {
    ...safeDailyQuest,
    gamesPlayed: [...safeDailyQuest.gamesPlayed, gameId],
    isCompleted: safeDailyQuest.isCompleted || isNowComplete,
  };
};

export const buildWeeklyChallengeAfterGame = (
  weeklyChallenge: UserState['weeklyChallenge'],
  todayKey: string,
  currentWeekKey: string
): UserState['weeklyChallenge'] => {
  const baseWeeklyChallenge =
    weeklyChallenge?.weekKey === currentWeekKey
      ? weeklyChallenge
      : { weekKey: currentWeekKey, dayProgress: {}, completedDays: [], isClaimed: false, reward: { coins: 250 } };

  const nextDayProgress = {
    ...(baseWeeklyChallenge.dayProgress || {}),
    [todayKey]: (baseWeeklyChallenge.dayProgress?.[todayKey] || 0) + 1,
  };

  return {
    ...baseWeeklyChallenge,
    weekKey: currentWeekKey,
    dayProgress: nextDayProgress,
    completedDays: Object.keys(nextDayProgress)
      .filter((key) => (nextDayProgress[key] || 0) >= 3)
      .sort(),
    reward: baseWeeklyChallenge.reward || { coins: 250 },
  };
};

export const buildWeeklyQuestAfterGame = (
  weeklyQuest: UserState['weeklyQuest'],
  now: Date
): UserState['weeklyQuest'] => {
  const safeWeeklyQuest = normalizeWeeklyQuest(weeklyQuest);
  const weekNumber = Math.floor(now.getTime() / WEEK_IN_MS);
  const lastResetWeek = safeWeeklyQuest.lastResetDate
    ? Math.floor(new Date(safeWeeklyQuest.lastResetDate).getTime() / WEEK_IN_MS)
    : -1;

  if (weekNumber !== lastResetWeek) {
    return {
      ...DEFAULT_WEEKLY_QUEST,
      gamesPlayed: 1,
      lastResetDate: now.toISOString(),
    };
  }

  return {
    ...safeWeeklyQuest,
    gamesPlayed: safeWeeklyQuest.gamesPlayed + 1,
  };
};

type DailyLoginReward = {
  coins: number;
  gems: number;
  xp: number;
  tournamentTickets: number;
  analyticsDay: number;
  analyticsTitle: string;
  analyticsDescription: string;
  nextUnlockDay: number | null;
  isNewUnlock: boolean;
  streakPreservedByVip: boolean;
};

type DailyLoginRewardState = Pick<
  UserState,
  'dailyRewardStreak' | 'plan' | 'planExpiry' | 'coins' | 'tournamentTickets'
>;

type DailyLoginRewardStatePatch = Pick<UserState, 'coins' | 'tournamentTickets' | 'dailyRewardStreak'>;

export const buildClaimDailyLoginRewardResult = (
  state: DailyLoginRewardState,
  today: string
):
  | {
      success: false;
      reward: { coins: 0; gems: 0; xp: 0; tournamentTickets: 0 };
    }
  | {
      success: true;
      reward: DailyLoginReward;
      statePatch: DailyLoginRewardStatePatch;
    } => {
  const lastDailyRewardDate = state.dailyRewardStreak?.lastClaimDate || null;

  if (lastDailyRewardDate === today) {
    return { success: false, reward: { coins: 0, gems: 0, xp: 0, tournamentTickets: 0 } };
  }

  let newStreak = 1;
  let streakPreservedByVip = false;
  const previousCount = state.dailyRewardStreak?.count || 0;

  if (lastDailyRewardDate) {
    const gapInDays = getDateDiffInDays(lastDailyRewardDate, today);

    if (gapInDays === 1) {
      newStreak = previousCount + 1;
    } else if (gapInDays === 2 && isVipDailyRewardGraceActive(state.plan, state.planExpiry)) {
      newStreak = previousCount + 1;
      streakPreservedByVip = true;
    }
  }

  const updatedClaimedDatesBase = Array.isArray(state.dailyRewardStreak?.claimedDates)
    ? state.dailyRewardStreak.claimedDates
    : [];
  const updatedClaimedDates = [...updatedClaimedDatesBase.filter((key) => key !== today), today].slice(-30);

  const streakCoinsReward = newStreak === 7 ? 200 : 0;
  const streakTicketReward = newStreak === 14 ? 1 : 0;
  const analyticsRewardMeta = getAnalyticsRewardForStreak(newStreak);

  return {
    success: true,
    reward: {
      coins: streakCoinsReward,
      gems: 0,
      xp: 0,
      tournamentTickets: streakTicketReward,
      ...analyticsRewardMeta,
      streakPreservedByVip,
    },
    statePatch: {
      coins: state.coins + streakCoinsReward,
      tournamentTickets: state.tournamentTickets + streakTicketReward,
      dailyRewardStreak: {
        count: newStreak,
        lastClaimDate: today,
        claimedDates: updatedClaimedDates,
      },
    },
  };
};

type MysteryBoxState = Pick<
  UserState,
  'mysteryBoxAvailable' | 'coins' | 'mysteryBoxPrice' | 'gems' | 'fecBalance' | 'inventory'
>;

export const rollMysteryBoxOutcome = (
  state: MysteryBoxState,
  randomValue: number,
  bonusRandomValue: number
): { mysteryBox: MysteryBox | null; statePatch?: Partial<UserState> } => {
  if (!state.mysteryBoxAvailable || state.coins < state.mysteryBoxPrice) {
    return { mysteryBox: null };
  }

  const price = state.mysteryBoxPrice;

  if (randomValue > 0.9) {
    return {
      mysteryBox: {
        id: Date.now().toString(),
        type: 'skin',
        amount: 1,
        skinId: 'neon_blue',
      },
      statePatch: { coins: state.coins - price },
    };
  }

  if (randomValue > 0.75) {
    const amount = Math.floor(bonusRandomValue * 10) + 5;
    return {
      mysteryBox: {
        id: Date.now().toString(),
        type: 'crystals',
        amount,
      },
      statePatch: { coins: state.coins - price, gems: state.gems + amount },
    };
  }

  if (randomValue > 0.6) {
    return {
      mysteryBox: {
        id: Date.now().toString(),
        type: 'booster',
        amount: 3,
        boosterType: 'hints',
      },
      statePatch: {
        coins: state.coins - price,
        inventory: { ...state.inventory, hints: state.inventory.hints + 3 },
      },
    };
  }

  if (randomValue > 0.4) {
    const amount = Number((bonusRandomValue * 1.5 + 0.5).toFixed(2));
    return {
      mysteryBox: {
        id: Date.now().toString(),
        type: 'fec',
        amount,
      },
      statePatch: { coins: state.coins - price, fecBalance: state.fecBalance + amount },
    };
  }

  const amount = Math.floor(bonusRandomValue * 200) + 100;
  return {
    mysteryBox: {
      id: Date.now().toString(),
      type: 'coins',
      amount,
    },
    statePatch: { coins: state.coins - price + amount },
  };
};
