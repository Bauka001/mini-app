// Shared types used by all pro-mode games.

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export const DIFFICULTY_LABEL: Record<Difficulty, { en: string; ru: string; kz: string }> = {
  easy:   { en: 'Easy',   ru: 'Легко',   kz: 'Оңай' },
  medium: { en: 'Medium', ru: 'Средне',  kz: 'Орташа' },
  hard:   { en: 'Hard',   ru: 'Сложно',  kz: 'Қиын' },
};

export const DIFFICULTY_COIN_MULT: Record<Difficulty, number> = {
  easy: 0.8,
  medium: 1.0,
  hard: 1.4,
};

/**
 * Keys used in the persisted best-score map. Keep `gameId` stable across versions.
 */
export const bestKey = (gameId: string, difficulty: Difficulty) => `${gameId}:${difficulty}`;
