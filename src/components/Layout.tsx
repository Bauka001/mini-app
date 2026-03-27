import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Gift } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore';

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useStore();

  const navItems = [
    { path: '/', icon: Home, label: 'home' }, 
    { path: '/airdrop', icon: Gift, label: 'Airdrop' },
    { path: '/shop', icon: ShoppingBag, label: 'shop' },
  ];

  const getBackgroundClass = () => {
    switch (theme) {
      case 'blue':
        return "bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800";
      case 'light':
        return "bg-white text-gray-900";
      case 'gold':
        return "bg-yellow-100 text-gray-900";
      case 'dark':
      default:
        return "bg-black text-white";
    }
  };

  const isLight = theme === 'light';

  return (
    <div className={clsx("flex flex-col h-screen overflow-hidden relative", getBackgroundClass())}>
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}>
        <Outlet />
      </div>
      
      <nav
        className={clsx(
          "fixed left-0 right-0 bottom-0 border-t z-50",
          isLight ? "bg-white border-gray-200" : "bg-black border-gray-800"
        )}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
      >
        <div className="flex justify-around items-center pt-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={clsx(
                  "flex flex-col items-center justify-center w-20 h-16",
                  isActive 
                    ? (isLight ? "text-blue-600" : "text-blue-400")
                    : (isLight ? "text-gray-500" : "text-gray-400")
                )}
              >
                <item.icon size={24} />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
