import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Gift } from 'lucide-react';
import { clsx } from 'clsx';
import { useThemeStyles } from '../hooks/useThemeStyles';

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bgClass, navClass, getNavItemClass } = useThemeStyles();

  const navItems = [
    { path: '/', icon: Home, label: 'home' }, 
    { path: '/airdrop', icon: Gift, label: 'Airdrop' },
    { path: '/shop', icon: ShoppingBag, label: 'shop' },
  ];

  return (
    <div className={clsx("flex flex-col h-screen overflow-hidden relative transition-colors duration-500", bgClass)}>
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}>
        <Outlet />
      </div>
      
      <nav
        className={clsx(
          "fixed left-0 right-0 bottom-0 z-50 transition-colors duration-500",
          navClass
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
                  "flex flex-col items-center justify-center w-20 h-16 transition-all duration-300",
                  getNavItemClass(isActive)
                )}
              >
                <item.icon size={24} className={clsx("transition-transform duration-300", isActive && "scale-110")} />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
