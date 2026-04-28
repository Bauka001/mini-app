import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Difficulty } from '../types/games';

/**
 * Dedicated pro-mode settings store. Kept separate from the giant `useStore`
 * to avoid entangling game preferences with user/economy state.
 *
 * Persisted to localStorage so preferences + best scores survive reloads.
 */
interface GameSettingsState {
  /** User's last chosen difficulty per game. */
  difficultyPrefs: Record<string, Difficulty>;
  /** Haptic master toggle. Defaults to true on Telegram. */
  hapticEnabled: boolean;
  /** Best score per `${gameId}:${difficulty}` key. Higher is better. */
  gameBests: Record<string, number>;
  /** Whether ghost piece / hints are enabled in games that support them. */
  hintsEnabled: boolean;

  setDifficulty: (gameId: string, difficulty: Difficulty) => void;
  getDifficulty: (gameId: string, fallback?: Difficulty) => Difficulty;
  toggleHaptic: () => void;
  setHapticEnabled: (enabled: boolean) => void;
  setGameBest: (key: string, score: number) => void;
  clearBests: () => void;
  toggleHints: () => void;
}

export const useGameSettings = create<GameSettingsState>()(
  persist(
    (set, get) => ({
      difficultyPrefs: {},
      hapticEnabled: true,
      gameBests: {},
      hintsEnabled: true,

      setDifficulty: (gameId, difficulty) =>
        set(state => ({
          difficultyPrefs: { ...state.difficultyPrefs, [gameId]: difficulty },
        })),

      getDifficulty: (gameId, fallback = 'medium') => get().difficultyPrefs[gameId] ?? fallback,

      toggleHaptic: () => set(state => ({ hapticEnabled: !state.hapticEnabled })),
      setHapticEnabled: (enabled) => set({ hapticEnabled: enabled }),

      setGameBest: (key, score) =>
        set(state => {
          const current = state.gameBests[key] ?? 0;
          if (score <= current) return state;
          return { gameBests: { ...state.gameBests, [key]: score } };
        }),

      clearBests: () => set({ gameBests: {} }),

      toggleHints: () => set(state => ({ hintsEnabled: !state.hintsEnabled })),
    }),
    {
      name: 'focus-game-settings',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
