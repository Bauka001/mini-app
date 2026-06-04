import { useState, useMemo, useCallback } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Табиғи навигация — finding direction WITHOUT a compass, the way travellers,
 * hunters and sailors did for millennia. A 5-lesson mini-course:
 *
 *   1. ☀️ Күн әдісі       — sun rises East, sets West, noon = South
 *   2. 🕐 Сағат әдісі     — hour hand at the sun, midpoint to 12 = South
 *   3. 🌑 Таяқ-көлеңке    — shadow-tip method (first mark = West)
 *   4. ⭐ Жұлдыздар       — Big Dipper → Polaris (Темірқазық) = North
 *   5. 🌳 Табиғат белгісі — moss, anthills, snow-melt as direction clues
 *
 * Each lesson: a teaching card (concept + tip) → a set of illustrated
 * multiple-choice rounds with after-answer explanations → 1–3 ★. Progress
 * persists in localStorage; lessons unlock sequentially.
 *
 * Facts sourced from standard wilderness-navigation references (REI, scouting
 * field manuals): sun/shadow/watch/Polaris/nature-sign techniques.
 */

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

// ── progress ──
type Progress = { stars: Record<number, number>; unlocked: number };
const PKEY = 'nature-nav-v1';
const readProgress = (): Progress => {
  try { const r = localStorage.getItem(PKEY); if (r) return JSON.parse(r); } catch { /* noop */ }
  return { stars: {}, unlocked: 1 };
};
const saveResult = (level: number, stars: number) => {
  const p = readProgress();
  p.stars[level] = Math.max(p.stars[level] || 0, stars);
  if (stars >= 1) p.unlocked = Math.max(p.unlocked, Math.min(5, level + 1));
  try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch { /* noop */ }
  return p;
};

type Round = { scene: string; caption: string; q: string; options: string[]; answer: number; teach: string };

