type BrainScoreHistoryEntry = {
  gameId: string;
  score: string | number;
  timestamp?: number;
  coinsEarned?: number;
};

type DailyWorkoutSession = {
  date: string;
  startedAt: number;
  gameIds: string[];
};

export type BrainScoreMetrics = {
  combinedScore: number;
  brainAge: number;
  brainAgeColor: 'green' | 'yellow' | 'red';
  dailyWorkoutPlayed: boolean;
  dailyWorkoutModifier: number;
  contributions: Record<string, number>;
};

const BASE_BRAIN_SCORE = 100;
const MIN_BRAIN_SCORE = 50;
const MAX_BRAIN_SCORE = 300;
const DAILY_WORKOUT_BOOST = 1.1;
const DAILY_WORKOUT_DECAY = 0.95;
const DAILY_WORKOUT_STORAGE_KEY = 'focus-daily-workout-v1';
const SCHULTE_TIME_LIMIT = 60;

const TRACKED_GAME_IDS = [
  'memory',
  'schulte',
  'math',
  'pairs',
  'odd_one_out',
  'stroop',
  'tetris',
  '2048',
] as const;

const GAME_MAX_SCORES: Record<(typeof TRACKED_GAME_IDS)[number], number> = {
  memory: 100,
  schulte: 60,
  math: 10,
  pairs: 150,
  odd_one_out: 300,
  stroop: 10,
  tetris: 3000,
  '2048': 10000,
};

const DAILY_WORKOUT_HISTORY_IDS: Record<string, string[]> = {
  memory: ['memory'],
  schulte: ['schulte'],
  math: ['math'],
  pairs: ['pairs'],
  'odd-one': ['odd_one_out'],
  odd_one_out: ['odd_one_out'],
  stroop: ['stroop'],
  tetris: ['tetris'],
  '2048': ['2048'],
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const safeNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const normalizeGameId = (gameId: string) => {
  if (gameId === 'odd_one' || gameId === 'odd-one') return 'odd_one_out';
  if (gameId === 'odd_one_out') return 'odd_one_out';
  if (gameId === 'odd_one_out_level') return null;
  if (gameId === '2048') return '2048';

  return TRACKED_GAME_IDS.includes(gameId as (typeof TRACKED_GAME_IDS)[number])
    ? (gameId as (typeof TRACKED_GAME_IDS)[number])
    : null;
};

const extractNumber = (value: string | number) => {
  if (typeof value === 'number') return value;
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

export const parseGameScore = (entry: BrainScoreHistoryEntry) => {
  const normalizedGameId = normalizeGameId(entry.gameId);
  if (!normalizedGameId) return 0;

  if (normalizedGameId === 'math' || normalizedGameId === 'stroop') {
    if (typeof entry.score === 'string') {
      const match = entry.score.match(/(\d+)\s*\/\s*10/);
      return match ? Number(match[1]) : extractNumber(entry.score);
    }
    return safeNumber(entry.score);
  }

  if (normalizedGameId === 'schulte') {
    const timeSpent = extractNumber(entry.score);
    return clamp(SCHULTE_TIME_LIMIT - timeSpent, 0, SCHULTE_TIME_LIMIT);
  }

  return Math.max(0, extractNumber(entry.score));
};

export const buildGameContributions = (history: BrainScoreHistoryEntry[]) => {
  const latestEntries = new Map<string, BrainScoreHistoryEntry>();

  history.forEach((entry) => {
    const normalizedGameId = normalizeGameId(entry.gameId);
    if (!normalizedGameId) return;
    latestEntries.set(normalizedGameId, entry);
  });

  return TRACKED_GAME_IDS.reduce<Record<string, number>>((acc, gameId) => {
    const entry = latestEntries.get(gameId);
    if (!entry) {
      acc[gameId] = 0;
      return acc;
    }

    const parsedScore = parseGameScore(entry);
    const maxPossible = GAME_MAX_SCORES[gameId];
    const weightedScore = clamp((parsedScore / maxPossible) * 25, 0, 25);
    acc[gameId] = Number(weightedScore.toFixed(2));
    return acc;
  }, {});
};

const getTodayKey = () => new Date().toISOString().split('T')[0];

const readDailyWorkoutSession = (): DailyWorkoutSession | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(DAILY_WORKOUT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<DailyWorkoutSession>;
    if (
      typeof parsed.date !== 'string' ||
      typeof parsed.startedAt !== 'number' ||
      !Array.isArray(parsed.gameIds)
    ) {
      return null;
    }

    return {
      date: parsed.date,
      startedAt: parsed.startedAt,
      gameIds: parsed.gameIds.filter((gameId): gameId is string => typeof gameId === 'string'),
    };
  } catch (error) {
    console.warn('Brain Score workout read error:', error);
    return null;
  }
};

export const hasPlayedDailyWorkoutToday = (history: BrainScoreHistoryEntry[]) => {
  const session = readDailyWorkoutSession();
  if (!session || session.date !== getTodayKey()) return false;

  return session.gameIds.some((gameId) => {
    const relatedHistoryIds = DAILY_WORKOUT_HISTORY_IDS[gameId] || [gameId];
    return history.some(
      (entry) =>
        safeNumber(entry.timestamp) >= session.startedAt &&
        relatedHistoryIds.includes(entry.gameId)
    );
  });
};

export const calculateBrainScoreMetrics = (history: BrainScoreHistoryEntry[]): BrainScoreMetrics => {
  const contributions = buildGameContributions(history);
  const scoreFromGames = Object.values(contributions).reduce((sum, value) => sum + value, 0);
  const scoreBeforeModifier = BASE_BRAIN_SCORE + scoreFromGames;
  const dailyWorkoutPlayed = hasPlayedDailyWorkoutToday(history);
  const dailyWorkoutModifier = dailyWorkoutPlayed ? DAILY_WORKOUT_BOOST : DAILY_WORKOUT_DECAY;
  const combinedScore = clamp(
    Math.round(scoreBeforeModifier * dailyWorkoutModifier),
    MIN_BRAIN_SCORE,
    MAX_BRAIN_SCORE
  );
  const brainAge = Math.max(0, Math.round(100 - combinedScore / 3));

  let brainAgeColor: BrainScoreMetrics['brainAgeColor'] = 'red';
  if (brainAge < 25) {
    brainAgeColor = 'green';
  } else if (brainAge <= 35) {
    brainAgeColor = 'yellow';
  }

  return {
    combinedScore,
    brainAge,
    brainAgeColor,
    dailyWorkoutPlayed,
    dailyWorkoutModifier,
    contributions,
  };
};
