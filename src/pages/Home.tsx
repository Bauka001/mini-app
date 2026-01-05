import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Brain, Calculator, Type, Grid, Trophy, Target, Bell, 
  CheckCircle, Video, Coins, Zap, Eye, Copy, Swords, Info, 
  Settings, Gift, Menu, User, ChevronRight, ShoppingCart, 
  Wallet, BarChart2, HelpCircle, Map
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { clsx } from 'clsx';
import { showAd } from '../utils/ads';

const GameGridItem = ({ 
  title, 
  icon: Icon, 
  onClick,
  isLight
}: { 
  title: string, 
  icon: any, 
  onClick: () => void,
  isLight: boolean
}) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-2 active:opacity-70 transition-opacity"
  >
    <div className="w-12 h-12 flex items-center justify-center">
      <Icon size={32} className={isLight ? "text-[#f14635] drop-shadow-sm" : "text-white drop-shadow-md"} />
    </div>
    <span className={clsx("text-[11px] font-medium text-center leading-tight", isLight ? "text-gray-700" : "text-white/90")}>{title}</span>
  </button>
);

const ListItem = ({ 
  icon: Icon, 
  title, 
  subtitle,
  onClick,
  isLight
}: { 
  icon: any, 
  title: string, 
  subtitle?: string,
  onClick: () => void,
  isLight: boolean
}) => (
  <button 
    onClick={onClick}
    className={clsx(
      "w-full p-4 flex items-center justify-between border-b last:border-0 transition-colors",
      isLight ? "bg-white border-gray-100 active:bg-gray-50" : "bg-white/10 border-white/5 active:bg-white/20 backdrop-blur-sm"
    )}
  >
    <div className="flex items-center gap-4">
      <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", isLight ? "bg-[#f14635]/10" : "bg-white/20")}>
        <Icon size={24} className={isLight ? "text-[#f14635]" : "text-white"} />
      </div>
      <div className="text-left">
        <div className={clsx("font-medium", isLight ? "text-gray-900" : "text-white")}>{title}</div>
        {subtitle && <div className={clsx("text-xs", isLight ? "text-gray-500" : "text-white/60")}>{subtitle}</div>}
      </div>
    </div>
    <ChevronRight size={20} className={isLight ? "text-gray-300" : "text-white/40"} />
  </button>
);

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { 
    coins,
    fecBalance,
    watchAd,
    theme
  } = useStore();

  const [showMenu, setShowMenu] = useState(false);

  const getBackgroundClass = () => {
    switch (theme) {
      case 'blue':
        return "bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800";
      case 'light':
        return "bg-[#f2f3f5] text-gray-900";
      case 'gold':
        return "bg-gradient-to-br from-yellow-900 via-yellow-700 to-yellow-900";
      case 'dark':
      default:
        return "bg-black";
    }
  };

  const isLight = theme === 'light';

  return (
    <div className={clsx("min-h-screen pb-20 font-sans transition-colors duration-500", getBackgroundClass(), isLight ? "text-gray-900" : "text-white")}>
      {/* Background Glows (Only for Dark/Blue themes) */}
      {!isLight && (
        <>
          <div className="fixed top-[-20%] left-[-20%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="fixed bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
        </>
      )}

      {/* Header */}
      <header className={clsx(
        "px-4 py-3 flex justify-between items-center sticky top-0 z-50 border-b backdrop-blur-xl",
        isLight ? "bg-white border-gray-200" : "bg-white/5 border-white/10"
      )}>
        <button onClick={() => setShowMenu(!showMenu)}>
          <Menu size={24} className={isLight ? "text-[#f14635]" : "text-white"} />
        </button>
        <h1 className={clsx("text-xl font-bold tracking-tight", isLight ? "text-[#f14635]" : "text-white")}>Focus App</h1>
        <button onClick={() => navigate('/profile')}>
          <User size={24} className={isLight ? "text-[#f14635]" : "text-white"} />
        </button>
      </header>

      {/* Stories Area */}
      <div className={clsx(
        "p-4 pb-6 border-b backdrop-blur-md",
        isLight ? "bg-[#fcd535] border-transparent" : "bg-white/5 border-white/5"
      )}>
        <div className="flex overflow-x-auto gap-4 no-scrollbar pb-2">
          {/* Daily Reward Story */}
          <button className="flex flex-col items-center gap-1 min-w-[70px]">
            <div className={clsx("w-16 h-16 rounded-full border-2 p-1", isLight ? "border-white bg-white" : "border-yellow-400")}>
               <div className={clsx("w-full h-full rounded-full flex items-center justify-center", isLight ? "bg-orange-100" : "bg-yellow-400/20 backdrop-blur-md")}>
                 <Gift size={24} className={isLight ? "text-orange-500" : "text-yellow-400"} />
               </div>
            </div>
            <span className={clsx("text-[10px] font-medium text-center leading-tight", isLight ? "text-black/80" : "text-white/90")}>Daily<br/>Bonus</span>
          </button>

          {/* Leaderboard Story */}
          <button onClick={() => navigate('/leaderboard')} className="flex flex-col items-center gap-1 min-w-[70px]">
            <div className={clsx("w-16 h-16 rounded-full border-2 p-1", isLight ? "border-white bg-white" : "border-blue-400")}>
               <div className={clsx("w-full h-full rounded-full flex items-center justify-center", isLight ? "bg-blue-100" : "bg-blue-400/20 backdrop-blur-md")}>
                 <Trophy size={24} className={isLight ? "text-blue-500" : "text-blue-400"} />
               </div>
            </div>
            <span className={clsx("text-[10px] font-medium text-center leading-tight", isLight ? "text-black/80" : "text-white/90")}>Top<br/>Players</span>
          </button>

          {/* Ad Story */}
          <button onClick={() => { watchAd(50); alert("Ad watched! +50 Coins"); }} className="flex flex-col items-center gap-1 min-w-[70px]">
            <div className={clsx("w-16 h-16 rounded-full border-2 p-0.5", isLight ? "border-red-500 bg-white" : "border-pink-500")}>
               <div className="w-full h-full rounded-full overflow-hidden relative">
                 <img src="https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=150&q=80" alt="Ad" className={clsx("w-full h-full object-cover", !isLight && "opacity-80")} />
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                   <Video size={20} className="text-white" />
                 </div>
               </div>
            </div>
            <span className={clsx("text-[10px] font-medium text-center leading-tight", isLight ? "text-black/80" : "text-white/90")}>Watch<br/>Ad</span>
          </button>
          
          {/* Balance Story */}
          <div className="flex flex-col items-center gap-1 min-w-[70px]">
            <div className={clsx("w-16 h-16 rounded-full border-2 p-1", isLight ? "border-white bg-white" : "border-green-400")}>
               <div className={clsx("w-full h-full rounded-full flex flex-col items-center justify-center", isLight ? "bg-green-100" : "bg-green-400/20 backdrop-blur-md")}>
                 <span className={clsx("text-[10px] font-bold", isLight ? "text-green-700" : "text-green-400")}>$FEC</span>
                 <span className={clsx("text-xs font-black", isLight ? "text-green-800" : "text-white")}>{fecBalance?.toFixed(1)}</span>
               </div>
            </div>
            <span className={clsx("text-[10px] font-medium text-center leading-tight", isLight ? "text-black/80" : "text-white/90")}>My<br/>Wallet</span>
          </div>
        </div>
      </div>

      {/* Main Grid Menu (Games) */}
      <div className={clsx(
        "p-4 pt-6 pb-6 -mt-4 rounded-t-3xl border-t relative z-10 mx-2 backdrop-blur-lg",
        isLight ? "bg-white border-white shadow-sm" : "bg-white/10 border-white/10"
      )}>
        <div className="grid grid-cols-4 gap-y-6 gap-x-2">
          <GameGridItem title="Memory" icon={Grid} onClick={() => navigate('/game/memory')} isLight={isLight} />
          <GameGridItem title="Schulte" icon={Brain} onClick={() => navigate('/game/schulte')} isLight={isLight} />
          <GameGridItem title="Math" icon={Calculator} onClick={() => navigate('/game/math')} isLight={isLight} />
          <GameGridItem title="Pairs" icon={Copy} onClick={() => navigate('/game/pairs')} isLight={isLight} />
          
          <GameGridItem title="Odd One" icon={Eye} onClick={() => navigate('/game/odd-one')} isLight={isLight} />
          <GameGridItem title="Stroop" icon={Type} onClick={() => navigate('/game/stroop')} isLight={isLight} />
          <GameGridItem title="Tetris" icon={Grid} onClick={() => navigate('/game/tetris')} isLight={isLight} />
          <GameGridItem title="Battle" icon={Swords} onClick={() => navigate('/battle')} isLight={isLight} />
        </div>
      </div>

      {/* List Menu Section */}
      <div className="mt-4 space-y-3 px-4">
        <div className={clsx("rounded-2xl overflow-hidden border", isLight ? "bg-white border-white" : "bg-white/10 border-white/5 backdrop-blur-md")}>
          <ListItem 
            title="Shop" 
            subtitle="Skins, Chests & Upgrades" 
            icon={ShoppingCart} 
            onClick={() => navigate('/shop')} 
            isLight={isLight}
          />
          <ListItem 
            title="Airdrop" 
            subtitle="Withdraw $FEC & Tasks" 
            icon={Wallet} 
            onClick={() => navigate('/airdrop')} 
            isLight={isLight}
          />
          <ListItem 
            title="My Profile" 
            subtitle="Stats & Achievements" 
            icon={User} 
            onClick={() => navigate('/profile')} 
            isLight={isLight}
          />
        </div>

        <div className={clsx("rounded-2xl overflow-hidden border", isLight ? "bg-white border-white" : "bg-white/10 border-white/5 backdrop-blur-md")}>
          <ListItem 
            title="Daily Workout" 
            subtitle="Keep your streak alive!" 
            icon={Zap} 
            onClick={() => navigate('/daily-workout')} 
            isLight={isLight}
          />
          <ListItem 
            title="Settings" 
            icon={Settings} 
            onClick={() => navigate('/settings')} 
            isLight={isLight}
          />
        </div>
      </div>

      {/* Bottom Info */}
      <div className={clsx("p-6 text-center text-xs", isLight ? "text-gray-400" : "text-white/40")}>
        <p>© 2026 Focus App. All rights reserved.</p>
        <p className="mt-1">Version 1.2.0</p>
      </div>
    </div>
  );
};

export default Home;
