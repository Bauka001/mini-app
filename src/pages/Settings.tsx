import { useTranslation } from 'react-i18next';
import { useStore, Language } from '../store/useStore';
import { Volume2, VolumeX, Moon, Sun, Globe, Youtube, Instagram, Send } from 'lucide-react';
import { clsx } from 'clsx';
import WebApp from '@twa-dev/sdk';

const SettingItem = ({ 
  icon: Icon, 
  title, 
  children,
  onClick
}: { 
  icon: any, 
  title: string, 
  children?: React.ReactNode,
  onClick?: () => void 
}) => (
  <div 
    onClick={onClick}
    className="flex items-center justify-between p-4 bg-secondary rounded-xl mb-3 border border-gray-800"
  >
    <div className="flex items-center gap-3">
      <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
        <Icon size={20} />
      </div>
      <span className="font-medium">{title}</span>
    </div>
    {children}
  </div>
);

const SettingsPage = () => {
  const { t, i18n } = useTranslation();
  const { 
    soundEnabled, 
    toggleSound, 
    language, 
    setLanguage,
    theme,
    setTheme
  } = useStore();

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    WebApp.HapticFeedback.selectionChanged();
  };

  const handleThemeChange = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    WebApp.HapticFeedback.selectionChanged();
  };

  const openLink = (url: string) => {
    WebApp.openLink(url);
  };

  return (
    <div className="p-4 pb-24">
      <h1 className="text-3xl font-bold text-primary mb-6">{t('settings', 'Settings')}</h1>

      <section className="mb-8">
        <h2 className="text-sm font-bold text-gray-500 uppercase mb-3 ml-1">{t('settings')}</h2>
        
        <SettingItem 
          icon={soundEnabled ? Volume2 : VolumeX} 
          title={t('sound')}
        >
          <button 
            onClick={() => {
              toggleSound();
              WebApp.HapticFeedback.selectionChanged();
            }}
            className={clsx(
              "w-12 h-7 rounded-full transition-colors relative",
              soundEnabled ? "bg-primary" : "bg-gray-700"
            )}
          >
            <div className={clsx(
              "absolute top-1 w-5 h-5 rounded-full bg-black transition-transform",
              soundEnabled ? "left-6" : "left-1"
            )} />
          </button>
        </SettingItem>

        <SettingItem icon={Globe} title={t('language')}>
          <div className="flex gap-2">
            {(['en', 'ru', 'kz'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={clsx(
                  "px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors",
                  language === lang ? "bg-primary text-black" : "bg-gray-800 text-gray-400"
                )}
              >
                {lang}
              </button>
            ))}
          </div>
        </SettingItem>

        <SettingItem 
          icon={theme === 'dark' ? Moon : Sun} 
          title={t('theme')}
        >
          <button 
            onClick={handleThemeChange}
            className={clsx(
              "w-12 h-7 rounded-full transition-colors relative",
              theme === 'light' ? "bg-primary" : "bg-gray-700"
            )}
          >
            <div className={clsx(
              "absolute top-1 w-5 h-5 rounded-full bg-black transition-transform",
              theme === 'light' ? "left-6" : "left-1"
            )} />
          </button>
        </SettingItem>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-bold text-gray-500 uppercase mb-3 ml-1">{t('support')}</h2>
        
        <SettingItem 
          icon={Youtube} 
          title={t('youtube')}
          onClick={() => openLink('https://youtube.com/@yourchannel')} 
        />
        <SettingItem 
          icon={Instagram} 
          title={t('instagram')}
          onClick={() => openLink('https://instagram.com')} 
        />
        <SettingItem 
          icon={Send} 
          title={t('telegram_channel')}
          onClick={() => openLink('https://t.me')} 
        />
      </section>
    </div>
  );
};

export default SettingsPage;
