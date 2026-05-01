import { HashRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
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

// Admin bundle is split out — only loads when an admin actually navigates to /admin/*.
const AdminLayout = lazy(() => import('./components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers').then((m) => ({ default: m.AdminUsers })));
const AdminChat = lazy(() => import('./pages/admin/AdminChat').then((m) => ({ default: m.AdminChat })));
const AdminGames = lazy(() => import('./pages/admin/AdminGames').then((m) => ({ default: m.AdminGames })));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

const AdminFallback = () => (
  <div className="flex h-screen items-center justify-center text-sm text-gray-400">Loading admin…</div>
);

const RouteFallback = () => (
  <div className="flex h-screen items-center justify-center text-sm text-gray-400">Loading…</div>
);

// Wallet/chart-heavy pages are lazy so @tonconnect/ui-react and recharts
// don't ship in the initial bundle. Other primary pages stay eager so the
// home flow has zero extra fetches.
const ShopPage = lazy(() => import('./pages/Shop'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const AirdropPage = lazy(() => import('./pages/Airdrop'));
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
import SchulteGame from './pages/games/SchulteGame';
import MathGame from './pages/games/MathGame';
import StroopGame from './pages/games/StroopGame';
import MemoryGame from './pages/games/MemoryGame';
import OddOneOutGame from './pages/games/OddOneOutGame';
import PairsGame from './pages/games/PairsGame';
import TetrisGame from './pages/games/TetrisGame';
import Merge2048Game from './pages/games/Merge2048Game';
import AgentSpotGame from './pages/games/AgentSpotGame';
import AgentSequenceGame from './pages/games/AgentSequenceGame';
import CodeBreakerGame from './pages/games/CodeBreakerGame';

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
const ONBOARDING_STORAGE_PREFIX = 'focus-onboarding-v1';

const workoutOnboardingGames: WorkoutOnboardingGame[] = [
  { id: 'memory', routeId: 'memory', historyIds: ['memory'] },
  { id: 'schulte', routeId: 'schulte', historyIds: ['schulte'] },
  { id: 'math', routeId: 'math', historyIds: ['math'] },
  { id: 'pairs', routeId: 'pairs', historyIds: ['pairs'] },
  { id: 'odd-one', routeId: 'odd-one', historyIds: ['odd_one_out'] },
  { id: 'stroop', routeId: 'stroop', historyIds: ['stroop'] },
  { id: 'tetris', routeId: 'tetris', historyIds: ['tetris'] },
  { id: '2048', routeId: '2048', historyIds: ['2048'] },
  { id: 'agent-spot', routeId: 'agent-spot', historyIds: ['agent_spot'] },
  { id: 'agent-sequence', routeId: 'agent-sequence', historyIds: ['agent_sequence'] },
  { id: 'code-breaker', routeId: 'code-breaker', historyIds: ['code_breaker'] },
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
  if (stored?.date === getTodayKey() && stored.gameIds.length === 3) {
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
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress | null>(null);

  const isRoot = ROOT_ROUTES.has(location.pathname);
  const goBack = useCallback(() => navigate(-1), [navigate]);
  useBackButton(isRoot ? null : goBack);

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
    // updateOnboardingProgress intentionally omitted — it's a stable closure
    // and including it would re-fire the route guard on every progress write.
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
    // updateOnboardingProgress is a stable closure; including it would loop
    // because every progress write changes its identity in this scope.
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
          </Route>

          <Route
            path="/profile"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ProfilePage />
              </Suspense>
            }
          />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/daily-workout" element={<DailyWorkoutPage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          <Route path="/game/schulte" element={<SchulteGame />} />
          <Route path="/game/math" element={<MathGame />} />
          <Route path="/game/stroop" element={<StroopGame />} />
          <Route path="/game/memory" element={<MemoryGame />} />
          <Route path="/game/odd-one" element={<OddOneOutGame />} />
          <Route path="/game/pairs" element={<PairsGame />} />
          <Route path="/game/tetris" element={<TetrisGame />} />
          <Route path="/game/2048" element={<Merge2048Game />} />
          <Route path="/game/agent-spot" element={<AgentSpotGame />} />
          <Route path="/game/agent-sequence" element={<AgentSequenceGame />} />
          <Route path="/game/code-breaker" element={<CodeBreakerGame />} />

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
            <Route path="chat" element={<Suspense fallback={<AdminFallback />}><AdminChat /></Suspense>} />
            <Route path="games" element={<Suspense fallback={<AdminFallback />}><AdminGames /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<AdminFallback />}><AdminSettings /></Suspense>} />
            <Route path="tickets" element={<Suspense fallback={<AdminFallback />}><AdminPanel /></Suspense>} />
          </Route>
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
        <OnboardingScreen3
          onOpenShop={handleOpenShop}
          onSkip={handleDismissOnboarding}
        />
      )}
    </>
  );
}

function App() {
  const { t } = useTranslation();
  const syncUserFromTelegram = useStore((state) => state.syncUserFromTelegram);
  const addNotification = useStore((state) => state.addNotification);
  const userId = useStore((state) => state.user.id);
  const language = useStore((state) => state.language);
  const logout = useStore((state) => state.logout);

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
    const checkAccount = () => {
      const tgUser = WebApp?.initDataUnsafe?.user || (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      
      if (tgUser && userId && userId !== 0 && userId !== tgUser.id) {
        console.warn('Account switch detected! Clearing local data and reloading...');
        // Force clear everything related to this app
        localStorage.clear(); 
        sessionStorage.clear();
        window.location.reload();
        return true;
      }
      return false;
    };

    if (!checkAccount()) {
      syncUserFromTelegram();
    }
  }, [syncUserFromTelegram, userId, logout]);

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
      }
    };
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', syncUserFromTelegram);
    return () => {
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', syncUserFromTelegram);
    };
  }, [syncUserFromTelegram]);

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
