import { motion } from 'framer-motion';
import { Trophy, Lock, Star, Zap, Target, Flame, Crown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStoreImpl';
import { useState } from 'react';
import { clsx } from 'clsx';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { claudeTokens } from './ui/claudeTokens';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Rarity → editorial label, used in the Claude variant. Ranking is preserved
// (legendary > epic > rare > common) but visualised through serif weight + a
// hairline rule rather than rainbow gradients.
const RARITY_LABEL: Record<Achievement['rarity'], string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const Achievements = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const { user } = useStore();
  const { isClaude } = useThemeStyles();
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const achievements: Achievement[] = [
    {
      id: 'first_game',
      title: lang === 'kz' ? 'Бірінші Қадам' : lang === 'ru' ? 'Первый Шаг' : 'First Steps',
      description: lang === 'kz' ? 'Бірінші ойыны ойнадыңыз' : lang === 'ru' ? 'Сыграйте в первую игру' : 'Play your first game',
      icon: <Zap size={28} className={isClaude ? '' : 'text-blue-400'} style={isClaude ? { color: claudeTokens.accent } : undefined} strokeWidth={isClaude ? 1.5 : 2} />,
      unlocked: user.level >= 2,
      rarity: 'common'
    },
    {
      id: 'schulte_master',
      title: lang === 'kz' ? 'Шульте Мастері' : lang === 'ru' ? 'Мастер Шульте' : 'Schulte Master',
      description: lang === 'kz' ? 'Шульте кестесінде 90% қол жеткізіңіз' : lang === 'ru' ? 'Достигните 90% точности в таблице Шульте' : 'Achieve 90% accuracy in Schulte',
      icon: <Target size={28} className={isClaude ? '' : 'text-green-400'} style={isClaude ? { color: claudeTokens.accent } : undefined} strokeWidth={isClaude ? 1.5 : 2} />,
      unlocked: false,
      progress: 45,
      maxProgress: 90,
      rarity: 'rare'
    },
    {
      id: 'memory_champion',
      title: lang === 'kz' ? 'Жады Чемпионы' : lang === 'ru' ? 'Чемпион Памяти' : 'Memory Champion',
      description: lang === 'kz' ? '5 күн қатарып жады ойынын ойнадыңыз' : lang === 'ru' ? 'Играйте в игру памяти 5 дней подряд' : 'Play memory game for 5 days straight',
      icon: <Flame size={28} className={isClaude ? '' : 'text-orange-400'} style={isClaude ? { color: claudeTokens.accent } : undefined} strokeWidth={isClaude ? 1.5 : 2} />,
      unlocked: false,
      progress: 3,
      maxProgress: 5,
      rarity: 'epic'
    },
    {
      id: 'streak_warrior',
      title: lang === 'kz' ? 'Жақ Қолданушы' : lang === 'ru' ? 'Активный Воин' : 'Streak Warrior',
      description: lang === 'kz' ? '30 күн қатарып кіруді үзгіздіңіз' : lang === 'ru' ? 'Заходите в приложение 30 дней подряд' : 'Visit the app for 30 days in a row',
      icon: <Star size={28} className={isClaude ? '' : 'text-yellow-400'} style={isClaude ? { color: claudeTokens.accent } : undefined} strokeWidth={isClaude ? 1.5 : 2} />,
      unlocked: false,
      progress: 15,
      maxProgress: 30,
      rarity: 'legendary'
    },
    {
      id: 'brain_level_10',
      title: lang === 'kz' ? 'Ми 10-Деңгейі' : lang === 'ru' ? 'Мозг Уровня 10' : 'Brain Level 10',
      description: lang === 'kz' ? 'Ми деңгейіңіз 10-ға жетті' : lang === 'ru' ? 'Достигните 10 уровень развития мозга' : 'Reach Brain Level 10',
      icon: <Crown size={28} className={isClaude ? '' : 'text-purple-400'} style={isClaude ? { color: claudeTokens.accent } : undefined} strokeWidth={isClaude ? 1.5 : 2} />,
      unlocked: false,
      progress: 5,
      maxProgress: 10,
      rarity: 'epic'
    },
    {
      id: 'premium_member',
      title: lang === 'kz' ? 'Premium Мүшесі' : lang === 'ru' ? 'Premium Член' : 'Premium Member',
      description: lang === 'kz' ? 'Premium жоспарын сатып алдыңыз' : lang === 'ru' ? 'Приобретите Premium план' : 'Purchase Premium plan',
      icon: <Trophy size={28} className={isClaude ? '' : 'text-amber-400'} style={isClaude ? { color: claudeTokens.accent } : undefined} strokeWidth={isClaude ? 1.5 : 2} />,
      unlocked: false,
      rarity: 'legendary'
    }
  ];

  const rarityColors = {
    common: 'from-gray-600 to-gray-700',
    rare: 'from-blue-600 to-blue-700',
    epic: 'from-purple-600 to-purple-700',
    legendary: 'from-amber-500 to-amber-600'
  };

  const headingText =
    lang === 'kz' ? 'Жетістіктер' : lang === 'ru' ? 'Достижения' : 'Achievements';

  if (isClaude) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-2xl p-5"
        style={{
          backgroundColor: claudeTokens.surface,
          border: `1px solid ${claudeTokens.border}`,
        }}
      >
        <div className="flex justify-between items-end mb-4 px-1">
          <div>
            <span
              className="text-[10px] font-medium uppercase tracking-[0.22em]"
              style={{ color: claudeTokens.textMuted }}
            >
              Awards
            </span>
            <h3
              className="mt-1 leading-none tracking-tight flex items-center gap-2"
              style={{
                color: claudeTokens.textPrimary,
                fontFamily: claudeTokens.serifStack,
                fontSize: '22px',
                fontWeight: 500,
              }}
            >
              <Trophy size={18} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
              {headingText}
            </h3>
          </div>
          <span
            className="text-[10px] font-medium tabular-nums uppercase tracking-[0.18em]"
            style={{ color: claudeTokens.textMuted }}
          >
            {achievements.filter(a => a.unlocked).length} / {achievements.length}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {achievements.map((achievement, i) => (
            <motion.button
              key={achievement.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelectedAchievement(achievement)}
              disabled={!achievement.unlocked && achievement.progress === undefined}
              className="relative p-4 rounded-xl text-left transition-colors"
              style={{
                backgroundColor: claudeTokens.surface,
                border: `1px solid ${achievement.unlocked ? claudeTokens.borderStrong : claudeTokens.border}`,
                opacity: achievement.unlocked ? 1 : 0.62,
              }}
            >
              {/* Chapter numeral, terracotta when unlocked */}
              <span
                className="absolute top-3 right-3 text-[10px] tracking-[0.18em] uppercase"
                style={{
                  color: achievement.unlocked ? claudeTokens.accent : claudeTokens.textMuted,
                  fontFamily: claudeTokens.serifStack,
                }}
              >
                № {String(i + 1).padStart(2, '0')}
              </span>

              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-3"
                style={{
                  backgroundColor: claudeTokens.surfaceMuted,
                  border: `1px solid ${claudeTokens.border}`,
                }}
              >
                {achievement.unlocked ? achievement.icon : (
                  <Lock size={20} strokeWidth={1.5} style={{ color: claudeTokens.textMuted }} />
                )}
              </div>

              <h4
                className="text-[14px] truncate leading-tight italic"
                style={{
                  color: claudeTokens.textPrimary,
                  fontFamily: claudeTokens.serifStack,
                  fontWeight: 500,
                }}
              >
                {achievement.title}
              </h4>

              <div
                className="mt-1 text-[10px] uppercase tracking-[0.18em]"
                style={{ color: claudeTokens.textMuted }}
              >
                {RARITY_LABEL[achievement.rarity]}
              </div>

              {!achievement.unlocked && achievement.progress !== undefined && (
                <div className="mt-3">
                  <div
                    className="flex justify-between text-[10px] mb-1 tabular-nums"
                    style={{ color: claudeTokens.textMuted }}
                  >
                    <span>Progress</span>
                    <span>{achievement.progress} / {achievement.maxProgress}</span>
                  </div>
                  <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: claudeTokens.border }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(achievement.progress! / achievement.maxProgress!) * 100}%`,
                        backgroundColor: claudeTokens.accent,
                      }}
                    />
                  </div>
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Detail modal — editorial cream */}
        {selectedAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAchievement(null)}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(31,30,29,0.55)', backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 12, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl overflow-hidden relative"
              style={{
                backgroundColor: claudeTokens.surface,
                border: `1px solid ${claudeTokens.border}`,
              }}
            >
              <button
                onClick={() => setSelectedAchievement(null)}
                aria-label="Close"
                className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[#F0EEE6]"
                style={{ color: claudeTokens.textMuted }}
              >
                <X size={18} strokeWidth={1.75} />
              </button>

              <div className="p-7 text-center">
                <div
                  className="w-20 h-20 mx-auto mb-5 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: claudeTokens.surfaceMuted,
                    border: `1px solid ${claudeTokens.border}`,
                  }}
                >
                  {selectedAchievement.unlocked ? (
                    <div className="transform scale-125">{selectedAchievement.icon}</div>
                  ) : (
                    <Lock size={32} strokeWidth={1.5} style={{ color: claudeTokens.textMuted }} />
                  )}
                </div>

                <h3
                  className="leading-tight italic"
                  style={{
                    color: claudeTokens.textPrimary,
                    fontFamily: claudeTokens.serifStack,
                    fontSize: '24px',
                    fontWeight: 500,
                  }}
                >
                  {selectedAchievement.title}
                </h3>

                <p
                  className="text-[14px] mt-2 leading-relaxed"
                  style={{ color: claudeTokens.textBody }}
                >
                  {selectedAchievement.description}
                </p>

                {!selectedAchievement.unlocked && selectedAchievement.progress !== undefined && (
                  <div
                    className="mt-5 rounded-xl p-4"
                    style={{
                      backgroundColor: claudeTokens.surfaceMuted,
                      border: `1px solid ${claudeTokens.border}`,
                    }}
                  >
                    <div
                      className="flex justify-between text-[12px] mb-2 tabular-nums"
                      style={{ color: claudeTokens.textBody }}
                    >
                      <span>Progress</span>
                      <span style={{ color: claudeTokens.textPrimary, fontWeight: 500 }}>
                        {selectedAchievement.progress} / {selectedAchievement.maxProgress}
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: claudeTokens.border }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(selectedAchievement.progress! / selectedAchievement.maxProgress!) * 100}%`,
                          backgroundColor: claudeTokens.accent,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 mt-6">
                  <span
                    className="px-3 py-1 rounded-md text-[10px] uppercase tracking-[0.22em] font-medium"
                    style={{
                      color: claudeTokens.accent,
                      border: `1px solid ${claudeTokens.accent}`,
                    }}
                  >
                    {RARITY_LABEL[selectedAchievement.rarity]}
                  </span>
                  <button
                    onClick={() => setSelectedAchievement(null)}
                    className="px-4 py-2 rounded-lg text-[13px] font-medium"
                    style={{
                      backgroundColor: claudeTokens.surfaceMuted,
                      color: claudeTokens.textPrimary,
                      border: `1px solid ${claudeTokens.borderStrong}`,
                    }}
                  >
                    {lang === 'kz' ? 'Жабу' : lang === 'ru' ? 'Закрыть' : 'Close'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.section>
    );
  }

  // Legacy themes (dark / light / blue / gold) — original markup
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-black/20 backdrop-blur-md rounded-3xl p-5 border border-white/10"
    >
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
           <Trophy size={22} className="text-yellow-400" />
           {headingText}
        </h3>
        <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-1 rounded-lg">
           {achievements.filter(a => a.unlocked).length} / {achievements.length}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {achievements.map((achievement, i) => (
          <motion.button
            key={achievement.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedAchievement(achievement)}
            disabled={!achievement.unlocked && achievement.progress === undefined}
            className={clsx(
              "relative p-4 rounded-2xl border transition-all duration-300 group overflow-hidden",
              achievement.unlocked
                ? `bg-gradient-to-br ${rarityColors[achievement.rarity]} border-white/20 shadow-lg`
                : "bg-white/5 border-white/10 opacity-60",
              !achievement.unlocked && achievement.progress !== undefined && "cursor-not-allowed"
            )}
          >
            <div className="absolute top-0 right-0 p-3 opacity-10">
              {achievement.icon}
            </div>

            <div className="relative z-10 mb-3">
              <div className={clsx(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                achievement.unlocked
                  ? "bg-white/20 backdrop-blur-sm border border-white/30"
                  : "bg-black/30 border border-white/10"
              )}>
                {achievement.unlocked ? (
                  <div className="transform scale-110">
                    {achievement.icon}
                  </div>
                ) : (
                  <Lock size={24} className="text-gray-500" />
                )}
              </div>
            </div>

            <h4 className={clsx(
              "text-sm font-bold truncate",
              achievement.unlocked ? "text-white" : "text-gray-400"
            )}>
              {achievement.title}
            </h4>

            {!achievement.unlocked && achievement.progress !== undefined && (
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{achievement.progress} / {achievement.maxProgress}</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(achievement.progress! / achievement.maxProgress!) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {achievement.unlocked && (
              <div className="mt-2 flex items-center gap-1.5">
                <div className={clsx(
                  "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-gradient-to-r",
                  achievement.rarity === 'common' && "from-gray-600 to-gray-700",
                  achievement.rarity === 'rare' && "from-blue-600 to-blue-700",
                  achievement.rarity === 'epic' && "from-purple-600 to-purple-700",
                  achievement.rarity === 'legendary' && "from-amber-500 to-amber-600"
                )}>
                  {achievement.rarity}
                </div>
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {selectedAchievement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedAchievement(null)}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className={clsx(
              "bg-[#1a1a1a] w-full max-w-sm rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative",
              `bg-gradient-to-br ${rarityColors[selectedAchievement.rarity]}`
            )}
          >
            <button
              onClick={() => setSelectedAchievement(null)}
              className="absolute top-4 right-4 p-2 bg-black/30 rounded-full text-white/70 hover:bg-black/50"
            >
              <Lock size={16} />
            </button>

            <div className="p-6 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                {selectedAchievement.unlocked ? (
                  <div className="transform scale-150 drop-shadow-2xl">
                    {selectedAchievement.icon}
                  </div>
                ) : (
                  <Lock size={40} className="text-gray-400" />
                )}
              </div>

              <h3 className={clsx("text-2xl font-bold mb-2", selectedAchievement.unlocked ? "text-white" : "text-gray-400")}>
                {selectedAchievement.title}
              </h3>

              <p className={clsx("text-sm leading-relaxed mb-4", selectedAchievement.unlocked ? "text-white/80" : "text-gray-500")}>
                {selectedAchievement.description}
              </p>

              {!selectedAchievement.unlocked && selectedAchievement.progress !== undefined && (
                <div className="bg-white/10 rounded-xl p-3">
                  <div className="flex justify-between text-sm text-white/80 mb-2">
                    <span>Progress</span>
                    <span className="font-bold text-white">{selectedAchievement.progress} / {selectedAchievement.maxProgress}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(selectedAchievement.progress! / selectedAchievement.maxProgress!) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-1.5 mt-4">
                <div className={clsx(
                  "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-gradient-to-r",
                  selectedAchievement.rarity === 'common' && "from-gray-600 to-gray-700",
                  selectedAchievement.rarity === 'rare' && "from-blue-600 to-blue-700",
                  selectedAchievement.rarity === 'epic' && "from-purple-600 to-purple-700",
                  selectedAchievement.rarity === 'legendary' && "from-amber-500 to-amber-600"
                )}>
                  {selectedAchievement.rarity}
                </div>
                <button
                  onClick={() => setSelectedAchievement(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold text-white transition-colors"
                >
                  {lang === 'kz' ? 'Жабу' : lang === 'ru' ? 'Закрыть' : 'Close'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};
