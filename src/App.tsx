import { HashRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import WebApp from '@twa-dev/sdk';
import { useBackButton } from './telegram/buttons';
import { Layout } from './components/Layout';
import { AuthGuard } from './components/AuthGuard';
import { AnimatedRoutes } from './components/AnimatedRoutes';
import { ConsentGate } from './components/ConsentGate';
import { OfflineBanner } from './components/OfflineBanner';
import OnboardingScreen1 from './components/onboarding/OnboardingScreen1';
import OnboardingScreen2 from './components/onboarding/OnboardingScreen2';
import OnboardingScreen3 from './components/onboarding/OnboardingScreen3';
import { useStore } from './store/useStoreImpl';
import i18n from './i18n/i18n';
import { lazyWithRetry } from './utils/lazyWithRetry';

// Admin bundle is split out — only loads when an admin actually navigates to /admin/*.
const AdminLayout = lazy(() => import('./components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminUsers = lazyWithRetry(() => import('./pages/admin/AdminUsers').then((m) => ({ default: m.AdminUsers })));
const AdminGames = lazyWithRetry(() => import('./pages/admin/AdminGames').then((m) => ({ default: m.AdminGames })));
const AdminTasks = lazyWithRetry(() => import('./pages/admin/AdminTasks'));
const AdminSettings = lazyWithRetry(() => import('./pages/admin/AdminSettings'));
const AdminPanel = lazyWithRetry(() => import('./pages/AdminPanel'));

const AdminFallback = () => (
  <div className="flex h-screen items-center justify-center text-sm text-gray-400">Loading admin…</div>
);

const RouteFallback = () => (
  <div className="flex h-screen items-center justify-center text-sm text-gray-400">Loading…</div>
);

// Wallet/chart-heavy pages are lazy so @tonconnect/ui-react and recharts
// don't ship in the initial bundle. Other primary pages stay eager so the
// home flow has zero extra fetches.
const ShopPage = lazyWithRetry(() => import('./pages/Shop'));
const ProfilePage = lazyWithRetry(() => import('./pages/Profile'));
const AirdropPage = lazyWithRetry(() => import('./pages/Airdrop'));
const TonConnectShell = lazy(() => import('./telegram/TonConnectShell'));

import Home from './pages/Home';
import SettingsPage from './pages/Settings';
import LeaderboardPage from './pages/Leaderboard';
import DailyWorkoutPage from './pages/DailyWorkout';
import TournamentsPage from './pages/Tournaments';
import AnalyticsPage from './pages/Analytics';
import TermsPage from './pages/Terms';
import PrivacyPage from './pages/Privacy';

// Games
const SchulteGame = lazyWithRetry(() => import('./pages/games/SchulteGame'));
const MathGame = lazyWithRetry(() => import('./pages/games/MathGame'));
const StroopGame = lazyWithRetry(() => import('./pages/games/StroopGame'));
const MemoryGame = lazyWithRetry(() => import('./pages/games/MemoryGame'));
const OddOneOutGame = lazyWithRetry(() => import('./pages/games/OddOneOutGame'));
const PairsGame = lazyWithRetry(() => import('./pages/games/PairsGame'));
const Merge2048Game = lazyWithRetry(() => import('./pages/games/Merge2048Game'));
const SozkomanGame = lazyWithRetry(() => import('./pages/games/SozkomanGame'));
const DalaTarihGame = lazyWithRetry(() => import('./pages/games/DalaTarihGame'));
const TogyzkumalakGame = lazyWithRetry(() => import('./pages/games/TogyzkumalakGame'));
const BagdarGame = lazyWithRetry(() => import('./pages/games/BagdarGame'));

type HistoryEntry = {
  gameId: string;
  score: string | number;
  timestamp: number;
  coinsEarned: number;
};

type WorkoutSession = {
  date: string;
  startedAt: number;
  gameIds: string[];
};

type OnboardingProgress = {
  screen: 0 | 1 | 2 | 3;
  hasStartedWorkout: boolean;
  isCompleted: boolean;
  sessionDate: string | null;
  startedAt: number | null;
};

type WorkoutOnboardingGame = {
  id: string;
  routeId: string;
  historyIds: string[];
};

const DAILY_WORKOUT_STORAGE_KEY = 'focus-daily-workout-v1';
// v2: drops any state written by the broken redirect-loop builds —
// hasStartedWorkout=true with screen still 1 would leave the user trapped
// forever otherwise.
const ONBOARDING_STORAGE_PREFIX = 'focus-onboarding-v2';

const workoutOnboardingGames: WorkoutOnboardingGame[] = [
  { id: 'memory', routeId: 'memory', historyIds: ['memory'] },
  { id: 'schulte', routeId: 'schulte', historyIds: ['schulte'] },
  { id: 'math', routeId: 'math', historyIds: ['math'] },
  { id: 'pairs', routeId: 'pairs', historyIds: ['pairs'] },
  { id: 'odd-one', routeId: 'odd-one', historyIds: ['odd_one_out'] },
  { id: 'stroop', routeId: 'stroop', historyIds: ['stroop'] },
  { id: '2048', routeId: '2048', historyIds: ['2048'] },
  { id: 'sozkoman', routeId: 'sozkoman', historyIds: ['sozkoman'] },
  { id: 'dala-tarih', routeId: 'dala-tarih', historyIds: ['dala-tarih'] },
  { id: 'togyzkumalak', routeId: 'togyzkumalak', historyIds: ['togyzkumalak'] },
  { id: 'bagdar', routeId: 'bagdar', historyIds: ['bagdar'] },
];

const getTodayKey = () => new Date().toISOString().split('T')[0];

const shuffleArray = <T,>(items: T[]) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
};

const createWorkoutSession = (): WorkoutSession => ({
  date: getTodayKey(),
  startedAt: Date.now(),
  gameIds: shuffleArray(workoutOnboardingGames.map((game) => game.id)).slice(0, 3),
});

const readStoredWorkoutSession = (): WorkoutSession | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(DAILY_WORKOUT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<WorkoutSession>;
    if (!parsed.date || typeof parsed.startedAt !== 'number' || !Array.isArray(parsed.gameIds)) {
      return null;
    }

    return {
      date: parsed.date,
      startedAt: parsed.startedAt,
      gameIds: parsed.gameIds.filter((gameId): gameId is string => typeof gameId === 'string').slice(0, 3),
    };
  } catch (error) {
    console.warn('Onboarding workout session read error:', error);
    return null;
  }
};

const writeWorkoutSession = (session: WorkoutSession) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DAILY_WORKOUT_STORAGE_KEY, JSON.stringify(session));
};

