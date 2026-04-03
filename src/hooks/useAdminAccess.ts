import { useEffect, useState } from 'react';
import { AdminSession, getAdminSession } from '../utils/adminApi';

const defaultSession: AdminSession = {
  userId: 0,
  isAdmin: false,
  role: null,
  canManageAdmins: false,
  source: 'none',
};

let sessionCache: AdminSession | null = null;
let sessionPromise: Promise<AdminSession> | null = null;

const loadAdminSession = async () => {
  if (sessionCache) {
    return sessionCache;
  }

  if (!sessionPromise) {
    sessionPromise = getAdminSession()
      .then((session) => {
        sessionCache = session;
        return session;
      })
      .finally(() => {
        sessionPromise = null;
      });
  }

  return sessionPromise;
};

export const invalidateAdminSession = () => {
  sessionCache = null;
  sessionPromise = null;
};

export const useAdminAccess = (enabled = true) => {
  const [session, setSession] = useState<AdminSession>(sessionCache ?? defaultSession);
  const [isLoading, setIsLoading] = useState(enabled && !sessionCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSession(defaultSession);
      setIsLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setIsLoading(!sessionCache);

    loadAdminSession()
      .then((nextSession) => {
        if (!active) {
          return;
        }

        setSession(nextSession);
        setError(null);
      })
      .catch((err) => {
        if (!active) {
          return;
        }

        setSession(defaultSession);
        setError(err instanceof Error ? err.message : 'Admin session error');
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return {
    session,
    isLoading,
    error,
    isAdmin: session.isAdmin,
    refresh: async () => {
      invalidateAdminSession();
      const nextSession = await loadAdminSession();
      setSession(nextSession);
      return nextSession;
    },
  };
};
