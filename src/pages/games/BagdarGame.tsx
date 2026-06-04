import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Сапар Академиясы — a 5-lesson compass mini-course that genuinely teaches
 * map & compass navigation, following the standard orienteering pedagogy:
 *
 *   Lesson 1  Бағыттар        — cardinal + intercardinal directions (the rose)
 *   Lesson 2  Градустар       — degrees ↔ direction (0°=N, 90°=E, …)
 *   Lesson 3  Азимут алу      — take a bearing to a target (read the angle)
 *   Lesson 4  Азимутпен жүру  — follow a bearing: rotate-to-align, then walk
 *   Lesson 5  Толық сапар     — multi-checkpoint course + the 180° trap
 *
 * Each lesson opens with a short teaching card (concept + tip), then an
 * interactive exercise that scores stars. Progress + stars persist in
 * localStorage; lessons unlock sequentially. Launched with ?daily=1 it jumps
 * straight into Lesson 4 as the daily exercise.
 *
 * Sources for the curriculum & method:
 *   REI — How to Use a Compass; learnorienteering.com — Compass Bearings;
 *   Orienteering Alberta lesson plans (cardinal → compass → bearings → course).
 */

// ─────────────────────────── shared compass helpers ───────────────────────────
type Dir = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
const DIR_ORDER: Dir[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const DIR_DEG: Record<Dir, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
const DIR_KZ: Record<Dir, string> = { N: 'С', NE: 'СШ', E: 'Ш', SE: 'ОШ', S: 'О', SW: 'ОБ', W: 'Б', NW: 'СБ' };
const DIR_FULL: Record<Dir, string> = {
  N: 'Солтүстік', NE: 'Солтүстік-Шығыс', E: 'Шығыс', SE: 'Оңтүстік-Шығыс',
  S: 'Оңтүстік', SW: 'Оңтүстік-Батыс', W: 'Батыс', NW: 'Солтүстік-Батыс',
};

const angleDiff = (a: number, b: number) => {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
};
const bearingTo = (fromX: number, fromY: number, toX: number, toY: number) => {
  const deg = (Math.atan2(toX - fromX, -(toY - fromY)) * 180) / Math.PI;
  return (deg + 360) % 360;
};
const bearingLabel = (deg: number): Dir => DIR_ORDER[Math.round(deg / 45) % 8];
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

// ─────────────────────────── progress persistence ───────────────────────────
type Progress = { stars: Record<number, number>; unlocked: number };
const PKEY = 'compass-academy-v1';
const readProgress = (): Progress => {
  try {
    const raw = localStorage.getItem(PKEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return { stars: {}, unlocked: 1 };
};
const saveResult = (level: number, stars: number) => {
  const p = readProgress();
  p.stars[level] = Math.max(p.stars[level] || 0, stars);
  if (stars >= 1) p.unlocked = Math.max(p.unlocked, Math.min(5, level + 1));
  try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch { /* noop */ }
  return p;
};

const LESSONS = [
  { id: 1, icon: '🧭', title: 'Бағыттар', concept: 'Компаста 8 негізгі бағыт бар. Солтүстік (С) әрқашан жоғарыда. Сағат тілімен: С → СШ → Ш → ОШ → О → ОБ → Б → СБ.', tip: 'С-жоғары, Ш-оң, О-төмен, Б-сол. Аралықтары — екеуінің атауын қосады (СШ = Солтүстік-Шығыс).' },
  { id: 2, icon: '🔢', title: 'Градустар', concept: 'Әр бағыттың градусы бар: С=0°, Ш=90°, О=180°, Б=270°. Аралықтары: СШ=45°, ОШ=135°, ОБ=225°, СБ=315°.', tip: 'Сағат тілімен 45°-тан өседі. 90°-қа бөлсеңіз — негізгі бағыт, ортасы — аралық.' },
  { id: 3, icon: '🎯', title: 'Азимут алу', concept: 'Азимут — мақсатқа бағыттың градусы. Компас инесін мақсатқа дәл бағыттап, градусты оқисыз.', tip: 'Денеңізді емес, инені (◀▶) мақсатқа бағыттаңыз. Сызық жасылданса — дәл.' },
  { id: 4, icon: '⛵', title: 'Теңіз сапары', concept: 'Кеме капитанысыз. Штурман бұйрық береді: «Азимут 90°, 3 миль жүз». Мақсат КӨРІНБЕЙДІ — тек бұйрықпен жүзесіз. Курсқа бұрылып, бұйрылған миль санын жүзіңіз.', tip: 'Алдымен бұйрылған азимутқа рульді бұрыңыз, «курста» болғанда ⛵ ЖҮЗУ басыңыз. Курстан тыс жүзу — миль санамайды!' },
  { id: 5, icon: '🌊', title: 'Ұзақ сапар', concept: 'Нағыз теңіз сапары: 5 аяқ (leg). Әр аяқта жаңа штурман бұйрығы. Картада ештеңе көрінбейді — тек компас пен бұйрық. Портқа адаспай жетіңіз!', tip: 'Әр бұйрықты дәл орында. Курстан тыс жүзу ұпайды азайтады. Қатесіз жүзсеңіз — 3 жұлдыз. Бұл — емтихан.' },
];

// ════════════════════════ Lesson 1 — Cardinal rose ════════════════════════
const Lesson1 = ({ onDone }: { onDone: (score: number, stars: number) => void }) => {
  const rounds = useMemo(() => shuffle(DIR_ORDER).concat(shuffle(DIR_ORDER).slice(0, 0)).slice(0, 6), []);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [flash, setFlash] = useState<{ dir: Dir; ok: boolean } | null>(null);
  const target = rounds[i];

  const pick = (d: Dir) => {
    if (flash) return;
    const ok = d === target;
    setFlash({ dir: d, ok });
    if (ok) { setScore((s) => s + 100); setCorrect((c) => c + 1); }
    setTimeout(() => {
      setFlash(null);
      if (i + 1 >= rounds.length) {
        const finalCorrect = correct + (ok ? 1 : 0);
        const stars = finalCorrect >= 6 ? 3 : finalCorrect >= 4 ? 2 : finalCorrect >= 2 ? 1 : 0;
        onDone(score + (ok ? 100 : 0), stars);
      } else setI((x) => x + 1);
    }, 650);
  };

  return (
    <div className="flex flex-col items-center px-4 pb-4">
      <div className="text-xs text-stone-400 mb-1">Сұрақ {i + 1}/{rounds.length} · ✓ {correct}</div>
      <div className="mb-5 px-4 py-2 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-center">
        <div className="text-[10px] uppercase text-amber-300/70 tracking-wider">Тап:</div>
        <div className="text-xl font-black text-amber-100">{DIR_FULL[target]} <span className="text-amber-300">({DIR_KZ[target]})</span></div>
      </div>
      {/* Rose with 8 tappable sectors */}
      <div className="relative" style={{ width: 260, height: 260 }}>
        <div className="absolute inset-6 rounded-full border-2 border-amber-700/30 bg-gradient-to-br from-stone-900 to-stone-950" />
        {DIR_ORDER.map((d) => {
          const a = DIR_DEG[d];
          const top = 50 - 42 * Math.cos((a * Math.PI) / 180);
          const left = 50 + 42 * Math.sin((a * Math.PI) / 180);
          const isFlash = flash?.dir === d;
          return (
            <motion.button
              key={d}
              disabled={!!flash}
              onClick={() => pick(d)}
              whileTap={{ scale: 0.9 }}
              className={clsx(
                'absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center font-black text-lg transition-all',
                isFlash && flash?.ok && 'bg-emerald-500 border-emerald-300 text-white',
                isFlash && !flash?.ok && 'bg-rose-500 border-rose-300 text-white',
                !isFlash && (d === 'N'
                  ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
                  : 'bg-stone-800/70 border-amber-600/40 text-amber-100 hover:border-amber-400'),
              )}
              style={{ top: `${top}%`, left: `${left}%` }}
            >{DIR_KZ[d]}</motion.button>
          );
        })}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl">🧭</div>
      </div>
    </div>
  );
};

// ════════════════════════ Lesson 2 — Degrees ════════════════════════
const Lesson2 = ({ onDone }: { onDone: (score: number, stars: number) => void }) => {
  const rounds = useMemo(() => shuffle(DIR_ORDER).slice(0, 6), []);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<Dir | null>(null);
  const target = rounds[i];
  const options = useMemo(() => {
    const opts = new Set<Dir>([target]);
    while (opts.size < 4) opts.add(DIR_ORDER[Math.floor(Math.random() * 8)]);
    return shuffle([...opts]);
  }, [target]);

  const pick = (d: Dir) => {
    if (picked) return;
    const ok = d === target;
    setPicked(d);
    if (ok) { setScore((s) => s + 100); setCorrect((c) => c + 1); }
    setTimeout(() => {
      setPicked(null);
      if (i + 1 >= rounds.length) {
        const fc = correct + (ok ? 1 : 0);
        onDone(score + (ok ? 100 : 0), fc >= 6 ? 3 : fc >= 4 ? 2 : fc >= 2 ? 1 : 0);
      } else setI((x) => x + 1);
    }, 700);
  };

  return (
    <div className="flex flex-col items-center px-4 pb-4">
      <div className="text-xs text-stone-400 mb-3">Сұрақ {i + 1}/{rounds.length} · ✓ {correct}</div>
      {/* Compass showing the degree */}
      <div className="relative mb-4" style={{ width: 150, height: 150 }}>
        <div className="absolute inset-0 rounded-full border-2 border-amber-600/40 bg-stone-900" />
        <div className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[10px] font-black text-rose-400">С</div>
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] text-amber-300/60">О</div>
        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-amber-300/60">Б</div>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-amber-300/60">Ш</div>
        <motion.div
          className="absolute top-1/2 left-1/2 origin-bottom" style={{ width: 4, height: '42%', transform: 'translate(-50%,-100%)' }}
          animate={{ rotate: DIR_DEG[target] }} transition={{ type: 'spring', stiffness: 120 }}
        >
          <div className="w-full h-2/3 bg-rose-400 rounded-t-full shadow-[0_0_10px_rgba(244,63,94,0.7)]" />
          <div className="w-full h-1/3 bg-stone-600 rounded-b-full" />
        </motion.div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-400 border-2 border-stone-900" />
      </div>
      <div className="mb-4 text-3xl font-black text-amber-200">{DIR_DEG[target]}°</div>
      <div className="text-xs text-stone-400 mb-2">Бұл қай бағыт?</div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
        {options.map((d) => {
          const isP = picked === d;
          const isCorrect = picked && d === target;
          return (
            <button
              key={d}
              disabled={!!picked}
              onClick={() => pick(d)}
              className={clsx(
                'py-3 rounded-xl border-2 font-bold transition-all',
                isCorrect ? 'bg-emerald-500/30 border-emerald-400 text-emerald-100' :
                isP ? 'bg-rose-500/30 border-rose-400 text-rose-100' :
                'bg-stone-800/60 border-stone-700 text-white hover:border-amber-400',
              )}
            >{DIR_FULL[d]} <span className="opacity-60">({DIR_KZ[d]})</span></button>
          );
        })}
      </div>
    </div>
  );
};

// ════════════════════════ Lesson 3 — Take a bearing ════════════════════════
const Lesson3 = ({ onDone }: { onDone: (score: number, stars: number) => void }) => {
  const TOTAL = 5;
  const [round, setRound] = useState(1);
  const [needle, setNeedle] = useState(0);
  const [target, setTarget] = useState(() => ({ x: 50 + Math.random() * 30, y: 50 - Math.random() * 30 }));
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const bearing = useMemo(() => bearingTo(50, 50, target.x, target.y), [target]);
  const delta = angleDiff(needle, bearing);
  const aligned = Math.abs(delta) <= 10;

  const confirm = () => {
    if (feedback) return;
    const ok = aligned;
    setFeedback(ok ? `✓ Дұрыс! Азимут ≈ ${Math.round(bearing)}°` : `Азимут ${Math.round(bearing)}° еді (сіз ${Math.round(needle)}°)`);
    if (ok) { setScore((s) => s + 100); setHits((h) => h + 1); }
    setTimeout(() => {
      setFeedback(null);
      if (round >= TOTAL) {
        const fh = hits + (ok ? 1 : 0);
        onDone(score + (ok ? 100 : 0), fh >= 5 ? 3 : fh >= 3 ? 2 : fh >= 1 ? 1 : 0);
      } else {
        setRound((r) => r + 1);
        setNeedle(0);
        setTarget({ x: 25 + Math.random() * 50, y: 25 + Math.random() * 50 });
      }
    }, 1400);
  };

  return (
    <div className="flex flex-col items-center px-4 pb-4 max-w-md mx-auto">
      <div className="text-xs text-stone-400 mb-2">Бекет {round}/{TOTAL} · ✓ {hits}</div>
      {/* Map */}
      <div className="relative w-full aspect-square max-w-[280px] rounded-2xl border-2 border-amber-700/30 overflow-hidden mb-3"
        style={{ background: 'radial-gradient(ellipse at 40% 40%, #2d3a2f, #0e1815)' }}>
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-black text-rose-300/80">С</div>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="50" y1="50" x2={target.x} y2={target.y} stroke={aligned ? '#34d399' : '#fb923c'} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
          {/* needle direction line */}
          <line x1="50" y1="50"
            x2={50 + 40 * Math.sin((needle * Math.PI) / 180)}
            y2={50 - 40 * Math.cos((needle * Math.PI) / 180)}
            stroke="#f43f5e" strokeWidth="1.5" />
        </svg>
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${target.x}%`, top: `${target.y}%` }}>
          <div className="text-2xl">⛳</div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-rose-400 ring-2 ring-white/40" />
      </div>
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs items-center mb-2">
        <div className="text-center text-xs">
          <div className="text-stone-400">Сіздің</div><div className="font-black text-sky-300">{Math.round(needle)}°</div>
        </div>
        <div className={clsx('text-center text-xs rounded-lg py-1', aligned ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/10 text-rose-200')}>
          {aligned ? '✓ дәл' : Math.abs(delta) > 0 ? `${Math.abs(Math.round(delta))}° ${delta > 0 ? 'оңға' : 'солға'}` : ''}
        </div>
        <div className="text-center text-xs">
          <div className="text-stone-400">Мақсат</div><div className="font-black text-amber-300">{bearingLabel(bearing) && DIR_KZ[bearingLabel(bearing)]}</div>
        </div>
      </div>
      {feedback && <div className="text-xs text-amber-200 mb-2 text-center">{feedback}</div>}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        <button onClick={() => !feedback && setNeedle((n) => (n - 15 + 360) % 360)} className="py-3 rounded-xl bg-sky-500/30 border-2 border-sky-400 text-white font-bold">◀ 15°</button>
        <button onClick={confirm} disabled={!!feedback}
          className={clsx('py-3 rounded-xl border-2 font-bold', aligned ? 'bg-emerald-500 border-emerald-300 text-white' : 'bg-amber-500/30 border-amber-400 text-amber-100')}>Растау</button>
        <button onClick={() => !feedback && setNeedle((n) => (n + 15) % 360)} className="py-3 rounded-xl bg-sky-500/30 border-2 border-sky-400 text-white font-bold">15° ▶</button>
      </div>
    </div>
  );
};

// ════════════ Lesson 4 & 5 — Ship voyage (blind navigation by orders) ════════════
// No destination is shown on the map — like a real ship, you only get the
// navigator's order (bearing + distance). Set the ordered heading, then sail
// the required legs. Reach port after all legs.
type Leg = { bearing: number; distance: number };
const makeVoyage = (legs: number): Leg[] => {
  const out: Leg[] = [];
  let prev = -1;
  for (let i = 0; i < legs; i++) {
    let b = 0;
    do { b = Math.floor(Math.random() * 8) * 45; } while (b === prev); // avoid repeating the same heading
    prev = b;
    out.push({ bearing: b, distance: 2 + Math.floor(Math.random() * 3) }); // 2–4 "miles"
  }
  return out;
};

const ShipVoyage = ({ legs, onDone }: { legs: number; onDone: (score: number, stars: number) => void }) => {
  const WORLD = 360, STEP = 30, ROT = 15, TOL = 12;
  const voyage = useMemo(() => makeVoyage(legs), [legs]);
  const [ship, setShip] = useState({ x: WORLD / 2, y: WORLD - 50 });
  const [heading, setHeading] = useState(0);
  const [legIdx, setLegIdx] = useState(0);
  const [stepsLeft, setStepsLeft] = useState(voyage[0].distance);
  const [moves, setMoves] = useState(0);
  const [offCourse, setOffCourse] = useState(0); // wrong-bearing sail attempts (penalty)
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([{ x: WORLD / 2, y: WORLD - 50 }]);
  const [toast, setToast] = useState<string | null>('⚓ Портты тастап шықтыңыз. Штурман бұйрығын орындаңыз!');

  const order = voyage[legIdx];
  const delta = angleDiff(heading, order.bearing);
  const aligned = Math.abs(delta) <= TOL;
  const px = (v: number) => `${(v / WORLD) * 100}%`;

  const sail = () => {
    if (done) return;
    setMoves((m) => m + 1);
    const rad = (heading * Math.PI) / 180;
    // The ship always moves in its heading — drifting off-course wastes a move
    // and doesn't reduce the leg's remaining distance (teaches precision).
    setShip((p) => {
      const nx = Math.max(16, Math.min(WORLD - 16, p.x + Math.sin(rad) * STEP));
      const ny = Math.max(16, Math.min(WORLD - 16, p.y - Math.cos(rad) * STEP));
      const next = { x: nx, y: ny };
      setTrail((t) => [...t.slice(-40), next]);
      return next;
    });
    if (!aligned) {
      setOffCourse((o) => o + 1);
      setToast('⚠️ Курстан тыс! Алдымен бұйрылған азимутқа бұрылыңыз.');
      setTimeout(() => setToast(null), 1400);
      return;
    }
    const left = stepsLeft - 1;
    setScore((s) => s + 25);
    if (left <= 0) {
      // Leg complete
      if (legIdx + 1 >= voyage.length) {
        setDone(true);
        setToast('🏝 Портқа жеттіңіз!');
        const accuracy = Math.max(0, 1 - offCourse / (legs * 3));
        const eff = Math.round(accuracy * 300);
        const stars = offCourse === 0 ? 3 : offCourse <= 2 ? 2 : 1;
        setTimeout(() => onDone(score + 25 + eff + 200, stars), 1400);
      } else {
        const ni = legIdx + 1;
        setLegIdx(ni);
        setStepsLeft(voyage[ni].distance);
        setToast(`✓ Аяқ ${legIdx + 1} аяқталды! Жаңа бұйрық.`);
        setTimeout(() => setToast(null), 1400);
      }
    } else {
      setStepsLeft(left);
    }
  };

  return (
    <div className="flex flex-col items-center px-3 pb-4 max-w-md mx-auto">
      <div className="w-full flex justify-between text-xs mb-2">
        <span className="text-stone-400">Аяқ <b className="text-white">{legIdx + 1}/{voyage.length}</b></span>
        <span className="text-stone-400">Жүзу <b className="text-white">{moves}</b></span>
        <span className="text-emerald-300 font-bold">🏆 {score}</span>
      </div>

      {/* Navigator's order — the ONLY guidance (no target on the map) */}
      <div className="w-full rounded-2xl bg-gradient-to-r from-sky-700/40 to-indigo-700/30 border-2 border-sky-400/50 p-3 mb-3">
        <div className="text-[10px] uppercase tracking-widest text-sky-300/80 mb-0.5">📜 Штурман бұйрығы</div>
        <div className="text-base font-black text-white">
          Азимут <span className="text-amber-300">{order.bearing}° ({DIR_KZ[bearingLabel(order.bearing)]})</span> · {stepsLeft} миль жүзіңіз
        </div>
      </div>

      {/* Ocean map — ship + wake only, NO destination marker */}
      <div className="relative w-full aspect-square rounded-2xl border-2 border-sky-700/40 overflow-hidden mb-3"
        style={{ background: 'linear-gradient(180deg, #0c4a6e 0%, #082f49 60%, #051f33 100%)' }}>
        {/* Wave texture */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 14px, rgba(255,255,255,0.15) 14px 15px)' }} />
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-black text-rose-300/80">С</div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-sky-200/50">О</div>
        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-sky-200/50">Б</div>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-sky-200/50">Ш</div>
        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${WORLD} ${WORLD}`} preserveAspectRatio="none">
          {trail.length > 1 && <polyline fill="none" stroke="#7dd3fc" strokeWidth="2" strokeDasharray="3 5" opacity="0.5" points={trail.map((p) => `${p.x},${p.y}`).join(' ')} />}
        </svg>
        {/* Ship — a directional boat marker whose bow points the heading.
            (An emoji can't convey heading; this SVG hull's pointed bow does.) */}
        <motion.div className="absolute -translate-x-1/2 -translate-y-1/2" animate={{ left: px(ship.x), top: px(ship.y) }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
          <motion.svg width="34" height="34" viewBox="0 0 24 24" animate={{ rotate: heading }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.6))' }}>
            {/* hull: pointed bow at top (heading), wide stern at bottom */}
            <path d="M12 1 C15 6 17 12 16 21 L8 21 C7 12 9 6 12 1 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="1.2" />
            {/* wake/water line accent + cabin */}
            <rect x="10" y="9" width="4" height="6" rx="1.5" fill="#78350f" />
            <circle cx="12" cy="5" r="1.3" fill="#fff" opacity="0.8" />
          </motion.svg>
        </motion.div>
        {done && <div className="absolute inset-0 flex items-center justify-center text-5xl">🏝</div>}
      </div>

      {/* Compass widget: your heading needle + ordered bearing (dotted) */}
      <div className="w-full grid grid-cols-3 gap-2 text-center text-xs mb-2 items-center">
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-1.5">
          <div className="text-[9px] text-amber-300/70">БҰЙРЫҚ</div>
          <div className="font-black text-amber-200">{order.bearing}°</div>
        </div>
        <div className={clsx('rounded-lg p-1.5 border', aligned ? 'bg-emerald-500/15 border-emerald-400/50' : 'bg-rose-500/10 border-rose-500/30')}>
          <div className="text-[9px] opacity-70">{aligned ? '✓ курста' : (delta > 0 ? 'оңға бұр' : 'солға бұр')}</div>
          <div className={clsx('font-black', aligned ? 'text-emerald-200' : 'text-rose-200')}>{aligned ? 'жүзуге дайын' : `${Math.abs(Math.round(delta))}°`}</div>
        </div>
        <div className="rounded-lg bg-sky-500/10 border border-sky-500/30 p-1.5">
          <div className="text-[9px] text-sky-300/70">КУРС</div>
          <div className="font-black text-sky-200">{Math.round(heading)}°</div>
        </div>
      </div>

      {toast && <div className="text-xs text-sky-100 mb-2 text-center px-2">{toast}</div>}

      <div className="w-full grid grid-cols-3 gap-2">
        <button onClick={() => !done && setHeading((h) => (h - ROT + 360) % 360)} className="py-4 rounded-xl bg-sky-500/40 border-2 border-sky-400 text-white font-bold text-xl">◀ руль</button>
        <button onClick={sail} disabled={done} className={clsx('py-4 rounded-xl border-2 font-bold', aligned && !done ? 'bg-emerald-500 border-emerald-300 text-white animate-pulse' : 'bg-amber-600/40 border-amber-500 text-amber-100')}>⛵ ЖҮЗУ</button>
        <button onClick={() => !done && setHeading((h) => (h + ROT) % 360)} className="py-4 rounded-xl bg-sky-500/40 border-2 border-sky-400 text-white font-bold text-xl">руль ▶</button>
      </div>
      <div className="text-[10px] text-stone-500 text-center mt-2">
        💡 Мақсат картада көрінбейді — тек штурман бұйрығымен жүзесіз (нағыз теңіздегідей).
      </div>
    </div>
  );
};

// ─────────────────────────── academy shell ───────────────────────────
const AcademyBoard = ({ onEnd, dailyMode }: { onEnd: (score: number, coins: number) => void; dailyMode: boolean }) => {
  const [progress, setProgress] = useState<Progress>(() => readProgress());
  const [view, setView] = useState<'menu' | 'intro' | 'play'>(dailyMode ? 'play' : 'menu');
  const [selected, setSelected] = useState<number>(dailyMode ? 4 : 1);

  const finishLesson = useCallback((level: number, score: number, stars: number) => {
    setProgress(saveResult(level, stars));
    // GameWrapper shows the tiered result + (if ?daily) submits to leaderboard.
    onEnd(score, Math.round(score / 10));
  }, [onEnd]);

  if (view === 'play') {
    const Exercise = () => {
      const done = (s: number, st: number) => finishLesson(selected, s, st);
      if (selected === 1) return <Lesson1 onDone={done} />;
      if (selected === 2) return <Lesson2 onDone={done} />;
      if (selected === 3) return <Lesson3 onDone={done} />;
      if (selected === 5) return <ShipVoyage legs={5} onDone={done} />;
      return <ShipVoyage legs={3} onDone={done} />;
    };
    return <Exercise />;
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
        <button onClick={() => setView('play')} className="w-full max-w-xs py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-black text-lg active:scale-95 transition-transform">
          Бастау ▶
        </button>
        <button onClick={() => setView('menu')} className="mt-2 text-sm text-stone-400">← Сабақтарға</button>
      </div>
    );
  }

  // menu
  return (
    <div className="flex flex-col items-center px-4 pb-6 max-w-md mx-auto">
      <div className="text-center mb-4 mt-1">
        <div className="text-3xl mb-1">🧭</div>
        <h2 className="text-xl font-black text-white">Сапар Академиясы</h2>
        <p className="text-xs text-stone-400">Компасты қолдануды 5 сабақта үйрен</p>
      </div>
      <div className="w-full space-y-2.5">
        {LESSONS.map((l) => {
          const locked = l.id > progress.unlocked;
          const stars = progress.stars[l.id] || 0;
          return (
            <button
              key={l.id}
              disabled={locked}
              onClick={() => { setSelected(l.id); setView('intro'); }}
              className={clsx(
                'w-full flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all',
                locked ? 'border-stone-800 bg-stone-900/40 opacity-50' :
                'border-amber-600/40 bg-gradient-to-r from-amber-900/30 to-stone-900 hover:border-amber-400 active:scale-[0.99]',
              )}
            >
              <div className="text-3xl shrink-0">{locked ? '🔒' : l.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-amber-400/60">Сабақ {l.id}</div>
                <div className="font-bold text-white">{l.title}</div>
              </div>
              <div className="text-sm shrink-0">
                {[1, 2, 3].map((s) => (
                  <span key={s} className={s <= stars ? 'text-amber-300' : 'text-stone-700'}>★</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 text-[11px] text-stone-500 text-center">
        🧭 С-Солтүстік · Ш-Шығыс · О-Оңтүстік · Б-Батыс<br/>
        Әр сабақ бір дағдыны үйретеді. Жұлдыз жинап, келесісін аш.
      </div>
    </div>
  );
};

export default function BagdarGame() {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  const [params] = useSearchParams();
  const dailyMode = params.get('daily') === '1';

  return (
    <GameWrapper
      title={t('game_bagdar', 'Сапар Академиясы')}
      instructions={t('bagdar_desc',
        '🧭 КОМПАС МИНИ-КУРСЫ\n\n' +
        '5 сабақта компасты қолдануды нөлден үйренесіз:\n\n' +
        '1️⃣ Бағыттар — С/Ш/О/Б және аралықтары\n' +
        '2️⃣ Градустар — 0°=С, 90°=Ш, 180°=О, 270°=Б\n' +
        '3️⃣ Азимут алу — мақсатқа бағытты оқу\n' +
        '4️⃣ Теңіз сапары — штурман бұйрығымен жүзу (мақсат көрінбейді!)\n' +
        '5️⃣ Ұзақ сапар — 5 аяқты маршрут (емтихан)\n\n' +
        '💡 Әр сабақ түсіндірмеден басталып, тапсырмамен бекітіледі. Жұлдыз жинап, келесі сабақты ашыңыз.',
      )}
    >
      {({ onEnd }) => (
        <AcademyBoard
          dailyMode={dailyMode}
          onEnd={(score, coins) => {
            setTimeout(() => addGameResult({ gameId: 'bagdar', score, coinsEarned: coins }), 0);
            onEnd(score, coins);
          }}
        />
      )}
    </GameWrapper>
  );
}