const ensureWorkoutSession = () => {
  const stored = readStoredWorkoutSession();
  if (
    stored?.date === getTodayKey() &&
    stored.gameIds.length === 3 &&
    stored.gameIds.every((gameId) => Boolean(getWorkoutGameById(gameId)))
  ) {
    return stored;
  }

  const nextSession = createWorkoutSession();
  writeWorkoutSession(nextSession);
  return nextSession;
};

const getWorkoutGameById = (gameId: string) =>
  workoutOnboardingGames.find((game) => game.id === gameId);

const createInitialOnboardingProgress = (): OnboardingProgress => ({
  screen: 1,
  hasStartedWorkout: false,
  isCompleted: false,
  sessionDate: null,
  startedAt: null,
});

const getOnboardingStorageKey = (userId: number) => `${ONBOARDING_STORAGE_PREFIX}-${userId}`;

let lastSyncTime = 0;
const SYNC_THROTTLE_MS = 60000;

const readOnboardingProgress = (userId: number): OnboardingProgress | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(getOnboardingStorageKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<OnboardingProgress>;
    if (
      typeof parsed.screen !== 'number' ||
      typeof parsed.hasStartedWorkout !== 'boolean' ||
      typeof parsed.isCompleted !== 'boolean'
    ) {
      return null;
    }

    return {
      screen: parsed.screen as OnboardingProgress['screen'],
      hasStartedWorkout: parsed.hasStartedWorkout,
      isCompleted: parsed.isCompleted,
      sessionDate: typeof parsed.sessionDate === 'string' ? parsed.sessionDate : null,
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
    };
  } catch (error) {
    console.warn('Onboarding progress read error:', error);
    return null;
  }
};

const writeOnboardingProgress = (userId: number, progress: OnboardingProgress) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getOnboardingStorageKey(userId), JSON.stringify(progress));
};

