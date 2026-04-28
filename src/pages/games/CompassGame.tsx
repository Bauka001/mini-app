import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { SKIN_STYLES } from '../../utils/skins';
import { motion, AnimatePresence } from 'framer-motion';
import { Difficulty, DIFFICULTY_COIN_MULT } from '../../types/games';
import { useGameTimer } from '../../hooks/useGameTimer';
import { useLocalBest } from '../../hooks/useLocalBest';
import { useHaptic } from '../../hooks/useHaptic';
import { useGameSettings } from '../../store/gameSettings';
import { DifficultySelector } from '../../components/games/DifficultySelector';
import { GameHUD } from '../../components/games/GameHUD';
import { ReviveModal } from '../../components/modals/ReviveModal';
import { Compass, RotateCcw, RotateCw, Map, Target, CheckCircle2 } from 'lucide-react';

const GAME_ID = 'compass';

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  {
    timeMs: number;
    angles: number[];
    questionCount: number;
  }
> = {
  easy:   { timeMs: 45_000, angles: [0, 90, 180, 270], questionCount: 10 },
  medium: { timeMs: 60_000, angles: [0, 45, 90, 135, 180, 225, 270, 315], questionCount: 12 },
  hard:   { timeMs: 75_000, angles: [15, 30, 60, 105, 120, 150, 210, 240, 300, 330], questionCount: 15 },
};

const getDirectionName = (angle: number, lang: string) => {
  const isKz = lang === 'kz';
  const isRu = lang === 'ru';

  const names: Record<number, { en: string; ru: string; kz: string }> = {
    0: { en: 'North (N)', ru: 'Север (N)', kz: 'Солтүстік (N)' },
    45: { en: 'North-East (NE)', ru: 'Северо-Восток (NE)', kz: 'Солтүстік-Шығыс (NE)' },
    90: { en: 'East (E)', ru: 'Восток (E)', kz: 'Шығыс (E)' },
    135: { en: 'South-East (SE)', ru: 'Юго-Восток (SE)', kz: 'Оңтүстік-Шығыс (SE)' },
    180: { en: 'South (S)', ru: 'Юг (S)', kz: 'Оңтүстік (S)' },
    225: { en: 'South-West (SW)', ru: 'Юго-Запад (SW)', kz: 'Оңтүстік-Батыс (SW)' },
    270: { en: 'West (W)', ru: 'Запад (W)', kz: 'Батыс (W)' },
    315: { en: 'North-West (NW)', ru: 'Северо-Запад (NW)', kz: 'Солтүстік-Батыс (NW)' },
  };

  if (names[angle]) {
    return isKz ? names[angle].kz : isRu ? names[angle].ru : names[angle].en;
  }
  return `${angle}°`;
};

export const CompassGame = () => {
  const { t } = useTranslation();
  const { addGameResult, theme } = useStore();

  return (
    <GameWrapper
      title={t('game_compass', 'Compass Game')}
      instructions={t('compass_desc', 'Берілген бағытты табу үшін компасты бұраңыз. Виртуалды түрде компасты қолдануды үйреніңіз!')}
    >
      {({ onEnd, isPaused }) => (
        <CompassBoard
          onEnd={(score, coins) => {
            queueMicrotask(() => addGameResult({ gameId: GAME_ID, score, coinsEarned: coins }));
            onEnd(score, coins);
          }}
          isGamePaused={isPaused}
          theme={theme}
        />
      )}
    </GameWrapper>
  );
};

