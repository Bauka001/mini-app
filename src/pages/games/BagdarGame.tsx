import { useState, useCallback, useEffect, useMemo } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Бағдар / Сапар — practical compass navigation game.
 *
 * Replaces the previous Simon-Says style memory game with a real
 * orienteering mechanic that TEACHES compass usage:
 *
 *   1. Top-down map shows player position and a target (checkpoint).
 *   2. Game tells the user the bearing to the target (e.g. "НШ 60°").
 *   3. Player rotates heading with ◀/▶ buttons (15° per tap).
 *   4. When the current heading matches the bearing (±15°), the "Walk
 *      forward" button activates. Tap it to move 30 units in heading dir.
 *   5. Reach target → next checkpoint. 5 checkpoints = win.
 *
 * Score: -1 per move, +100 per checkpoint reached, big bonus for
 * efficiency (fewer than N moves total). Teaches bearings, cardinal
 * directions, and how to align a compass to follow a course — actual
 * orienteering skill.
 */

const WORLD = 360;                  // square viewport in conceptual units
const PLAYER_RADIUS = 14;
const TARGET_RADIUS = 22;
const STEP_LEN = 36;                // distance walked per "forward" tap
const ROTATE_STEP = 15;             // degrees per turn tap
const ALIGN_TOL = 15;               // ± degrees considered "aligned"
const CHECKPOINTS = 5;
const HIT_RADIUS = 38;              // proximity to checkpoint to register
const MAX_MOVES_PAR = 35;           // per-round par for efficiency bonus

type Vec = { x: number; y: number };

