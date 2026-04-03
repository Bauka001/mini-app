import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/admin/AdminLayout';
import { AuthGuard } from './components/AuthGuard';
import { AnimatedRoutes } from './components/AnimatedRoutes';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminChat } from './pages/admin/AdminChat';
import { AdminGames } from './pages/admin/AdminGames';
import AdminSettings from './pages/admin/AdminSettings';
import AdminPanel from './pages/AdminPanel';
import { useStore } from './store/useStore.1';

// Static imports to prevent lazy loading errors
import Home from './pages/Home';
import ShopPage from './pages/Shop';
import SettingsPage from './pages/Settings';
import ProfilePage from './pages/Profile';
import LeaderboardPage from './pages/Leaderboard';
import DailyWorkoutPage from './pages/DailyWorkout';
import AirdropPage from './pages/Airdrop';

// Games
import SchulteGame from './pages/games/SchulteGame';
import MathGame from './pages/games/MathGame';
import StroopGame from './pages/games/StroopGame';
import MemoryGame from './pages/games/MemoryGame';
import OddOneOutGame from './pages/games/OddOneOutGame';
import PairsGame from './pages/games/PairsGame';
import TetrisGame from './pages/games/TetrisGame';
import Merge2048Game from './pages/games/Merge2048Game';

function App() {
  const syncUserFromTelegram = useStore((state) => state.syncUserFromTelegram);
  const addNotification = useStore((state) => state.addNotification);
  const userId = useStore((state) => state.user.id);
  const logout = useStore((state) => state.logout);

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

  // Periodic sync check
  useEffect(() => {
    const timer = setInterval(() => {
      syncUserFromTelegram();
    }, 2000);
    return () => clearInterval(timer);
  }, [syncUserFromTelegram]);

  useEffect(() => {
    if (userId && typeof userId === 'number') {
      const key = `welcome_shown_${userId}`;
      if (!localStorage.getItem(key)) {
        addNotification({
          title: 'Қош келдіңіз!',
          message: 'Профиль құру үшін Profile бөліміне өтіңіз',
          type: 'success'
        });
        localStorage.setItem(key, '1');
      }
    }
  }, [userId, addNotification]);

  return (
    <AuthGuard>
      <Router>
        <AnimatedRoutes>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="shop" element={<ShopPage />} />
              <Route path="airdrop" element={<AirdropPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/daily-workout" element={<DailyWorkoutPage />} />

            {/* Games */}
            <Route path="/game/schulte" element={<SchulteGame />} />
            <Route path="/game/math" element={<MathGame />} />
            <Route path="/game/stroop" element={<StroopGame />} />
            <Route path="/game/memory" element={<MemoryGame />} />
            <Route path="/game/odd-one" element={<OddOneOutGame />} />
            <Route path="/game/pairs" element={<PairsGame />} />
            <Route path="/game/tetris" element={<TetrisGame />} />
            <Route path="/game/2048" element={<Merge2048Game />} />

            {/* Admin */}
            <Route path="/admin" element={<AuthGuard adminOnly={true}><AdminLayout /></AuthGuard>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="chat" element={<AdminChat />} />
              <Route path="games" element={<AdminGames />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="tickets" element={<AdminPanel />} />
            </Route>
          </Routes>
        </AnimatedRoutes>
      </Router>
    </AuthGuard>
  );
}

export default App;
