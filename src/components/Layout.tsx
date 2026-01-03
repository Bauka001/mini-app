import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Shield, Gift } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { path: '/', icon: Home, label: 'home' }, 
    { path: '/airdrop', icon: Gift, label: 'Airdrop' },
    { path: '/community', icon: Shield, label: 'guilds' },
    { path: '/shop', icon: ShoppingBag, label: 'shop' },
  ];

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden relative">
      <div className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </div>
      
      {/* Floating Glass Navigation */}
      <nav className="fixed bottom-6 left-4 right-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl z-50">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={clsx(
                  "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-300 relative overflow-hidden",
                  isActive ? "text-black bg-primary shadow-[0_0_15px_rgba(255,215,0,0.5)] scale-105" : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && <span className="text-[10px] font-bold mt-0.5 leading-none">{t(item.label)}</span>}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
