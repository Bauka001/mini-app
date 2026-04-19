import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Binary,
  Fingerprint,
  Flame,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GameWrapper } from '../../components/GameWrapper';
import { useStore } from '../../store/useStoreImpl';
import type { Language } from '../../store/useStore';
import { hapticFeedback } from '../../utils/telegram';
import { soundManager } from '../../utils/soundManager';

type PuzzleType = 'sum' | 'delta' | 'double' | 'chain';

type CodeGlyph = {
  id: string;
  label: string;
  shellClass: string;
  glowClass: string;
};

type KeyCard = CodeGlyph & {
  value: number;
};

type RoundData = {
  keys: KeyCard[];
  expression: string;
  answer: number;
  options: number[];
  type: PuzzleType;
};

type CopySet = {
  round: string;
  score: string;
  streak: string;
  timer: string;
  legend: string;
  objective: string;
  correct: string;
  wrong: string;
  ready: string;
  prompts: Record<PuzzleType, string>;
};

const TOTAL_ROUNDS = 12;
const INITIAL_TIME = 70;

const GLYPHS: CodeGlyph[] = [
  {
    id: 'hex',
    label: 'HEX',
    shellClass: 'from-cyan-400/25 via-sky-400/10 to-blue-500/20 border-cyan-300/35 text-cyan-100',
    glowClass: 'shadow-[0_0_24px_rgba(34,211,238,0.18)]',
  },
  {
    id: 'nova',
    label: 'NOVA',
    shellClass: 'from-fuchsia-400/25 via-violet-400/10 to-purple-500/20 border-fuchsia-300/35 text-fuchsia-100',
    glowClass: 'shadow-[0_0_24px_rgba(217,70,239,0.18)]',
  },
  {
    id: 'arc',
    label: 'ARC',
    shellClass: 'from-amber-400/25 via-orange-400/10 to-yellow-500/20 border-amber-300/35 text-amber-100',
    glowClass: 'shadow-[0_0_24px_rgba(251,191,36,0.18)]',
  },
  {
    id: 'flux',
    label: 'FLUX',
    shellClass: 'from-emerald-400/25 via-teal-400/10 to-lime-500/20 border-emerald-300/35 text-emerald-100',
    glowClass: 'shadow-[0_0_24px_rgba(52,211,153,0.18)]',
  },
  {
    id: 'pulse',
    label: 'PULSE',
    shellClass: 'from-rose-400/25 via-red-400/10 to-pink-500/20 border-rose-300/35 text-rose-100',
    glowClass: 'shadow-[0_0_24px_rgba(251,113,133,0.18)]',
  },
  {
    id: 'veil',
    label: 'VEIL',
    shellClass: 'from-slate-300/25 via-slate-400/10 to-zinc-500/20 border-slate-200/35 text-slate-100',
    glowClass: 'shadow-[0_0_24px_rgba(226,232,240,0.16)]',
  },
];

const COPY: Record<Language, CopySet> = {
  en: {
    round: 'Round',
    score: 'Score',
    streak: 'Streak',
    timer: 'Timer',
    legend: 'Cipher legend',
    objective: 'Tap the decoded value before the trace expires.',
    correct: 'Code cracked',
    wrong: 'False key',
    ready: 'Signal stable',
    prompts: {
      sum: 'Decrypt the total',
      delta: 'Resolve the breach',
      double: 'Amplify the lead cipher',
      chain: 'Complete the chain',
    },
  },
  ru: {
    round: 'Раунд',
    score: 'Очки',
    streak: 'Серия',
    timer: 'Таймер',
    legend: 'Легенда шифра',
    objective: 'Нажмите правильное значение, пока сигнал не исчез.',
    correct: 'Код взломан',
    wrong: 'Неверный ключ',
    ready: 'Сигнал стабилен',
    prompts: {
      sum: 'Расшифруйте сумму',
      delta: 'Устраните сбой',
      double: 'Усильте ведущий шифр',
      chain: 'Завершите цепочку',
    },
  },
  kz: {
    round: 'Раунд',
    score: 'Ұпай',
    streak: 'Серия',
    timer: 'Таймер',
    legend: 'Шифр картасы',
    objective: 'Із жоғалмай тұрғанда дұрыс мәнді таңдаңыз.',
    correct: 'Код ашылды',
    wrong: 'Қате кілт',
    ready: 'Сигнал тұрақты',
    prompts: {
      sum: 'Жиынтықты ашыңыз',
      delta: 'Бұзылған ізді шешіңіз',
      double: 'Басты шифрды күшейтіңіз',
      chain: 'Тізбекті аяқтаңыз',
    },
  },
};

const shuffle = <T,>(items: T[]) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
};

