import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Target, Zap, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { claudeTokens } from './ui/claudeTokens';

export type GameType = 'schulte' | 'stroop' | 'memory' | 'math' | 'tetris' | '2048' | 'odd_one' | 'pairs';

interface GameInfo {
  title: string;
  benefits: string[];
  science: string;
  skills: string[];
}

export const InfoGuideModal = ({ 
  isOpen, 
  onClose,
  gameType 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  gameType: GameType;
}) => {
  const { i18n } = useTranslation();
  const lang = i18n.language as 'kz' | 'ru' | 'en';
  const { isClaude } = useThemeStyles();

  if (!isOpen) return null;

  const gameData: Record<GameType, { kz: GameInfo, ru: GameInfo, en: GameInfo }> = {
    schulte: {
      kz: {
        title: "Шульте Кестесі",
        benefits: ["Перифериялық көруді дамытады", "Оқу жылдамдығын арттырады", "Зейін тұрақтылығын күшейтеді"],
        science: "Бұл әдісті ғалымдар ұшқыштар мен ғарышкерлердің зейінін жаттықтыру үшін қолданған. Тұрақты жаттығу көру аймағын 20-30%-ға кеңейтеді.",
        skills: ["Зейін", "Жылдамдық"]
      },
      ru: {
        title: "Таблица Шульте",
        benefits: ["Развивает периферийное зрение", "Увеличивает скорость чтения", "Улучшает устойчивость внимания"],
        science: "Этот метод использовался для тренировки внимания пилотов. Регулярные тренировки расширяют поле зрения на 20-30%.",
        skills: ["Внимание", "Скорость"]
      },
      en: {
        title: "Schulte Table",
        benefits: ["Develops peripheral vision", "Increases reading speed", "Improves attention stability"],
        science: "Originally used to train pilots. Regular practice expands your field of vision by 20-30%.",
        skills: ["Focus", "Speed"]
      }
    },
    stroop: {
      kz: {
        title: "Струп Тесті",
        benefits: ["Когнитивті икемділікті арттырады", "Импульсивті реакцияны тежейді", "Стресске төзімділікті қалыптастырады"],
        science: "Нобель сыйлығының лауреаттары зерттеген 'Алдыңғы ми қыртысының' белсенділігін арттырады. Дұрыс шешім қабылдауға көмектеседі.",
        skills: ["Бақылау", "Икемділік"]
      },
      ru: {
        title: "Тест Струпа",
        benefits: ["Повышает когнитивную гибкость", "Тормозит импульсивные реакции", "Формирует стрессоустойчивость"],
        science: "Активирует переднюю поясную кору мозга. Помогает принимать взвешенные решения в стрессовых ситуациях.",
        skills: ["Контроль", "Гибкость"]
      },
      en: {
        title: "Stroop Test",
        benefits: ["Enhances cognitive flexibility", "Inhibits impulsive reactions", "Builds stress resilience"],
        science: "Activates the anterior cingulate cortex. Helps in making rational decisions under stress.",
        skills: ["Control", "Flexibility"]
      }
    },
    memory: {
      kz: {
        title: "Матрица Памяти",
        benefits: ["Қысқа мерзімді жадыны жақсартады", "Визуалды есте сақтауды дамытады", "Кеңістіктік бағдарлауды үйретеді"],
        science: "Жұмыс жадының (Working Memory) көлемін ұлғайтады, бұл жаңа тілдерді үйрену мен күрделі есептерді шығару үшін өте маңызды.",
        skills: ["Жады", "Кеңістік"]
      },
      ru: {
        title: "Матрица Памяти",
        benefits: ["Улучшает кратковременную память", "Развивает визуальную память", "Тренирует пространственное мышление"],
        science: "Увеличивает объем рабочей памяти (Working Memory), что критически важно для изучения языков и решения сложных задач.",
        skills: ["Память", "Пространство"]
      },
      en: {
        title: "Memory Matrix",
        benefits: ["Improves short-term memory", "Develops visual recall", "Trains spatial orientation"],
        science: "Increases Working Memory capacity, which is crucial for learning new languages and complex problem solving.",
        skills: ["Memory", "Spatial"]
      }
    },
    math: {
      kz: {
        title: "Арифметика",
        benefits: ["Мидың нейропластикасын арттырады", "Логикалық ойлауды жылдамдатады", "Аналитикалық қабілетті шыңдайды"],
        science: "Күнделікті есеп шығару мидың 'Prefrontal Cortex' аймағын белсенді ұстап, қартаю процесін баяулатады.",
        skills: ["Логика", "Есептеу"]
      },
      ru: {
        title: "Арифметика",
        benefits: ["Повышает нейропластичность мозга", "Ускоряет логическое мышление", "Оттачивает аналитические способности"],
        science: "Ежедневные вычисления держат префронтальную кору в тонусе и замедляют процессы старения мозга.",
        skills: ["Логика", "Вычисления"]
      },
      en: {
        title: "Arithmetic",
        benefits: ["Increases neuroplasticity", "Accelerates logical thinking", "Sharpens analytical skills"],
        science: "Daily mental math keeps the prefrontal cortex active and slows down brain aging processes.",
        skills: ["Logic", "Calculation"]
      }
    },
    tetris: {
      kz: {
        title: "Тетрис",
        benefits: ["Кеңістіктік ойлауды дамытады", "Жоспарлау қабілетін арттырады", "Мидың тиімділігін арттырады"],
        science: "'Тетрис эффектісі' - мидың кеңістіктік тапсырмаларды шешу кезіндегі энергия шығынын азайтып, тиімділігін арттыратыны дәлелденген.",
        skills: ["Кеңістік", "Жоспарлау"]
      },
      ru: {
        title: "Тетрис",
        benefits: ["Развивает пространственное мышление", "Улучшает навыки планирования", "Повышает эффективность мозга"],
        science: "'Эффект Тетриса' — доказано, что игра снижает энергозатраты мозга при решении пространственных задач, делая его эффективнее.",
        skills: ["Пространство", "Планирование"]
      },
      en: {
        title: "Tetris",
        benefits: ["Develops spatial reasoning", "Improves planning skills", "Increases brain efficiency"],
        science: "The 'Tetris Effect' proves that the game reduces brain energy consumption for spatial tasks, increasing efficiency.",
        skills: ["Spatial", "Planning"]
      }
    },
    '2048': {
      kz: {
        title: "2048",
        benefits: ["Стратегиялық ойлауды дамытады", "Болжау қабілетін жаттықтырады", "Логикалық тізбектерді құруды үйретеді"],
        science: "Шахмат сияқты, бұл ойын бірнеше қадам алға ойлауды талап етеді, бұл мидың стратегиялық орталығын дамытады.",
        skills: ["Стратегия", "Логика"]
      },
      ru: {
        title: "2048",
        benefits: ["Развивает стратегическое мышление", "Тренирует навыки прогнозирования", "Учит строить логические цепочки"],
        science: "Как и шахматы, игра требует продумывания на несколько ходов вперед, развивая стратегические центры мозга.",
        skills: ["Стратегия", "Логика"]
      },
      en: {
        title: "2048",
        benefits: ["Develops strategic thinking", "Trains forecasting skills", "Teaches logical sequencing"],
        science: "Like chess, this game requires thinking several steps ahead, developing the brain's strategic centers.",
        skills: ["Strategy", "Logic"]
      }
    },
    odd_one: {
      kz: {
        title: "Артығын Тап",
        benefits: ["Визуалды зейінді күшейтеді", "Детальдарды байқағыштықты арттырады", "Ақпаратты сұрыптауды үйретеді"],
        science: "Визуалды іздеу тапсырмалары мидың 'Visual Cortex' аймағын жаттықтырады, бұл күнделікті өмірде қателіктерді тез табуға көмектеседі.",
        skills: ["Зейін", "Қабылдау"]
      },
      ru: {
        title: "Найди Лишнее",
        benefits: ["Усиливает визуальное внимание", "Повышает наблюдательность к деталям", "Учит сортировать информацию"],
        science: "Задачи на визуальный поиск тренируют зрительную кору, помогая быстрее замечать ошибки и детали в реальной жизни.",
        skills: ["Внимание", "Восприятие"]
      },
      en: {
        title: "Odd One Out",
        benefits: ["Strengthens visual attention", "Increases detail observation", "Teaches information sorting"],
        science: "Visual search tasks train the visual cortex, helping you spot errors and details faster in daily life.",
        skills: ["Focus", "Perception"]
      }
    },
    pairs: {
      kz: {
        title: "Жұптар",
        benefits: ["Ассоциативті жадыны дамытады", "Зейін шоғырландыруды жақсартады", "Бейнелік ойлауды қалыптастырады"],
        science: "Гиппокамп белсенділігін арттырады. Бұл аймақ есте сақтау және кеңістікте бағдарлау үшін жауап береді.",
        skills: ["Жады", "Бейнелеу"]
      },
      ru: {
        title: "Пары",
        benefits: ["Развивает ассоциативную память", "Улучшает концентрацию внимания", "Формирует образное мышление"],
        science: "Стимулирует активность гиппокампа. Эта область отвечает за память и ориентацию в пространстве.",
        skills: ["Память", "Образы"]
      },
      en: {
        title: "Pairs",
        benefits: ["Develops associative memory", "Improves concentration", "Forms imaginative thinking"],
        science: "Stimulates hippocampus activity. This area is responsible for memory and spatial navigation.",
        skills: ["Memory", "Imagery"]
      }
    }
  };

  const currentData = gameData[gameType][lang] || gameData[gameType]['en'];

  if (isClaude) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(31,30,29,0.55)', backdropFilter: 'blur(6px)' }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: claudeTokens.surface,
              border: `1px solid ${claudeTokens.border}`,
              maxHeight: '85vh',
            }}
          >
            <header
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: `1px solid ${claudeTokens.border}` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: claudeTokens.accentSoft, color: claudeTokens.accent }}
                >
                  <Brain size={18} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <span
                    className="block text-[10px] font-medium uppercase tracking-[0.22em]"
                    style={{ color: claudeTokens.textMuted }}
                  >
                    Game guide
                  </span>
                  <h2
                    className="leading-tight italic truncate"
                    style={{
                      color: claudeTokens.textPrimary,
                      fontFamily: claudeTokens.serifStack,
                      fontSize: '20px',
                      fontWeight: 500,
                    }}
                  >
                    {currentData.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[#F0EEE6]"
                style={{ color: claudeTokens.textMuted }}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </header>

            <div className="overflow-y-auto px-6 py-5 space-y-5">
              {/* Skill chips */}
              <div className="flex flex-wrap gap-1.5">
                {currentData.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="text-[10px] uppercase tracking-[0.22em] italic px-2.5 py-1 rounded-md"
                    style={{
                      color: claudeTokens.accent,
                      border: `1px solid ${claudeTokens.accent}`,
                      fontFamily: claudeTokens.serifStack,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Benefits — hairline list */}
              <section>
                <h3
                  className="text-[10px] font-medium uppercase tracking-[0.22em] mb-3 flex items-center gap-2"
                  style={{ color: claudeTokens.textMuted }}
                >
                  <Target size={12} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
                  {lang === 'kz' ? 'Пайдасы' : lang === 'ru' ? 'Польза' : 'Benefits'}
                </h3>
                <ul
                  className="rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: claudeTokens.surface,
                    border: `1px solid ${claudeTokens.border}`,
                  }}
                >
                  {currentData.benefits.map((benefit, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 px-4 py-3 text-[13px]"
                      style={{
                        color: claudeTokens.textBody,
                        borderBottom:
                          i < currentData.benefits.length - 1
                            ? `1px solid ${claudeTokens.border}`
                            : 'none',
                      }}
                    >
                      <span style={{ color: claudeTokens.accent, marginTop: 2 }}>·</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Scientific fact — sunken cream pull-quote with terracotta side rule */}
              <section
                className="relative rounded-xl px-5 py-4"
                style={{
                  backgroundColor: claudeTokens.surfaceMuted,
                  border: `1px solid ${claudeTokens.border}`,
                }}
              >
                <span
                  className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full"
                  style={{ backgroundColor: claudeTokens.accent }}
                />
                <h3
                  className="text-[10px] font-medium uppercase tracking-[0.22em] mb-2 flex items-center gap-2 pl-3"
                  style={{ color: claudeTokens.accent, fontFamily: claudeTokens.serifStack }}
                >
                  <Lightbulb size={12} strokeWidth={1.75} />
                  {lang === 'kz' ? 'Ғылыми факт' : lang === 'ru' ? 'Научный факт' : 'Scientific fact'}
                </h3>
                <p
                  className="text-[13px] italic leading-relaxed pl-3"
                  style={{ color: claudeTokens.textBody, fontFamily: claudeTokens.serifStack }}
                >
                  “{currentData.science}”
                </p>
              </section>

              <button
                onClick={onClose}
                className="w-full rounded-lg py-3 text-[14px] font-medium transition-colors flex items-center justify-center gap-2"
                style={{ backgroundColor: claudeTokens.accent, color: '#FFFFFF' }}
              >
                <Zap size={15} strokeWidth={2} />
                {lang === 'kz' ? 'Бастау' : lang === 'ru' ? 'Начать' : 'Start'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-[#1a1a1a] w-full max-w-md rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative"
        >
           <button 
             onClick={onClose}
             className="absolute top-4 right-4 p-2 bg-white/5 rounded-full text-gray-400 hover:bg-white/10 z-10"
           >
             <X size={20} />
           </button>

           <div className="p-6">
             <div className="flex flex-col items-center mb-6">
               <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
                 <Brain size={32} className="text-blue-400" />
               </div>
               <h2 className="text-2xl font-bold text-white text-center">{currentData.title}</h2>
               <div className="flex gap-2 mt-2">
                 {currentData.skills.map((skill, i) => (
                   <span key={i} className="text-[10px] uppercase font-bold px-2 py-1 rounded-lg bg-white/10 text-gray-400">
                     {skill}
                   </span>
                 ))}
               </div>
             </div>

             <div className="space-y-6">
               <div>
                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                   <Target size={14} className="text-green-500" />
                   {lang === 'kz' ? 'Пайдасы' : lang === 'ru' ? 'Польза' : 'Benefits'}
                 </h3>
                 <ul className="space-y-2">
                   {currentData.benefits.map((benefit, i) => (
                     <li key={i} className="flex items-start gap-3 text-sm text-gray-200">
                       <div className="min-w-[4px] h-[4px] rounded-full bg-green-500 mt-2" />
                       {benefit}
                     </li>
                   ))}
                 </ul>
               </div>

               <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                 <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                   <Lightbulb size={14} />
                   {lang === 'kz' ? 'Ғылыми факт' : lang === 'ru' ? 'Научный факт' : 'Scientific Fact'}
                 </h3>
                 <p className="text-xs leading-relaxed text-gray-300 italic">
                   "{currentData.science}"
                 </p>
               </div>
             </div>

             <button 
               onClick={onClose}
               className="w-full mt-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
             >
               <Zap size={18} fill="currentColor" />
               {lang === 'kz' ? 'Бастау' : lang === 'ru' ? 'Начать' : 'Start'}
             </button>
           </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
