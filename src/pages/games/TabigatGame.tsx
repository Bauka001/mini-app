import { useState, useMemo, useCallback } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Табиғи навигация — finding direction WITHOUT a compass: the skills
 * travellers, hunters and sailors used for millennia. A 6-lesson course:
 *
 *   1. ☀️ Sun        — rises East, sets West, noon = South
 *   2. 🕐 Watch       — hour hand at the sun, midpoint to 12 = South
 *   3. 🌑 Shadow      — shadow-tip method (first mark = West)
 *   4. ⭐ Stars       — Big Dipper → Polaris (Темірқазық) = North
 *   5. 🌳 Nature      — moss / anthill / snow-melt / branch-growth clues
 *   6. 🧭 Survival    — capstone exam mixing all five techniques
 *
 * Fully trilingual (kz / ru / en) and illustrated with purpose-drawn SVG
 * scenes (sky + sun, analog clock, shadow stick, Big-Dipper constellation,
 * nature signs) instead of bare emoji. Each lesson: teaching card → rounds
 * with after-answer explanations → 1–3★; sequential unlock; localStorage.
 */

type Lang = 'kz' | 'ru' | 'en';
const pickLang = (raw?: string): Lang => {
  const l = (raw || 'kz').slice(0, 2);
  return l === 'ru' ? 'ru' : l === 'en' ? 'en' : 'kz';
};
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

// localised cardinal-direction words (for the many direction-answer rounds)
const DIRS: Record<Lang, Record<'N' | 'S' | 'E' | 'W', string>> = {
  kz: { N: 'Солтүстік', S: 'Оңтүстік', E: 'Шығыс', W: 'Батыс' },
  ru: { N: 'Север', S: 'Юг', E: 'Восток', W: 'Запад' },
  en: { N: 'North', S: 'South', E: 'East', W: 'West' },
};

// ── progress ──
type Progress = { stars: Record<number, number>; unlocked: number };
const PKEY = 'nature-nav-v1';
const LEVELS = 6;
const readProgress = (): Progress => {
  try { const r = localStorage.getItem(PKEY); if (r) return JSON.parse(r); } catch { /* noop */ }
  return { stars: {}, unlocked: 1 };
};
const saveResult = (level: number, stars: number) => {
  const p = readProgress();
  p.stars[level] = Math.max(p.stars[level] || 0, stars);
  if (stars >= 1) p.unlocked = Math.max(p.unlocked, Math.min(LEVELS, level + 1));
  try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch { /* noop */ }
  return p;
};

// ════════════════════════ SVG scene art ════════════════════════
const D2R = Math.PI / 180;
const pol = (cx: number, cy: number, r: number, deg: number): [number, number] => [cx + r * Math.sin(deg * D2R), cy - r * Math.cos(deg * D2R)];

type Art =
  | { kind: 'sun'; pos: 'E' | 'S' | 'W'; fig?: boolean }
  | { kind: 'clock'; hour: number; mode: 'point' | 'mid' | 'check' | 'watch' }
  | { kind: 'shadow'; phase: 'first' | 'move' | 'dir' | 'axis' }
  | { kind: 'stars'; mode: 'pointer' | 'north' | 'fixed' | 'back' }
  | { kind: 'nature'; sign: 'moss' | 'anthill' | 'snow' | 'branch' };