const createOptions = (answer: number) => {
  const options = new Set<number>([answer]);
  const offsets = shuffle([-6, -4, -3, -2, 2, 3, 4, 5, 6]);

  for (const offset of offsets) {
    const candidate = answer + offset;
    if (candidate > 0) {
      options.add(candidate);
    }
    if (options.size >= 4) break;
  }

  let fallback = 1;
  while (options.size < 4) {
    if (fallback !== answer) {
      options.add(fallback);
    }
    fallback += 1;
  }

  return shuffle(Array.from(options)).slice(0, 4);
};

const buildRound = (roundIndex: number): RoundData => {
  const glyphPool = shuffle(GLYPHS).slice(0, 4);
  const values = shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4);
  const keys = glyphPool.map((glyph, index) => ({
    ...glyph,
    value: values[index],
  }));

  const [first, second, third] = keys;
  let answer = first.value + second.value;
  let expression = `${first.label} + ${second.label}`;
  let type: PuzzleType = 'sum';

  if (roundIndex >= 8) {
    type = randomFrom(['delta', 'double', 'chain']);
  } else if (roundIndex >= 4) {
    type = randomFrom(['sum', 'delta', 'double']);
  }

  if (type === 'delta') {
    answer = first.value + second.value - Math.min(third.value, first.value);
    expression = `${first.label} + ${second.label} - ${third.label}`;
    if (answer <= 0) {
      answer = first.value + third.value;
      expression = `${first.label} + ${third.label}`;
      type = 'sum';
    }
  }

  if (type === 'double') {
    answer = first.value * 2 + second.value;
    expression = `2 x ${first.label} + ${second.label}`;
  }

  if (type === 'chain') {
    answer = first.value + second.value + third.value;
    expression = `${first.label} + ${second.label} + ${third.label}`;
  }

  return {
    keys,
    expression,
    answer,
    options: createOptions(answer),
    type,
  };
};

const randomFrom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

export default function CodeBreakerGame() {
  const { t } = useTranslation();
  const addGameResult = useStore((state) => state.addGameResult);

  return (
    <GameWrapper
      title={t('game_code_breaker', 'Code Breaker')}
      instructions={t(
        'code_breaker_desc',
        'Decode fast cipher rules, solve compact symbol equations and keep your streak alive.'
      )}
    >
      {({ onEnd, isPaused }) => (
        <CodeBreakerBoard
          isPaused={isPaused}
          onEnd={(score, coins) => {
            addGameResult({ gameId: 'code_breaker', score, coinsEarned: coins });
            onEnd(score, coins);
          }}
        />
      )}
    </GameWrapper>
  );
}

