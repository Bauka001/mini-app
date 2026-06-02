import { useState, useEffect, useMemo } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Дала тарихы — Kazakh history & culture quiz.
 *
 * 10 questions per round, 30s per question. Mixes historical facts, cultural
 * trivia, geography, and prominent figures. Multiple-choice (4 options).
 *
 * Score = correct answers × 50 + speed bonus.
 * Trains long-term recall, reading speed, and decision-making under time pressure.
 */

type Question = {
  q: string;
  a: string[];
  correct: number; // 0-3
};

const QUESTIONS_BANK: Question[] = [
  { q: 'Абылай хан қай ғасырда өмір сүрді?', a: ['XVI', 'XVII', 'XVIII', 'XIX'], correct: 2 },
  { q: 'Қазақстанның астанасы қашан Астанаға көшті?', a: ['1995', '1997', '1999', '2001'], correct: 1 },
  { q: 'Абайдың туған жылы?', a: ['1825', '1835', '1845', '1855'], correct: 2 },
  { q: 'Тоғызқұмалақ ойынында неше шұңқыр бар?', a: ['12', '16', '18', '20'], correct: 2 },
  { q: 'Қожа Ахмет Яссауи кесенесі қай қалада?', a: ['Тараз', 'Сайрам', 'Түркістан', 'Отырар'], correct: 2 },
  { q: 'Қазақ ССР-і қашан құрылды?', a: ['1920', '1936', '1945', '1956'], correct: 1 },
  { q: 'Алтын адам қай қорғаннан табылды?', a: ['Бесшатыр', 'Есік', 'Берел', 'Тасмола'], correct: 1 },
  { q: 'Шоқан Уәлиханов қай Орыс географиялық қоғамының мүшесі болды?', a: ['Орыс', 'Швед', 'Неміс', 'Француз'], correct: 0 },
  { q: 'Қазақ тілінде неше әріп бар (1995 нұсқасы)?', a: ['33', '36', '42', '45'], correct: 2 },
  { q: '«Қозы Көрпеш — Баян сұлу» жанры?', a: ['Эпос', 'Әңгіме', 'Роман', 'Аңыз'], correct: 0 },
  { q: 'Қазақстанның ең биік шыңы?', a: ['Хан Тәңірі', 'Талғар', 'Жеңіс', 'Қазығұрт'], correct: 2 },
  { q: 'Бөлтіріктің бөлтіріктері — қай ертегі?', a: ['Ер Төстік', 'Алдар Көсе', 'Жиренше шешен', 'Қарашаш'], correct: 0 },
  { q: 'Қазақ ұлттық киімі көйлек астында киілетін?', a: ['Камзол', 'Шапан', 'Көйлек', 'Бешпет'], correct: 1 },
  { q: 'Қазақстанның ұлттық валютасы қашан енгізілді?', a: ['1991', '1993', '1995', '1997'], correct: 1 },
  { q: 'Дешті Қыпшақ — қандай аймақ?', a: ['Орманды', 'Шөлейтті дала', 'Таулы', 'Жағалаулық'], correct: 1 },
  { q: 'Қыз Жібек — қандай шығарма?', a: ['Эпос', 'Поэма', 'Драма', 'Аңыз'], correct: 0 },
  { q: 'Қазақ халқының дәстүрлі жылқысы?', a: ['Ахалтеке', 'Мустанг', 'Жабы', 'Арабиан'], correct: 2 },
  { q: 'Қыпшақ Ордасының басшысы кім?', a: ['Сұлтан', 'Хан', 'Әмір', 'Бек'], correct: 1 },
  { q: 'Қазақстанның қанша облысы бар (2024)?', a: ['14', '17', '20', '23'], correct: 1 },
  { q: 'Манас эпосы қай халықтыкі?', a: ['Қазақ', 'Қырғыз', 'Өзбек', 'Түрікмен'], correct: 1 },
  { q: 'Тұңғыш қазақ ғарышкері?', a: ['Тоқтар Әубәкіров', 'Талғат Мусабаев', 'Айдын Айымбетов', 'Юрий Гагарин'], correct: 0 },
  { q: 'Қожанасыр кейіпкер қай мәдениетте бар?', a: ['Жалғыз қазақ', 'Барлық түркі', 'Тек өзбек', 'Тек ұйғыр'], correct: 1 },
  { q: 'Сақ заманы — шамамен қандай ғасырлар?', a: ['VIII–III б.з.б.', 'III–I б.з.б.', 'I–IV', 'IV–VIII'], correct: 0 },
  { q: 'Алтын Орда — қандай мемлекет?', a: ['Қытай династиясы', 'Моңғол ұрпағы', 'Парсы империясы', 'Рим империясы'], correct: 1 },
  { q: 'Қара шаңырақ — нені білдіреді?', a: ['Ескі үй', 'Әке-шеше үйі', 'Қонақ үй', 'Соғыс штабы'], correct: 1 },
];

