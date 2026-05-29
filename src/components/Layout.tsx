import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Trophy } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { claudeTokens } from './ui/claudeTokens';

export const Layout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { bgClass, navClass, getNavItemClass, isClaude } = useThemeStyles();

  const navItems = [
    { path: '/', icon: Home, label: 'home' },
    { path: '/tournaments', icon: Trophy, label: 'tournaments' },
    { path: '/shop', icon: ShoppingBag, label: 'shop' },
  ];

  if (isClaude) {
    return (
      <div
        className="flex flex-col h-screen overflow-hidden relative transition-colors duration-500"
        style={{ backgroundColor: claudeTokens.surface, color: claudeTokens.textPrimary }}
      >
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)' }}>
          <Outlet />
        </div>

        <nav
          className="fixed left-0 right-0 bottom-0 z-50"
          style={{
            backgroundColor: 'rgba(250, 249, 245, 0.95)',
            borderTop: `1px solid ${claudeTokens.border}`,
            backdropFilter: 'saturate(140%) blur(16px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
          }}
        >
          <div className="flex justify-around items-center pt-2.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const labelText = t(item.label);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="relative flex flex-col items-center justify-center w-20 h-14 transition-colors"
                  aria-label={labelText}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Terracotta marker dot above the active icon — replaces glow */}
                  <span
                    className="absolute top-0.5 w-1 h-1 rounded-full transition-opacity"
                    style={{
                      backgroundColor: claudeTokens.accent,
                      opacity: isActive ? 1 : 0,
                    }}
                  />
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2 : 1.6}
                    style={{ color: isActive ? claudeTokens.accent : claudeTokens.textBody }}
                  />
                  <span
                    className="text-[10px] mt-1 tracking-[0.16em] uppercase"
                    style={{
                      color: isActive ? claudeTokens.accent : claudeTokens.textMuted,
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    {labelText}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  // Legacy themes (dark / light / blue / gold) — unchanged
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
