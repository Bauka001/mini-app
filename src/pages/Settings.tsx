import { useTranslation } from 'react-i18next';
import { Language } from '../store/useStore';
import { useStore } from '../store/useStoreImpl';
import { Volume2, VolumeX, Moon, Sun, Globe, Youtube, Send, Info, CheckCircle, Gem, Share2, MessageSquare, LogOut, Instagram, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import WebApp from '@twa-dev/sdk';
import { useState, useEffect, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { InfoGuideModal } from '../components/InfoGuideModal';
import { FeedbackModal } from '../components/FeedbackModal';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { claudeTokens } from '../components/ui/claudeTokens';
import { useAdminAccess } from '../hooks/useAdminAccess';

const SettingItem = ({
  icon: Icon,
  title,
  children,
  onClick,
}: {
  icon: ElementType;
  title: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) => {
  const { theme } = useStore();
  const isLight = theme === 'light';
  const isClaude = theme === 'claude';

  if (isClaude) {
    return (
      <div
        onClick={onClick}
        className={clsx(
          'flex items-center justify-between p-4 rounded-xl mb-3',
          onClick && 'cursor-pointer hover:bg-[#F0EEE6] transition-colors'
        )}
        style={{
          backgroundColor: claudeTokens.surface,
          border: `1px solid ${claudeTokens.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: claudeTokens.surfaceMuted,
              border: `1px solid ${claudeTokens.border}`,
              color: claudeTokens.textPrimary,
            }}
          >
            <Icon size={17} strokeWidth={1.75} />
          </div>
          <span className="text-[14px]" style={{ color: claudeTokens.textPrimary, fontWeight: 500 }}>
            {title}
          </span>
        </div>
        {children}
      </div>
    );
  }

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
  onClick,
}: {
  platform: 'youtube' | 'telegram' | 'instagram' | 'twitter' | 'other';
  reward: number;
  isClaimed: boolean;
  onClick: () => void;
}) => {
  const { t } = useTranslation();
  const { isClaude } = useThemeStyles();

  const getIcon = (claude: boolean = false) => {
    if (claude) {
      switch (platform) {
        case 'youtube':
          return (
            <Youtube size={20} strokeWidth={1.75} style={{ color: claudeTokens.textPrimary }} />
          );
        case 'telegram':
          return (
            <Send size={20} strokeWidth={1.75} style={{ color: claudeTokens.textPrimary }} />
          );
        case 'instagram':
          return (
            <Instagram size={20} strokeWidth={1.75} style={{ color: claudeTokens.textPrimary }} />
          );
        case 'twitter':
          return (
            <Share2 size={20} strokeWidth={1.75} style={{ color: claudeTokens.textPrimary }} />
          );
        default:
          return (
            <Share2 size={20} strokeWidth={1.75} style={{ color: claudeTokens.textPrimary }} />
          );
      }
    }
    switch (platform) {
      case 'youtube': return <Youtube size={24} className="text-red-500" />;
      case 'telegram': return <Send size={24} className="text-blue-400" />;
      case 'instagram': return <Instagram size={24} className="text-pink-500" />;
      case 'twitter': return <Share2 size={24} className="text-blue-400" />;
      default: return <Share2 size={24} className="text-gray-400" />;
    }
  };

  const getName = () => {
    switch (platform) {
      case 'youtube': return t('task_youtube');
      case 'telegram': return t('task_telegram');
      case 'instagram': return t('task_instagram');
      case 'twitter': return t('task_twitter');
      default: return t('social_network');
    }
  };

  if (isClaude) {
    return (
      <button
        onClick={onClick}
        disabled={isClaimed}
        className="w-full p-4 rounded-xl flex items-center justify-between mb-3 transition-colors"
        style={{
          backgroundColor: isClaimed ? claudeTokens.surfaceMuted : claudeTokens.surface,
          border: `1px solid ${claudeTokens.border}`,
          opacity: isClaimed ? 0.6 : 1,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: claudeTokens.surfaceMuted,
              border: `1px solid ${claudeTokens.border}`,
            }}
          >
            {getIcon(true)}
          </div>
          <div className="text-left">
            <div className="text-[14px]" style={{ color: claudeTokens.textPrimary, fontWeight: 500 }}>
              {getName()}
            </div>
            <div className="text-[11px]" style={{ color: claudeTokens.textMuted }}>
              {t('support_community')}
            </div>
          </div>
        </div>
        {isClaimed ? (
          <span
            className="text-[10px] uppercase tracking-[0.22em] italic flex items-center gap-1"
            style={{ color: claudeTokens.success, fontFamily: claudeTokens.serifStack }}
          >
            <CheckCircle size={12} strokeWidth={2} />
            {t('claimed')}
          </span>
        ) : (
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] tabular-nums"
            style={{
              backgroundColor: claudeTokens.surfaceMuted,
              color: claudeTokens.accent,
              border: `1px solid ${claudeTokens.border}`,
              fontFamily: claudeTokens.serifStack,
              fontWeight: 500,
            }}
          >
            <Gem size={12} strokeWidth={1.75} />
            +{String(reward)}
          </div>
        )}
      </button>
    );
  }

  const getGradient = () => {
    switch (platform) {
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
        'w-full p-4 rounded-2xl flex items-center justify-between border border-white/5 transition-all active:scale-[0.98] mb-3',
        isClaimed ? 'bg-white/5 opacity-50' : `bg-gradient-to-r ${getGradient()}`
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          {getIcon(false)}
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
    logout,
  } = useStore();
  const { isClaude } = useThemeStyles();
  const navigate = useNavigate();
  const { isAdmin } = useAdminAccess();

  useEffect(() => {
    void fetchSocialTasks();
  }, [fetchSocialTasks]);

  const isLight = theme === 'light';

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    WebApp.HapticFeedback.selectionChanged();
  };

  const handleThemeChange = (newTheme: 'dark' | 'light' | 'gold' | 'blue' | 'claude') => {
    setTheme(newTheme);
    WebApp.HapticFeedback.selectionChanged();
  };

  const handleSocialClick = (taskId: string, url: string) => {
    WebApp.openLink(url);
    setTimeout(() => {
      void claimSocialTask(taskId);
      WebApp.HapticFeedback.notificationOccurred('success');
    }, 5000);
  };

  // Helper for the language and theme inline pill toggles. Claude-aware.
  const pillStyle = (active: boolean, accentColor?: string) => {
    if (isClaude) {
      return active
        ? {
            backgroundColor: accentColor || claudeTokens.accent,
            color: '#FFFFFF',
            border: `1px solid ${accentColor || claudeTokens.accent}`,
          }
        : {
            backgroundColor: claudeTokens.surface,
            color: claudeTokens.textMuted,
            border: `1px solid ${claudeTokens.border}`,
          };
    }
    return undefined;
  };

  return (
    <div className="w-full">
      <section className="mb-8">
        <h2
          className={clsx(
            'text-[10px] font-medium uppercase tracking-[0.22em] mb-3 ml-1',
            !isClaude && 'text-gray-500'
          )}
          style={isClaude ? { color: claudeTokens.textMuted } : undefined}
        >
          {t('settings')}
        </h2>

        <SettingItem icon={soundEnabled ? Volume2 : VolumeX} title={t('sound')}>
          <button
            onClick={() => {
              toggleSound();
              WebApp.HapticFeedback.selectionChanged();
            }}
            className="w-12 h-7 rounded-full transition-colors relative"
            style={
              isClaude
                ? {
                    backgroundColor: soundEnabled ? claudeTokens.accent : claudeTokens.border,
                  }
                : undefined
            }
            // Legacy fallback uses Tailwind classes
            {...(isClaude
              ? {}
              : {
                  className: clsx(
                    'w-12 h-7 rounded-full transition-colors relative',
                    soundEnabled ? 'bg-primary' : 'bg-gray-700'
                  ),
                })}
          >
            <div
              className={clsx(
                'absolute top-1 w-5 h-5 rounded-full transition-transform',
                soundEnabled ? 'left-6' : 'left-1'
              )}
              style={
                isClaude
                  ? { backgroundColor: '#FFFFFF', boxShadow: '0 1px 2px rgba(31,30,29,0.18)' }
                  : { backgroundColor: '#000' }
              }
            />
          </button>
        </SettingItem>

        <SettingItem icon={Info} title={t('game_info_guide')} onClick={() => setShowInfo(true)}>
          <button
            className="text-[11px] uppercase tracking-[0.22em] font-medium"
            style={isClaude ? { color: claudeTokens.accent, fontFamily: claudeTokens.serifStack } : undefined}
          >
            {!isClaude ? <span className="text-xs font-bold text-primary">{t('open')}</span> : t('open')}
          </button>
        </SettingItem>

        <SettingItem icon={MessageSquare} title={t('feedback_support', t('support'))} onClick={() => setShowFeedback(true)}>
          <button
            className="text-[11px] uppercase tracking-[0.22em] font-medium"
            style={isClaude ? { color: claudeTokens.accent, fontFamily: claudeTokens.serifStack } : undefined}
          >
            {!isClaude ? <span className="text-xs font-bold text-primary">{t('write_btn', t('open'))}</span> : t('write_btn', t('open'))}
          </button>
        </SettingItem>

        <SettingItem icon={Share2} title={t('share_app')}>
          <button
            onClick={() => {
              const shareText = t(
                i18n.language === 'kz' ? 'share_text_kz' : i18n.language === 'ru' ? 'share_text_ru' : 'share_text_en',
                { level: user?.level || 1 }
              );

              const shareUrl = 'https://t.me/Focus_game_bot?start=app';

              const wa = WebApp as unknown as { shareText?: (text: string, url: string) => void };
              if (wa.shareText) {
                wa.shareText(shareText, shareUrl);
              } else {
                WebApp.openTelegramLink(shareUrl);
              }

              WebApp.HapticFeedback.notificationOccurred('success');
            }}
            className="text-[11px] uppercase tracking-[0.22em] font-medium"
            style={isClaude ? { color: claudeTokens.accent, fontFamily: claudeTokens.serifStack } : undefined}
          >
            {!isClaude ? (
              <span className="text-xs font-bold text-primary">{t('share_button')}</span>
            ) : (
              t('share_button')
            )}
          </button>
        </SettingItem>

        <SettingItem icon={Globe} title={t('language')}>
          <div className="flex gap-2">
            {(['en', 'ru', 'kz'] as Language[]).map((lang) => {
              const active = language === lang;
              return (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors',
                    !isClaude && (active ? 'bg-primary text-black' : 'bg-gray-800 text-gray-400')
                  )}
                  style={pillStyle(active)}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </SettingItem>

        <SettingItem icon={theme === 'dark' ? Moon : Sun} title={t('theme')}>
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => handleThemeChange('dark')}
              className={clsx(
                'px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors',
                !isClaude &&
                  (theme === 'dark'
                    ? 'bg-gray-800 text-white border border-gray-600'
                    : 'bg-gray-800/50 text-gray-500')
              )}
              style={pillStyle(theme === 'dark', '#1F1E1D')}
            >
              {t('theme_dark')}
            </button>
            <button
              onClick={() => handleThemeChange('light')}
              className={clsx(
                'px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors',
                !isClaude && (theme === 'light' ? 'bg-white text-black' : 'bg-gray-800/50 text-gray-500')
              )}
              style={pillStyle(theme === 'light', '#E5E2D8')}
            >
              {t('theme_light')}
            </button>
            <button
              onClick={() => handleThemeChange('gold')}
              className={clsx(
                'px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors',
                !isClaude &&
                  (theme === 'gold'
                    ? 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]'
                    : 'bg-gray-800/50 text-yellow-500/50')
              )}
              style={pillStyle(theme === 'gold', '#C4972A')}
            >
              {t('theme_gold')}
            </button>
            <button
              onClick={() => handleThemeChange('blue')}
              className={clsx(
                'px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors',
                !isClaude &&
                  (theme === 'blue'
                    ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                    : 'bg-gray-800/50 text-blue-500/50')
              )}
              style={pillStyle(theme === 'blue', '#3D6B9E')}
            >
              {t('theme_blue')}
            </button>
          </div>
        </SettingItem>

        {/* Admin panel — visible only to users in ADMIN_BOOTSTRAP_TELEGRAM_IDS */}
        {isAdmin && (
          <SettingItem
            icon={Shield}
            title={t('admin_panel', 'Admin Panel')}
            onClick={() => {
              WebApp.HapticFeedback.impactOccurred('medium');
              navigate('/admin/dashboard');
            }}
          >
            <span className={clsx('text-[11px] uppercase tracking-[0.22em] font-medium', !isClaude && 'text-amber-400')}>
              Open
            </span>
          </SettingItem>
        )}
        <SettingItem
          icon={LogOut}
          title={t('log_out')}
          onClick={() => {
            if (confirm(t('logout_confirm'))) {
              logout();
              WebApp.close();
            }
          }}
        >
          <span
            className={clsx(
              'text-[11px] uppercase tracking-[0.22em] font-medium',
              !isClaude && 'text-red-500'
            )}
            style={isClaude ? { color: claudeTokens.warning, fontFamily: claudeTokens.serifStack } : undefined}
          >
            {!isClaude ? (
              <span className="text-xs font-bold text-red-500">{t('log_out')}</span>
            ) : (
              t('log_out')
            )}
          </span>
        </SettingItem>
      </section>

      {/* Social Tasks Section */}
      <section className="mb-8">
        <h2
          className={clsx(
            'text-[10px] font-medium uppercase tracking-[0.22em] mb-3 ml-1',
            !isClaude && 'text-gray-500'
          )}
          style={isClaude ? { color: claudeTokens.textMuted } : undefined}
        >
          {t('earn_crystals')}
        </h2>

        {socialTasks.map((task) => (
          <SocialTaskCard
            key={task.id}
            platform={task.platform}
            reward={task.reward}
            isClaimed={task.isClaimed}
            onClick={() => handleSocialClick(task.id, task.url)}
          />
        ))}
      </section>

      <InfoGuideModal isOpen={showInfo} onClose={() => setShowInfo(false)} gameType="schulte" />
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  );
};

const SettingsPage = () => {
  const { t } = useTranslation();
  const { theme } = useStore();
  const isLight = theme === 'light';
  const isClaude = theme === 'claude';

  if (isClaude) {
    return (
      <div
        className="min-h-screen pb-24"
        style={{ backgroundColor: claudeTokens.surface, color: claudeTokens.textPrimary }}
      >
        <header
          className="sticky top-0 z-10 px-5 py-5 backdrop-blur-md"
          style={{
            backgroundColor: 'rgba(250, 249, 245, 0.92)',
            borderBottom: `1px solid ${claudeTokens.border}`,
          }}
        >
          <span
            className="text-[10px] font-medium uppercase tracking-[0.22em]"
            style={{ color: claudeTokens.textMuted }}
          >
            Preferences
          </span>
          <h1
            className="mt-1 leading-none tracking-tight"
            style={{
              color: claudeTokens.textPrimary,
              fontFamily: claudeTokens.serifStack,
              fontSize: '30px',
              fontWeight: 500,
            }}
          >
            {t('settings', 'Settings')}
          </h1>
        </header>
        <div className="px-5 pt-5">
          <SettingsContent />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 no-scrollbar">
      <h1 className={`text-3xl font-bold mb-6 ${isLight ? 'text-gray-900' : 'text-primary'}`}>
        {t('settings', 'Settings')}
      </h1>
      <SettingsContent />
    </div>
  );
};

export default SettingsPage;