const angleBetween = (from: Vec, to: Vec): number => {
  // Returns bearing in degrees, 0 = North (up = negative y), clockwise.
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const radians = Math.atan2(dx, -dy); // note: -dy because screen y grows down
  let deg = (radians * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
};

const angleDiff = (a: number, b: number): number => {
  // Signed shortest delta b - a, in [-180, 180]
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
};

const bearingLabel = (deg: number): string => {
  // Map degrees to Kazakh cardinal compound (С / СШ / Ш / ОШ / О / ОБ / Б / СБ)
  const names = ['С', 'СШ', 'Ш', 'ОШ', 'О', 'ОБ', 'Б', 'СБ'];
  const idx = Math.round(deg / 45) % 8;
  return names[idx];
};

const newCheckpoint = (playerPos: Vec): Vec => {
  // Place a checkpoint somewhere on the map but not too close to the player
  for (let i = 0; i < 50; i++) {
    const x = 60 + Math.random() * (WORLD - 120);
    const y = 60 + Math.random() * (WORLD - 120);
    const dx = x - playerPos.x;
    const dy = y - playerPos.y;
    if (Math.hypot(dx, dy) > 140) return { x, y };
  }
  return { x: WORLD / 2 + 100, y: WORLD / 2 - 100 };
};

const SaparBoard = ({ onEnd }: { onEnd: (score: number, coins: number) => void }) => {
  const [player, setPlayer] = useState<Vec>({ x: WORLD / 2, y: WORLD / 2 });
  const [heading, setHeading] = useState<number>(0); // 0 = North
  const [target, setTarget] = useState<Vec>(() => newCheckpoint({ x: WORLD / 2, y: WORLD / 2 }));
  const [checkpointIdx, setCheckpointIdx] = useState(1);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [trail, setTrail] = useState<Vec[]>([{ x: WORLD / 2, y: WORLD / 2 }]);
  const [hitFlash, setHitFlash] = useState(false);
  const [hint, setHint] = useState<string>('Алдымен бағытты тура салыңыз');
  const [startedAt] = useState(Date.now());

  // Decorative landscape (yurts, mountains) — fixed per session
  const decorations = useMemo(() => {
    const items: { x: number; y: number; emoji: string }[] = [];
    const palette = ['🏔', '🏔', '🌲', '🌲', '🌲', '⛺', '🪨', '🌾'];
    for (let i = 0; i < 14; i++) {
      items.push({
        x: 30 + Math.random() * (WORLD - 60),
        y: 30 + Math.random() * (WORLD - 60),
        emoji: palette[Math.floor(Math.random() * palette.length)],
      });
    }
    return items;
  }, []);

  const bearing = useMemo(() => angleBetween(player, target), [player, target]);
  const delta = useMemo(() => angleDiff(heading, bearing), [heading, bearing]);
  const aligned = Math.abs(delta) <= ALIGN_TOL;

  const rotate = useCallback((dir: -1 | 1) => {
    if (finished) return;
    setMoves((m) => m + 1);
    setHeading((h) => (h + dir * ROTATE_STEP + 360) % 360);
    setHint('');
  }, [finished]);

  const walk = useCallback(() => {
    if (finished || !aligned) return;
    setMoves((m) => m + 1);
    const rad = (heading * Math.PI) / 180;
    setPlayer((p) => {
      const nx = Math.max(20, Math.min(WORLD - 20, p.x + Math.sin(rad) * STEP_LEN));
      const ny = Math.max(20, Math.min(WORLD - 20, p.y - Math.cos(rad) * STEP_LEN));
      const next = { x: nx, y: ny };
      setTrail((tr) => tr.length > 30 ? [...tr.slice(-30), next] : [...tr, next]);
      // Reached?
      const dist = Math.hypot(nx - target.x, ny - target.y);
      if (dist <= HIT_RADIUS) {
        setHitFlash(true);
        setTimeout(() => setHitFlash(false), 600);
        setScore((s) => s + 100);
        if (checkpointIdx >= CHECKPOINTS) {
          const elapsedSec = (Date.now() - startedAt) / 1000;
          const efficiency = Math.max(0, MAX_MOVES_PAR * CHECKPOINTS - moves) * 5;
          const speedBonus = Math.max(0, 600 - Math.round(elapsedSec));
          const final = score + 100 + efficiency + speedBonus;
          setFinished(true);
          setHint('🏆 ӨТТІҢ! Барлық бекет алынды.');
          setTimeout(() => onEnd(final, Math.round(final / 10)), 1500);
        } else {
          setCheckpointIdx((c) => c + 1);
          const newT = newCheckpoint(next);
          setTarget(newT);
          setHint(`✨ Бекет алынды! Келесі бекет — ${bearingLabel(angleBetween(next, newT))}`);
        }
      }
      return next;
    });
  }, [finished, aligned, heading, target, checkpointIdx, moves, score, startedAt, onEnd]);

  // Helpful hint when starting a round
  useEffect(() => {
    if (moves === 0) {
      setHint(`🧭 Бағытыңызды компаспен реттеңіз — мақсат: ${bearingLabel(bearing)} (${Math.round(bearing)}°)`);
    }
  }, [bearing, moves]);

  // Map scale: convert world units to CSS percent
  const px = (v: number) => `${(v / WORLD) * 100}%`;

  return (
    <div className="flex flex-col items-center px-3 pb-4 max-w-md mx-auto">
      {/* Header */}
      <div className="w-full mb-3 flex items-center justify-between text-xs">
        <span className="text-stone-400">Бекет <span className="text-white font-bold">{checkpointIdx}/{CHECKPOINTS}</span></span>
        <span className="text-stone-400">Жүріс: <span className="text-white font-bold">{moves}</span></span>
        <span className="text-emerald-300 font-bold">🏆 {score}</span>
      </div>

      {/* Top-down map */}
      <div
        className={clsx(
          'relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-amber-700/30 shadow-2xl mb-3 transition-shadow',
          hitFlash ? 'shadow-[0_0_30px_rgba(52,211,153,0.6)] border-emerald-400' : '',
        )}
        style={{
          background:
            'radial-gradient(ellipse at 30% 30%, #2d3a2f 0%, #1a2820 40%, #0e1815 100%)',
        }}
      >
        {/* Cardinal labels on map edge */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-black text-rose-300/80">С</div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-black text-stone-400/60">О</div>
        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-black text-stone-400/60">Б</div>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-black text-stone-400/60">Ш</div>

        {/* Decorations */}
        {decorations.map((d, i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-base opacity-50 select-none pointer-events-none"
            style={{ left: px(d.x), top: px(d.y) }}
          >{d.emoji}</span>
        ))}

        {/* Trail */}
        {trail.length > 1 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${WORLD} ${WORLD}`} preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#fde68a"
              strokeWidth="2"
              strokeDasharray="4 6"
              opacity="0.45"
              points={trail.map((p) => `${p.x},${p.y}`).join(' ')}
            />
          </svg>
        )}

        {/* Bearing line — preview from player to target */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${WORLD} ${WORLD}`} preserveAspectRatio="none">
          <line
            x1={player.x}
            y1={player.y}
            x2={target.x}
            y2={target.y}
            stroke={aligned ? '#34d399' : '#fb923c'}
            strokeWidth="1.5"
            strokeDasharray="3 4"
            opacity="0.4"
          />
        </svg>

        {/* Target */}
        <motion.div
          key={`${target.x}-${target.y}`}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: px(target.x), top: px(target.y) }}
        >
          <div className="relative">
            <div
              className="rounded-full border-4 border-amber-400/60 bg-amber-500/20"
              style={{ width: TARGET_RADIUS * 2, height: TARGET_RADIUS * 2 }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">⛳</div>
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-amber-300"
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Player triangle, rotated by heading */}
        <motion.div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          animate={{ left: px(player.x), top: px(player.y) }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        >
          <motion.div
            animate={{ rotate: heading }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            style={{ width: PLAYER_RADIUS * 2, height: PLAYER_RADIUS * 2 }}
            className="flex items-center justify-center"
          >
            <div
              className="border-l-[10px] border-r-[10px] border-b-[18px] border-l-transparent border-r-transparent border-b-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]"
              style={{ filter: 'drop-shadow(0 0 6px rgba(244,63,94,0.6))' }}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Bearing & heading panel */}
      <div className="w-full mb-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2">
          <div className="text-[9px] text-amber-300/70 uppercase">Мақсат бағыт</div>
          <div className="text-base font-black text-amber-200 leading-tight">
            {bearingLabel(bearing)} <span className="text-[10px] font-normal opacity-70">{Math.round(bearing)}°</span>
          </div>
        </div>
        <div className={clsx(
          'rounded-lg p-2 border',
          aligned ? 'bg-emerald-500/15 border-emerald-400/50' : 'bg-rose-500/10 border-rose-500/30'
        )}>
          <div className="text-[9px] uppercase opacity-70">
            {aligned ? '✓ Тура' : (delta > 0 ? '→ Оңға' : '← Солға')}
          </div>
          <div className={clsx('text-base font-black leading-tight', aligned ? 'text-emerald-200' : 'text-rose-200')}>
            {aligned ? 'жүруге дайын' : `${Math.abs(Math.round(delta))}° бұр`}
          </div>
        </div>
        <div className="rounded-lg bg-sky-500/10 border border-sky-500/30 p-2">
          <div className="text-[9px] text-sky-300/70 uppercase">Сіздің бағыт</div>
          <div className="text-base font-black text-sky-200 leading-tight">
            {bearingLabel(heading)} <span className="text-[10px] font-normal opacity-70">{Math.round(heading)}°</span>
          </div>
        </div>
      </div>

      {/* Compass face widget */}
      <div className="relative mx-auto mb-3" style={{ width: 110, height: 110 }}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-900/40 to-stone-900 border-2 border-amber-600/40 shadow-inner" />
        {/* North marker */}
        <div className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[10px] font-black text-rose-400">С</div>
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] text-amber-300/60">О</div>
        <div className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[9px] text-amber-300/60">Б</div>
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[9px] text-amber-300/60">Ш</div>
        {/* Heading needle */}
        <motion.div
          className="absolute top-1/2 left-1/2 origin-bottom"
          style={{ width: 4, height: '42%', transform: 'translate(-50%, -100%)' }}
          animate={{ rotate: heading }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        >
          <div className="w-full h-2/3 bg-rose-400 rounded-t-full shadow-[0_0_10px_rgba(244,63,94,0.7)]" />
          <div className="w-full h-1/3 bg-stone-600 rounded-b-full" />
        </motion.div>
        {/* Target bearing dotted indicator */}
        <motion.div
          className="absolute top-1/2 left-1/2 origin-bottom"
          style={{ width: 2, height: '40%', transform: 'translate(-50%, -100%)' }}
          animate={{ rotate: bearing }}
        >
          <div className="w-full h-full bg-amber-300/50" style={{ background: 'repeating-linear-gradient(180deg, #fde68a 0 4px, transparent 4px 8px)' }} />
        </motion.div>
        {/* Center pin */}
        <div className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 border-2 border-stone-900" />
      </div>

      {/* Hint */}
      {hint && (
        <AnimatePresence mode="wait">
          <motion.div
            key={hint}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-amber-200 text-center mb-3 px-3 leading-relaxed"
          >
            {hint}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Controls */}
      <div className="w-full grid grid-cols-3 gap-2">
        <motion.button
          whileTap={{ scale: 0.92 }}
          disabled={finished}
          onClick={() => rotate(-1)}
          className="py-4 rounded-xl bg-gradient-to-br from-sky-500/40 to-sky-700/30 border-2 border-sky-400 text-white font-bold flex flex-col items-center gap-0.5 disabled:opacity-40"
        >
          <span className="text-2xl">◀</span>
          <span className="text-[10px] opacity-80">Солға -{ROTATE_STEP}°</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.92 }}
          disabled={finished || !aligned}
          onClick={walk}
          className={clsx(
            'py-4 rounded-xl border-2 font-bold flex flex-col items-center gap-0.5 transition-all',
            aligned && !finished
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-300 text-white shadow-lg shadow-emerald-500/40 animate-pulse'
              : 'bg-stone-800/40 border-stone-700 text-stone-500 opacity-60',
          )}
        >
          <span className="text-2xl">⬆</span>
          <span className="text-[10px] opacity-90">ЖҮРУ</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.92 }}
          disabled={finished}
          onClick={() => rotate(1)}
          className="py-4 rounded-xl bg-gradient-to-br from-sky-500/40 to-sky-700/30 border-2 border-sky-400 text-white font-bold flex flex-col items-center gap-0.5 disabled:opacity-40"
        >
          <span className="text-2xl">▶</span>
          <span className="text-[10px] opacity-80">Оңға +{ROTATE_STEP}°</span>
        </motion.button>
      </div>

      {/* Legend */}
      <div className="mt-3 text-[10px] text-stone-500 text-center leading-relaxed px-2">
        🧭 <b>С</b>=Солтүстік · <b>Ш</b>=Шығыс · <b>О</b>=Оңтүстік · <b>Б</b>=Батыс<br/>
        Сары компас иесі — сіздің бағытыңыз · сары үзік сызық — мақсат бағыты
      </div>
    </div>
  );
};

