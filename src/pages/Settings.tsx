import { useTranslation } from 'react-i18next';
import { useStore, Language } from '../store/useStore';
import { Volume2, VolumeX, Moon, Sun, Globe, Youtube, Instagram, Send, Info, CheckCircle, Gem } from 'lucide-react';
import { clsx } from 'clsx';
import WebApp from '@twa-dev/sdk';
import { useState } from 'react';
import { InfoGuideModal } from '../components/InfoGuideModal';

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

const SocialTaskCard = ({ 
  platform, 
  reward, 
  isClaimed, 
  onClick 
}: { 
  platform: 'instagram' | 'youtube' | 'telegram', 
  reward: number, 
  isClaimed: boolean, 
  onClick: () => void 
}) => {
  const getIcon = () => {
    switch(platform) {
      case 'instagram': return <Instagram size={24} className="text-pink-500" />;
      case 'youtube': return <Youtube size={24} className="text-red-500" />;
      case 'telegram': return <Send size={24} className="text-blue-400" />;
    }
  };

  const getName = () => {
    switch(platform) {
      case 'instagram': return 'Follow on Instagram';
      case 'youtube': return 'Subscribe YouTube';
      case 'telegram': return 'Join Founding Group';
    }
  };

  const getGradient = () => {
    switch(platform) {
      case 'instagram': return 'from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30';
      case 'youtube': return 'from-red-500/20 to-orange-500/20 hover:from-red-500/30 hover:to-orange-500/30';
      case 'telegram': return 'from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30';
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
          <div className="text-xs text-gray-400">Support the community</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isClaimed ? (
          <span className="text-xs font-bold text-green-400 flex items-center gap-1">
            <CheckCircle size={14} /> Claimed
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
  const { 
    soundEnabled, 
    toggleSound, 
    language, 
    setLanguage,
    theme,
    setTheme,
    socialTasks,
    claimSocialReward
  } = useStore();

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    WebApp.HapticFeedback.selectionChanged();
  };

  const handleThemeChange = (newTheme: 'dark' | 'light' | 'gold') => {
    setTheme(newTheme);
    WebApp.HapticFeedback.selectionChanged();
  };

  const handleSocialClick = (taskId: string, url: string) => {
    WebApp.openLink(url);
    
    // Simple verification simulation - claim after delay
    setTimeout(() => {
        claimSocialReward(taskId);
        WebApp.HapticFeedback.notificationOccurred('success');
    }, 5000); 
  };

  return (
    <div className="w-full">
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

        <SettingItem 
          icon={Info} 
          title="Game Info / Guide"
          onClick={() => setShowInfo(true)}
        >
           <button className="text-xs font-bold text-primary">Open</button>
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
                Dark
              </button>
              <button
                onClick={() => handleThemeChange('light')}
                className={clsx(
                  "px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors",
                  theme === 'light' ? "bg-white text-black" : "bg-gray-800/50 text-gray-500"
                )}
              >
                Light
              </button>
              <button
                onClick={() => handleThemeChange('gold')}
                className={clsx(
                  "px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors",
                  theme === 'gold' ? "bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]" : "bg-gray-800/50 text-yellow-500/50"
                )}
              >
                Gold
              </button>
          </div>
        </SettingItem>
      </section>

      {/* Social Tasks Section */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-gray-500 uppercase mb-3 ml-1 flex items-center gap-2">
          Earn Crystals 💎
        </h2>
        
        {socialTasks.map(task => (
           <SocialTaskCard 
             key={task.id}
             platform={task.platform}
             reward={task.reward}
             isClaimed={task.isClaimed}
             onClick={() => handleSocialClick(task.id, task.url)}
           />
         ))}
      </section>
      
      <InfoGuideModal isOpen={showInfo} onClose={() => setShowInfo(false)} />
    </div>
  );
};

const SettingsPage = () => {
  const { t } = useTranslation();
  return (
    <div className="p-4 no-scrollbar">
      <h1 className="text-3xl font-bold text-primary mb-6">{t('settings', 'Settings')}</h1>
      <SettingsContent />
    </div>
  );
};

export default SettingsPage;
