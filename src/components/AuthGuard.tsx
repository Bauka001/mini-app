import React, { ReactNode } from 'react';
import { useTelegramAuth } from '../hooks/useTelegramAuth';
import WebApp from '@twa-dev/sdk';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  adminOnly?: boolean;
}

export const AuthGuard = ({ 
  children, 
  fallback = (
    <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-bold">Жүктелуде...</p>
        <p className="text-sm text-gray-400">Telegram-нан деректер алынуда</p>
      </div>
    </div>
  ),
  adminOnly = false
}: AuthGuardProps) => {
  const { isAuthenticated, isLoading, error, user } = useTelegramAuth();
  const ADMIN_IDS = [123456789];

  // Loading state
  if (isLoading) {
    return <>{fallback}</>;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-red-500 mb-4">Қате орын алды!</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => WebApp.close()}
            className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-transform"
          >
            Жабу
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="text-2xl font-bold mb-4">Telegram-нан ашыңыз</h2>
          <p className="text-gray-400 mb-8">
            Бұл қолданба Telegram Mini App. 
            Дұрыс аутентификация үшін Telegram-ден ашыңыз.
          </p>
          <button
            onClick={() => WebApp.openTelegramLink('https://t.me/Focus_game_bot?startapp')}
            className="px-6 py-3 bg-[#2AABEE] text-white font-bold rounded-xl hover:scale-105 transition-transform"
          >
            Bot-қа өту
          </button>
        </div>
      </div>
    );
  }

  // Admin check
  if (adminOnly && user && !ADMIN_IDS.includes(user.id)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-red-500 mb-4">Қатынау рұқсат</h2>
          <p className="text-gray-300 mb-6">
            Бұл бет тек әкімшілер үшін қолжетімді.
          </p>
          <button
            onClick={() => WebApp.close()}
            className="px-6 py-3 bg-gray-600 text-white font-bold rounded-xl hover:scale-105 transition-transform"
          >
            Артқа қайту
          </button>
        </div>
      </div>
    );
  }

  // Authenticated
  return <>{children}</>;
};
