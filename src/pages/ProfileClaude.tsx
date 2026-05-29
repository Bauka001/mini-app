// Editorial Claude.ai variant of Profile.tsx. Mounted only when the active
// theme is 'claude'. Uses claudeTokens for surfaces, hairline borders, and
// terracotta accents — never the legacy gradient/glow palette.
//
// Functional contract is identical to ProfilePage in Profile.tsx: avatar
// upload, name/username edit, plan + streak display, VIP analytics gate,
// brain profile, achievements, tickets, level progress, stats, recent
// activity. We re-use BrainProfile, Achievements, VipAnalyticsPanel, and
// VipAnalyticsLockedCard verbatim — they'll get their own Claude pass.

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  BarChart3,
  Calculator,
  Calendar,
  Camera,
  CheckCircle,
  Edit2,
  Flame,
  History,
  LayoutGrid,
  Lock,
  Star,
  Target,
  Ticket as TicketIcon,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { buildVipAnalyticsSnapshot, useStore } from '../store/useStoreImpl';
import WebApp from '@twa-dev/sdk';
import { BrainProfile } from '../components/BrainProfile';
import { Achievements } from '../components/Achievements';
import { Web3Section } from '../components/Web3Section';
import { ReferralCard } from '../components/ReferralCard';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { usePlanGate } from '../hooks/usePlanGate';
import { VipAnalyticsLockedCard, VipAnalyticsPanel } from '../components/analytics/VipAnalyticsContent';
import { claudeTokens } from '../components/ui/claudeTokens';

const PLAN_LABEL: Record<'free' | 'silver' | 'gold' | 'premium', string> = {
  free: 'Free',
  silver: 'Silver',
  gold: 'Gold',
  premium: 'Premium',
};

const ACHIEVEMENTS = [
  { id: 'first_game', name: 'Pioneer', description: 'Played your first game', icon: '🚀' },
  { id: 'gamer_10', name: 'Gamer', description: 'Played 10 games', icon: '🎮' },
  { id: 'pro_gamer', name: 'Pro Gamer', description: 'Played 50 games', icon: '🏆' },
  { id: 'xp_master', name: 'XP Master', description: 'Earned 5000 XP', icon: '⚡' },
];

const getGameIcon = (gameId: string) => {
  switch (gameId.toLowerCase()) {
    case 'math': return <Calculator size={18} strokeWidth={1.6} />;
    case 'memory': return <LayoutGrid size={18} strokeWidth={1.6} />;
    case 'schulte': return <Star size={18} strokeWidth={1.6} />;
    case 'agent_spot': return <Target size={18} strokeWidth={1.6} />;
    case 'code_breaker': return <Lock size={18} strokeWidth={1.6} />;
    case 'tetris': return <LayoutGrid size={18} strokeWidth={1.6} />;
    case '2048': return <Zap size={18} strokeWidth={1.6} />;
    default: return <Zap size={18} strokeWidth={1.6} />;
  }
};

