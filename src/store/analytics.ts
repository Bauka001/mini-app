import { calculateBrainScoreMetrics } from '../utils/brainScore';
import type { BrainStats, UserState } from './useStore';

export const DEFAULT_BRAIN_STATS: BrainStats = {
  focus: 20,
  memory: 20,
  logic: 20,
  speed: 20,
  flexibility: 20,
};

export type AnalyticsCategoryKey = 'focus' | 'memory' | 'logic' | 'speed' | 'flexibility';

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

export const VIP_ANALYTICS_DAY_RANGE = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const clampAnalyticsMetric = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)));

const toSafeNumber = (value: string | number | undefined | null) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : 0;
};

const buildAnalyticsDateLabel = (value: Date) =>
  `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}`;

export function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const normalizeBrainStats = (
  brainStats?: Partial<BrainStats> | null,
  history: UserState['history'] = []
): BrainStats => {
  const safeStats: BrainStats = {
    focus: Number.isFinite(Number(brainStats?.focus)) ? Number(brainStats?.focus) : DEFAULT_BRAIN_STATS.focus,
    memory: Number.isFinite(Number(brainStats?.memory)) ? Number(brainStats?.memory) : DEFAULT_BRAIN_STATS.memory,
    logic: Number.isFinite(Number(brainStats?.logic)) ? Number(brainStats?.logic) : DEFAULT_BRAIN_STATS.logic,
    speed: Number.isFinite(Number(brainStats?.speed)) ? Number(brainStats?.speed) : DEFAULT_BRAIN_STATS.speed,
    flexibility: Number.isFinite(Number(brainStats?.flexibility))
      ? Number(brainStats?.flexibility)
      : DEFAULT_BRAIN_STATS.flexibility,
  };

  return {
    ...safeStats,
    ...calculateBrainScoreMetrics(history),
  };
};

export const applyBrainStatProgress = (
  currentStats: UserState['brainStats'],
  gameId: string,
  increment: number
): UserState['brainStats'] => {
  const nextStats = { ...currentStats };

  switch (gameId) {
    case 'schulte':
    case 'odd_one':
    case 'odd_one_out':
      nextStats.focus = Math.min(100, nextStats.focus + increment);
      nextStats.speed = Math.min(100, nextStats.speed + increment);
      break;
    case 'memory':
    case 'pairs':
      nextStats.memory = Math.min(100, nextStats.memory + increment);
      nextStats.logic = Math.min(100, nextStats.logic + increment);
      break;
    case 'math':
    case '2048':
    case 'code_breaker':
      nextStats.logic = Math.min(100, nextStats.logic + increment);
      nextStats.speed = Math.min(100, nextStats.speed + increment);
      break;
    case 'stroop':
    case 'tetris':
      nextStats.flexibility = Math.min(100, nextStats.flexibility + increment);
      nextStats.focus = Math.min(100, nextStats.focus + increment);
      break;
    default:
      break;
  }

  return nextStats;
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
