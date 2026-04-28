import { useEffect, useRef, useState, useCallback } from 'react';

interface UseGameTimerOptions {
  /** Total duration in ms. */
  durationMs: number;
  /** Tick interval in ms. Default 100. Smaller = smoother UI, heavier. */
  tickMs?: number;
  /** Timer only runs when true. */
  isActive: boolean;
  /** When true, timer freezes (time does not advance). */
  isPaused: boolean;
  /** Fires once when timeLeft reaches 0. */
  onExpire?: () => void;
  /** Changing this value hard-resets the timer to durationMs. */
  resetKey?: string | number;
}

/**
 * Pause-aware countdown timer used by every pro-mode game.
 *
 * Fixes the common bugs from the old games:
 *  - setInterval kept running during pause (drained time in the background).
 *  - `onExpire` was read from stale closures.
 *  - Interval wasn't cleared on unmount.
 *  - Reset logic was inconsistent with dependency arrays.
 */
export function useGameTimer({
  durationMs,
  tickMs = 100,
  isActive,
  isPaused,
  onExpire,
  resetKey,
}: UseGameTimerOptions) {
  const [timeLeftMs, setTimeLeftMs] = useState(durationMs);
  const onExpireRef = useRef(onExpire);
  const expiredRef = useRef(false);

  // Keep the callback ref fresh so the interval sees the latest closure.
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Reset whenever duration or resetKey changes.
  useEffect(() => {
    setTimeLeftMs(durationMs);
    expiredRef.current = false;
  }, [durationMs, resetKey]);

  useEffect(() => {
    if (!isActive || isPaused) return;
    const id = window.setInterval(() => {
      setTimeLeftMs(prev => {
        const next = prev - tickMs;
        if (next <= 0) {
          if (!expiredRef.current) {
            expiredRef.current = true;
            // Defer to avoid setState-in-render warnings.
            queueMicrotask(() => onExpireRef.current?.());
          }
          return 0;
        }
        return next;
      });
    }, tickMs);
    return () => window.clearInterval(id);
  }, [isActive, isPaused, tickMs]);

  const reset = useCallback((nextDurationMs?: number) => {
    expiredRef.current = false;
    setTimeLeftMs(nextDurationMs ?? durationMs);
  }, [durationMs]);

  const addTime = useCallback((deltaMs: number) => {
    expiredRef.current = false;
    setTimeLeftMs(prev => Math.max(0, prev + deltaMs));
  }, []);

  const subtractTime = useCallback((deltaMs: number) => {
    setTimeLeftMs(prev => {
      const next = Math.max(0, prev - Math.max(0, deltaMs));
      if (next === 0 && !expiredRef.current) {
        expiredRef.current = true;
        queueMicrotask(() => onExpireRef.current?.());
      }
      return next;
    });
  }, []);

  return {
    timeLeftMs,
    timeLeftSec: timeLeftMs / 1000,
    progress: durationMs > 0 ? timeLeftMs / durationMs : 0,
    reset,
    addTime,
    subtractTime,
    isExpired: timeLeftMs === 0,
  } as const;
}