function CodeBreakerBoard({
  onEnd,
  isPaused,
}: {
  onEnd: (score: number, coins: number) => void;
  isPaused: boolean;
}) {
  const language = useStore((state) => state.language);
  const copy = useMemo(() => COPY[language] || COPY.en, [language]);
  const hasFinishedRef = useRef(false);

  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<RoundData>(() => buildRound(0));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; tone: 'idle' | 'success' | 'error' }>({
    text: copy.ready,
    tone: 'idle',
  });

  useEffect(() => {
    setFeedback((prev) => ({ ...prev, text: copy.ready }));
  }, [copy.ready]);

  useEffect(() => {
    if (isPaused) return;

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 0.1) {
          window.clearInterval(timer);
          return 0;
        }
        return previous - 0.1;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  useEffect(() => {
    if (timeLeft > 0) return;

    finishGame(score, correctAnswers, bestStreak);
  }, [bestStreak, correctAnswers, onEnd, score, timeLeft]);

  const finishGame = (finalScore: number, finalCorrectAnswers: number, finalBestStreak: number) => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    const coins = Math.max(0, Math.min(42, finalCorrectAnswers * 2 + Math.floor(finalBestStreak / 2)));
    onEnd(finalScore, coins);
  };

  const moveToNextRound = (
    nextRoundIndex: number,
    nextState?: { score: number; correctAnswers: number; bestStreak: number }
  ) => {
    if (nextRoundIndex >= TOTAL_ROUNDS) {
      finishGame(
        nextState?.score ?? score,
        nextState?.correctAnswers ?? correctAnswers,
        nextState?.bestStreak ?? bestStreak
      );
      return;
    }

    setRoundIndex(nextRoundIndex);
    setRound(buildRound(nextRoundIndex));
    setSelectedOption(null);
  };

  const handleAnswer = (option: number) => {
    if (selectedOption !== null || isPaused || timeLeft <= 0) return;

    setSelectedOption(option);

    if (option === round.answer) {
      const nextStreak = streak + 1;
      const gained = 110 + nextStreak * 18 + Math.floor(timeLeft);
      const nextScore = score + gained;
      const nextCorrectAnswers = correctAnswers + 1;
      const nextBestStreak = Math.max(bestStreak, nextStreak);

      hapticFeedback.notification('success');
      soundManager.playSuccess();
      setScore(nextScore);
      setStreak(nextStreak);
      setBestStreak(nextBestStreak);
      setCorrectAnswers(nextCorrectAnswers);
      setFeedback({ text: copy.correct, tone: 'success' });

      window.setTimeout(() => {
        moveToNextRound(roundIndex + 1, {
          score: nextScore,
          correctAnswers: nextCorrectAnswers,
          bestStreak: nextBestStreak,
        });
      }, 280);
      return;
    }

    hapticFeedback.notification('error');
    soundManager.playError();
    setStreak(0);
    setTimeLeft((previous) => Math.max(0, previous - 4));
    setFeedback({ text: copy.wrong, tone: 'error' });

    window.setTimeout(() => {
      moveToNextRound(roundIndex + 1);
    }, 280);
  };

  return (
    <div className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,#13233b_0%,#090b13_42%,#04050a_100%)] px-4 pb-20 pt-4 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[28px] border border-cyan-400/15 bg-white/5 shadow-[0_20px_80px_rgba(6,182,212,0.14)] backdrop-blur-xl"
        >
          <div className="relative overflow-hidden p-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.24),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.18),transparent_36%)]" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/75">
                  <Fingerprint size={14} />
                  Code Breaker
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Rapid Cipher Run</h2>
                <p className="mt-1 max-w-[240px] text-sm leading-5 text-slate-300">{copy.objective}</p>
              </div>

              <div
                className={clsx(
                  'rounded-2xl border px-3 py-2 text-right text-xs font-bold shadow-lg',
                  feedback.tone === 'success' && 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200',
                  feedback.tone === 'error' && 'border-rose-400/30 bg-rose-400/15 text-rose-200',
                  feedback.tone === 'idle' && 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
                )}
              >
                <div className="flex items-center justify-end gap-2">
                  {feedback.tone === 'success' && <ShieldCheck size={14} />}
                  {feedback.tone === 'error' && <Lock size={14} />}
                  {feedback.tone === 'idle' && <Sparkles size={14} />}
                  <span>{feedback.text}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: copy.round, value: `${Math.min(roundIndex + 1, TOTAL_ROUNDS)}/${TOTAL_ROUNDS}`, icon: Binary },
            { label: copy.score, value: score.toLocaleString(), icon: Sparkles },
            { label: copy.streak, value: `${streak}`, icon: Flame },
            { label: copy.timer, value: `${timeLeft.toFixed(1)}s`, icon: Lock },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.35)] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{item.label}</span>
                <item.icon size={15} className="text-cyan-200" />
              </div>
              <div className="mt-2 text-2xl font-black text-white">{item.value}</div>
            </div>
          ))}
        </div>

        <motion.div
          key={`${roundIndex}-${round.expression}`}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[30px] border border-cyan-400/15 bg-slate-950/70 p-4 shadow-[0_24px_80px_rgba(8,47,73,0.36)]"
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/70">{copy.legend}</div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
              {copy.prompts[round.type]}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {round.keys.map((keyCard) => (
              <div
                key={keyCard.id}
                className={clsx(
                  'rounded-[24px] border bg-gradient-to-br px-4 py-4 backdrop-blur-xl',
                  keyCard.shellClass,
                  keyCard.glowClass
                )}
              >
                <div className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">{keyCard.label}</div>
                <div className="mt-3 flex items-end justify-between">
                  <div className="text-3xl font-black text-white">{keyCard.value}</div>
                  <div className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
                    key
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Cipher line</div>
            <div className="mt-3 text-center text-[30px] font-black tracking-wide text-white">
              {round.expression}
            </div>
            <div className="mt-2 text-center text-sm text-slate-400">Select the correct output</div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 pb-4">
          {round.options.map((option) => {
            const isSelected = selectedOption === option;
            const isCorrect = isSelected && option === round.answer;
            const isWrong = isSelected && option !== round.answer;

            return (
              <motion.button
                key={`${round.expression}-${option}`}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleAnswer(option)}
                className={clsx(
                  'relative overflow-hidden rounded-[26px] border px-4 py-6 text-left shadow-[0_14px_40px_rgba(15,23,42,0.32)] transition-all',
                  'bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))] backdrop-blur-xl',
                  !selectedOption && 'border-white/10 hover:border-cyan-300/40 hover:-translate-y-0.5',
                  isCorrect && 'border-emerald-300/45 bg-emerald-400/20',
                  isWrong && 'border-rose-300/45 bg-rose-400/20',
                  selectedOption !== null && !isSelected && 'border-white/8 opacity-70'
                )}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_38%)]" />
                <div className="relative">
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Output</div>
                  <div className="mt-2 text-4xl font-black text-white">{option}</div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-xs text-slate-400">
          Best streak: <span className="font-bold text-white">{bestStreak}</span> | Correct decrypts:{' '}
          <span className="font-bold text-white">{correctAnswers}</span>
        </div>
      </div>
    </div>
  );
}