export default function BagdarGame() {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  return (
    <GameWrapper
      title={t('game_bagdar', 'Бағдар · Сапар')}
      instructions={t(
        'bagdar_desc',
        '🎯 МАҚСАТ: Компасты пайдаланып 5 бекетке жету.\n\n' +
        '📋 ҚАЛАЙ ОЙНАУ:\n' +
        '1. Картадан өзіңіз (қызыл үшбұрыш) мен мақсат (⛳) арасын көресіз.\n' +
        '2. Жоғарыдағы панель сізге МАҚСАТ БАҒЫТЫН көрсетеді (мысалы: «НШ 60°»).\n' +
        '3. ◀ немесе ▶ батырмаларымен өз бағытыңызды БҰРАСЫЗ.\n' +
        '4. Бағыт «✓ тура жүруге дайын» болғанда — ⬆ ЖҮРУ батырмасы жанады.\n' +
        '5. ⬆ түрту → 36 қадам алға жүресіз. Қажет болса, қайта бұрылу.\n' +
        '6. Мақсатқа жеткенде — келесі бекет шығады.\n\n' +
        '🧭 БАҒЫТ КОДЫ:\n' +
        '   С — Солтүстік (0°) · Ш — Шығыс (90°) · О — Оңтүстік (180°) · Б — Батыс (270°)\n' +
        '   СШ = Солтүстік-Шығыс (45°), ОШ = Оңтүстік-Шығыс (135°), т.б.\n\n' +
        '💡 КЕҢЕС: Аз жүріспен бекетті алыңыз — әр артық жүріс ұпайды азайтады.',
      )}
    >
      {({ onEnd }) => (
        <SaparBoard
          onEnd={(score, coins) => {
            setTimeout(() => addGameResult({ gameId: 'bagdar', score, coinsEarned: coins }), 0);
            onEnd(score, coins);
          }}
        />
      )}
    </GameWrapper>
  );
}
