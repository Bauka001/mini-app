import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
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

// Games
import SchulteGame from './pages/games/SchulteGame';
import MathGame from './pages/games/MathGame';
import StroopGame from './pages/games/StroopGame';
import MemoryGame from './pages/games/MemoryGame';
import OddOneOutGame from './pages/games/OddOneOutGame';
import PairsGame from './pages/games/PairsGame';
import TetrisGame from './pages/games/TetrisGame';

function App() {
  return (
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
        
        {/* Games */}
        <Route path="/game/schulte" element={<SchulteGame />} />
        <Route path="/game/math" element={<MathGame />} />
        <Route path="/game/stroop" element={<StroopGame />} />
        <Route path="/game/memory" element={<MemoryGame />} />
        <Route path="/game/odd-one" element={<OddOneOutGame />} />
        <Route path="/game/pairs" element={<PairsGame />} />
        <Route path="/game/tetris" element={<TetrisGame />} />
      </Routes>
    </Router>
  );
}

export default App;