const LESSONS: { id: number; icon: string; title: string; concept: string; tip: string; rounds: Round[] }[] = [
  {
    id: 1, icon: '☀️', title: 'Күн әдісі',
    concept: 'Күн Шығыстан шығып, Батысқа батады. Талтүсте (Қазақстан — солтүстік жарты шар) ол дәл Оңтүстікте тұрады.',
    tip: 'Таң = Шығыс · Талтүс = Оңтүстік · Кеш = Батыс. Көлеңке әрқашан Күнге қарама-қарсы.',
    rounds: [
      { scene: '🌅', caption: 'Таң ату', q: 'Күн көкжиектен шығып келеді. Бұл қай бағыт?', options: ['Шығыс', 'Батыс', 'Солтүстік', 'Оңтүстік'], answer: 0, teach: 'Күн әрқашан Шығыстан шығады.' },
      { scene: '🌇', caption: 'Кеш', q: 'Күн көкжиекке батып барады. Қай бағыт?', options: ['Шығыс', 'Батыс', 'Оңтүстік', 'Солтүстік'], answer: 1, teach: 'Күн Батысқа батады.' },
      { scene: '☀️', caption: 'Талтүс', q: 'Күн ең биік нүктеде. Қай бағытта (сол. жарты шар)?', options: ['Солтүстік', 'Оңтүстік', 'Шығыс', 'Батыс'], answer: 1, teach: 'Талтүсте Күн Оңтүстікте болады.' },
      { scene: '🌅', caption: 'Таң', q: 'Күнге қарап тұрсыз (Шығыс). Артыңызда қай бағыт?', options: ['Батыс', 'Солтүстік', 'Оңтүстік', 'Шығыс'], answer: 0, teach: 'Шығысқа қарасаң — арт жағың Батыс.' },
      { scene: '☀️', caption: 'Талтүс', q: 'Күн Оңтүстікте. Көлеңкеңіз қай бағытқа түседі?', options: ['Оңтүстік', 'Солтүстік', 'Шығыс', 'Батыс'], answer: 1, teach: 'Көлеңке Күнге қарама-қарсы — Солтүстікке.' },
    ],
  },
  {
    id: 2, icon: '🕐', title: 'Сағат әдісі',
    concept: 'Тілді (механикалық сағат) Күнге қаратыңыз. Сағат тілі мен 12 санының дәл ОРТАСЫ — Оңтүстік бағытын көрсетеді.',
    tip: 'Тіл → Күнге. 12 мен тілдің ортасы → Оңтүстік. Қарама-қарсысы — Солтүстік.',
    rounds: [
      { scene: '🕐', caption: 'Сағат + Күн', q: 'Сағат әдісінде тілді неге қаратасыз?', options: ['Күнге', 'Жерге', 'Айға', '12-ге'], answer: 0, teach: 'Сағат тілін Күнге қаратасыз.' },
      { scene: '🧭', caption: 'Орта нүкте', q: '12 мен сағат тілінің дәл ортасы қай бағытты көрсетеді?', options: ['Солтүстік', 'Оңтүстік', 'Шығыс', 'Батыс'], answer: 1, teach: 'Орта нүкте — Оңтүстік (сол. жарты шарда).' },
      { scene: '🕐', caption: 'Тексеру', q: 'Оңтүстікті таптыңыз. Солтүстік қай жақта?', options: ['Қарама-қарсы', 'Сол жақта', 'Оң жақта', 'Дәл сонда'], answer: 0, teach: 'Солтүстік — Оңтүстікке қарама-қарсы.' },
      { scene: '⌚', caption: 'Не керек?', q: 'Бұл әдіске қандай сағат керек?', options: ['Тілді (стрелкалы)', 'Цифрлық', 'Құм сағат', 'Ешқандай'], answer: 0, teach: 'Тек тілді (аналог) сағат жарайды.' },
    ],
  },
  {
    id: 3, icon: '🌑', title: 'Таяқ-көлеңке',
    concept: 'Жерге таяқ тігіп, көлеңке ұшын белгілейсіз. 15 минут күтіп, тағы белгілейсіз. Бірінші белгі — БАТЫС, екіншісі — Шығыс.',
    tip: 'Күн Шығыс→Батыс жүреді, көлеңке КЕРІ (Батыс→Шығыс) жылжиды. Екі белгінің сызығы = Шығыс-Батыс осі.',
    rounds: [
      { scene: '🌑', caption: 'Таяқ көлеңкесі', q: 'Көлеңке ұшының БІРІНШІ белгісі қай бағыт?', options: ['Батыс', 'Шығыс', 'Солтүстік', 'Оңтүстік'], answer: 0, teach: 'Бірінші белгі әрқашан Батыс.' },
      { scene: '➡️', caption: 'Жылжу', q: 'Уақыт өте көлеңке қай жаққа жылжиды?', options: ['Шығысқа', 'Батысқа', 'Солтүстікке', 'Оңтүстікке'], answer: 0, teach: 'Күн Батысқа жүргенде көлеңке Шығысқа жылжиды.' },
      { scene: '🌑', caption: 'Бағыт', q: 'Көлеңке Күннен қай жаққа созылады?', options: ['Қарама-қарсы', 'Күнге қарай', 'Жоғары', 'Дәл астына'], answer: 0, teach: 'Көлеңке әрқашан Күнге қарама-қарсы.' },
      { scene: '📏', caption: 'Ось', q: 'Екі белгіні қосқан сызық қай осьті береді?', options: ['Шығыс-Батыс', 'Солтүстік-Оңтүстік', 'Көлбеу', 'Шеңбер'], answer: 0, teach: 'Екі белгі = Шығыс-Батыс осі. Оған тік — Солтүстік-Оңтүстік.' },
    ],
  },
  {
    id: 4, icon: '⭐', title: 'Жұлдыздар',
    concept: 'Түнде Жетіқарақшы (Үлкен Жетіген) шомышының шеткі 2 жұлдызы — «көрсеткіш». Олардан 5 есе ара қашықтықта Темірқазық (Polaris) тұр — ол дәл СОЛТҮСТІК.',
    tip: 'Жетіқарақшы → шеткі 2 жұлдыз → Темірқазық → Солтүстік. Темірқазық қозғалмайды.',
    rounds: [
      { scene: '⭐', caption: 'Жетіқарақшы', q: 'Шомыштың шеткі 2 жұлдызы қай жұлдызды көрсетеді?', options: ['Темірқазық', 'Шолпан', 'Ай', 'Күн'], answer: 0, teach: 'Көрсеткіш жұлдыздар Темірқазыққа (Polaris) бағыттайды.' },
      { scene: '🌟', caption: 'Темірқазық', q: 'Темірқазық (Polaris) қай бағытты білдіреді?', options: ['Солтүстік', 'Оңтүстік', 'Шығыс', 'Батыс'], answer: 0, teach: 'Темірқазық әрқашан Солтүстікті көрсетеді.' },
      { scene: '✨', caption: 'Ерекшелік', q: 'Түнде басқа жұлдыздарға қарағанда Темірқазық қалай ерекшеленеді?', options: ['Қозғалмайды', 'Ең жарық', 'Қызыл түсті', 'Жыпылықтайды'], answer: 0, teach: 'Темірқазық аспанда дерлік қозғалмай тұрады.' },
      { scene: '⭐', caption: 'Бағыт', q: 'Темірқазыққа қарап тұрсыз. Артыңызда қай бағыт?', options: ['Оңтүстік', 'Шығыс', 'Батыс', 'Солтүстік'], answer: 0, teach: 'Солтүстікке қарасаң — арт жағың Оңтүстік.' },
    ],
  },
  {
    id: 5, icon: '🌳', title: 'Табиғат белгілері',
    concept: 'Табиғаттың өзі бағыт көрсетеді: мүк, қар, құмырсқа илеуі, ағаш сақиналары — Күн мен ылғалға байланысты бір жаққа бейім болады.',
    tip: 'Мүк — Солтүстік (көлеңкелі, ылғалды). Құмырсқа илеуі — Оңтүстік (жылы). Қар көлеңкеде (Солтүстік) ұзақ жатады.',
    rounds: [
      { scene: '🌳', caption: 'Ағаш мүгі', q: 'Ағаш діңінде мүк көбіне қай жағында өседі?', options: ['Солтүстік', 'Оңтүстік', 'Шығыс', 'Батыс'], answer: 0, teach: 'Мүк көлеңкелі, ылғалды Солтүстік жақты ұнатады.' },
      { scene: '🐜', caption: 'Құмырсқа илеуі', q: 'Құмырсқа илеуінің жайпақ, жылы жағы қай бағытқа қарайды?', options: ['Оңтүстік', 'Солтүстік', 'Шығыс', 'Батыс'], answer: 0, teach: 'Илеу жылы Оңтүстік жаққа қарай жайпақ болады.' },
      { scene: '❄️', caption: 'Қар', q: 'Көктемде қар баурайдың қай жағында ұзағырақ сақталады?', options: ['Солтүстік', 'Оңтүстік', 'Шығыс', 'Батыс'], answer: 0, teach: 'Көлеңкелі Солтүстік беткейде қар ұзақ ериді.' },
      { scene: '🌲', caption: 'Жалғыз ағаш', q: 'Ашық далада жалғыз ағаштың бұтақтары қай жақта қалың/ұзын болады?', options: ['Оңтүстік', 'Солтүстік', 'Шығыс', 'Батыс'], answer: 0, teach: 'Күн көп түсетін Оңтүстік жақта бұтақ қалың өседі.' },
    ],
  },
];

