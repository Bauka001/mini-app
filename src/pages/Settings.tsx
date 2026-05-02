import { useTranslation } from 'react-i18next';
import { Language } from '../store/useStore';
import { useStore } from '../store/useStoreImpl';
import { Volume2, VolumeX, Moon, Sun, Globe, Youtube, Send, Info, CheckCircle, Gem, Share2, MessageSquare, LogOut, Instagram } from 'lucide-react';
import { clsx } from 'clsx';
import WebApp from '@twa-dev/sdk';
import { useState, useEffect } from 'react';
import { InfoGuideModal } from '../components/InfoGuideModal';
import { FeedbackModal } from '../components/FeedbackModal';

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
}) => {
  const { theme } = useStore();
  const isLight = theme === 'light';

  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between p-4 rounded-xl mb-3 border ${
        isLight 
          ? 'bg-white/80 border-gray-200' 
          : 'bg-secondary border-gray-800'
      }`}
    >
      <div className={`flex items-center gap-3 ${isLight ? 'text-gray-900' : ''}`}>
        <div className={`p-2 rounded-lg ${isLight ? 'bg-gray-200 text-gray-600' : 'bg-gray-800 text-gray-400'}`}>
          <Icon size={20} />
        </div>
        <span className="font-medium">{title}</span>
      </div>
      {children}
    </div>
  );
};

const SocialTaskCard = ({ 
  platform, 
  reward, 
  isClaimed, 
  onClick 
}: { 
  platform: 'youtube' | 'telegram' | 'instagram' | 'twitter' | 'other', 
  reward: number, 
  isClaimed: boolean, 
  onClick: () => void 
}) => {
  const { t } = useTranslation();

  const getIcon = () => {
    switch(platform) {
      case 'youtube': return <Youtube size={24} className="text-red-500" />;
      case 'telegram': return <Send size={24} className="text-blue-400" />;
      case 'instagram': return <Instagram size={24} className="text-pink-500" />;
      case 'twitter': return <Share2 size={24} className="text-blue-400" />;
      default: return <Share2 size={24} className="text-gray-400" />;
    }
  };

  const getName = () => {
    switch(platform) {
      case 'youtube': return t('task_youtube');
      case 'telegram': return t('task_telegram');
      case 'instagram': return t('task_instagram');
      case 'twitter': return t('task_twitter');
      default: return t('social_network');
    }
  };

  const getGradient = () => {
    switch(platform) {
      case 'youtube': return 'from-red-500/20 to-orange-500/20 hover:from-red-500/30 hover:to-orange-500/30';
      case 'telegram': return 'from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30';
      case 'instagram': return 'from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30';
      default: return 'from-gray-500/20 to-gray-400/20 hover:from-gray-500/30 hover:to-gray-400/30';
    }
  };

  return (
    <button 
      onClick={onClick}
      disabled={isClaimed}
      className={clsx(
        "w-full p-4 rounded-2xl flex items-center justify-between border border-white/5 transition-all active:scale-[0.98] mb-3",
        isClaimed ? "bg-white/5 opacity-50" : `bg-gradient-to-r ${getGradient()}`
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          {getIcon()}
        </div>
        <div className="text-left">
          <div className="text-sm font-bold text-white">{getName()}</div>
          <div className="text-xs text-gray-400">{t('support_community')}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isClaimed ? (
          <span className="text-xs font-bold text-green-400 flex items-center gap-1">
            <CheckCircle size={14} /> {t('claimed')}
          </span>
        ) : (
          <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-lg text-white text-xs font-bold">
            <Gem size={14} className="text-blue-400" />
            +{String(reward)}
          </div>
        )}
      </div>
    </button>
  );
};

export const SettingsContent = () => {
  const { t, i18n } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const { 
    soundEnabled, 
    toggleSound, 
    language, 
    setLanguage,
    theme,
    setTheme,
    socialTasks,
    fetchSocialTasks,
    claimSocialTask,
    user,
    logout
  } = useStore();

  useEffect(() => {
    void fetchSocialTasks();
  }, [fetchSocialTasks]);

  const isLight = theme === 'light';

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    WebApp.HapticFeedback.selectionChanged();
  };

  const handleThemeChange = (newTheme: 'dark' | 'light' | 'gold' | 'blue') => {
    setTheme(newTheme);
    WebApp.HapticFeedback.selectionChanged();
  };

  const handleSocialClick = (taskId: string, url: string) => {
    WebApp.openLink(url);
    
    // Simple verification simulation - claim after delay
    setTimeout(() => {
        void claimSocialTask(taskId);
        WebApp.HapticFeedback.notificationOccurred('success');
    }, 5000); 
  };

  return (
    <div className="w-full">
      <section className="mb-8">
        <h2 className={`text-sm font-bold uppercase mb-3 ml-1 ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{t('settings')}</h2>
        
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

        <SettingItem icon={Info} 
          title={t('game_info_guide')}
          onClick={() => setShowInfo(true)}
        >
           <button className="text-xs font-bold text-primary">{t('open')}</button>
        </SettingItem>

        <SettingItem icon={MessageSquare} 
          title={t('feedback_support')}
          onClick={() => setShowFeedback(true)}
        >
            <button className="text-xs font-bold text-primary">{t('write_btn')}</button>
          </SettingItem>

        <SettingItem icon={Share2} title={t('share_app')}>
          <button
            onClick={() => {
              const shareText = t(i18n.language === 'kz' ? 'share_text_kz' : i18n.language === 'ru' ? 'share_text_ru' : 'share_text_en', { level: user?.level || 1 });

              const shareUrl = 'https://t.me/Focus_game_bot?start=app';

              if (WebApp.shareText) {
                WebApp.shareText(shareText, shareUrl);
              } else {
                WebApp.openTelegramLink(shareUrl);
              }

              WebApp.HapticFeedback.notificationOccurred('success');
            }}
            className="text-xs font-bold text-primary"
          >
            {t('share_button')}
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
          <div className="flex gap-2">
             <button
                onClick={() => handleThemeChange('dark')}
                className={clsx(
                  "px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors",
                  theme === 'dark' ? "bg-gray-800 text-white border border-gray-600" : "bg-gray-800/50 text-gray-500"
                )}
              >
                {t('theme_dark')}
              </button>
              <button
                onClick={() => handleThemeChange('light')}
                className={clsx(
                  "px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors",
                  theme === 'light' ? "bg-white text-black" : "bg-gray-800/50 text-gray-500"
                )}
              >
                {t('theme_light')}
              </button>
              <button
                onClick={() => handleThemeChange('blue')}
                className={clsx(
                  "px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors",
                  theme === 'blue' ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]" : "bg-gray-800/50 text-blue-500/50"
                )}
              >
                {t('theme_blue')}
              </button>
          </div>
        </SettingItem>

        <SettingItem icon={LogOut} title={t('log_out')} onClick={() => {
          if (confirm(t('logout_confirm'))) {
            logout();
            WebApp.close();
          }
        }}>
          <button className="text-xs font-bold text-red-500">{t('log_out')}</button>
        </SettingItem>
      </section>

      <InfoGuideModal isOpen={showInfo} onClose={() => setShowInfo(false)} />
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  );
};

const SettingsPage = () => {
  const { t } = useTranslation();
  const { theme } = useStore();
  const isLight = theme === 'light';
  return (
    <div className="p-4 no-scrollbar">
      <h1 className={`text-3xl font-bold mb-6 ${isLight ? 'text-gray-900' : 'text-primary'}`}>{t('settings', 'Settings')}</h1>
      <SettingsContent />
    </div>
  );
};

export default SettingsPage;