const QUESTIONS_PER_ROUND = 10;
const SECONDS_PER_QUESTION = 30;

const shuffled = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

const DalaTarihBoard = ({ onEnd }: { onEnd: (score: number, coins: number) => void }) => {
  const questions = useMemo(() => shuffled(QUESTIONS_BANK).slice(0, QUESTIONS_PER_ROUND), []);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_QUESTION);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (revealed) return;
    if (secondsLeft <= 0) { reveal(null); return; }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, revealed]);

  const q = questions[idx];

  const reveal = (chosen: number | null) => {
    if (revealed) return;
    setSelectedIdx(chosen);
    setRevealed(true);
    const isCorrect = chosen === q.correct;
    if (isCorrect) {
      const speedBonus = secondsLeft * 2; // 60 max
      setScore((s) => s + 50 + speedBonus);
      setCorrectCount((c) => c + 1);
    }
    setTimeout(() => {
      if (idx + 1 >= QUESTIONS_PER_ROUND) {
        const finalScore = score + (isCorrect ? 50 + secondsLeft * 2 : 0);
        const accuracy = (correctCount + (isCorrect ? 1 : 0)) / QUESTIONS_PER_ROUND;
        const accuracyBonus = Math.round(accuracy * 100);
        onEnd(finalScore + accuracyBonus, Math.round((finalScore + accuracyBonus) / 10));
      } else {
        setIdx((i) => i + 1);
        setSecondsLeft(SECONDS_PER_QUESTION);
        setSelectedIdx(null);
        setRevealed(false);
      }
    }, 1500);
  };

  const progress = ((idx + 1) / QUESTIONS_PER_ROUND) * 100;

  return (
    <div className="flex flex-col items-center px-4 pb-4 max-w-lg mx-auto">
      {/* Header bar */}
      <div className="w-full mb-4">
        <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
          <span>Сұрақ {idx + 1} / {QUESTIONS_PER_ROUND}</span>
          <span className={clsx('font-bold', secondsLeft <= 10 ? 'text-rose-400' : 'text-emerald-300')}>⏱ {secondsLeft}с</span>
          <span>🏆 {score}</span>
        </div>
        <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 to-rose-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full"
        >
          <div className="rounded-2xl bg-gradient-to-br from-amber-900/40 to-rose-900/30 border border-amber-500/30 p-6 mb-5">
            <div className="text-xs text-amber-400/80 uppercase tracking-wider mb-2">🏛 Дала тарихы</div>
            <div className="text-lg sm:text-xl font-bold text-white leading-relaxed">{q.q}</div>
          </div>

          <div className="space-y-2.5">
            {q.a.map((opt, i) => {
              const isCorrect = revealed && i === q.correct;
              const isWrong = revealed && i === selectedIdx && i !== q.correct;
              const isChosen = i === selectedIdx;
              return (
                <motion.button
                  key={i}
                  disabled={revealed}
                  onClick={() => reveal(i)}
                  whileTap={{ scale: 0.98 }}
                  className={clsx(
                    'w-full text-left p-4 rounded-xl border-2 transition-all font-medium',
                    !revealed && 'bg-stone-800/60 border-stone-700 hover:border-amber-400 hover:bg-stone-800 text-white',
                    isCorrect && 'bg-emerald-500/20 border-emerald-400 text-emerald-100',
                    isWrong && 'bg-rose-500/20 border-rose-400 text-rose-100',
                    revealed && !isCorrect && !isWrong && 'bg-stone-800/30 border-stone-700/40 text-stone-500',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black',
                      isCorrect && 'bg-emerald-400 text-stone-950',
                      isWrong && 'bg-rose-400 text-white',
                      !revealed && 'bg-stone-700 text-stone-200',
                      revealed && !isCorrect && !isWrong && 'bg-stone-800 text-stone-600',
                    )}>{String.fromCharCode(65 + i)}</div>
                    <div>{opt}</div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default function DalaTarihGame() {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  return (
    <GameWrapper
      title={t('game_dala_tarih', 'Дала тарихы')}
      instructions={t('dala_tarih_desc', 'Қазақ тарихы, мәдениеті және географиясы бойынша 10 сұрақ. Әр сұраққа 30 секунд.')}
    >
      {({ onEnd }) => (
        <DalaTarihBoard
          onEnd={(score, coins) => {
            setTimeout(() => addGameResult({ gameId: 'dala-tarih', score, coinsEarned: coins }), 0);
            onEnd(score, coins);
          }}
        />
      )}
    </GameWrapper>
  );
}