const ROOT_ROUTES = new Set(['/', '/shop', '/tournaments']);

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = useStore((state) => state.user.id);
  const history = useStore((state) => state.history as HistoryEntry[]);
  const syncUserFromTelegram = useStore((state) => state.syncUserFromTelegram);
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress | null>(null);

  const isRoot = ROOT_ROUTES.has(location.pathname);
  const goBack = useCallback(() => navigate(-1), [navigate]);
  useBackButton(isRoot ? null : goBack);

  const throttledSync = useCallback(() => {
    const now = Date.now();
    if (now - lastSyncTime > SYNC_THROTTLE_MS) {
      lastSyncTime = now;
      syncUserFromTelegram();
    }
  }, [syncUserFromTelegram]);

  useEffect(() => {
    throttledSync();
  }, [location.pathname, throttledSync]);

  const updateOnboardingProgress = (patch: Partial<OnboardingProgress>) => {
    if (!userId || !onboardingProgress) return;

    const nextProgress: OnboardingProgress = {
      ...onboardingProgress,
      ...patch,
    };

    setOnboardingProgress(nextProgress);
    writeOnboardingProgress(userId, nextProgress);
  };

  useEffect(() => {
    if (!userId) {
      setOnboardingProgress(null);
      return;
    }

    const savedProgress = readOnboardingProgress(userId);
    if (savedProgress) {
      setOnboardingProgress(savedProgress);
      return;
    }

    const nextProgress: OnboardingProgress =
      history.length === 0
        ? createInitialOnboardingProgress()
        : {
            ...createInitialOnboardingProgress(),
            screen: 0,
            isCompleted: true,
          };

    setOnboardingProgress(nextProgress);
    writeOnboardingProgress(userId, nextProgress);
  }, [history.length, userId]);

  useEffect(() => {
    if (!userId || !onboardingProgress || onboardingProgress.isCompleted || onboardingProgress.screen !== 1) {
      return;
    }

    const session = ensureWorkoutSession();

    if (
      onboardingProgress.sessionDate !== session.date ||
      onboardingProgress.startedAt !== session.startedAt
    ) {
      updateOnboardingProgress({
        sessionDate: session.date,
        startedAt: session.startedAt,
      });
      return;
    }

    // Pin the user to /daily-workout while screen 1 is still asking them to
    // start. Once they tap PLAY (`hasStartedWorkout` flips true), we hand off
    // to the game route the handler navigated to — clamping back to
    // /daily-workout here would otherwise cancel the navigation and look
    // exactly like a "PLAY does nothing" reload.
    const isGameRoute = location.pathname.startsWith('/game/');
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isDailyWorkout = location.pathname === '/daily-workout';
    const allowedDuringWorkout = onboardingProgress.hasStartedWorkout && isGameRoute;

    if (!isDailyWorkout && !isAdminRoute && !allowedDuringWorkout) {
      navigate('/daily-workout', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navigate, onboardingProgress, userId]);

  const firstWorkoutResult = useMemo(() => {
    if (!onboardingProgress?.startedAt) return null;

    const session = readStoredWorkoutSession();
    if (!session?.gameIds.length) return null;

    const firstGame = getWorkoutGameById(session.gameIds[0]);
    if (!firstGame) return null;

    const matchedEntries = history.filter(
      (entry) =>
        entry.timestamp >= onboardingProgress.startedAt! &&
        firstGame.historyIds.includes(entry.gameId)
    );

    return matchedEntries.length > 0 ? matchedEntries[matchedEntries.length - 1] : null;
  }, [history, onboardingProgress]);

  useEffect(() => {
    if (
      !onboardingProgress ||
      onboardingProgress.isCompleted ||
      onboardingProgress.screen !== 1 ||
      !onboardingProgress.hasStartedWorkout ||
      !firstWorkoutResult
    ) {
      return;
    }

    updateOnboardingProgress({ screen: 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstWorkoutResult, onboardingProgress]);

  const handleOnboardingStart = () => {
    const session = ensureWorkoutSession();
    const firstGame = getWorkoutGameById(session.gameIds[0]);

    updateOnboardingProgress({
      hasStartedWorkout: true,
      sessionDate: session.date,
      startedAt: session.startedAt,
    });

    if (firstGame) {
      navigate(`/game/${firstGame.routeId}`);
    }
  };

  const handleOpenShop = () => {
    if (!onboardingProgress || !userId) return;

    const completedProgress: OnboardingProgress = {
      ...onboardingProgress,
      screen: 0,
      isCompleted: true,
    };

    setOnboardingProgress(completedProgress);
    writeOnboardingProgress(userId, completedProgress);
    navigate('/shop');
  };

  const handleDismissOnboarding = () => {
    if (!onboardingProgress || !userId) return;

    const completedProgress: OnboardingProgress = {
      ...onboardingProgress,
      screen: 0,
      isCompleted: true,
    };

    setOnboardingProgress(completedProgress);
    writeOnboardingProgress(userId, completedProgress);
  };

  const canRenderOverlay =
    onboardingProgress &&
    !onboardingProgress.isCompleted &&
    !location.pathname.startsWith('/admin') &&
    (onboardingProgress.screen === 1
      ? location.pathname === '/daily-workout'
      : !location.pathname.startsWith('/game/'));

  return (
    <>
      <AnimatedRoutes>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route
              path="shop"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <TonConnectShell>
                    <ShopPage />
                  </TonConnectShell>
                </Suspense>
              }
            />
            <Route
              path="airdrop"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <TonConnectShell>
                    <AirdropPage />
                  </TonConnectShell>
                </Suspense>
              }
            />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="tournaments" element={<TournamentsPage />} />
          </Route>

          <Route
            path="/profile"
            element={
              <Suspense fallback={<RouteFallback />}>
                <TonConnectShell>
                  <ProfilePage />
                </TonConnectShell>
              </Suspense>
            }
          />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/daily-workout" element={<DailyWorkoutPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          <Route path="/game/schulte" element={<Suspense fallback={<RouteFallback />}><SchulteGame /></Suspense>} />
          <Route path="/game/math" element={<Suspense fallback={<RouteFallback />}><MathGame /></Suspense>} />
          <Route path="/game/stroop" element={<Suspense fallback={<RouteFallback />}><StroopGame /></Suspense>} />
          <Route path="/game/memory" element={<Suspense fallback={<RouteFallback />}><MemoryGame /></Suspense>} />
          <Route path="/game/odd-one" element={<Suspense fallback={<RouteFallback />}><OddOneOutGame /></Suspense>} />
          <Route path="/game/pairs" element={<Suspense fallback={<RouteFallback />}><PairsGame /></Suspense>} />
          <Route path="/game/2048" element={<Suspense fallback={<RouteFallback />}><Merge2048Game /></Suspense>} />
          <Route path="/game/sozkoman" element={<Suspense fallback={<RouteFallback />}><SozkomanGame /></Suspense>} />
          <Route path="/game/dala-tarih" element={<Suspense fallback={<RouteFallback />}><DalaTarihGame /></Suspense>} />
          <Route path="/game/togyzkumalak" element={<Suspense fallback={<RouteFallback />}><TogyzkumalakGame /></Suspense>} />
          <Route path="/game/bagdar" element={<Suspense fallback={<RouteFallback />}><BagdarGame /></Suspense>} />

          <Route
            path="/admin"
            element={
              <AuthGuard adminOnly={true}>
                <Suspense fallback={<AdminFallback />}>
                  <AdminLayout />
                </Suspense>
              </AuthGuard>
            }
          >
            <Route index element={<Suspense fallback={<AdminFallback />}><AdminDashboard /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<AdminFallback />}><AdminUsers /></Suspense>} />
            <Route path="games" element={<Suspense fallback={<AdminFallback />}><AdminGames /></Suspense>} />
            <Route path="tasks" element={<Suspense fallback={<AdminFallback />}><AdminTasks /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<AdminFallback />}><AdminSettings /></Suspense>} />
            <Route path="tickets" element={<Suspense fallback={<AdminFallback />}><AdminPanel /></Suspense>} />
          </Route>

          {/* Catch-all: if HashRouter restores a hash like /#/foo from a
              previous session that points at a route we no longer ship,
              the user would see Layout with an empty Outlet — looks
              identical to a "blank screen" bug. Bouncing them to / keeps
              the app self-rescuing. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatedRoutes>

      {canRenderOverlay && onboardingProgress?.screen === 1 && (
        <OnboardingScreen1
          onStart={handleOnboardingStart}
          onSkip={handleDismissOnboarding}
        />
      )}

      {canRenderOverlay && onboardingProgress?.screen === 2 && (
        <OnboardingScreen2
          value={Math.min(300, Math.max(0, (firstWorkoutResult?.coinsEarned || 0) * 10))}
          onContinue={() => updateOnboardingProgress({ screen: 3 })}
          onSkip={handleDismissOnboarding}
        />
      )}

      {canRenderOverlay && onboardingProgress?.screen === 3 && (
        <Suspense fallback={null}>
          <TonConnectShell>
            <OnboardingScreen3
              onOpenShop={handleOpenShop}
              onSkip={handleDismissOnboarding}
            />
          </TonConnectShell>
        </Suspense>
      )}
    </>
  );
}

function App() {
  const { t } = useTranslation();
  const syncUserFromTelegram = useStore((state) => state.syncUserFromTelegram);
  const fetchEntitlements = useStore((state) => state.fetchEntitlements);
  const addNotification = useStore((state) => state.addNotification);
  const userId = useStore((state) => state.user.id);
  const language = useStore((state) => state.language);

  // Sync the persisted store language into i18next on mount and on every change
  // so a user's previously chosen language survives a refresh and overrides the
  // first-launch Telegram detection.
  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  // Sync user data immediately and handle account switching.
  // Telegram lifecycle (ready/expand/theme) is owned by src/telegram/bootstrap.ts.
  useEffect(() => {
    // Only wipe app-owned keys that store user state
    const APP_KEY_PREFIXES = ['focus-app-', 'focus-daily-', 'focus-onboarding-', 'welcome_shown_'];
    const clearAppStorage = () => {
      try {
        const storages: Storage[] = [localStorage, sessionStorage];
        for (const storage of storages) {
          const toRemove: string[] = [];
          for (let i = 0; i < storage.length; i += 1) {
            const key = storage.key(i);
            if (key && APP_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
              toRemove.push(key);
            }
          }
          toRemove.forEach((key) => storage.removeItem(key));
        }
      } catch (e) {
        console.warn('Failed to clear app storage:', e);
      }
    };

    const checkAccount = () => {
      const tgUser = WebApp?.initDataUnsafe?.user || (window as any).Telegram?.WebApp?.initDataUnsafe?.user;

      if (tgUser && userId && userId !== 0 && userId !== tgUser.id) {
        console.warn('Account switch detected! Clearing app storage...');
        clearAppStorage();
        return true;
      }
      return false;
    };

    const isSwitched = checkAccount();

    syncUserFromTelegram();
    fetchEntitlements();

    // Referral tracking: if user opened via t.me/bot?start=ref_<userId>,
    // post once to /referral/track (server dedupes via UNIQUE on referee).
    try {
      const startParam = WebApp.initDataUnsafe?.start_param || '';
      const m = /^ref_(\d{5,})$/i.exec(startParam);
      if (m && m[1]) {
        const refUserId = Number(m[1]);
        const initData = WebApp.initData || '';
        if (initData && refUserId) {
          fetch((import.meta.env.VITE_API_URL || '') + '/referral/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData, refUserId }),
          }).catch(() => {});
        }
      }
    } catch (_) { /* non-fatal */ }

    if (isSwitched) {
      if (WebApp.isVersionAtLeast('6.2')) {
        WebApp.showAlert(t('account_switched'));
      } else {
        alert(t('account_switched'));
      }
    }
  }, [syncUserFromTelegram, fetchEntitlements, userId, t]);

  // Sync HTML data-theme attribute with store
  const theme = useStore((state) => state.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Re-sync when the tab/app regains focus rather than polling every 2s.
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        syncUserFromTelegram();
        fetchEntitlements();
      }
    };
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleVisible);
    return () => {
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleVisible);
    };
  }, [syncUserFromTelegram, fetchEntitlements]);

  useEffect(() => {
    if (userId && typeof userId === 'number') {
      const key = `welcome_shown_${userId}`;
      if (!localStorage.getItem(key)) {
        addNotification({
          title: t('welcome_notification_title'),
          message: t('welcome_notification_message'),
          type: 'success'
        });
        localStorage.setItem(key, '1');
      }
    }
  }, [userId, addNotification, t]);

  return (
    <ConsentGate>
      <AuthGuard>
        <Router>
          <OfflineBanner />
          <AppRoutes />
        </Router>
      </AuthGuard>
    </ConsentGate>
  );
}

export default App;
