import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Gift, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore';

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useStore();

  const navItems = [
    { path: '/', icon: Home, label: 'home' }, 
    { path: '/airdrop', icon: Gift, label: 'Airdrop' },
    { path: '/community', icon: Shield, label: 'guilds' },
    { path: '/shop', icon: ShoppingBag, label: 'shop' },
  ];

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
        return "bg-black text-white";
    }
  };

  const isLight = theme === 'light';

  return (
    <div className={clsx("flex flex-col h-screen overflow-hidden relative transition-colors duration-500", getBackgroundClass())}>
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}>
        <Outlet />
      </div>
      
      {/* Floating Glass Navigation */}
      <nav
        className={clsx(
          "fixed left-3 right-3 bottom-0 mb-2 backdrop-blur-xl border rounded-2xl p-2 shadow-2xl z-50 transition-colors duration-500",
          isLight ? "bg-white/80 border-white/20" : "bg-white/10 border-white/10"
        )}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
      >
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={clsx(
                  "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-300 relative overflow-hidden touch-manipulation",
                  isActive 
                    ? (isLight ? "text-white bg-blue-600 shadow-lg" : "text-black bg-primary shadow-lg scale-105")
                    : (isLight ? "text-gray-400 hover:text-gray-600 hover:bg-black/5" : "text-gray-400 hover:text-white hover:bg-white/5")
                )}
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && <span className="text-[10px] font-bold mt-0.5 leading-none">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
