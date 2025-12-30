import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Bell, Settings, ShoppingBag } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { path: '/', icon: Home, label: 'home' }, 
    { path: '/notifications', icon: Bell, label: 'notifications' },
    { path: '/shop', icon: ShoppingBag, label: 'shop' },
    { path: '/settings', icon: Settings, label: 'settings' },
  ];

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 left-0 right-0 bg-secondary border-t border-gray-800 p-2 pb-6 safe-area-pb">
        <div className="flex justify-around items-center">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={clsx(
                "flex flex-col items-center p-2 rounded-lg transition-colors w-16",
                location.pathname === item.path ? "text-primary" : "text-gray-400"
              )}
            >
              <item.icon size={24} />
              <span className="text-xs mt-1">{t(item.label)}</span> 
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
