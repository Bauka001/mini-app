import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { CanonicalUser, getUserMe } from '../utils/adminApi';

const isBrowserGuest = (): boolean => {
  try {
    return !WebApp.initData;
  } catch {
    return true;
  }
};

interface PlanGateState {
  isPremiumActive: boolean | null;
  plan: CanonicalUser['plan'] | null;
  planExpiry: number | null;
  isLoading: boolean;
  error: string | null;
}

// Cache the canonical user response for a short window so multiple gated
// components on the same page don't each round-trip to the server. Refreshes
// when the cache is stale or when refresh() is called explicitly.
const CACHE_TTL_MS = 30_000;
let cached: { fetchedAt: number; data: CanonicalUser | null } | null = null;
let inflight: Promise<CanonicalUser | null> | null = null;

const fetchCanonicalUser = async (): Promise<CanonicalUser | null> => {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }
  if (inflight) {
    return inflight;
  }
  inflight = getUserMe()
    .then((response) => {
      cached = { fetchedAt: Date.now(), data: response.user };
      return response.user;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
};

export const invalidatePlanGate = () => {
  cached = null;
};

// Server-canonical plan check. Returns null while loading so callers can
// distinguish "definitely not premium" from "haven't heard back yet".
// `state.plan` from Zustand is hydrated from /users/me as well after sprint #6,
// but a tampered local state can briefly assert premium before the next
// hydrate; this hook always reflects what the server says, modulo the cache.
export const usePlanGate = () => {
  const [state, setState] = useState<PlanGateState>(() => {
    if (cached?.data) {
      const planActive = cached.data.planActive;
      return {
        isPremiumActive: planActive && cached.data.plan === 'premium',
        plan: cached.data.plan,
        planExpiry: cached.data.planExpiry,
        isLoading: false,
        error: null,
      };
    }
    return {
      isPremiumActive: null,
      plan: null,
      planExpiry: null,
      isLoading: true,
      error: null,
    };
  });

  useEffect(() => {
    let active = true;

    // Browser/PWA guests have no initData and the server will 401 every call.
    // Short-circuit to a definite "not premium" so the UI doesn't flash a
    // spinner and the network log isn't full of 401s.
    if (isBrowserGuest()) {
      setState({
        isPremiumActive: false,
        plan: 'free',
        planExpiry: null,
        isLoading: false,
        error: null,
      });
      return () => {
        active = false;
      };
    }

    fetchCanonicalUser()
      .then((user) => {
        if (!active) return;
        if (!user) {
          setState({
            isPremiumActive: false,
            plan: 'free',
            planExpiry: null,
            isLoading: false,
            error: null,
          });
          return;
        }
        setState({
          isPremiumActive: user.planActive && user.plan === 'premium',
          plan: user.plan,
          planExpiry: user.planExpiry,
          isLoading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (!active) return;
        setState({
          isPremiumActive: null,
          plan: null,
          planExpiry: null,
          isLoading: false,
          error: err instanceof Error ? err.message : 'plan_gate_error',
        });
      });

    return () => {
      active = false;
    };
  }, []);

  return {
    ...state,
    refresh: async () => {
      if (isBrowserGuest()) {
        setState({
          isPremiumActive: false,
          plan: 'free',
          planExpiry: null,
          isLoading: false,
          error: null,
        });
        return;
      }
      invalidatePlanGate();
      const user = await fetchCanonicalUser();
      setState({
        isPremiumActive: !!(user?.planActive && user.plan === 'premium'),
        plan: user?.plan ?? 'free',
        planExpiry: user?.planExpiry ?? null,
        isLoading: false,
        error: null,
      });
    },
  };
};
