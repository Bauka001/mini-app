import { useCallback } from 'react';
import { useGameSettings } from '../store/gameSettings';
import { Difficulty, bestKey } from '../types/games';

/**
 * Per-game, per-difficulty best score tracker.
 *
 * Persisted via `useGameSettings` (localStorage) so the "BEST" badge on the HUD
 * survives page reloads and route changes.
 *
 * Usage:
 *   const { best, submit } = useLocalBest('memory', difficulty);
 *   const isNewBest = submit(score); // returns true when beaten
 */
export function useLocalBest(gameId: string, difficulty: Difficulty) {
  const bests = useGameSettings(state => state.gameBests);
  const setGameBest = useGameSettings(state => state.setGameBest);

  const key = bestKey(gameId, difficulty);
  const best = bests[key] ?? 0;

  const submit = useCallback(
    (score: number): boolean => {
      if (!Number.isFinite(score)) return false;
      const prev = useGameSettings.getState().gameBests[key] ?? 0;
      if (score > prev) {
        setGameBest(key, score);
        return true;
      }
      return false;
    },
    [key, setGameBest]
  );

  return { best, submit } as const;
}