export const CompassBoard = ({ onEnd, isGamePaused, theme }: { onEnd: (score: string, coins: number) => void, isGamePaused: boolean, theme: string }) => {
  const { language } = useStore();
  const { t } = useTranslation();
  const storedDifficulty = useGameSettings(s => s.difficultyPrefs[GAME_ID] ?? 'easy');
  const setStoredDifficulty = useGameSettings(s => s.setDifficulty);
  const [difficulty, setDifficulty] = useState<Difficulty>(storedDifficulty);
  const config = DIFFICULTY_CONFIG[difficulty];

  const { best, submit } = useLocalBest(GAME_ID, difficulty);
  const haptic = useHaptic();

  const [targetAngle, setTargetAngle] = useState<number | null>(null);
  const [currentAngle, setCurrentAngle] = useState<number>(0);
  
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [tutorialStep, setTutorialStep] = useState(0); // 0 = not started, 1,2,3 = steps, 4 = finished
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [courseStep, setCourseStep] = useState(0); // 0 means not in course or completed, 1-6 are lessons
  const [isCourseMode, setIsCourseMode] = useState(false);

  // Check if tutorial was already seen
  useEffect(() => {
    const seen = localStorage.getItem('focus-compass-tutorial-seen');
    const courseCompleted = localStorage.getItem('focus-compass-course-completed');
    if (seen && courseCompleted) {
      setHasSeenTutorial(true);
      setTutorialStep(6);
      setIsCourseMode(false);
      setCourseStep(0);
    } else {
      setTutorialStep(1);
    }
  }, []);

  const completeTutorial = useCallback(() => {
    localStorage.setItem('focus-compass-tutorial-seen', 'true');
    setHasSeenTutorial(true);
    setTutorialStep(6);
    setIsCourseMode(true);
    setCourseStep(1); // Start course at lesson 1
    haptic.impact('light');
  }, [haptic]);

  // Story-driven missions that teach compass usage step by step.
  // Each lesson has: target angle, short scenario, hint, icon.
  const courseLessons = useMemo(() => [
    {
      target: 0,
      title: '1-сабақ · Солтүстік',
      scenario: 'Қыран биік таудан ұшып шықты. Полярлық жұлдыз бағытын тап.',
      hint: '☝️ Қызыл жебе N-ге қараған кезде — бұл Солтүстік (0°).',
      icon: '⭐',
    },
    {
      target: 90,
      title: '2-сабақ · Шығыс',
      scenario: 'Күн атты — бұл қай тарап? 90° бетін бұр.',
      hint: '🌅 Күн шығысы — Шығыс (E, 90°).',
      icon: '🌅',
    },
    {
      target: 180,
      title: '3-сабақ · Оңтүстік',
      scenario: 'Көшбасшы Оңтүстікке қарай 180° бет алып жүр. Сен де бұрыл.',
      hint: '🔆 Солтүстікке қарама-қарсы — Оңтүстік (S, 180°).',
      icon: '🔆',
    },
    {
      target: 270,
      title: '4-сабақ · Батыс',
      scenario: 'Күн батты. Батысқа қарай (W) бағдарла.',
      hint: '🌇 Күн батуы — Батыс (W, 270°).',
      icon: '🌇',
    },
    {
      target: 45,
      title: '5-сабақ · Солтүстік-Шығыс',
      scenario: 'Ауыл ортасы — N мен E арасында. 45° тап.',
      hint: '🧭 N мен E арасы — Солтүстік-Шығыс (NE, 45°).',
      icon: '🧭',
    },
    {
      target: 135,
      title: '6-сабақ · Оңтүстік-Шығыс',
      scenario: 'Өзен 135° бағытқа ағады. Соған сай бұрыл.',
      hint: '💧 E мен S арасы — Оңтүстік-Шығыс (SE, 135°).',
      icon: '💧',
    },
    {
      target: 225,
      title: '7-сабақ · Оңтүстік-Батыс',
      scenario: 'Дауыл SW-ден келеді. 225°-қа бетіңді бұр.',
      hint: '🌬️ S мен W арасы — Оңтүстік-Батыс (SW, 225°).',
      icon: '🌬️',
    },
    {
      target: 315,
      title: '8-сабақ · Солтүстік-Батыс',
      scenario: 'Жол 315° бойы созылады. NW бағытын тап.',
      hint: '🏔️ W мен N арасы — Солтүстік-Батыс (NW, 315°).',
      icon: '🏔️',
    },
    {
      target: 60,
      title: '9-сабақ · Нақты бұрыш',
      scenario: 'Карта бойынша 60° азимут. Дәл тап!',
      hint: '📐 Белгісі жоқ бұрыштар: N-ден сағат тілімен санаймыз.',
      icon: '📐',
    },
    {
      target: 210,
      title: '10-сабақ · Меңгеру',
      scenario: 'Соңғы сабақ — 210° бағытты өз бетіңмен тап.',
      hint: '🎯 Сәттілік! Компас — саяхатшының досы.',
      icon: '🎯',
    },
  ], []);

  const generateTarget = useCallback(() => {
    if (isCourseMode && courseStep > 0 && courseStep <= courseLessons.length) {
      setTargetAngle(courseLessons[courseStep - 1].target);
      setIsSuccess(false);
      setHoldProgress(0);
      return;
    }

    const angles = config.angles;
    let nextAngle = angles[Math.floor(Math.random() * angles.length)];
    // Prevent same angle twice in a row if possible
    if (nextAngle === targetAngle && angles.length > 1) {
      nextAngle = angles[(angles.indexOf(nextAngle) + 1) % angles.length];
    }
    setTargetAngle(nextAngle);
    setIsSuccess(false);
    setHoldProgress(0);
  }, [config, targetAngle, isCourseMode, courseStep, courseLessons]);

  useEffect(() => {
    if (tutorialStep >= 6) {
      generateTarget();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, courseStep, tutorialStep]); // regenerate when difficulty or course step changes

  const { timeLeftMs, reset: resetTimer } = useGameTimer({
    durationMs: config.timeMs,
    tickMs: 100,
    isActive: !isCourseMode && questionsAnswered < config.questionCount && !isSuccess && tutorialStep >= 6,
    isPaused: isGamePaused,
    resetKey: `${difficulty}-${tutorialStep}-${isCourseMode}`,
    onExpire: () => {
      haptic.notification('error');
      handleGameEnd();
    },
  });

  const addPointsForWin = useCallback(() => {
    const base = 10;
    const comboBonus = combo > 0 && combo % 3 === 0 ? 20 : 0;
    const gained = base + comboBonus;
    setScore(s => s + gained);
  }, [combo]);

  const handleGameEnd = useCallback(() => {
    const isNewBest = submit(score);
    const coins = Math.round((score * DIFFICULTY_COIN_MULT[difficulty]) / 4);
    onEnd(
      isNewBest ? `${score} ★` : `${score}`,
      Math.max(0, coins)
    );
  }, [score, submit, difficulty, onEnd]);

  const handleRevive = useCallback(() => {
    resetTimer();
    setQuestionsAnswered(0);
    setScore(0);
    setCombo(0);
    setCurrentAngle(0);
    generateTarget();
    haptic.impact('medium');
  }, [resetTimer, generateTarget, haptic]);

  const changeDifficulty = useCallback((next: Difficulty) => {
    setStoredDifficulty(GAME_ID, next);
    setDifficulty(next);
    setQuestionsAnswered(0);
    setScore(0);
    setCombo(0);
    setCurrentAngle(0);
  }, [setStoredDifficulty]);

  // Check win condition
  useEffect(() => {
    if (isGamePaused || targetAngle === null || isSuccess || tutorialStep < 6) return;

    // Check if within 5 degrees
    let diff = Math.abs(currentAngle - targetAngle);
    if (diff > 180) diff = 360 - diff;

    if (diff <= 5) {
      // Increase hold progress
      const timer = setTimeout(() => {
        setHoldProgress(p => {
          const next = p + 20;
          if (next >= 100) {
            // WIN!
            setIsSuccess(true);
            haptic.notification('success');

            if (isCourseMode) {
              setTimeout(() => {
                if (courseStep < courseLessons.length) {
                  setCourseStep(s => s + 1);
                } else {
                  // Course completed!
                  setCourseStep(courseLessons.length + 1); // move to completion state
                  localStorage.setItem('focus-compass-course-completed', 'true');
                }
              }, 1000);
            } else {
              setCombo(c => c + 1);
              addPointsForWin();
              
              setTimeout(() => {
                const nextCount = questionsAnswered + 1;
                setQuestionsAnswered(nextCount);
                if (nextCount >= config.questionCount) {
                  handleGameEnd();
                } else {
                  generateTarget();
                }
              }, 500);
            }
            return 100;
          }
          return next;
        });
      }, 100);
      return () => clearTimeout(timer);
    } else {
      if (holdProgress > 0) {
        setHoldProgress(0);
      }
    }
  }, [currentAngle, targetAngle, isGamePaused, holdProgress, isSuccess, questionsAnswered, config.questionCount, haptic, addPointsForWin, handleGameEnd, generateTarget, isCourseMode, courseStep, tutorialStep, courseLessons.length]);

  if (targetAngle === null) return null;

  const isGameActive = !isCourseMode && questionsAnswered < config.questionCount && timeLeftMs > 0;

  return (
    <div
      className={clsx(
        'h-full flex flex-col items-center p-4 relative overflow-hidden transition-colors duration-500',
        theme === 'light' ? 'bg-gradient-to-br from-blue-50 to-indigo-50' : 'bg-transparent'
      )}
    >
      {theme !== 'light' && (
        <div
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background z-0"
          aria-hidden
        />
      )}

      {/* Tutorial Overlay — 5-step interactive intro to compass */}
      <AnimatePresence>
        {tutorialStep > 0 && tutorialStep < 6 && (() => {
          const steps = [
            {
              icon: '🧭',
              title: 'Компас дегеніміз не?',
              body: 'Компас — бағытты анықтайтын ежелгі құрал. Қызыл жебе әрқашан Солтүстікке (N) қарайды.',
              visual: 'cardinal',
            },
            {
              icon: '🧭',
              title: '4 негізгі бағыт',
              body: 'N = Солтүстік (жоғары), E = Шығыс (оң), S = Оңтүстік (төмен), W = Батыс (сол).',
              visual: 'cardinal',
            },
            {
              icon: '📐',
              title: 'Градустар',
              body: 'Толық шеңбер — 360°. N = 0°, E = 90°, S = 180°, W = 270°. Сағат тілімен саналады.',
              visual: 'degrees',
            },
            {
              icon: '✦',
              title: 'Аралық бағыттар',
              body: 'NE = 45° (N мен E арасы), SE = 135°, SW = 225°, NW = 315°. Бірдей қашықтықта.',
              visual: 'intercardinal',
            },
            {
              icon: '🎯',
              title: 'Ойын ережесі',
              body: 'Экранда мақсатты бағыт шығады. Слайдер немесе түймелерді қолданып 5° дәлдікпен бұрыл. 0.5с ұста — ұпай аласың!',
              visual: 'play',
            },
          ] as const;
          const cur = steps[tutorialStep - 1];
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/70 backdrop-blur-md"
            >
              <motion.div
                key={tutorialStep}
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className={clsx(
                  'w-full max-w-sm rounded-3xl p-6 shadow-2xl border',
                  theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-700'
                )}
              >
                <div className="flex justify-center mb-4">
                  <div className={clsx(
                    'w-20 h-20 rounded-3xl flex items-center justify-center shadow-inner text-4xl',
                    theme === 'light' ? 'bg-indigo-50' : 'bg-indigo-500/20'
                  )}>
                    {cur.icon}
                  </div>
                </div>

                {/* Visual diagram per step */}
                <div className="flex justify-center mb-4">
                  {cur.visual === 'cardinal' && (
                    <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden>
                      <circle cx="70" cy="70" r="58" fill="none" stroke={theme==='light'?'#e5e7eb':'#374151'} strokeWidth="2" />
                      <text x="70" y="22" textAnchor="middle" fontSize="18" fontWeight="900" fill="#ef4444">N</text>
                      <text x="120" y="76" textAnchor="middle" fontSize="16" fontWeight="700" fill={theme==='light'?'#1e293b':'#cbd5e1'}>E</text>
                      <text x="70" y="128" textAnchor="middle" fontSize="16" fontWeight="700" fill={theme==='light'?'#1e293b':'#cbd5e1'}>S</text>
                      <text x="20" y="76" textAnchor="middle" fontSize="16" fontWeight="700" fill={theme==='light'?'#1e293b':'#cbd5e1'}>W</text>
                      <polygon points="70,30 64,72 76,72" fill="#ef4444" />
                      <circle cx="70" cy="70" r="4" fill="#ef4444" />
                    </svg>
                  )}
                  {cur.visual === 'degrees' && (
                    <svg width="160" height="140" viewBox="0 0 160 140" aria-hidden>
                      <circle cx="80" cy="70" r="58" fill="none" stroke={theme==='light'?'#e5e7eb':'#374151'} strokeWidth="2" />
                      <text x="80" y="18" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ef4444">0°</text>
                      <text x="142" y="74" textAnchor="middle" fontSize="11" fontWeight="700" fill={theme==='light'?'#6366f1':'#a5b4fc'}>90°</text>
                      <text x="80" y="134" textAnchor="middle" fontSize="11" fontWeight="700" fill={theme==='light'?'#6366f1':'#a5b4fc'}>180°</text>
                      <text x="18" y="74" textAnchor="middle" fontSize="11" fontWeight="700" fill={theme==='light'?'#6366f1':'#a5b4fc'}>270°</text>
                      <path d="M 80 70 L 80 16" stroke="#ef4444" strokeWidth="2.5" />
                      <path d="M 80 70 L 132 70" stroke="#6366f1" strokeWidth="2" strokeDasharray="3 3" />
                      <circle cx="80" cy="70" r="4" fill="#ef4444" />
                    </svg>
                  )}
                  {cur.visual === 'intercardinal' && (
                    <svg width="160" height="140" viewBox="0 0 160 140" aria-hidden>
                      <circle cx="80" cy="70" r="58" fill="none" stroke={theme==='light'?'#e5e7eb':'#374151'} strokeWidth="2" />
                      <text x="80" y="18" textAnchor="middle" fontSize="12" fontWeight="800" fill="#ef4444">N</text>
                      <text x="80" y="130" textAnchor="middle" fontSize="12" fontWeight="700" fill={theme==='light'?'#1e293b':'#cbd5e1'}>S</text>
                      <text x="140" y="74" textAnchor="middle" fontSize="12" fontWeight="700" fill={theme==='light'?'#1e293b':'#cbd5e1'}>E</text>
                      <text x="20" y="74" textAnchor="middle" fontSize="12" fontWeight="700" fill={theme==='light'?'#1e293b':'#cbd5e1'}>W</text>
                      <text x="122" y="30" textAnchor="middle" fontSize="10" fontWeight="700" fill="#10b981">NE</text>
                      <text x="122" y="118" textAnchor="middle" fontSize="10" fontWeight="700" fill="#10b981">SE</text>
                      <text x="38" y="118" textAnchor="middle" fontSize="10" fontWeight="700" fill="#10b981">SW</text>
                      <text x="38" y="30" textAnchor="middle" fontSize="10" fontWeight="700" fill="#10b981">NW</text>
                      <circle cx="80" cy="70" r="4" fill="#ef4444" />
                    </svg>
                  )}
                  {cur.visual === 'play' && (
                    <div className={clsx('px-4 py-3 rounded-xl text-xs leading-relaxed', theme==='light'?'bg-indigo-50 text-indigo-900':'bg-indigo-500/10 text-indigo-200')}>
                      ◀ −15°  ·  слайдер  ·  +15° ▶<br/>мақсатпен ±5° — 0.5с ұстау
                    </div>
                  )}
                </div>

                <h3 className={clsx('text-xl font-bold text-center mb-2', theme === 'light' ? 'text-gray-900' : 'text-white')}>
                  {cur.title}
                </h3>
                <p className={clsx('text-center mb-6 text-sm leading-relaxed', theme === 'light' ? 'text-gray-600' : 'text-gray-300')}>
                  {cur.body}
                </p>

                <div className="flex justify-between items-center mt-auto">
                  <div className="flex gap-1.5">
                    {steps.map((_, i) => (
                      <div
                        key={i}
                        className={clsx(
                          'h-2 rounded-full transition-all',
                          i + 1 === tutorialStep
                            ? (theme === 'light' ? 'bg-indigo-500 w-5' : 'bg-indigo-400 w-5')
                            : (theme === 'light' ? 'bg-gray-200 w-2' : 'bg-gray-700 w-2')
                        )}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {tutorialStep > 1 && (
                      <button
                        onClick={() => { haptic.impact('light'); setTutorialStep(s => s - 1); }}
                        className={clsx(
                          'px-4 py-2.5 rounded-xl text-sm font-semibold transition-transform active:scale-95',
                          theme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'
                        )}
                      >
                        ← Артқа
                      </button>
                    )}
                    <button
                      onClick={() => {
                        haptic.impact('light');
                        if (tutorialStep < 5) setTutorialStep(s => s + 1);
                        else completeTutorial();
                      }}
                      className={clsx(
                        'px-5 py-2.5 rounded-xl font-bold text-white transition-transform active:scale-95',
                        theme === 'light' ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-indigo-500 hover:bg-indigo-400'
                      )}
                    >
                      {tutorialStep < 5 ? 'Әрі қарай →' : 'Жаттығуды бастау'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <ReviveModal
        isOpen={timeLeftMs <= 0 && questionsAnswered < config.questionCount}
        score={score}
        gameName="Compass Game"
        onRevive={handleRevive}
        onRestart={() => handleGameEnd()}
      />

      <div className="w-full max-w-md mx-auto z-10 mt-2 mb-4">
        {!isCourseMode ? (
          <GameHUD
            score={score}
            timeLeftSec={timeLeftMs / 1000}
            timeTotalSec={config.timeMs / 1000}
            best={best}
            combo={combo}
            showSoundToggle
            showHapticToggle
          />
        ) : (
          <div className="flex justify-between items-center px-4">
            <div className={clsx("font-bold text-lg", theme === 'light' ? "text-indigo-900" : "text-white")}>
              {courseStep <= courseLessons.length ? `Course: ${courseStep} / ${courseLessons.length}` : 'Course Completed'}
            </div>
            <button
              onClick={() => {
                haptic.impact('medium');
                setIsCourseMode(false);
                setCourseStep(0);
                resetTimer();
                generateTarget();
              }}
              className={clsx(
                "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider",
                theme === 'light' ? "bg-indigo-100 text-indigo-700" : "bg-white/10 text-white"
              )}
            >
              Skip Course
            </button>
          </div>
        )}
      </div>

      {!isCourseMode && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-4 flex flex-col items-center z-10 w-full max-w-sm gap-3"
        >
          <DifficultySelector
            value={difficulty}
            onChange={changeDifficulty}
            size="sm"
            disabled={isGameActive}
          />
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={`target-${questionsAnswered}`}
          initial={{ scale: 0.8, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 1.1, opacity: 0, filter: "blur(10px)" }}
          transition={{ type: "spring", bounce: 0.5 }}
          className={clsx(
            "flex flex-col items-center justify-center w-full max-w-sm rounded-3xl p-6 mb-6 border relative overflow-hidden group z-10 shadow-lg",
            isSuccess
              ? "bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
              : theme === 'light'
                ? "bg-white/80 border-white backdrop-blur-xl"
                : "bg-white/5 backdrop-blur-2xl border-white/10"
          )}
        >
          {isCourseMode && courseStep > 0 && courseStep <= courseLessons.length && (() => {
            const lesson = courseLessons[courseStep - 1];
            return (
              <div className="absolute -top-28 left-0 right-0 px-2">
                <motion.div
                  key={courseStep}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className={clsx(
                    "rounded-2xl px-4 py-3 shadow-lg border",
                    theme === 'light' ? "bg-white border-indigo-100" : "bg-gray-800/90 border-gray-700 backdrop-blur-lg"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl" aria-hidden>{lesson.icon}</span>
                    <div className={clsx("text-xs font-bold uppercase tracking-wider", theme === 'light' ? "text-indigo-500" : "text-indigo-300")}>
                      {lesson.title}
                    </div>
                  </div>
                  <div className={clsx("text-sm leading-snug mb-1.5", theme === 'light' ? "text-gray-900" : "text-white")}>
                    {lesson.scenario}
                  </div>
                  <div className={clsx("text-[11px] leading-snug italic", theme === 'light' ? "text-gray-500" : "text-gray-400")}>
                    {lesson.hint}
                  </div>
                </motion.div>
              </div>
            );
          })()}
            
            <div className={clsx("text-sm font-semibold uppercase tracking-widest mb-2", theme === 'light' ? 'text-gray-500' : 'text-gray-400')}>
              Бетті бұрыңыз / Face
            </div>
            <h2
            className={clsx(
              "text-3xl sm:text-4xl font-black tracking-tight text-center drop-shadow-md",
              theme === 'light' ? "text-indigo-900" : "text-white"
            )}
          >
            {getDirectionName(targetAngle, language)}
          </h2>
          
          {/* Hold progress bar */}
          <div className="w-full h-2 bg-black/10 rounded-full mt-4 overflow-hidden relative">
            <div 
              className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-100 ease-linear"
              style={{ width: `${holdProgress}%` }}
            />
          </div>
        </motion.div>
      </AnimatePresence>

        {isCourseMode && courseStep > courseLessons.length && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <div className={clsx(
              "w-full max-w-sm rounded-3xl p-8 shadow-2xl border text-center",
              theme === 'light' ? "bg-white border-gray-200" : "bg-gray-900 border-gray-700"
            )}>
              <CheckCircle2 size={64} className="text-emerald-500 mx-auto mb-4" />
              <h3 className={clsx("text-2xl font-bold mb-4", theme === 'light' ? "text-gray-900" : "text-white")}>
                {t('compass_course_completed')}
              </h3>
              <button
                onClick={() => {
                  haptic.impact('medium');
                  setIsCourseMode(false);
                  setCourseStep(0);
                  resetTimer();
                  generateTarget();
                }}
                className="w-full py-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
              >
                {t('compass_course_start_game')}
              </button>
            </div>
          </motion.div>
        )}

      {/* Compass UI */}
      <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          {/* Direction of travel arrow */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-red-500 drop-shadow-lg z-20" />
          
          {/* Compass housing */}
          <div className={clsx(
            "absolute inset-0 rounded-full border-8 shadow-2xl flex items-center justify-center",
            theme === 'light' ? "bg-slate-100 border-slate-300" : "bg-slate-900 border-slate-700"
          )}>
            {/* Rotating Card */}
            <motion.div 
              className="w-full h-full rounded-full relative"
              animate={{ rotate: -currentAngle }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Compass markings */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* N */}
                <div className="absolute top-2 text-2xl font-black text-red-500">N</div>
                {/* E */}
                <div className="absolute right-4 text-xl font-bold text-gray-400">E</div>
                {/* S */}
                <div className="absolute bottom-2 text-xl font-bold text-gray-400">S</div>
                {/* W */}
                <div className="absolute left-4 text-xl font-bold text-gray-400">W</div>
                
                {/* Center dot */}
                <div className="w-4 h-4 rounded-full bg-red-500 shadow-md z-10" />
                
                {/* Lines */}
                <div className="absolute w-1 h-full bg-gradient-to-b from-red-500/50 to-gray-400/20" />
                <div className="absolute h-1 w-full bg-gray-400/20" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Controls */}
        <div className="w-full max-w-sm mt-12 flex flex-col gap-6">
          <div className="flex items-center justify-between px-4">
            <button
              onClick={() => {
                haptic.impact('light');
                setCurrentAngle(a => (a - 15 + 360) % 360);
              }}
              disabled={!isGameActive || isSuccess}
              className={clsx(
                "p-3 rounded-full transition-colors",
                theme === 'light' ? "bg-white shadow hover:bg-gray-50" : "bg-white/10 hover:bg-white/20 text-white"
              )}
            >
              <RotateCcw size={24} />
            </button>
            
            <div className={clsx(
              "text-2xl font-mono font-bold w-24 text-center",
              theme === 'light' ? "text-indigo-900" : "text-white"
            )}>
              {currentAngle}°
            </div>

            <button
              onClick={() => {
                haptic.impact('light');
                setCurrentAngle(a => (a + 15) % 360);
              }}
              disabled={!isGameActive || isSuccess}
              className={clsx(
                "p-3 rounded-full transition-colors",
                theme === 'light' ? "bg-white shadow hover:bg-gray-50" : "bg-white/10 hover:bg-white/20 text-white"
              )}
            >
              <RotateCw size={24} />
            </button>
          </div>

          <input 
            type="range" 
            min="0" 
            max="359" 
            value={currentAngle}
            onChange={(e) => {
              setCurrentAngle(Number(e.target.value));
              if (Number(e.target.value) % 5 === 0) haptic.impact('light');
            }}
            disabled={!isGameActive || isSuccess}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default CompassGame;