// ── one lesson's exercise (illustrated multiple-choice) ──
const LessonRunner = ({ rounds, onDone }: { rounds: Round[]; onDone: (score: number, stars: number) => void }) => {
  const order = useMemo(() => shuffle(rounds.map((_, i) => i)), [rounds]);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const r = rounds[order[step]];

  const pick = (i: number) => {
    if (picked !== null) return;
    const ok = i === r.answer;
    setPicked(i);
    if (ok) { setScore((s) => s + 100); setCorrect((c) => c + 1); }
    setTimeout(() => {
      setPicked(null);
      if (step + 1 >= order.length) {
        const fc = correct + (ok ? 1 : 0);
        const total = order.length;
        const stars = fc >= total ? 3 : fc >= Math.ceil(total * 0.6) ? 2 : fc >= 1 ? 1 : 0;
        onDone(score + (ok ? 100 : 0), stars);
      } else setStep((x) => x + 1);
    }, 1700);
  };

  return (
    <div className="flex flex-col items-center px-4 pb-4 max-w-md mx-auto">
      <div className="text-xs text-stone-400 mb-3">Сұрақ {step + 1}/{order.length} · ✓ {correct}</div>

      {/* Scene */}
      <div className="w-full rounded-2xl bg-gradient-to-b from-sky-700/30 to-indigo-900/30 border border-sky-500/30 p-5 mb-3 flex flex-col items-center">
        <motion.div key={order[step]} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-6xl mb-1">{r.scene}</motion.div>
        <div className="text-[11px] uppercase tracking-widest text-sky-300/70">{r.caption}</div>
      </div>

      <div className="text-sm font-bold text-white text-center mb-3 leading-snug">{r.q}</div>

      <div className="grid grid-cols-2 gap-2 w-full">
        {r.options.map((opt, i) => {
          const isCorrect = picked !== null && i === r.answer;
          const isWrong = picked === i && i !== r.answer;
          return (
            <button
              key={i}
              disabled={picked !== null}
              onClick={() => pick(i)}
              className={clsx(
                'py-3.5 rounded-xl border-2 font-bold transition-all',
                isCorrect ? 'bg-emerald-500/30 border-emerald-400 text-emerald-100' :
                isWrong ? 'bg-rose-500/30 border-rose-400 text-rose-100' :
                picked !== null ? 'bg-stone-800/40 border-stone-700 text-stone-500' :
                'bg-stone-800/70 border-amber-600/40 text-white hover:border-amber-400',
              )}
            >{opt}</button>
          );
        })}
      </div>

      <AnimatePresence>
        {picked !== null && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-3 w-full rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-100 text-center">
            {picked === r.answer ? '✓ Дұрыс! ' : '✗ '}{r.teach}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── academy shell ──
const NatureBoard = ({ onEnd }: { onEnd: (score: number, coins: number) => void }) => {
  const [progress, setProgress] = useState<Progress>(() => readProgress());
  const [view, setView] = useState<'menu' | 'intro' | 'play'>('menu');
  const [selected, setSelected] = useState(1);

  const finish = useCallback((level: number, score: number, stars: number) => {
    setProgress(saveResult(level, stars));
    onEnd(score, Math.round(score / 10));
  }, [onEnd]);

  if (view === 'play') {
    const l = LESSONS[selected - 1];
    return <LessonRunner rounds={l.rounds} onDone={(s, st) => finish(selected, s, st)} />;
  }

  if (view === 'intro') {
    const l = LESSONS[selected - 1];
    return (
      <div className="flex flex-col items-center px-5 pb-4 max-w-md mx-auto text-center">
        <div className="text-5xl mb-3 mt-2">{l.icon}</div>
        <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-1">Сабақ {l.id}</div>
        <h2 className="text-2xl font-black text-white mb-4">{l.title}</h2>
        <div className="w-full rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 mb-3 text-left">
          <div className="text-[10px] uppercase text-amber-300/70 tracking-wider mb-1">📖 Түсіндірме</div>
          <p className="text-sm text-amber-50 leading-relaxed">{l.concept}</p>
        </div>
        <div className="w-full rounded-2xl bg-sky-500/10 border border-sky-500/30 p-4 mb-5 text-left">
          <div className="text-[10px] uppercase text-sky-300/70 tracking-wider mb-1">💡 Кеңес</div>
          <p className="text-sm text-sky-50 leading-relaxed">{l.tip}</p>
        </div>
        <button onClick={() => setView('play')} className="w-full max-w-xs py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-black text-lg active:scale-95 transition-transform">Бастау ▶</button>
        <button onClick={() => setView('menu')} className="mt-2 text-sm text-stone-400">← Сабақтарға</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 pb-6 max-w-md mx-auto">
      <div className="text-center mb-4 mt-1">
        <div className="text-3xl mb-1">🌅</div>
        <h2 className="text-xl font-black text-white">Табиғи навигация</h2>
        <p className="text-xs text-stone-400">Компассыз бағыт табуды 5 сабақта үйрен</p>
      </div>
      <div className="w-full space-y-2.5">
        {LESSONS.map((l) => {
          const locked = l.id > progress.unlocked;
          const stars = progress.stars[l.id] || 0;
          return (
            <button key={l.id} disabled={locked} onClick={() => { setSelected(l.id); setView('intro'); }}
              className={clsx('w-full flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all',
                locked ? 'border-stone-800 bg-stone-900/40 opacity-50' :
                'border-amber-600/40 bg-gradient-to-r from-amber-900/30 to-stone-900 hover:border-amber-400 active:scale-[0.99]')}>
              <div className="text-3xl shrink-0">{locked ? '🔒' : l.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-amber-400/60">Сабақ {l.id}</div>
                <div className="font-bold text-white">{l.title}</div>
              </div>
              <div className="text-sm shrink-0">{[1, 2, 3].map((s) => <span key={s} className={s <= stars ? 'text-amber-300' : 'text-stone-700'}>★</span>)}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 text-[11px] text-stone-500 text-center">
        🌍 Компас болмаса да адаспа: Күн, сағат, көлеңке, жұлдыз, табиғат — бәрі бағыт көрсетеді.
      </div>
    </div>
  );
};

export default function TabigatGame() {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  return (
    <GameWrapper
      title={t('game_tabigat', 'Табиғи навигация')}
      instructions={t('tabigat_desc',
        '🌅 КОМПАССЫЗ БАҒЫТ ТАБУ\n\n' +
        'Компас болмаса да адаспаудың 5 ежелгі әдісі:\n\n' +
        '1️⃣ ☀️ Күн — Шығыстан шығып, Батысқа батады\n' +
        '2️⃣ 🕐 Сағат — тілді Күнге қаратып, Оңтүстікті табу\n' +
        '3️⃣ 🌑 Көлеңке — таяқ көлеңкесімен Шығыс-Батыс\n' +
        '4️⃣ ⭐ Жұлдыз — Темірқазық = Солтүстік\n' +
        '5️⃣ 🌳 Табиғат — мүк, қар, құмырсқа белгілері\n\n' +
        '💡 Әр сабақ түсіндірмеден басталады. Жұлдыз жинап, келесісін аш.',
      )}
    >
      {({ onEnd }) => (
        <NatureBoard
          onEnd={(score, coins) => {
            setTimeout(() => addGameResult({ gameId: 'tabigat', score, coinsEarned: coins }), 0);
            onEnd(score, coins);
          }}
        />
      )}
    </GameWrapper>
  );
}
