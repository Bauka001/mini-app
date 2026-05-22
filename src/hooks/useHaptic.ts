import { useCallback } from 'react';
import { useGameSettings } from '../store/gameSettings';
import { hapticFeedback } from '../utils/telegram';

/**
 * Convenience wrapper around `hapticFeedback` that respects the user's
 * `hapticEnabled` preference. Use this in games instead of the raw util so
 * players can opt out of vibration.
 */
export function useHaptic() {
  const enabled = useGameSettings(state => state.hapticEnabled);

  const impact = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'medium') => {
      if (!enabled) return;
      hapticFeedback.impact(type);
    },
    [enabled]
  );

  const notification = useCallback(
    (type: 'success' | 'warning' | 'error' = 'success') => {
      if (!enabled) return;
      hapticFeedback.notification(type);
    },
    [enabled]
  );

  const selection = useCallback(() => {
    if (!enabled) return;
    hapticFeedback.selection();
  }, [enabled]);

  const click = useCallback(() => {
    if (!enabled) return;
    hapticFeedback.click();
  }, [enabled]);

  return { impact, notification, selection, click, enabled } as const;
}