const SunArt = ({ pos, fig }: { pos: 'E' | 'S' | 'W'; fig?: boolean }) => {
  const map = { E: [26, 52], W: [94, 52], S: [60, 22] } as const;
  const [cx, cy] = map[pos];
  const sky = pos === 'S' ? ['#0ea5e9', '#bae6fd'] : pos === 'E' ? ['#f59e0b', '#fde68a'] : ['#7c3aed', '#fb7185'];
  return (
    <svg viewBox="0 0 120 90" className="w-full h-32">
      <defs>
        <linearGradient id={`sky-${pos}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="120" height="90" rx="10" fill={`url(#sky-${pos})`} />
      {/* rays */}
      {Array.from({ length: 12 }).map((_, i) => {
        const [x1, y1] = pol(cx, cy, 13, i * 30);
        const [x2, y2] = pol(cx, cy, 18, i * 30);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff7cc" strokeWidth="1.4" opacity="0.8" />;
      })}
      <circle cx={cx} cy={cy} r="11" fill="#fde047" stroke="#fbbf24" strokeWidth="1.5" />
      {/* horizon hills */}
      <path d="M0 64 Q30 56 60 63 T120 62 L120 90 L0 90 Z" fill="#14532d" />
      <path d="M0 70 Q40 64 80 70 T120 69 L120 90 L0 90 Z" fill="#166534" opacity="0.85" />
      {fig && (<>
        <line x1="60" y1="64" x2="60" y2="50" stroke="#0c2a1a" strokeWidth="2.5" />
        <circle cx="60" cy="48" r="3" fill="#0c2a1a" />
        <ellipse cx="60" cy="80" rx="14" ry="4" fill="#052012" opacity="0.6" />
        <polygon points="60,64 50,80 70,80" fill="#052012" opacity="0.45" />
      </>)}
    </svg>
  );
};

const ClockArt = ({ hour, mode }: { hour: number; mode: string }) => {
  const cx = 46, cy = 46, r = 33;
  const [hx, hy] = pol(cx, cy, 21, hour * 30);
  const [sx, sy] = pol(cx, cy, r + 16, hour * 30);
  const [mx, my] = pol(cx, cy, r, hour * 15);
  return (
    <svg viewBox="0 0 120 90" className="w-full h-32">
      <rect x="0" y="0" width="120" height="90" rx="10" fill="#0f172a" />
      <circle cx={cx} cy={cy} r={r} fill="#1e293b" stroke="#475569" strokeWidth="2" />
      {[0, 90, 180, 270].map((a) => { const [tx, ty] = pol(cx, cy, r - 4, a); return <circle key={a} cx={tx} cy={ty} r="1.6" fill="#cbd5e1" />; })}
      <text x={cx} y={cy - r + 9} textAnchor="middle" fontSize="7" fill="#e2e8f0" fontWeight="bold">12</text>
      {/* sun in the hour-hand direction */}
      <circle cx={sx} cy={sy} r="8" fill="#fde047" stroke="#fbbf24" strokeWidth="1.2" />
      {Array.from({ length: 8 }).map((_, i) => { const [x1, y1] = pol(sx, sy, 9, i * 45); const [x2, y2] = pol(sx, sy, 12, i * 45); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fde047" strokeWidth="1" />; })}
      {/* hour hand → sun */}
      <line x1={cx} y1={cy} x2={hx} y2={hy} stroke="#f8fafc" strokeWidth="2.6" strokeLinecap="round" />
      {(mode === 'mid' || mode === 'watch') && (
        <line x1={cx} y1={cy} x2={mx} y2={my} stroke="#34d399" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
      )}
      {mode === 'check' && <circle cx={mx} cy={my} r="3" fill="#34d399" />}
      <circle cx={cx} cy={cy} r="2.4" fill="#f8fafc" />
    </svg>
  );
};

const ShadowArt = ({ phase }: { phase: string }) => {
  const baseX = 60, groundY = 64;
  return (
    <svg viewBox="0 0 120 90" className="w-full h-32">
      <rect x="0" y="0" width="120" height="90" rx="10" fill="#bfdbfe" />
      <rect x="0" y={groundY} width="120" height={90 - groundY} fill="#a16207" />
      <rect x="0" y={groundY} width="120" height="4" fill="#ca8a04" />
      {/* sun upper-right (east) → shadow falls left (west) */}
      <circle cx="98" cy="24" r="9" fill="#fde047" stroke="#fbbf24" strokeWidth="1.2" />
      {Array.from({ length: 8 }).map((_, i) => { const [x1, y1] = pol(98, 24, 10, i * 45); const [x2, y2] = pol(98, 24, 13, i * 45); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fde047" strokeWidth="1" />; })}
      {/* stick */}
      <line x1={baseX} y1={groundY} x2={baseX} y2={groundY - 22} stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
      {/* shadow to the left (west) */}
      <line x1={baseX} y1={groundY} x2={30} y2={groundY} stroke="#1c1917" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
      {/* first mark (West) */}
      <circle cx="30" cy={groundY} r="3.4" fill="#dc2626" />
      <text x="30" y={groundY + 12} textAnchor="middle" fontSize="7" fill="#7f1d1d" fontWeight="bold">1</text>
      {(phase === 'move' || phase === 'axis') && (<>
        <line x1={baseX} y1={groundY} x2={86} y2={groundY} stroke="#1c1917" strokeWidth="3" strokeDasharray="3 3" opacity="0.4" />
        <circle cx="86" cy={groundY} r="3.4" fill="#16a34a" />
        <text x="86" y={groundY + 12} textAnchor="middle" fontSize="7" fill="#14532d" fontWeight="bold">2</text>
      </>)}
      {phase === 'move' && <path d="M40 78 Q58 84 78 78" stroke="#1e3a8a" strokeWidth="1.6" fill="none" markerEnd="url(#arr)" />}
      {phase === 'axis' && <line x1="26" y1={groundY} x2="92" y2={groundY} stroke="#1e3a8a" strokeWidth="1.4" strokeDasharray="2 2" />}
      <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#1e3a8a" /></marker></defs>
    </svg>
  );
};

const StarArt = ({ mode }: { mode: string }) => {
  const bowl = [[40, 62], [56, 60], [58, 46], [42, 48]];
  const handle = [[58, 46], [72, 42], [86, 44]];
  const polaris = [30, 16];
  const dots = [[100, 24], [108, 60], [92, 74], [70, 78], [50, 80], [22, 40], [16, 64]];
  return (
    <svg viewBox="0 0 120 90" className="w-full h-32">
      <rect x="0" y="0" width="120" height="90" rx="10" fill="#0b1026" />
      {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1" fill="#94a3b8" opacity="0.7" />)}
      {mode === 'fixed' && <circle cx={polaris[0]} cy={polaris[1]} r="11" fill="none" stroke="#475569" strokeWidth="0.8" strokeDasharray="2 3" />}
      {/* dipper outline */}
      <polyline points={[...bowl, bowl[0]].map((p) => p.join(',')).join(' ')} fill="none" stroke="#64748b" strokeWidth="1" />
      <polyline points={handle.map((p) => p.join(',')).join(' ')} fill="none" stroke="#64748b" strokeWidth="1" />
      {[...bowl, ...handle.slice(1)].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" fill="#e2e8f0" />)}
      {/* pointer line: outer bowl edge → Polaris */}
      <line x1={42} y1={48} x2={polaris[0]} y2={polaris[1]} stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.85" />
      {/* Polaris */}
      <circle cx={polaris[0]} cy={polaris[1]} r="4.5" fill="#fde047" />
      <circle cx={polaris[0]} cy={polaris[1]} r="8" fill="#fde047" opacity="0.25" />
      {mode === 'north' && <text x={polaris[0]} y={polaris[1] - 8} textAnchor="middle" fontSize="8" fill="#fde047" fontWeight="bold">N</text>}
      {mode === 'back' && (<>
        <circle cx="64" cy="74" r="4" fill="#38bdf8" />
        <line x1="64" y1="74" x2={polaris[0] + 6} y2={polaris[1] + 6} stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="2 2" />
      </>)}
    </svg>
  );
};

const NatureArt = ({ sign }: { sign: string }) => (
  <svg viewBox="0 0 120 90" className="w-full h-32">
    <rect x="0" y="0" width="120" height="90" rx="10" fill="#dbeafe" />
    <rect x="0" y="70" width="120" height="20" fill="#4d7c0f" />
    {(sign === 'anthill' || sign === 'snow' || sign === 'branch') && (<>
      <circle cx="98" cy="20" r="9" fill="#fde047" stroke="#fbbf24" strokeWidth="1.2" />
      {Array.from({ length: 8 }).map((_, i) => { const [x1, y1] = pol(98, 20, 10, i * 45); const [x2, y2] = pol(98, 20, 13, i * 45); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fde047" strokeWidth="1" />; })}
    </>)}
    {sign === 'moss' && (<>
      <rect x="54" y="26" width="13" height="46" rx="3" fill="#5b3a1e" />
      <ellipse cx="60" cy="24" rx="20" ry="14" fill="#15803d" />
      {/* moss on the (shaded) left side */}
      <path d="M54 34 q-4 4 0 8 q-5 4 0 8 q-4 4 0 8 q-4 3 0 7" fill="none" stroke="#4ade80" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="51" cy="40" r="2" fill="#22c55e" /><circle cx="51" cy="52" r="2" fill="#22c55e" /><circle cx="52" cy="62" r="2" fill="#22c55e" />
    </>)}
    {sign === 'anthill' && (<>
      <path d="M36 70 Q60 30 84 70 Z" fill="#92400e" />
      <path d="M60 70 Q74 46 84 70 Z" fill="#b45309" />
      {[[58, 60], [64, 64], [54, 66], [68, 58]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.2" fill="#1c1917" />)}
    </>)}
    {sign === 'snow' && (<>
      <path d="M20 70 L60 28 L100 70 Z" fill="#78716c" />
      <path d="M20 70 L60 28 L60 70 Z" fill="#e2e8f0" />
      <path d="M30 70 L52 42 L52 70 Z" fill="#f8fafc" />
    </>)}
    {sign === 'branch' && (<>
      <rect x="56" y="34" width="9" height="38" rx="2" fill="#5b3a1e" />
      <ellipse cx="74" cy="40" rx="20" ry="15" fill="#15803d" />
      <ellipse cx="50" cy="42" rx="9" ry="8" fill="#166534" opacity="0.8" />
    </>)}
  </svg>
);

const SceneArt = ({ art }: { art: Art }) => {
  switch (art.kind) {
    case 'sun': return <SunArt pos={art.pos} fig={art.fig} />;
    case 'clock': return <ClockArt hour={art.hour} mode={art.mode} />;
    case 'shadow': return <ShadowArt phase={art.phase} />;
    case 'stars': return <StarArt mode={art.mode} />;
    case 'nature': return <NatureArt sign={art.sign} />;
  }
};

// ════════════════════════ lesson data ════════════════════════
type ARound = { art: Art; answer: number; dirs?: ('N' | 'S' | 'E' | 'W')[] };
type TRound = { q: string; teach: string; options?: string[] };
type LText = { title: string; concept: string; tip: string; rounds: TRound[] };
type Lesson = { id: number; icon: string; rounds: ARound[]; text: Record<Lang, LText> };

const LESSONS: Lesson[] = [
  {
    id: 1, icon: '☀️',
    rounds: [
      { art: { kind: 'sun', pos: 'E' }, answer: 0, dirs: ['E', 'W', 'N', 'S'] },
      { art: { kind: 'sun', pos: 'W' }, answer: 1, dirs: ['E', 'W', 'S', 'N'] },
      { art: { kind: 'sun', pos: 'S' }, answer: 1, dirs: ['N', 'S', 'E', 'W'] },
      { art: { kind: 'sun', pos: 'E' }, answer: 0, dirs: ['W', 'N', 'S', 'E'] },
      { art: { kind: 'sun', pos: 'S', fig: true }, answer: 1, dirs: ['S', 'N', 'E', 'W'] },
    ],
    text: {
      kz: {
        title: 'Күн әдісі',
        concept: 'Күн Шығыстан шығып, Батысқа батады. Талтүсте (Қазақстан — солтүстік жарты шар) ол дәл Оңтүстікте тұрады.',
        tip: 'Таң = Шығыс · Талтүс = Оңтүстік · Кеш = Батыс. Көлеңке әрқашан Күнге қарама-қарсы.',
        rounds: [
          { q: 'Күн көкжиектен шығып келеді. Бұл қай бағыт?', teach: 'Күн әрқашан Шығыстан шығады.' },
          { q: 'Күн көкжиекке батып барады. Қай бағыт?', teach: 'Күн Батысқа батады.' },
          { q: 'Күн ең биік нүктеде. Қай бағытта (сол. жарты шар)?', teach: 'Талтүсте Күн Оңтүстікте болады.' },
          { q: 'Күнге қарап тұрсыз (Шығыс). Артыңызда қай бағыт?', teach: 'Шығысқа қарасаң — арт жағың Батыс.' },
          { q: 'Күн Оңтүстікте. Көлеңкеңіз қай бағытқа түседі?', teach: 'Көлеңке Күнге қарама-қарсы — Солтүстікке.' },
        ],
      },
      ru: {
        title: 'Метод Солнца',
        concept: 'Солнце восходит на Востоке и садится на Западе. В полдень (Казахстан — северное полушарие) оно точно на Юге.',
        tip: 'Утро = Восток · Полдень = Юг · Вечер = Запад. Тень всегда напротив Солнца.',
        rounds: [
          { q: 'Солнце восходит над горизонтом. Это какая сторона?', teach: 'Солнце всегда восходит на Востоке.' },
          { q: 'Солнце садится за горизонт. Какая сторона?', teach: 'Солнце садится на Западе.' },
          { q: 'Солнце в высшей точке. Где оно (сев. полушарие)?', teach: 'В полдень Солнце на Юге.' },
          { q: 'Вы смотрите на Солнце (Восток). Что позади вас?', teach: 'Смотришь на Восток — сзади Запад.' },
          { q: 'Солнце на Юге. В какую сторону падает ваша тень?', teach: 'Тень напротив Солнца — на Север.' },
        ],
      },
      en: {
        title: 'Sun method',
        concept: 'The Sun rises in the East and sets in the West. At noon (Kazakhstan — northern hemisphere) it sits due South.',
        tip: 'Morning = East · Noon = South · Evening = West. A shadow always points away from the Sun.',
        rounds: [
          { q: 'The Sun is rising over the horizon. Which way is that?', teach: 'The Sun always rises in the East.' },
          { q: 'The Sun is setting below the horizon. Which way?', teach: 'The Sun sets in the West.' },
          { q: 'The Sun is at its highest. Where is it (N. hemisphere)?', teach: 'At noon the Sun is in the South.' },
          { q: 'You face the Sun (East). What is behind you?', teach: 'Facing East — West is behind you.' },
          { q: 'The Sun is South. Which way does your shadow fall?', teach: 'A shadow falls opposite the Sun — to the North.' },
        ],
      },
    },
  },
  {
    id: 2, icon: '🕐',
    rounds: [
      { art: { kind: 'clock', hour: 3, mode: 'point' }, answer: 0 },
      { art: { kind: 'clock', hour: 4, mode: 'mid' }, answer: 1, dirs: ['N', 'S', 'E', 'W'] },
      { art: { kind: 'clock', hour: 3, mode: 'check' }, answer: 0 },
      { art: { kind: 'clock', hour: 2, mode: 'watch' }, answer: 0 },
    ],
    text: {
      kz: {
        title: 'Сағат әдісі',
        concept: 'Тілді (механикалық сағат) Күнге қаратыңыз. Сағат тілі мен 12 санының дәл ОРТАСЫ — Оңтүстік бағытын көрсетеді.',
        tip: 'Тіл → Күнге. 12 мен тілдің ортасы → Оңтүстік. Қарама-қарсысы — Солтүстік.',
        rounds: [
          { q: 'Сағат әдісінде тілді неге қаратасыз?', teach: 'Сағат тілін Күнге қаратасыз.', options: ['Күнге', 'Жерге', 'Айға', '«12»-ге'] },
          { q: '12 мен сағат тілінің дәл ортасы қай бағытты көрсетеді?', teach: 'Орта нүкте — Оңтүстік (сол. жарты шарда).' },
          { q: 'Оңтүстікті таптыңыз. Солтүстік қай жақта?', teach: 'Солтүстік — Оңтүстікке қарама-қарсы.', options: ['Қарама-қарсы', 'Сол жақта', 'Оң жақта', 'Дәл сонда'] },
          { q: 'Бұл әдіске қандай сағат керек?', teach: 'Тек тілді (аналог) сағат жарайды.', options: ['Тілді (стрелкалы)', 'Цифрлық', 'Құм сағат', 'Ешқандай'] },
        ],
      },
      ru: {
        title: 'Метод часов',
        concept: 'Направьте часовую стрелку (механические часы) на Солнце. Точная СЕРЕДИНА между стрелкой и цифрой 12 указывает на Юг.',
        tip: 'Стрелка → на Солнце. Середина между 12 и стрелкой → Юг. Напротив — Север.',
        rounds: [
          { q: 'На что направляют стрелку в методе часов?', teach: 'Часовую стрелку направляют на Солнце.', options: ['На Солнце', 'На землю', 'На Луну', 'На «12»'] },
          { q: 'Середина между 12 и стрелкой указывает на какую сторону?', teach: 'Середина — это Юг (в сев. полушарии).' },
          { q: 'Вы нашли Юг. Где Север?', teach: 'Север — напротив Юга.', options: ['Напротив', 'Слева', 'Справа', 'Там же'] },
          { q: 'Какие часы нужны для этого метода?', teach: 'Подходят только стрелочные (аналоговые) часы.', options: ['Со стрелками', 'Цифровые', 'Песочные', 'Никакие'] },
        ],
      },
      en: {
        title: 'Watch method',
        concept: 'Point the hour hand (analog watch) at the Sun. The exact MIDPOINT between the hand and the 12 points South.',
        tip: 'Hand → Sun. Midpoint between 12 and hand → South. Opposite is North.',
        rounds: [
          { q: 'In the watch method, what do you point the hand at?', teach: 'You point the hour hand at the Sun.', options: ['At the Sun', 'At the ground', 'At the Moon', 'At the “12”'] },
          { q: 'The midpoint between 12 and the hand points which way?', teach: 'The midpoint is South (in the N. hemisphere).' },
          { q: 'You found South. Where is North?', teach: 'North is opposite South.', options: ['Opposite', 'On the left', 'On the right', 'Same spot'] },
          { q: 'What kind of watch does this method need?', teach: 'Only an analog (hands) watch works.', options: ['Analog (hands)', 'Digital', 'Hourglass', 'None'] },
        ],
      },
    },
  },
  {
    id: 3, icon: '🌑',
    rounds: [
      { art: { kind: 'shadow', phase: 'first' }, answer: 0, dirs: ['W', 'E', 'N', 'S'] },
      { art: { kind: 'shadow', phase: 'move' }, answer: 0 },
      { art: { kind: 'shadow', phase: 'dir' }, answer: 0 },
      { art: { kind: 'shadow', phase: 'axis' }, answer: 0 },
    ],
    text: {
      kz: {
        title: 'Таяқ-көлеңке',
        concept: 'Жерге таяқ тігіп, көлеңке ұшын белгілейсіз. 15 минут күтіп, тағы белгілейсіз. Бірінші белгі — БАТЫС, екіншісі — Шығыс.',
        tip: 'Күн Шығыс→Батыс жүреді, көлеңке КЕРІ (Батыс→Шығыс) жылжиды. Екі белгінің сызығы = Шығыс-Батыс осі.',
        rounds: [
          { q: 'Көлеңке ұшының БІРІНШІ белгісі қай бағыт?', teach: 'Бірінші белгі әрқашан Батыс.' },
          { q: 'Уақыт өте көлеңке қай жаққа жылжиды?', teach: 'Күн Батысқа жүргенде көлеңке Шығысқа жылжиды.', options: ['Шығысқа', 'Батысқа', 'Солтүстікке', 'Оңтүстікке'] },
          { q: 'Көлеңке Күннен қай жаққа созылады?', teach: 'Көлеңке әрқашан Күнге қарама-қарсы.', options: ['Қарама-қарсы', 'Күнге қарай', 'Жоғары', 'Дәл астына'] },
          { q: 'Екі белгіні қосқан сызық қай осьті береді?', teach: 'Екі белгі = Шығыс-Батыс осі. Оған тік — Солтүстік-Оңтүстік.', options: ['Шығыс-Батыс', 'Солтүстік-Оңтүстік', 'Қиғаш', 'Шеңбер'] },
        ],
      },
      ru: {
        title: 'Палка и тень',
        concept: 'Воткните палку и отметьте конец тени. Через 15 минут отметьте снова. Первая отметка — ЗАПАД, вторая — Восток.',
        tip: 'Солнце идёт Восток→Запад, тень — НАОБОРОТ (Запад→Восток). Линия между отметками = ось Восток-Запад.',
        rounds: [
          { q: 'ПЕРВАЯ отметка конца тени — какая сторона?', teach: 'Первая отметка всегда Запад.' },
          { q: 'Куда смещается тень со временем?', teach: 'Солнце идёт на Запад — тень смещается на Восток.', options: ['На восток', 'На запад', 'На север', 'На юг'] },
          { q: 'В какую сторону тянется тень от Солнца?', teach: 'Тень всегда напротив Солнца.', options: ['Напротив', 'К Солнцу', 'Вверх', 'Прямо вниз'] },
          { q: 'Линия между двумя отметками даёт какую ось?', teach: 'Две отметки = ось Восток-Запад. Перпендикуляр — Север-Юг.', options: ['Восток-Запад', 'Север-Юг', 'Диагональ', 'Круг'] },
        ],
      },
      en: {
        title: 'Shadow stick',
        concept: 'Plant a stick and mark the shadow tip. Wait 15 minutes and mark again. The first mark is WEST, the second is East.',
        tip: 'The Sun moves East→West, so the shadow moves the OPPOSITE way (West→East). The line between marks = East-West axis.',
        rounds: [
          { q: 'The FIRST shadow-tip mark is which direction?', teach: 'The first mark is always West.' },
          { q: 'Which way does the shadow drift over time?', teach: 'Sun goes West, so the shadow drifts East.', options: ['Eastward', 'Westward', 'Northward', 'Southward'] },
          { q: 'Which way does the shadow stretch from the Sun?', teach: 'A shadow always points opposite the Sun.', options: ['Opposite', 'Toward the Sun', 'Up', 'Straight down'] },
          { q: 'The line between the two marks gives which axis?', teach: 'Two marks = East-West axis. Perpendicular = North-South.', options: ['East-West', 'North-South', 'Diagonal', 'A circle'] },
        ],
      },
    },
  },
  {
    id: 4, icon: '⭐',
    rounds: [
      { art: { kind: 'stars', mode: 'pointer' }, answer: 0 },
      { art: { kind: 'stars', mode: 'north' }, answer: 0, dirs: ['N', 'S', 'E', 'W'] },
      { art: { kind: 'stars', mode: 'fixed' }, answer: 0 },
      { art: { kind: 'stars', mode: 'back' }, answer: 0, dirs: ['S', 'E', 'W', 'N'] },
    ],
    text: {
      kz: {
        title: 'Жұлдыздар',
        concept: 'Түнде Жетіқарақшы (Үлкен Жетіген) шомышының шеткі 2 жұлдызы — «көрсеткіш». Олардан 5 есе ара қашықтықта Темірқазық (Polaris) тұр — ол дәл СОЛТҮСТІК.',
        tip: 'Жетіқарақшы → шеткі 2 жұлдыз → Темірқазық → Солтүстік. Темірқазық қозғалмайды.',
        rounds: [
          { q: 'Шомыштың шеткі 2 жұлдызы қай жұлдызды көрсетеді?', teach: 'Көрсеткіш жұлдыздар Темірқазыққа (Polaris) бағыттайды.', options: ['Темірқазық', 'Шолпан', 'Ай', 'Күн'] },
          { q: 'Темірқазық (Polaris) қай бағытты білдіреді?', teach: 'Темірқазық әрқашан Солтүстікті көрсетеді.' },
          { q: 'Темірқазық басқа жұлдыздардан несімен ерекше?', teach: 'Темірқазық аспанда дерлік қозғалмай тұрады.', options: ['Қозғалмайды', 'Ең жарық', 'Қызыл түсті', 'Жыпылықтайды'] },
          { q: 'Темірқазыққа қарап тұрсыз. Артыңызда қай бағыт?', teach: 'Солтүстікке қарасаң — арт жағың Оңтүстік.' },
        ],
      },
      ru: {
        title: 'Звёзды',
        concept: 'Ночью две крайние звезды ковша Большой Медведицы — «указатели». На расстоянии ×5 от них стоит Полярная звезда (Polaris) — это точный СЕВЕР.',
        tip: 'Большая Медведица → 2 крайние звезды → Полярная → Север. Полярная не движется.',
        rounds: [
          { q: 'Две крайние звезды ковша указывают на какую звезду?', teach: 'Звёзды-указатели ведут к Полярной (Polaris).', options: ['Полярная звезда', 'Венера', 'Луна', 'Солнце'] },
          { q: 'Полярная звезда (Polaris) означает какую сторону?', teach: 'Полярная всегда показывает Север.' },
          { q: 'Чем Полярная отличается от других звёзд?', teach: 'Полярная почти неподвижна на небе.', options: ['Не движется', 'Самая яркая', 'Красная', 'Мерцает'] },
          { q: 'Вы смотрите на Полярную. Что позади вас?', teach: 'Смотришь на Север — сзади Юг.' },
        ],
      },
      en: {
        title: 'Stars',
        concept: 'At night the two outer stars of the Big Dipper’s bowl are the “pointers”. Five times that distance away sits Polaris — true NORTH.',
        tip: 'Big Dipper → 2 pointer stars → Polaris → North. Polaris does not move.',
        rounds: [
          { q: 'The two outer bowl stars point to which star?', teach: 'The pointer stars lead to Polaris.', options: ['Polaris', 'Venus', 'The Moon', 'The Sun'] },
          { q: 'Polaris means which direction?', teach: 'Polaris always marks North.' },
          { q: 'How does Polaris differ from other stars?', teach: 'Polaris stays almost fixed in the sky.', options: ['Stays still', 'Brightest', 'Red', 'Twinkles'] },
          { q: 'You face Polaris. What is behind you?', teach: 'Facing North — South is behind you.' },
        ],
      },
    },
  },
  {
    id: 5, icon: '🌳',
    rounds: [
      { art: { kind: 'nature', sign: 'moss' }, answer: 0, dirs: ['N', 'S', 'E', 'W'] },
      { art: { kind: 'nature', sign: 'anthill' }, answer: 0, dirs: ['S', 'N', 'E', 'W'] },
      { art: { kind: 'nature', sign: 'snow' }, answer: 0, dirs: ['N', 'S', 'E', 'W'] },
      { art: { kind: 'nature', sign: 'branch' }, answer: 0, dirs: ['S', 'N', 'E', 'W'] },
    ],
    text: {
      kz: {
        title: 'Табиғат белгілері',
        concept: 'Табиғаттың өзі бағыт көрсетеді: мүк, қар, құмырсқа илеуі, ағаш бұтақтары — Күн мен ылғалға байланысты бір жаққа бейім болады.',
        tip: 'Мүк — Солтүстік (көлеңкелі, ылғалды). Құмырсқа илеуі — Оңтүстік (жылы). Қар көлеңкеде (Солтүстік) ұзақ жатады.',
        rounds: [
          { q: 'Ағаш діңінде мүк көбіне қай жағында өседі?', teach: 'Мүк көлеңкелі, ылғалды Солтүстік жақты ұнатады.' },
          { q: 'Құмырсқа илеуінің жайпақ, жылы жағы қай бағытқа қарайды?', teach: 'Илеу жылы Оңтүстік жаққа қарай жайпақ болады.' },
          { q: 'Көктемде қар баурайдың қай жағында ұзағырақ сақталады?', teach: 'Көлеңкелі Солтүстік беткейде қар ұзақ ериді.' },
          { q: 'Ашық далада жалғыз ағаштың бұтақтары қай жақта қалың болады?', teach: 'Күн көп түсетін Оңтүстік жақта бұтақ қалың өседі.' },
        ],
      },
      ru: {
        title: 'Признаки природы',
        concept: 'Сама природа подсказывает направление: мох, снег, муравейник, ветви дерева — из-за Солнца и влаги склоняются к одной стороне.',
        tip: 'Мох — Север (тень, влага). Муравейник — Юг (тепло). Снег в тени (Север) лежит дольше.',
        rounds: [
          { q: 'С какой стороны ствола чаще растёт мох?', teach: 'Мох любит тенистую влажную сторону — Север.' },
          { q: 'Пологая тёплая сторона муравейника смотрит куда?', teach: 'Муравейник пологий к тёплой стороне — на Юг.' },
          { q: 'Весной с какой стороны склона снег лежит дольше?', teach: 'На тенистом Северном склоне снег тает дольше.' },
          { q: 'В открытом поле ветви одинокого дерева гуще с какой стороны?', teach: 'Гуще на Южной стороне — там больше Солнца.' },
        ],
      },
      en: {
        title: 'Nature signs',
        concept: 'Nature itself hints at direction: moss, snow, anthills, tree branches — sun and moisture make them favour one side.',
        tip: 'Moss — North (shady, damp). Anthill — South (warm). Snow on the shaded (North) side lasts longer.',
        rounds: [
          { q: 'On which side of a trunk does moss usually grow?', teach: 'Moss prefers the shady, damp North side.' },
          { q: 'The gentle, warm side of an anthill faces which way?', teach: 'An anthill slopes gently toward the warm South.' },
          { q: 'In spring, on which slope side does snow last longer?', teach: 'Snow lasts longer on the shaded North slope.' },
          { q: 'Branches of a lone field tree are denser on which side?', teach: 'Denser on the South side — more sunlight.' },
        ],
      },
    },
  },
  {
    id: 6, icon: '🧭',
    rounds: [
      { art: { kind: 'sun', pos: 'E' }, answer: 0, dirs: ['E', 'W', 'N', 'S'] },
      { art: { kind: 'sun', pos: 'W' }, answer: 0, dirs: ['W', 'E', 'S', 'N'] },
      { art: { kind: 'stars', mode: 'north' }, answer: 0, dirs: ['N', 'S', 'E', 'W'] },
      { art: { kind: 'sun', pos: 'S' }, answer: 0, dirs: ['S', 'N', 'E', 'W'] },
      { art: { kind: 'shadow', phase: 'first' }, answer: 0, dirs: ['W', 'E', 'N', 'S'] },
    ],
    text: {
      kz: {
        title: 'Аман қалу емтиханы',
        concept: 'Қорытынды деңгей! Барлық 5 әдіс араласады: Күн, көлеңке, жұлдыз. Компас жоқ — тек біліміңмен адаспай бағытты тап.',
        tip: 'Тыныштал, Күн мен жұлдыздарды бақыла. Қатесіз өтсең — нағыз навигаторсың!',
        rounds: [
          { q: 'Таң. Күн көтерілді — ол қай бағыт?', teach: 'Күн Шығыстан шығады.' },
          { q: 'Кеш. Күн көкжиекке батты — қай бағыт?', teach: 'Күн Батысқа батады.' },
          { q: 'Түн. Темірқазықты таптың — ол қай бағыт?', teach: 'Темірқазық — Солтүстік.' },
          { q: 'Талтүс. Күн ең биікте — қай бағыт?', teach: 'Талтүс Күні — Оңтүстік.' },
          { q: 'Таяқ көлеңкесінің бірінші белгісі — қай бағыт?', teach: 'Бірінші белгі — Батыс.' },
        ],
      },
      ru: {
        title: 'Экзамен на выживание',
        concept: 'Финальный уровень! Смешаны все 5 методов: Солнце, тень, звёзды. Компаса нет — найди направление только знаниями.',
        tip: 'Спокойно наблюдай за Солнцем и звёздами. Пройдёшь без ошибок — ты настоящий навигатор!',
        rounds: [
          { q: 'Утро. Солнце взошло — это какая сторона?', teach: 'Солнце восходит на Востоке.' },
          { q: 'Вечер. Солнце село за горизонт — какая сторона?', teach: 'Солнце садится на Западе.' },
          { q: 'Ночь. Ты нашёл Полярную — это какая сторона?', teach: 'Полярная звезда — Север.' },
          { q: 'Полдень. Солнце в высшей точке — какая сторона?', teach: 'Полуденное Солнце — Юг.' },
          { q: 'Первая отметка тени от палки — какая сторона?', teach: 'Первая отметка — Запад.' },
        ],
      },
      en: {
        title: 'Survival exam',
        concept: 'Final level! All 5 methods mixed: Sun, shadow, stars. No compass — find direction from knowledge alone.',
        tip: 'Stay calm, read the Sun and stars. Pass with no mistakes — you’re a true navigator!',
        rounds: [
          { q: 'Morning. The Sun has risen — which way is that?', teach: 'The Sun rises in the East.' },
          { q: 'Evening. The Sun has set — which way?', teach: 'The Sun sets in the West.' },
          { q: 'Night. You found Polaris — which way is that?', teach: 'Polaris marks North.' },
          { q: 'Noon. The Sun is at its peak — which way?', teach: 'The noon Sun is South.' },
          { q: 'The first shadow-stick mark — which way?', teach: 'The first mark is West.' },
        ],
      },
    },
  },
];

// ── localised UI strings ──
const UI: Record<Lang, { sub: string; lesson: string; explain: string; tip: string; start: string; back: string; q: string; correct: string; footer: string; heading: string }> = {
  kz: { sub: 'Компассыз бағыт табуды үйрен', lesson: 'Сабақ', explain: '📖 Түсіндірме', tip: '💡 Кеңес', start: 'Бастау ▶', back: '← Сабақтарға', q: 'Сұрақ', correct: 'Дұрыс', footer: '🌍 Компас болмаса да адаспа: Күн, сағат, көлеңке, жұлдыз, табиғат — бәрі бағыт көрсетеді.', heading: 'Табиғи навигация' },
  ru: { sub: 'Научись находить направление без компаса', lesson: 'Урок', explain: '📖 Объяснение', tip: '💡 Совет', start: 'Начать ▶', back: '← К урокам', q: 'Вопрос', correct: 'Верно', footer: '🌍 Без компаса не заблудишься: Солнце, часы, тень, звёзды, природа — всё укажет путь.', heading: 'Навигация без компаса' },
  en: { sub: 'Learn to find direction without a compass', lesson: 'Lesson', explain: '📖 Concept', tip: '💡 Tip', start: 'Start ▶', back: '← Lessons', q: 'Question', correct: 'Correct', footer: '🌍 No compass, no problem: Sun, watch, shadow, stars and nature all point the way.', heading: 'Natural Navigation' },
};

// ── one lesson's exercise ──
const LessonRunner = ({ lesson, lang, onDone }: { lesson: Lesson; lang: Lang; onDone: (score: number, stars: number) => void }) => {
  const tr = lesson.text[lang] || lesson.text.kz;
  const order = useMemo(() => shuffle(lesson.rounds.map((_, i) => i)), [lesson]);
  const ui = UI[lang];
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const ri = order[step];
  const ar = lesson.rounds[ri];
  const trr = tr.rounds[ri];
  const options = ar.dirs ? ar.dirs.map((k) => DIRS[lang][k]) : (trr.options || []);

  const pick = (i: number) => {
    if (picked !== null) return;
    const ok = i === ar.answer;
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
      <div className="text-xs text-stone-400 mb-3">{ui.q} {step + 1}/{order.length} · ✓ {correct}</div>

      <motion.div key={ri} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full rounded-2xl overflow-hidden border border-sky-500/30 mb-3 shadow-lg">
        <SceneArt art={ar.art} />
      </motion.div>

      <div className="text-sm font-bold text-white text-center mb-3 leading-snug">{trr.q}</div>

      <div className="grid grid-cols-2 gap-2 w-full">
        {options.map((opt, i) => {
          const isCorrect = picked !== null && i === ar.answer;
          const isWrong = picked === i && i !== ar.answer;
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
            {picked === ar.answer ? `✓ ${ui.correct}! ` : '✗ '}{trr.teach}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── academy shell ──
const NatureBoard = ({ lang, onEnd }: { lang: Lang; onEnd: (score: number, coins: number) => void }) => {
  const [progress, setProgress] = useState<Progress>(() => readProgress());
  const [view, setView] = useState<'menu' | 'intro' | 'play'>('menu');
  const [selected, setSelected] = useState(1);
  const ui = UI[lang];

  const finish = useCallback((level: number, score: number, stars: number) => {
    setProgress(saveResult(level, stars));
    onEnd(score, Math.round(score / 10));
  }, [onEnd]);

  if (view === 'play') {
    const l = LESSONS[selected - 1];
    return <LessonRunner lesson={l} lang={lang} onDone={(s, st) => finish(selected, s, st)} />;
  }

  if (view === 'intro') {
    const l = LESSONS[selected - 1];
    const tr = l.text[lang] || l.text.kz;
    return (
      <div className="flex flex-col items-center px-5 pb-4 max-w-md mx-auto text-center">
        <div className="text-5xl mb-3 mt-2">{l.icon}</div>
        <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-1">{ui.lesson} {l.id}</div>
        <h2 className="text-2xl font-black text-white mb-4">{tr.title}</h2>
        <div className="w-full rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 mb-3 text-left">
          <div className="text-[10px] uppercase text-amber-300/70 tracking-wider mb-1">{ui.explain}</div>
          <p className="text-sm text-amber-50 leading-relaxed">{tr.concept}</p>
        </div>
        <div className="w-full rounded-2xl bg-sky-500/10 border border-sky-500/30 p-4 mb-5 text-left">
          <div className="text-[10px] uppercase text-sky-300/70 tracking-wider mb-1">{ui.tip}</div>
          <p className="text-sm text-sky-50 leading-relaxed">{tr.tip}</p>
        </div>
        <button onClick={() => setView('play')} className="w-full max-w-xs py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-black text-lg active:scale-95 transition-transform">{ui.start}</button>
        <button onClick={() => setView('menu')} className="mt-2 text-sm text-stone-400">{ui.back}</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 pb-6 max-w-md mx-auto">
      <div className="text-center mb-4 mt-1">
        <div className="text-3xl mb-1">🌅</div>
        <h2 className="text-xl font-black text-white">{ui.heading}</h2>
        <p className="text-xs text-stone-400">{ui.sub}</p>
      </div>
      <div className="w-full space-y-2.5">
        {LESSONS.map((l) => {
          const locked = l.id > progress.unlocked;
          const stars = progress.stars[l.id] || 0;
          const tr = l.text[lang] || l.text.kz;
          return (
            <button key={l.id} disabled={locked} onClick={() => { setSelected(l.id); setView('intro'); }}
              className={clsx('w-full flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all',
                locked ? 'border-stone-800 bg-stone-900/40 opacity-50' :
                l.id === 6 ? 'border-fuchsia-500/50 bg-gradient-to-r from-fuchsia-900/30 to-stone-900 hover:border-fuchsia-400 active:scale-[0.99]' :
                'border-amber-600/40 bg-gradient-to-r from-amber-900/30 to-stone-900 hover:border-amber-400 active:scale-[0.99]')}>
              <div className="text-3xl shrink-0">{locked ? '🔒' : l.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-amber-400/60">{ui.lesson} {l.id}{l.id === 6 ? ' · ★' : ''}</div>
                <div className="font-bold text-white">{tr.title}</div>
              </div>
              <div className="text-sm shrink-0">{[1, 2, 3].map((s) => <span key={s} className={s <= stars ? 'text-amber-300' : 'text-stone-700'}>★</span>)}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 text-[11px] text-stone-500 text-center">{ui.footer}</div>
    </div>
  );
};

const INTRO: Record<Lang, { title: string; body: string }> = {
  kz: {
    title: 'Табиғи навигация',
    body: '🌅 КОМПАССЫЗ БАҒЫТ ТАБУ\n\n' +
      'Компас болмаса да адаспаудың 6 ежелгі әдісі:\n\n' +
      '1️⃣ ☀️ Күн — Шығыстан шығып, Батысқа батады\n' +
      '2️⃣ 🕐 Сағат — тілді Күнге қаратып, Оңтүстікті табу\n' +
      '3️⃣ 🌑 Көлеңке — таяқ көлеңкесімен Шығыс-Батыс\n' +
      '4️⃣ ⭐ Жұлдыз — Темірқазық = Солтүстік\n' +
      '5️⃣ 🌳 Табиғат — мүк, қар, құмырсқа белгілері\n' +
      '6️⃣ 🧭 Аман қалу емтиханы — бәрін біріктір\n\n' +
      '💡 Әр сабақ түсіндірмеден басталады. Жұлдыз жинап, келесісін аш.',
  },
  ru: {
    title: 'Навигация без компаса',
    body: '🌅 НАЙТИ НАПРАВЛЕНИЕ БЕЗ КОМПАСА\n\n' +
      '6 древних способов не заблудиться без компаса:\n\n' +
      '1️⃣ ☀️ Солнце — восходит на Востоке, садится на Западе\n' +
      '2️⃣ 🕐 Часы — стрелку на Солнце, найти Юг\n' +
      '3️⃣ 🌑 Тень — палка и тень дают ось Восток-Запад\n' +
      '4️⃣ ⭐ Звёзды — Полярная = Север\n' +
      '5️⃣ 🌳 Природа — мох, снег, муравейник\n' +
      '6️⃣ 🧭 Экзамен на выживание — всё вместе\n\n' +
      '💡 Каждый урок начинается с объяснения. Собирай звёзды и открывай следующий.',
  },
  en: {
    title: 'Natural Navigation',
    body: '🌅 FIND DIRECTION WITHOUT A COMPASS\n\n' +
      '6 ancient ways never to get lost without a compass:\n\n' +
      '1️⃣ ☀️ Sun — rises East, sets West\n' +
      '2️⃣ 🕐 Watch — hand at the Sun to find South\n' +
      '3️⃣ 🌑 Shadow — a stick and its shadow give the East-West axis\n' +
      '4️⃣ ⭐ Stars — Polaris = North\n' +
      '5️⃣ 🌳 Nature — moss, snow, anthills\n' +
      '6️⃣ 🧭 Survival exam — all of it together\n\n' +
      '💡 Each lesson starts with a concept. Earn stars to unlock the next.',
  },
};

export default function TabigatGame() {
  const { i18n } = useTranslation();
  const lang = pickLang(i18n.language);
  const { addGameResult } = useStore();
  const intro = INTRO[lang];
  return (
    <GameWrapper title={intro.title} instructions={intro.body}>
      {({ onEnd }) => (
        <NatureBoard
          lang={lang}
          onEnd={(score, coins) => {
            setTimeout(() => addGameResult({ gameId: 'tabigat', score, coinsEarned: coins }), 0);
            onEnd(score, coins);
          }}
        />
      )}
    </GameWrapper>
  );
}
