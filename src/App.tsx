import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import NotificationsPage from './pages/Notifications';
import ShopPage from './pages/Shop';
import SettingsPage from './pages/Settings';
import SchulteGame from './pages/games/SchulteGame';
import MathGame from './pages/games/MathGame';
import StroopGame from './pages/games/StroopGame';
import { useStore } from './store/useStore';
import { useEffect } from 'react';

function App() {
  const { theme } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        
        {/* Games should be outside the main layout (no bottom nav) or inside? Usually full screen */}
        {/* Let's put them outside for full immersion */}
        <Route path="/game/schulte" element={<SchulteGame />} />
        <Route path="/game/math" element={<MathGame />} />
        <Route path="/game/stroop" element={<StroopGame />} />
      </Routes>
    </Router>
  );
}

export default App;
