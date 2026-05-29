import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useStore } from '../store/useStoreImpl';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { claudeTokens } from './ui/claudeTokens';

export const BrainProfile = () => {
  const { brainStats } = useStore();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const { isClaude } = useThemeStyles();

  const labels = {
    focus: lang === 'kz' ? 'Зейін' : lang === 'ru' ? 'Внимание' : 'Focus',
    memory: lang === 'kz' ? 'Жады' : lang === 'ru' ? 'Память' : 'Memory',
    logic: lang === 'kz' ? 'Логика' : lang === 'ru' ? 'Логика' : 'Logic',
    speed: lang === 'kz' ? 'Жылдамдық' : lang === 'ru' ? 'Скорость' : 'Speed',
    flexibility: lang === 'kz' ? 'Икемділік' : lang === 'ru' ? 'Гибкость' : 'Flexibility',
  };

  const stats = brainStats || { focus: 20, memory: 20, logic: 20, speed: 20, flexibility: 20 };
  const combinedScore = stats.combinedScore ?? 100;
  const brainAge = stats.brainAge ?? 33;
  const workoutBoostPercent = Math.round(((stats.dailyWorkoutModifier ?? 1) - 1) * 100);

  const data = [
    { subject: labels.focus, A: stats.focus, fullMark: 100 },
    { subject: labels.memory, A: stats.memory, fullMark: 100 },
    { subject: labels.logic, A: stats.logic, fullMark: 100 },
    { subject: labels.speed, A: stats.speed, fullMark: 100 },
    { subject: labels.flexibility, A: stats.flexibility, fullMark: 100 },
  ];

  const headingText =
    lang === 'kz' ? 'Ми Паспорты' : lang === 'ru' ? 'Паспорт Мозга' : 'Brain Profile';
  const brainLevel = Math.floor(
    (stats.focus + stats.memory + stats.logic + stats.speed + stats.flexibility) / 50
  );

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
        <div className="flex justify-between items-end mb-4">
          <div>
            <span
              className="text-[10px] font-medium uppercase tracking-[0.22em]"
              style={{ color: claudeTokens.textMuted }}
            >
              Cognitive
            </span>
            <h3
              className="mt-1 leading-none tracking-tight"
              style={{
                color: claudeTokens.textPrimary,
                fontFamily: claudeTokens.serifStack,
                fontSize: '22px',
                fontWeight: 500,
              }}
            >
              {headingText}
            </h3>
          </div>
          <span
            className="text-[10px] font-medium uppercase tracking-[0.18em]"
            style={{ color: claudeTokens.accent, fontFamily: claudeTokens.serifStack }}
          >
            Lv {brainLevel}
          </span>
        </div>

        {/* Three editorial stat columns separated by hairline rules */}
        <div
          className="grid grid-cols-3 mb-3 rounded-xl overflow-hidden"
          style={{ border: `1px solid ${claudeTokens.border}` }}
        >
          {[
            { label: 'Combined', value: combinedScore, color: claudeTokens.textPrimary },
            { label: 'Brain age', value: brainAge, color: claudeTokens.textPrimary },
            {
              label: 'Workout',
              value: `${workoutBoostPercent > 0 ? '+' : ''}${workoutBoostPercent}%`,
              color: workoutBoostPercent >= 0 ? claudeTokens.accent : claudeTokens.warning,
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="p-3"
              style={{
                borderRight: i < 2 ? `1px solid ${claudeTokens.border}` : 'none',
                backgroundColor: claudeTokens.surface,
              }}
            >
              <div
                className="text-[10px] uppercase tracking-[0.22em]"
                style={{ color: claudeTokens.textMuted }}
              >
                {stat.label}
              </div>
              <div
                className="mt-1 tabular-nums"
                style={{
                  color: stat.color,
                  fontFamily: claudeTokens.serifStack,
                  fontSize: '22px',
                  fontWeight: 500,
                  fontFeatureSettings: '"lnum","tnum"',
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Radar — terracotta line + warm grid */}
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
              <PolarGrid stroke={claudeTokens.border} />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: claudeTokens.textMuted, fontSize: 10, fontWeight: 500 }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Stats"
                dataKey="A"
                stroke={claudeTokens.accent}
                strokeWidth={2}
                fill={claudeTokens.accent}
                fillOpacity={0.18}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Per-axis hairline rows */}
        <div
          className="mt-3 rounded-xl overflow-hidden"
          style={{ border: `1px solid ${claudeTokens.border}` }}
        >
          {data.map((item, i) => (
            <div
              key={item.subject}
              className="flex items-center justify-between p-3"
              style={{
                borderBottom: i < data.length - 1 ? `1px solid ${claudeTokens.border}` : 'none',
                backgroundColor: claudeTokens.surface,
              }}
            >
              <span className="text-[12px]" style={{ color: claudeTokens.textBody }}>
                {item.subject}
              </span>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-20 h-1 rounded-full overflow-hidden"
                  style={{ backgroundColor: claudeTokens.border }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.A}%`,
                      backgroundColor: claudeTokens.accent,
                    }}
                  />
                </div>
                <span
                  className="w-8 text-right text-[12px] tabular-nums"
                  style={{
                    color: claudeTokens.textPrimary,
                    fontFamily: claudeTokens.serifStack,
                    fontWeight: 500,
                    fontFeatureSettings: '"lnum","tnum"',
                  }}
                >
                  {Math.round(item.A)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    );
  }

  // Legacy themes (dark / light / blue / gold) — original markup
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full bg-black/20 backdrop-blur-md rounded-3xl p-4 border border-white/10"
    >
      <div className="flex justify-between items-center mb-2 px-2">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
           🧠 {headingText}
        </h3>
        <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">Lv. {brainLevel}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Combined</div>
          <div className="mt-1 text-xl font-black text-white">{combinedScore}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Brain Age</div>
          <div className="mt-1 text-xl font-black text-white">{brainAge}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Workout</div>
          <div className={clsx("mt-1 text-xl font-black", workoutBoostPercent >= 0 ? "text-emerald-400" : "text-orange-400")}>
            {workoutBoostPercent > 0 ? `+${workoutBoostPercent}%` : `${workoutBoostPercent}%`}
          </div>
        </div>
      </div>

      <div className="h-[250px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="My Stats"
              dataKey="A"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="#3b82f6"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
         {data.map((item, i) => (
           <div key={i} className="bg-white/5 rounded-lg p-2 flex justify-between items-center hover:bg-white/10 transition-colors">
             <span className="text-xs text-gray-400">{item.subject}</span>
             <div className="flex items-center gap-1">
               <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                 <div
                   className="h-full bg-blue-500 rounded-full"
                   style={{ width: `${item.A}%` }}
                 />
               </div>
               <span className="text-xs font-bold text-white w-6 text-right">{Math.round(item.A)}</span>
             </div>
           </div>
         ))}
      </div>
    </motion.div>
  );
};
