import React, { ReactNode } from 'react';
import WebApp from '@twa-dev/sdk';
import { useTranslation } from 'react-i18next';
import { useTelegramAuth } from '../hooks/useTelegramAuth';
import { useAdminAccess } from '../hooks/useAdminAccess';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  adminOnly?: boolean;
}

const LoadingPanel = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-t-primary border-white/10 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-bold">{t('auth_loading_title')}</p>
        <p className="text-sm text-gray-400 mt-1">{t('auth_loading_subtitle')}</p>
      </div>
    </div>
  );
};

export const AuthGuard = ({
  children,
  fallback,
  adminOnly = false,
}: AuthGuardProps) => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, errorKey, errorReason, user, isGuest } = useTelegramAuth();
  const {
    isAdmin,
    isLoading: isAdminLoading,
    error: adminError,
  } = useAdminAccess(adminOnly && isAuthenticated && !isGuest);

  const fallbackNode = fallback ?? <LoadingPanel />;

  if (isLoading) return <>{fallbackNode}</>;

  if (adminOnly && isGuest) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-4">{t('auth_admin_only_title')}</h2>
          <p className="text-gray-400 mb-6">{t('auth_admin_only_body')}</p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gray-600 text-white font-bold rounded-xl hover:scale-105 transition-transform"
          >
            {t('back')}
          </button>
        </div>
      </div>
    );
  }

  if (adminOnly && isAdminLoading) return <>{fallbackNode}</>;

  if (errorKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-red-500 mb-4">{t('auth_error_title')}</h2>
          <p className="text-gray-300 mb-2">{t(errorKey)}</p>
          {errorReason && (
            <p className="text-xs text-gray-500 mb-6 font-mono break-all">
              {t('auth_reason_label')}: {errorReason}
            </p>
          )}
          <button
            onClick={() => WebApp.close()}
            className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-transform"
          >
            {t('auth_error_close')}
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="text-2xl font-bold mb-4">{t('auth_open_in_telegram_title')}</h2>
          <p className="text-gray-400 mb-8">{t('auth_open_in_telegram_body')}</p>
          <button
            onClick={() => WebApp.openTelegramLink('https://t.me/focusgameapp_bot?startapp')}
            className="px-6 py-3 bg-[#2AABEE] text-white font-bold rounded-xl hover:scale-105 transition-transform"
          >
            {t('auth_open_in_telegram_cta')}
          </button>
        </div>
      </div>
    );
  }

  if (adminOnly && adminError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🛡️</div>
          <h2 className="text-2xl font-bold text-red-500 mb-4">{t('auth_admin_check_failed_title')}</h2>
          <p className="text-gray-300 mb-6">{adminError}</p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gray-600 text-white font-bold rounded-xl hover:scale-105 transition-transform"
          >
            {t('back')}
          </button>
        </div>
      </div>
    );
  }

  if (adminOnly && user && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-red-500 mb-4">{t('auth_no_access_title')}</h2>
          <p className="text-gray-300 mb-6">{t('auth_no_access_body')}</p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gray-600 text-white font-bold rounded-xl hover:scale-105 transition-transform"
          >
            {t('back')}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
