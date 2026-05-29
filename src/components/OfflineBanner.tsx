import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';

export const OfflineBanner = () => {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 z-[250] flex justify-center px-3 pointer-events-none"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
    >
      <div
        className="pointer-events-auto flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 shadow-lg"
        style={{
          backgroundColor: '#1F1E1D',
          color: '#FAF9F5',
          border: '1px solid rgba(255,255,255,0.08)',
          maxWidth: '440px',
        }}
      >
        <WifiOff size={16} strokeWidth={2} className="mt-0.5 shrink-0" style={{ color: '#D97757' }} />
        <div>
          <div className="text-[12px] font-semibold leading-tight">{t('offline_banner_title')}</div>
          <div className="text-[11px] leading-snug opacity-80 mt-0.5">{t('offline_banner_body')}</div>
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;