const formatGameName = (gameId: string) => {
  if (gameId.toLowerCase() === 'odd_one_out') return 'Odd One Out';
  return gameId.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const ProfileClaude = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    user,
    updateUserProfile,
    history,
    brainStats,
    unclaimedLevelRewards,
    claimLevelReward,
    coins,
    gems,
    streak,
    plan,
    planExpiry,
    tickets,
  } = useStore();

  const styles = useThemeStyles();
  const isPlanExpired = planExpiry ? Date.now() > planExpiry : false;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'analytics'>('profile');
  const [firstName, setFirstName] = useState(user.firstName);
  const [username, setUsername] = useState(user.username || '');

  const xpProgress = useMemo(() => ((user.xp % 1000) / 1000) * 100, [user.xp]);
  const nextLevelXp = useMemo(() => 1000 - (user.xp % 1000), [user.xp]);

  const handleSave = () => {
    updateUserProfile({ firstName, username });
    setIsEditing(false);
    WebApp.HapticFeedback.notificationOccurred('success');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateUserProfile({ photoUrl: base64String });
        WebApp.HapticFeedback.impactOccurred('medium');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClaimReward = (level: number) => {
    claimLevelReward(level);
    WebApp.HapticFeedback.notificationOccurred('success');
  };

  const recentGames = useMemo(
    () => [...(history || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5),
    [history]
  );

  const vipAnalytics = useMemo(
    () => buildVipAnalyticsSnapshot(history || [], brainStats),
    [brainStats, history]
  );

  const { isPremiumActive } = usePlanGate();
  const isVipAnalyticsUnlocked = isPremiumActive === true;

  const handleUnlockVipAnalytics = () => {
    WebApp.HapticFeedback.impactOccurred('medium');
    navigate('/shop');
  };

  // ---------- token shorthands ----------
  const Eyebrow = ({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) => (
    <span
      className="text-[10px] font-medium uppercase tracking-[0.22em]"
      style={{ color: accent ? claudeTokens.accent : claudeTokens.textMuted }}
    >
      {children}
    </span>
  );

  return (
    <div
      className="min-h-screen pb-24"
      style={{ backgroundColor: claudeTokens.surface, color: claudeTokens.textPrimary }}
    >
      {/* Header — back button + page title + edit/save */}
      <header
        className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between gap-3 backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(250, 249, 245, 0.92)',
          borderBottom: `1px solid ${claudeTokens.border}`,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[#F0EEE6]"
          style={{ color: claudeTokens.textBody }}
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </button>
        <span
          className="text-[10px] font-medium uppercase tracking-[0.32em]"
          style={{ color: claudeTokens.textMuted, fontFamily: claudeTokens.serifStack }}
        >
          {t('profile', 'Profile')}
        </span>
        {isEditing ? (
          <button
            onClick={handleSave}
            className="px-4 h-9 rounded-lg text-[13px] font-medium"
            style={{ backgroundColor: claudeTokens.accent, color: '#FFFFFF' }}
          >
            {t('save', 'Save')}
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            aria-label="Edit"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[#F0EEE6]"
            style={{ color: claudeTokens.accent }}
          >
            <Edit2 size={16} strokeWidth={1.75} />
          </button>
        )}
      </header>

      <div className="px-5 pt-6 flex flex-col gap-6">
        {/* Identity card */}
        <section
          className="rounded-2xl p-6"
          style={{
            backgroundColor: claudeTokens.surface,
            border: `1px solid ${isVipAnalyticsUnlocked ? claudeTokens.accent : claudeTokens.border}`,
          }}
        >
          <div className="flex items-start gap-5">
            <div className="relative shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div
                className="w-20 h-20 rounded-xl overflow-hidden relative"
                style={{ border: `1px solid ${claudeTokens.borderStrong}` }}
              >
                <img
                  src={user.photoUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=' + (user.firstName || 'F')}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {isEditing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(31,30,29,0.55)' }}
                  >
                    <Camera size={20} className="text-white" strokeWidth={1.75} />
                  </button>
                )}
              </div>
              {/* Level numeral as a chapter mark */}
              <span
                className="absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded-md text-[10px] tracking-[0.16em] uppercase"
                style={{
                  backgroundColor: claudeTokens.surface,
                  color: claudeTokens.accent,
                  border: `1px solid ${claudeTokens.borderStrong}`,
                  fontFamily: claudeTokens.serifStack,
                }}
              >
                Lv {user.level}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Name"
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{
                      backgroundColor: claudeTokens.surfaceMuted,
                      border: `1px solid ${claudeTokens.border}`,
                      color: claudeTokens.textPrimary,
                    }}
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    className="w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                    style={{
                      backgroundColor: claudeTokens.surfaceMuted,
                      border: `1px solid ${claudeTokens.border}`,
                      color: claudeTokens.textBody,
                    }}
                  />
                </div>
              ) : (
                <>
                  <Eyebrow>Welcome back</Eyebrow>
                  <h1
                    className="leading-tight truncate mt-1 italic"
                    style={{
                      color: claudeTokens.textPrimary,
                      fontFamily: claudeTokens.serifStack,
                      fontSize: '26px',
                      fontWeight: 500,
                    }}
                  >
                    {user.firstName}
                  </h1>
                  <p
                    className="text-xs mt-0.5 truncate font-mono"
                    style={{ color: claudeTokens.textMuted }}
                  >
                    @{user.username || 'pioneer'}
                  </p>

                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <span
                      className="text-[10px] font-medium tabular-nums"
                      style={{ color: claudeTokens.textMuted }}
                    >
                      ID {user.gameId || '17096844'}
                    </span>
                    <span style={{ color: claudeTokens.border }}>·</span>
                    <span className="flex items-center gap-1 text-[10px] font-medium tabular-nums" style={{ color: claudeTokens.textBody }}>
                      <Flame size={11} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
                      {streak} day streak
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Plan strip */}
          <div
            className="mt-6 pt-5 flex items-center justify-between"
            style={{ borderTop: `1px solid ${claudeTokens.border}` }}
          >
            <div>
              <Eyebrow>Current plan</Eyebrow>
              <div
                className="mt-1 italic"
                style={{
                  color: claudeTokens.textPrimary,
                  fontFamily: claudeTokens.serifStack,
                  fontSize: '20px',
                  fontWeight: 500,
                }}
              >
                {PLAN_LABEL[plan]}
              </div>
            </div>
            <button
              onClick={() => navigate(isVipAnalyticsUnlocked ? '/analytics' : '/shop')}
              className="px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
              style={
                isVipAnalyticsUnlocked
                  ? { backgroundColor: claudeTokens.surfaceMuted, color: claudeTokens.textPrimary, border: `1px solid ${claudeTokens.borderStrong}` }
                  : { backgroundColor: claudeTokens.accent, color: '#FFFFFF' }
              }
            >
              {isVipAnalyticsUnlocked ? 'Open analytics' : 'Upgrade'}
            </button>
          </div>
        </section>

        {/* VIP Analytics callout */}
        <button
          onClick={() => navigate('/analytics')}
          className="relative w-full text-left rounded-2xl p-5"
          style={{
            backgroundColor: claudeTokens.surfaceMuted,
            border: `1px solid ${claudeTokens.border}`,
          }}
        >
          <span
            className="absolute left-0 top-5 bottom-5 w-[3px] rounded-full"
            style={{ backgroundColor: claudeTokens.accent }}
          />
          <div className="flex items-center justify-between gap-3 pl-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: claudeTokens.surface, border: `1px solid ${claudeTokens.border}` }}
              >
                <BarChart3 size={18} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
              </div>
              <div className="min-w-0">
                <Eyebrow>VIP Analytics</Eyebrow>
                <div
                  className="mt-0.5 text-[15px]"
                  style={{ color: claudeTokens.textPrimary, fontFamily: claudeTokens.serifStack, fontWeight: 500 }}
                >
                  Brain Score · Tournament utility
                </div>
              </div>
            </div>
            <span
              className="text-[10px] font-medium uppercase tracking-[0.22em]"
              style={{ color: claudeTokens.accent }}
            >
              Open
            </span>
          </div>
        </button>

        {/* Tabs */}
        <div
          className="rounded-xl p-1 flex gap-1"
          style={{ backgroundColor: claudeTokens.surfaceSunken }}
        >
          {[
            { id: 'profile' as const, label: 'Profile', icon: <Star size={14} strokeWidth={1.75} /> },
            { id: 'analytics' as const, label: 'Analytics', icon: <TrendingUp size={14} strokeWidth={1.75} /> },
          ].map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className="flex-1 rounded-lg px-3 py-2.5 text-[12px] font-medium transition-colors flex items-center justify-center gap-2"
                style={
                  isActive
                    ? { backgroundColor: claudeTokens.accent, color: '#FFFFFF' }
                    : { backgroundColor: 'transparent', color: claudeTokens.textMuted }
                }
              >
                {tab.icon}
                <span className="uppercase tracking-[0.16em]">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeSection === 'profile' ? (
          <>
            {/* Brain Profile component renders its own card; the warm theme
                will absorb its dark-mode styling for now (its own pass is a
                follow-up). */}
            <BrainProfile />

            <Achievements />

            {/* Web3 — TON wallet, $FOCUS jetton, NFT trophies */}
            <Web3Section />

            {/* Referral — invite friend → both earn $FOCUS */}
            <ReferralCard />

            {tickets.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3
                    className="flex items-center gap-2"
                    style={{
                      color: claudeTokens.textPrimary,
                      fontFamily: claudeTokens.serifStack,
                      fontSize: '20px',
                      fontWeight: 500,
                    }}
                  >
                    <TicketIcon size={18} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
                    My tickets
                  </h3>
                  <span className="text-[10px] font-medium tabular-nums" style={{ color: claudeTokens.textMuted }}>
                    {tickets.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="relative rounded-2xl p-5 overflow-hidden"
                      style={{
                        backgroundColor: claudeTokens.surface,
                        border: `1px solid ${claudeTokens.border}`,
                      }}
                    >
                      {/* perforated edge feel — dotted vertical line */}
                      <div
                        className="absolute top-3 bottom-3 left-[64px]"
                        style={{ borderLeft: `1px dashed ${claudeTokens.borderStrong}` }}
                      />
                      <div className="absolute top-4 right-4">
                        {ticket.isUsed ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium tracking-[0.16em] uppercase flex items-center gap-1"
                            style={{ color: claudeTokens.success, border: `1px solid ${claudeTokens.success}` }}
                          >
                            <CheckCircle size={10} strokeWidth={2} />
                            Verified
                          </span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium tracking-[0.16em] uppercase"
                            style={{ color: claudeTokens.accent, border: `1px solid ${claudeTokens.accent}` }}
                          >
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-stretch gap-5">
                        <div
                          className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center"
                          style={{
                            backgroundColor: claudeTokens.surfaceMuted,
                            border: `1px solid ${claudeTokens.border}`,
                          }}
                        >
                          <TicketIcon size={20} strokeWidth={1.5} style={{ color: claudeTokens.accent }} />
                        </div>
                        <div className="flex-1 min-w-0 pl-2">
                          <div
                            className="text-[10px] uppercase tracking-[0.22em]"
                            style={{ color: claudeTokens.textMuted }}
                          >
                            Ticket no.
                          </div>
                          <div
                            className="text-[26px] tabular-nums leading-none mt-1 truncate"
                            style={{
                              color: claudeTokens.textPrimary,
                              fontFamily: claudeTokens.serifStack,
                              fontFeatureSettings: '"lnum","tnum"',
                            }}
                          >
                            {String(ticket.ticketNumber).padStart(8, '0')}
                          </div>
                          <p className="text-[12px] mt-1.5 truncate" style={{ color: claudeTokens.textBody }}>
                            {ticket.eventName}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Level progress */}
            <section
              className="rounded-2xl p-5"
              style={{
                backgroundColor: claudeTokens.surface,
                border: `1px solid ${claudeTokens.border}`,
              }}
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <Eyebrow>Current progress</Eyebrow>
                  <div className="mt-1 flex items-center gap-2">
                    <TrendingUp size={16} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
                    <span
                      className="text-[20px] tabular-nums"
                      style={{
                        color: claudeTokens.textPrimary,
                        fontFamily: claudeTokens.serifStack,
                        fontWeight: 500,
                      }}
                    >
                      {user.xp % 1000}
                      <span className="text-[12px] ml-1" style={{ color: claudeTokens.textMuted }}>
                        / 1000 XP
                      </span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <Eyebrow>Next level</Eyebrow>
                  <div className="text-[12px] mt-1 font-medium tabular-nums" style={{ color: claudeTokens.accent }}>
                    {nextLevelXp} XP left
                  </div>
                </div>
              </div>
              <div
                className="h-1.5 mt-4 rounded-full overflow-hidden"
                style={{ backgroundColor: claudeTokens.border }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: claudeTokens.accent }}
                />
              </div>
            </section>

            {/* Stats grid */}
            <section className="grid grid-cols-2 gap-3">
              {[
                { label: 'Coins', value: coins },
                { label: 'Gems', value: gems },
                { label: 'Total XP', value: user.xp },
                { label: 'Games', value: (history || []).length },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: claudeTokens.surface,
                    border: `1px solid ${claudeTokens.border}`,
                  }}
                >
                  <Eyebrow>{stat.label}</Eyebrow>
                  <div
                    className="mt-1 tabular-nums"
                    style={{
                      color: claudeTokens.textPrimary,
                      fontFamily: claudeTokens.serifStack,
                      fontSize: '24px',
                      fontWeight: 500,
                      fontFeatureSettings: '"lnum","tnum"',
                    }}
                  >
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </div>
                </div>
              ))}
            </section>

            {/* Achievements grid (rendered above by Achievements component already;
                here we list the inline editorial achievements for variety) */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3
                  className="flex items-center gap-2"
                  style={{
                    color: claudeTokens.textPrimary,
                    fontFamily: claudeTokens.serifStack,
                    fontSize: '20px',
                    fontWeight: 500,
                  }}
                >
                  <Award size={18} strokeWidth={1.75} style={{ color: claudeTokens.textMuted }} />
                  Milestones
                </h3>
                <span className="text-[10px] font-medium tabular-nums" style={{ color: claudeTokens.textMuted }}>
                  {(user.achievements || []).length} / {ACHIEVEMENTS.length}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-none">
                {ACHIEVEMENTS.map((achievement, idx) => {
                  const isUnlocked = (user.achievements || []).includes(achievement.id);
                  return (
                    <div
                      key={achievement.id}
                      className="min-w-[140px] rounded-xl p-4 transition-opacity"
                      style={{
                        backgroundColor: claudeTokens.surface,
                        border: `1px solid ${claudeTokens.border}`,
                        opacity: isUnlocked ? 1 : 0.45,
                      }}
                    >
                      <span
                        className="text-[10px] tracking-[0.18em] uppercase"
                        style={{ color: claudeTokens.textMuted, fontFamily: claudeTokens.serifStack }}
                      >
                        № {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="text-[28px] mt-2">{achievement.icon}</div>
                      <div
                        className="text-[13px] mt-1"
                        style={{
                          color: claudeTokens.textPrimary,
                          fontFamily: claudeTokens.serifStack,
                          fontWeight: 500,
                        }}
                      >
                        {achievement.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Level rewards (if any) */}
            {(unclaimedLevelRewards || []).length > 0 && (
              <section
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: claudeTokens.surfaceMuted,
                  border: `1px solid ${claudeTokens.accent}`,
                }}
              >
                <Eyebrow accent>Level up rewards</Eyebrow>
                <div className="mt-3 space-y-2">
                  {unclaimedLevelRewards.map((level) => (
                    <div
                      key={level}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5"
                      style={{
                        backgroundColor: claudeTokens.surface,
                        border: `1px solid ${claudeTokens.border}`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Award size={16} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
                        <span className="text-[13px]" style={{ color: claudeTokens.textPrimary }}>
                          Level {level} chest
                        </span>
                      </div>
                      <button
                        onClick={() => handleClaimReward(level)}
                        className="px-3 py-1.5 rounded-md text-[11px] font-medium uppercase tracking-[0.16em]"
                        style={{ backgroundColor: claudeTokens.accent, color: '#FFFFFF' }}
                      >
                        Claim
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent activity */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3
                  className="flex items-center gap-2"
                  style={{
                    color: claudeTokens.textPrimary,
                    fontFamily: claudeTokens.serifStack,
                    fontSize: '20px',
                    fontWeight: 500,
                  }}
                >
                  <History size={18} strokeWidth={1.75} style={{ color: claudeTokens.textMuted }} />
                  Recent activity
                </h3>
                <span className="text-[10px] font-medium uppercase tracking-[0.18em]" style={{ color: claudeTokens.textMuted }}>
                  Last 5 games
                </span>
              </div>

              {recentGames.length > 0 ? (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: claudeTokens.surface,
                    border: `1px solid ${claudeTokens.border}`,
                  }}
                >
                  {recentGames.map((game, i) => (
                    <motion.div
                      key={game.timestamp}
                      initial={{ x: -16, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center justify-between p-4"
                      style={{
                        borderBottom: i < recentGames.length - 1 ? `1px solid ${claudeTokens.border}` : 'none',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: claudeTokens.surfaceMuted,
                            color: claudeTokens.textPrimary,
                            border: `1px solid ${claudeTokens.border}`,
                          }}
                        >
                          {getGameIcon(game.gameId)}
                        </div>
                        <div className="min-w-0">
                          <div
                            className="text-[14px] capitalize truncate"
                            style={{ color: claudeTokens.textPrimary, fontWeight: 500 }}
                          >
                            {formatGameName(game.gameId)}
                          </div>
                          <div className="text-[11px] flex items-center gap-1.5 mt-0.5" style={{ color: claudeTokens.textMuted }}>
                            <Calendar size={10} strokeWidth={1.75} />
                            {game.date}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className="text-[15px] tabular-nums"
                          style={{
                            color: claudeTokens.textPrimary,
                            fontFamily: claudeTokens.serifStack,
                            fontFeatureSettings: '"lnum","tnum"',
                            fontWeight: 500,
                          }}
                        >
                          {game.score}
                        </div>
                        <div className="text-[10px] mt-0.5 tabular-nums" style={{ color: claudeTokens.accent }}>
                          + {game.coinsEarned} coins
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div
                  className="rounded-2xl p-10 flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: claudeTokens.surface,
                    border: `1px dashed ${claudeTokens.borderStrong}`,
                    color: claudeTokens.textMuted,
                  }}
                >
                  <Zap size={28} strokeWidth={1.5} className="mb-2 opacity-30" />
                  <p className="text-sm">No games played yet</p>
                </div>
              )}
            </section>
          </>
        ) : isVipAnalyticsUnlocked ? (
          <VipAnalyticsPanel analytics={vipAnalytics} styles={styles} />
        ) : (
          <VipAnalyticsLockedCard
            styles={styles}
            onUnlock={handleUnlockVipAnalytics}
            isPlanExpired={isPlanExpired}
          />
        )}
      </div>
    </div>
  );
};

export default ProfileClaude;
