import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useStore } from '../store/useStore.1';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export const BrainProfile = () => {
  const { brainStats } = useStore();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  // Translations for chart labels
  const labels = {
    focus: lang === 'kz' ? 'Зейін' : lang === 'ru' ? 'Внимание' : 'Focus',
    memory: lang === 'kz' ? 'Жады' : lang === 'ru' ? 'Память' : 'Memory',
    logic: lang === 'kz' ? 'Логика' : lang === 'ru' ? 'Логика' : 'Logic',
    speed: lang === 'kz' ? 'Жылдамдық' : lang === 'ru' ? 'Скорость' : 'Speed',
    flexibility: lang === 'kz' ? 'Икемділік' : lang === 'ru' ? 'Гибкость' : 'Flexibility',
  };

  // Safe fallback if brainStats is undefined (e.g. old store version)
  const stats = brainStats || { focus: 20, memory: 20, logic: 20, speed: 20, flexibility: 20 };

  const data = [
    { subject: labels.focus, A: stats.focus, fullMark: 100 },
    { subject: labels.memory, A: stats.memory, fullMark: 100 },
    { subject: labels.logic, A: stats.logic, fullMark: 100 },
    { subject: labels.speed, A: stats.speed, fullMark: 100 },
    { subject: labels.flexibility, A: stats.flexibility, fullMark: 100 },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full bg-black/20 backdrop-blur-md rounded-3xl p-4 border border-white/10"
    >
      <div className="flex justify-between items-center mb-2 px-2">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
           🧠 {lang === 'kz' ? 'Ми Паспорты' : lang === 'ru' ? 'Паспорт Мозга' : 'Brain Profile'}
        </h3>
        <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">Lv. {Math.floor((stats.focus + stats.memory + stats.logic + stats.speed + stats.flexibility) / 50)}</span>
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
