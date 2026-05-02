import { HashRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import WebApp from '@twa-dev/sdk';
import { useTranslation } from 'react-i18next';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/admin/AdminLayout';
import { AuthGuard } from './components/AuthGuard';
import { AnimatedRoutes } from './components/AnimatedRoutes';
import OnboardingScreen1 from './components/onboarding/OnboardingScreen1';
import OnboardingScreen2 from './components/onboarding/OnboardingScreen2';
import OnboardingScreen3 from './components/onboarding/OnboardingScreen3';
import { useStore } from './store/useStoreImpl';
import Home from './pages/Home';

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminChat = lazy(() => import('./pages/admin/AdminChat').then(m => ({ default: m.AdminChat })));
const AdminGames = lazy(() => import('./pages/admin/AdminGames').then(m => ({ default: m.AdminGames })));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminTasks = lazy(() => import('./pages/admin/AdminTasks'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

// Lazy loaded pages to reduce initial bundle size
const ShopPage = lazy(() => import('./pages/Shop'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const LeaderboardPage = lazy(() => import('./pages/Leaderboard'));
const DailyWorkoutPage = lazy(() => import('./pages/DailyWorkout'));
const AirdropPage = lazy(() => import('./pages/Airdrop'));
const TournamentsPage = lazy(() => import('./pages/Tournaments'));
const AnalyticsPage = lazy(() => import('./pages/Analytics'));

// Games
const SchulteGame = lazy(() => import('./pages/games/SchulteGame'));
const MathGame = lazy(() => import('./pages/games/MathGame'));
const StroopGame = lazy(() => import('./pages/games/StroopGame'));
const MemoryGame = lazy(() => import('./pages/games/MemoryGame'));
const OddOneOutGame = lazy(() => import('./pages/games/OddOneOutGame'));
const PairsGame = lazy(() => import('./pages/games/PairsGame'));
const Merge2048Game = lazy(() => import('./pages/games/Merge2048Game'));

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
  { id: '2048', routeId: '2048', historyIds: ['2048'] },
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
const SYNC_THROTTLE_MS = 60000; // 1 minute throttle


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

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = useStore((state) => state.user.id);
  const history = useStore((state) => state.history as HistoryEntry[]);
  const syncUserFromTelegram = useStore((state) => state.syncUserFromTelegram);
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress | null>(null);

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

    const nextProgress =
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

    if (location.pathname !== '/daily-workout' && !location.pathname.startsWith('/admin')) {
      navigate('/daily-workout', { replace: true });
    }
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
      <Suspense fallback={
        <div className="flex h-screen w-full items-center justify-center bg-black/5">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      }>
        <AnimatedRoutes>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="shop" element={<ShopPage />} />
              <Route path="airdrop" element={<AirdropPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="tournaments" element={<TournamentsPage />} />
            </Route>

            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/daily-workout" element={<DailyWorkoutPage />} />

            <Route path="/game/schulte" element={<SchulteGame />} />
            <Route path="/game/math" element={<MathGame />} />
            <Route path="/game/stroop" element={<StroopGame />} />
            <Route path="/game/memory" element={<MemoryGame />} />
            <Route path="/game/odd-one" element={<OddOneOutGame />} />
            <Route path="/game/pairs" element={<PairsGame />} />
            <Route path="/game/2048" element={<Merge2048Game />} />

            <Route path="/admin" element={<AuthGuard adminOnly={true}><AdminLayout /></AuthGuard>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="games" element={<AdminGames />} />
              <Route path="tasks" element={<AdminTasks />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="tickets" element={<AdminPanel />} />
            </Route>
          </Routes>
        </AnimatedRoutes>
      </Suspense>

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
  const syncUserFromTelegram = useStore((state) => state.syncUserFromTelegram);
  const addNotification = useStore((state) => state.addNotification);
  const userId = useStore((state) => state.user.id);
  const language = useStore((state) => state.language);
  const { i18n } = useTranslation();

  // Sync i18n language with store
  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  // Sync user data immediately and handle account switching
  useEffect(() => {
    if (WebApp) {
      try {
        WebApp.ready();
        WebApp.expand();
      } catch (e) {
        console.error('WebApp initialization error:', e);
      }
    }

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
    
    // Sync user data for the new account without reloading the page
    syncUserFromTelegram();

    if (isSwitched) {
      // Show native modal/toast to the user
      if (WebApp.isVersionAtLeast('6.2')) {
        WebApp.showAlert(i18n.t('account_switched'));
      } else {
        alert(i18n.t('account_switched'));
      }
    }
  }, [syncUserFromTelegram, userId, i18n]);

  // Sync HTML data-theme attribute with store
  const theme = useStore((state) => state.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Periodic sync check
  useEffect(() => {
    const throttledSync = () => {
      const now = Date.now();
      if (now - lastSyncTime > SYNC_THROTTLE_MS) {
        lastSyncTime = now;
        syncUserFromTelegram();
      }
    };

    // Sync every 3 minutes
    const timer = setInterval(() => {
      throttledSync();
    }, 3 * 60 * 1000);

    // Sync on app focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        throttledSync();
      }
    };
    const handleFocus = () => throttledSync();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncUserFromTelegram]);

  useEffect(() => {
    if (userId && typeof userId === 'number') {
      const key = `welcome_shown_${userId}`;
      if (!localStorage.getItem(key)) {
        addNotification({
          title: i18n.t('welcome'),
          message: i18n.t('profile_welcome_message'),
          type: 'success'
        });
        localStorage.setItem(key, '1');
      }
    }
  }, [userId, addNotification, i18n]);

  return (
    <AuthGuard>
      <Router>
        <AppRoutes />
      </Router>
    </AuthGuard>
  );
}

export default App;
