import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Trophy } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useThemeStyles } from '../hooks/useThemeStyles';

export const Layout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { bgClass, navClass, getNavItemClass } = useThemeStyles();

  const navItems = [
    { path: '/', icon: Home, label: 'home' }, 
    { path: '/tournaments', icon: Trophy, label: 'tournaments' },
    { path: '/shop', icon: ShoppingBag, label: 'shop' },
  ];

  return (
    <div className={clsx("flex flex-col h-[100dvh] w-full max-w-full overflow-hidden relative transition-colors duration-500", bgClass)}>
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden mobile-page safe-top"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}
      >
        <Outlet />
      </div>
      
      <nav
        className={clsx(
          "fixed left-0 right-0 bottom-0 z-50 transition-colors duration-500 safe-bottom",
          navClass
        )}
      >
        <div className="flex justify-around items-center pt-2 min-h-[72px]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={clsx(
                  "flex flex-col items-center justify-center min-w-[72px] min-h-[56px] px-2 py-2 transition-all duration-300",
                  getNavItemClass(isActive)
                )}
              >
                <item.icon size={24} className={clsx("transition-transform duration-300", isActive && "scale-110")} />
                <span className="text-xs mt-1 leading-tight">{t(item.label)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
