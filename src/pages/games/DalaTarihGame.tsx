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
  // === ХАНДАР МЕН МЕМЛЕКЕТ ===
  { q: 'Абылай хан қай ғасырда өмір сүрді?', a: ['XVI', 'XVII', 'XVIII', 'XIX'], correct: 2 },
  { q: 'Қазақ хандығының негізін салушылар?', a: ['Тәуке хан', 'Керей мен Жәнібек', 'Жошы хан', 'Қасым хан'], correct: 1 },
  { q: 'Қасым ханның жарғысы қашан жазылды?', a: ['XV ғ.', 'XVI ғ.', 'XVII ғ.', 'XVIII ғ.'], correct: 1 },
  { q: 'Тәуке ханның «Жеті жарғысы» қандай заң?', a: ['Сауда', 'Дала заңы', 'Дін', 'Соғыс'], correct: 1 },
  { q: 'Кенесары Қасымұлы қашан көтерілді?', a: ['1820', '1837', '1851', '1863'], correct: 1 },
  { q: 'Алтын Орда — қандай мемлекет?', a: ['Қытай династиясы', 'Моңғол ұрпағы', 'Парсы империясы', 'Рим империясы'], correct: 1 },
  { q: 'Қазақ хандығы құрылған жыл?', a: ['1456', '1465', '1480', '1500'], correct: 1 },
  { q: 'Қыпшақ Ордасының басшысы қалай аталды?', a: ['Сұлтан', 'Хан', 'Әмір', 'Бек'], correct: 1 },
  { q: 'Алаш Орда қашан құрылды?', a: ['1905', '1917', '1920', '1925'], correct: 1 },
  { q: 'Кіші жүздің ханы Әбілқайыр Ресейге қашан адалдықпен ант берді?', a: ['1714', '1731', '1740', '1755'], correct: 1 },

  // === АҢЫЗ ЖӘНЕ ТАРИХИ ҚАЙРАТКЕРЛЕР ===
  { q: 'Абайдың туған жылы?', a: ['1825', '1835', '1845', '1855'], correct: 2 },
  { q: 'Абай Құнанбайұлы қай жерде туған?', a: ['Семей', 'Шыңғыстау', 'Қарағанды', 'Қызылорда'], correct: 1 },
  { q: 'Шоқан Уәлиханов қай Орыс географиялық қоғамының мүшесі болды?', a: ['Орыс', 'Швед', 'Неміс', 'Француз'], correct: 0 },
  { q: 'Шоқан Уәлиханов өмір сүрген жылдар?', a: ['1825-1855', '1835-1865', '1845-1875', '1855-1885'], correct: 1 },
  { q: 'Ыбырай Алтынсарин ненің негізін салды?', a: ['Көркем әдебиет', 'Балалар әдебиеті', 'Сауда', 'Газет'], correct: 1 },
  { q: 'Мағжан Жұмабаев қай дәуірдің ақыны?', a: ['XIX', 'Алаш кезеңі', 'Кеңес кезеңі', 'Тәуелсіздік'], correct: 1 },
  { q: 'Ахмет Байтұрсынұлы — кім?', a: ['Хан', 'Жазушы-ғалым', 'Палуан', 'Биші'], correct: 1 },
  { q: 'Тұңғыш қазақ ғарышкері?', a: ['Тоқтар Әубәкіров', 'Талғат Мусабаев', 'Айдын Айымбетов', 'Юрий Гагарин'], correct: 0 },
  { q: 'Алмат тұңғыш ғарышқа қашан ұшты?', a: ['1991', '1995', '2000', '2003'], correct: 0 },
  { q: 'Тұңғыш Қазақ Кеңес ССР-нің Бас хатшысы?', a: ['Қонаев', 'Назарбаев', 'Шаяхметов', 'Жабаев'], correct: 2 },

  // === ЭПОС, ӘДЕБИ ШЫҒАРМАЛАР ===
  { q: '«Қозы Көрпеш — Баян сұлу» жанры?', a: ['Эпос', 'Әңгіме', 'Роман', 'Аңыз'], correct: 0 },
  { q: 'Қыз Жібек — қандай шығарма?', a: ['Эпос', 'Поэма', 'Драма', 'Аңыз'], correct: 0 },
  { q: 'Манас эпосы қай халықтыкі?', a: ['Қазақ', 'Қырғыз', 'Өзбек', 'Түрікмен'], correct: 1 },
  { q: 'Қобыланды батыр — қай жанрдың кейіпкері?', a: ['Лирика', 'Эпос', 'Драма', 'Әңгіме'], correct: 1 },
  { q: '«Бұқар жырау» — кім?', a: ['Хан', 'Жырау', 'Палуан', 'Аңшы'], correct: 1 },
  { q: 'Махамбет Өтемісұлы кіммен қарсы күрескен?', a: ['Орыспен', 'Қытаймен', 'Жәңгір ханмен', 'Жоңғармен'], correct: 2 },
  { q: 'Сұлтанмахмұт Торайғыров қай саладағы ақын?', a: ['Сатира', 'Лирика', 'Эпос', 'Драма'], correct: 1 },
  { q: 'Алдар Көсе кейіпкер қай мәдениетте бар?', a: ['Жалғыз қазақ', 'Барлық түркі', 'Тек өзбек', 'Тек ұйғыр'], correct: 1 },
  { q: 'Жиренше шешен — қай ғасырдағы атақты тұлға?', a: ['XIV', 'XV', 'XVI', 'XVII'], correct: 2 },
  { q: 'Бөлтіріктің бөлтіріктері — қай ертегі?', a: ['Ер Төстік', 'Алдар Көсе', 'Жиренше шешен', 'Қарашаш'], correct: 0 },

  // === ҚАЛАЛАР ЖӘНЕ ГЕОГРАФИЯ ===
  { q: 'Қожа Ахмет Яссауи кесенесі қай қалада?', a: ['Тараз', 'Сайрам', 'Түркістан', 'Отырар'], correct: 2 },
  { q: 'Қазақстанның ең биік шыңы?', a: ['Хан Тәңірі', 'Талғар', 'Жеңіс', 'Қазығұрт'], correct: 2 },
  { q: 'Қазақстанның қанша облысы бар (2024)?', a: ['14', '17', '20', '23'], correct: 1 },
  { q: 'Қазақстанның астанасы қашан Астанаға көшті?', a: ['1995', '1997', '1999', '2001'], correct: 1 },
  { q: 'Дешті Қыпшақ — қандай аймақ?', a: ['Орманды', 'Шөлейтті дала', 'Таулы', 'Жағалаулық'], correct: 1 },
  { q: 'Балқаш көлінің ерекшелігі?', a: ['Тұщы', 'Жартысы тұщы, жартысы тұзды', 'Тұзды', 'Мұзды'], correct: 1 },
  { q: 'Шығыс Қазақстанның биік таулары?', a: ['Алатау', 'Алтай', 'Сарыарқа', 'Мұғалжар'], correct: 1 },
  { q: 'Қазақстанның жалпы аумағы (млн км²)?', a: ['1.5', '2.0', '2.7', '3.5'], correct: 2 },
  { q: 'Каспий теңізі қазір нақты қандай су айдыны?', a: ['Теңіз', 'Көл', 'Шығанақ', 'Шығыс'], correct: 1 },
  { q: 'Алматы — қай жылға дейін астана болды?', a: ['1991', '1995', '1997', '2000'], correct: 2 },

  // === МӘДЕНИЕТ, ҰЛТТЫҚ ОЙЫНДАР ===
  { q: 'Тоғызқұмалақ ойынында неше шұңқыр бар?', a: ['12', '16', '18', '20'], correct: 2 },
  { q: 'Қазақ ұлттық киімі көйлек астында киілетін?', a: ['Камзол', 'Шапан', 'Көйлек', 'Бешпет'], correct: 1 },
  { q: 'Қара шаңырақ — нені білдіреді?', a: ['Ескі үй', 'Әке-шеше үйі', 'Қонақ үй', 'Соғыс штабы'], correct: 1 },
  { q: 'Қазақ халқының дәстүрлі жылқысы?', a: ['Ахалтеке', 'Мустанг', 'Жабы', 'Арабиан'], correct: 2 },
  { q: 'Кездейсоқ басталатын ат жарыс?', a: ['Көкпар', 'Қыз қуу', 'Бәйге', 'Аударыспақ'], correct: 2 },
  { q: 'Қазақтың ұлттық тағамы?', a: ['Манты', 'Бешбармақ', 'Самса', 'Лагман'], correct: 1 },
  { q: 'Қазақ халқының жаз мерекесі?', a: ['Наурыз', 'Ораза', 'Шілдехана', 'Қой айт'], correct: 0 },
  { q: 'Наурыз қашан тойланады?', a: ['1 наурыз', '14 наурыз', '21-22 наурыз', '31 наурыз'], correct: 2 },
  { q: 'Қыз ұзату — қандай рәсім?', a: ['Туу', 'Үйлену', 'Ас', 'Той бастар'], correct: 1 },
  { q: 'Жұптасу рәсімінде қалыңмал — кімге беріледі?', a: ['Қыздың әкесіне', 'Жігітке', 'Бабасына', 'Жеңгесіне'], correct: 0 },

  // === КЕҢЕС ДӘУІРІ ===
  { q: 'Қазақ ССР-і қашан құрылды?', a: ['1920', '1936', '1945', '1956'], correct: 1 },
  { q: 'Желтоқсан көтерілісі қашан болды?', a: ['1985', '1986', '1988', '1991'], correct: 1 },
  { q: 'Желтоқсан көтерілісі қай қалада басталды?', a: ['Қарағанды', 'Алматы', 'Шымкент', 'Семей'], correct: 1 },
  { q: 'Тәуелсіздік декларациясы қашан қабылданды?', a: ['1990', '1991', '1992', '1993'], correct: 0 },
  { q: 'Қазақстан тәуелсіздігі қашан жарияланды?', a: ['16.12.1991', '17.12.1991', '25.12.1991', '01.01.1992'], correct: 0 },
  { q: 'Тың игеру қашан басталды?', a: ['1928', '1945', '1954', '1965'], correct: 2 },
  { q: 'Семей ядролық полигоны қашан жабылды?', a: ['1985', '1989', '1991', '1994'], correct: 1 },
  { q: 'Қазақстан ҰБ-ге қашан кірді?', a: ['1991', '1992', '1995', '2000'], correct: 1 },

  // === ТӘУЕЛСІЗ ҚАЗАҚСТАН ===
  { q: 'Қазақстанның ұлттық валютасы қашан енгізілді?', a: ['1991', '1993', '1995', '1997'], correct: 1 },
  { q: 'Теңге қашан енгізілді?', a: ['1991 қазан', '1993 қараша', '1995 наурыз', '2000 қаңтар'], correct: 1 },
  { q: 'Қазақстанның тұңғыш президенті?', a: ['Шаяхметов', 'Назарбаев', 'Қонаев', 'Тоқаев'], correct: 1 },
  { q: 'Қазіргі Қазақстан Президенті (2024)?', a: ['Назарбаев', 'Тоқаев', 'Сматов', 'Машкевич'], correct: 1 },
  { q: 'Қазақстанның мемлекеттік тілі?', a: ['Орыс', 'Қазақ', 'Ағылшын', 'Түрік'], correct: 1 },
  { q: 'EXPO-2017 қай қалада өтті?', a: ['Алматы', 'Астана', 'Шымкент', 'Қарағанды'], correct: 1 },
  { q: 'Қазақстан Олимпиада ойындарына қатарға қашан кірді?', a: ['1992', '1994', '1996', '2000'], correct: 0 },
  { q: 'Қазақстанның халық саны (2024)?', a: ['~15 млн', '~17 млн', '~20 млн', '~25 млн'], correct: 2 },

  // === КӨНЕ ТАРИХ ===
  { q: 'Алтын адам қай қорғаннан табылды?', a: ['Бесшатыр', 'Есік', 'Берел', 'Тасмола'], correct: 1 },
  { q: 'Сақ заманы — шамамен қандай ғасырлар?', a: ['VIII–III б.з.б.', 'III–I б.з.б.', 'I–IV', 'IV–VIII'], correct: 0 },
  { q: 'Үйсіндер мемлекеті қашан болды?', a: ['III б.з.б.', 'II б.з.б.', 'I б.з.б. – V б.з.', 'V–X'], correct: 2 },
  { q: 'Түркі қағанаты қай ғасырда?', a: ['III–V', 'VI–VIII', 'IX–XI', 'XII–XIV'], correct: 1 },
  { q: 'Қарахан мемлекеті қай дінді ұстанды?', a: ['Тенгризм', 'Будда', 'Ислам', 'Христиан'], correct: 2 },
  { q: 'Орхон-Енисей жазулары қай дәуірден?', a: ['Сақ', 'Түркі қағанаты', 'Қарахан', 'Алтын Орда'], correct: 1 },
  { q: 'Жоңғар шапқыншылығы аса қатты қашан болды?', a: ['XVI ғ.', 'XVII ғ.', 'XVIII ғ.', 'XIX ғ.'], correct: 2 },
  { q: '«Ақтабан шұбырынды» қашан болды?', a: ['1723-1727', '1750-1755', '1700-1710', '1740-1745'], correct: 0 },

  // === ТІЛ ЖӘНЕ ЖАЗУ ===
  { q: 'Қазақ тілінде неше әріп бар (1995 нұсқасы)?', a: ['33', '36', '42', '45'], correct: 2 },
  { q: 'Қазақ латын әрпіне толық қашан көшу жоспарланған?', a: ['2023', '2025', '2031', '2040'], correct: 2 },
  { q: 'Қазақ жазуы XX ғ. басында қай алфавит болатын?', a: ['Кириллица', 'Латын', 'Араб', 'Орхон'], correct: 2 },
  { q: 'Қазақ кириллицаға қашан көшті?', a: ['1929', '1940', '1956', '1991'], correct: 1 },

  // === ҒЫЛЫМ, СПОРТ ===
  { q: 'Әбу Насыр Әл-Фараби қай қалада туған?', a: ['Бағдад', 'Самарқанд', 'Отырар', 'Тараз'], correct: 2 },
  { q: 'Жамбыл Жабаев — кім?', a: ['Хан', 'Палуан', 'Ақын-жырау', 'Жазушы'], correct: 2 },
  { q: 'Серік Сапиев — қай саланың атағы?', a: ['Бокс', 'Күрес', 'Жүгіру', 'Шахмат'], correct: 0 },
  { q: 'Геннадий Головкин — қандай спортшы?', a: ['Күрес', 'Бокс', 'Шахмат', 'Жеңіл атлетика'], correct: 1 },
  { q: 'Қазақстанның тұңғыш Олимпиада чемпионы (тәуелсіздік кезінде)?', a: ['Юрий Мельниченко', 'Дмитрий Карпов', 'Серік Конакбаев', 'Бекжан Сатархан'], correct: 0 },
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
