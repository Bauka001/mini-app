import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/admin/AdminLayout';
import { AuthGuard } from './components/AuthGuard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminChat } from './pages/admin/AdminChat';
import { AdminGames } from './pages/admin/AdminGames';
import AdminSettings from './pages/admin/AdminSettings';
import AdminPanel from './pages/AdminPanel';
import AdminAirdrop from './pages/admin/AdminAirdrop';
import { useStore } from './store/useStore';

// Static imports to prevent lazy loading errors
import Home from './pages/Home';
import ShopPage from './pages/Shop';
import SettingsPage from './pages/Settings';
import ProfilePage from './pages/Profile';
import LeaderboardPage from './pages/Leaderboard';
import GuildsPage from './pages/Guilds';
import BattlePage from './pages/Battle';
import DailyWorkoutPage from './pages/DailyWorkout';
import AirdropPage from './pages/Airdrop';
import Tournaments from './pages/Tournaments';

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
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  useEffect(() => {
    syncUserFromTelegram();
    if (WebApp) {
      try {
        WebApp.ready();
        WebApp.expand();
      } catch {}
    }
  }, [syncUserFromTelegram]);

  useEffect(() => {
    let count = 0;
    const timer = setInterval(() => {
      syncUserFromTelegram();
      count++;
      const id = useStore.getState().user.id;
      if (id && typeof id === 'number') {
        clearInterval(timer);
      }
      if (count > 20) {
        clearInterval(timer);
      }
    }, 250);
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

  const handleAdminLogin = () => {
    const secretCode = prompt('Әкімшілік кодын енгізіңіз:');
    if (secretCode === 'FOCUS_ADMIN_2024') {
      // Add user ID to admin list (demo mode)
      alert('Әкімшілік сәтті қосылды!');
      setShowAdminLogin(false);
    } else if (secretCode) {
      alert('Жарамсыз код!');
    }
  };

  return (
    <AuthGuard>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="community" element={<GuildsPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="airdrop" element={<AirdropPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/daily-workout" element={<DailyWorkoutPage />} />
          <Route path="/battle" element={<BattlePage />} />
          <Route path="/tournaments" element={<Tournaments />} />
          
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
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AuthGuard adminOnly={true}><AdminDashboard /></AuthGuard>} />
            <Route path="users" element={<AuthGuard adminOnly={true}><AdminUsers /></AuthGuard>} />
            <Route path="chat" element={<AuthGuard adminOnly={true}><AdminChat /></AuthGuard>} />
            <Route path="games" element={<AuthGuard adminOnly={true}><AdminGames /></AuthGuard>} />
            <Route path="settings" element={<AuthGuard adminOnly={true}><AdminSettings /></AuthGuard>} />
            <Route path="tickets" element={<AuthGuard adminOnly={true}><AdminPanel /></AuthGuard>} />
            <Route path="airdrop" element={<AuthGuard adminOnly={true}><AdminAirdrop /></AuthGuard>} />
          </Route>
        </Routes>
      </Router>
    </AuthGuard>
  );
}

export default App;
