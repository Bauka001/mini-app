import { useState, useEffect, useCallback, useRef } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Бағдар — compass direction memory game.
 *
 * Concept: a compass face shows a sequence of cardinal directions one by one
 *          (the needle swings to each in turn). User must tap them back in
 *          the same order using the 4-button directional pad.
 *
 * Why this fits the lineup:
 *   - Casual: tap-only, no typing, no complex rules.
 *   - Cognitive: short-term spatial memory + sequence recall.
 *   - Compass training: subtly teaches N/E/S/W positions and rotation.
 *   - Visual hook: a real-looking compass face animates beautifully.
 *
 * Difficulty curve: round 1 = 3 directions, +1 each round, max 10 rounds.
 * One mistake ends the game — score = (rounds * 50) + speed bonus.
 */

type Dir = 'N' | 'E' | 'S' | 'W';
const DIRS: Dir[] = ['N', 'E', 'S', 'W'];
const DIR_ANGLE: Record<Dir, number> = { N: 0, E: 90, S: 180, W: 270 };
const DIR_LABEL: Record<Dir, string> = { N: 'С', E: 'Ш', S: 'О', W: 'Б' }; // Solt-Шығыс-Оңтүстік-Батыс
const DIR_LABEL_FULL: Record<Dir, string> = {
  N: 'Солтүстік', E: 'Шығыс', S: 'Оңтүстік', W: 'Батыс',
};

const MAX_ROUNDS = 10;
const START_LEN = 3;
const PLAYBACK_MS = 700;       // time between needle steps in playback
const NEEDLE_PAUSE_MS = 300;   // visual pause at each direction

const rng = () => DIRS[Math.floor(Math.random() * DIRS.length)];

const BagdarBoard = ({ onEnd }: { onEnd: (score: number, coins: number) => void }) => {
  const [round, setRound] = useState(1);
  const [sequence, setSequence] = useState<Dir[]>([]);
  const [phase, setPhase] = useState<'show' | 'input' | 'success' | 'fail'>('show');
  const [needleDir, setNeedleDir] = useState<Dir | null>(null);
  const [userIdx, setUserIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [startedAt] = useState(Date.now());
  const [highlightedBtn, setHighlightedBtn] = useState<Dir | null>(null);
  const cancelRef = useRef(false);

  // Build a new sequence whenever the round changes (length = START_LEN + round - 1)
  useEffect(() => {
    const len = START_LEN + (round - 1);
    const seq: Dir[] = [];
    for (let i = 0; i < len; i++) seq.push(rng());
    setSequence(seq);
    setUserIdx(0);
    setPhase('show');
  }, [round]);

  // Playback of the sequence (needle swings to each direction)
  useEffect(() => {
    if (phase !== 'show' || sequence.length === 0) return;
    cancelRef.current = false;
    let cancelled = false;
    (async () => {
      // brief 'get ready' pause
      await new Promise((r) => setTimeout(r, 600));
      for (let i = 0; i < sequence.length; i++) {
        if (cancelled || cancelRef.current) return;
        setNeedleDir(sequence[i]);
        await new Promise((r) => setTimeout(r, NEEDLE_PAUSE_MS));
        if (cancelled || cancelRef.current) return;
        setNeedleDir(null);
        await new Promise((r) => setTimeout(r, PLAYBACK_MS - NEEDLE_PAUSE_MS));
      }
      if (!cancelled && !cancelRef.current) {
        setPhase('input');
      }
    })();
    return () => { cancelled = true; cancelRef.current = true; };
  }, [phase, sequence]);

  const pressDir = useCallback((d: Dir) => {
    if (phase !== 'input') return;
    setHighlightedBtn(d);
    setTimeout(() => setHighlightedBtn(null), 200);
    setNeedleDir(d);
    setTimeout(() => setNeedleDir(null), 350);

    const expected = sequence[userIdx];
    if (d !== expected) {
      // Wrong
      setPhase('fail');
      const elapsedSec = (Date.now() - startedAt) / 1000;
      const speedBonus = Math.max(0, 300 - Math.round(elapsedSec));
      const finalScore = score + speedBonus;
      setTimeout(() => onEnd(finalScore, Math.round(finalScore / 10)), 1500);
      return;
    }

    // Correct
    const nextIdx = userIdx + 1;
    if (nextIdx >= sequence.length) {
      // round cleared
      const roundScore = sequence.length * 50;
      setScore((s) => s + roundScore);
      setPhase('success');
      setTimeout(() => {
        if (round >= MAX_ROUNDS) {
          const elapsedSec = (Date.now() - startedAt) / 1000;
          const speedBonus = Math.max(0, 600 - Math.round(elapsedSec));
          const finalScore = score + roundScore + speedBonus + 500;
          onEnd(finalScore, Math.round(finalScore / 10));
        } else {
          setRound((r) => r + 1);
        }
      }, 900);
    } else {
      setUserIdx(nextIdx);
    }
  }, [phase, sequence, userIdx, score, round, startedAt, onEnd]);

  return (
    <div className="flex flex-col items-center px-4 pb-4 max-w-md mx-auto">
      {/* Header */}
      <div className="w-full mb-3 flex items-center justify-between text-xs">
        <span className="text-stone-400">Раунд <span className="text-white font-bold">{round}/{MAX_ROUNDS}</span></span>
        <span className="text-stone-400">Ұзындық <span className="text-white font-bold">{sequence.length}</span></span>
        <span className="text-emerald-300 font-bold">🏆 {score}</span>
      </div>

      {/* Big phase banner — large, unmissable indicator of WHAT the user should do */}
      <motion.div
        key={phase}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={clsx(
          'w-full mb-3 px-4 py-2.5 rounded-2xl border-2 text-center font-bold transition-all',
          phase === 'show' && 'bg-amber-500/20 border-amber-400 text-amber-100',
          phase === 'input' && 'bg-emerald-500/20 border-emerald-400 text-emerald-100 animate-pulse',
          phase === 'success' && 'bg-emerald-500/30 border-emerald-300 text-white',
          phase === 'fail' && 'bg-rose-500/20 border-rose-400 text-rose-100',
        )}
      >
        {phase === 'show' && <>👀 Компасты қараңыз — инені бағытпен есте сақтаңыз</>}
        {phase === 'input' && <>👆 ЕНДІ СІЗДІҢ КЕЗЕК · {userIdx + 1}/{sequence.length} бағыт енгізіңіз</>}
        {phase === 'success' && <>✨ Тамаша! Келесі раунд...</>}
        {phase === 'fail' && <>😔 Қате! Дұрыс: {DIR_LABEL[sequence[userIdx]]} ({DIR_LABEL_FULL[sequence[userIdx]]})</>}
      </motion.div>

      {/* Compass face */}
      <div className="relative mb-6 select-none" style={{ width: 'min(80vw, 280px)', height: 'min(80vw, 280px)' }}>
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-900/60 to-stone-950 border-4 border-amber-600/40 shadow-2xl" />
        {/* Inner face */}
        <div className="absolute inset-3 rounded-full bg-gradient-radial from-stone-900 to-stone-950 border border-amber-700/30" />
        {/* Cardinal markings */}
        {DIRS.map((d) => {
          const angle = DIR_ANGLE[d];
          const top = 50 - 42 * Math.cos((angle * Math.PI) / 180);
          const left = 50 + 42 * Math.sin((angle * Math.PI) / 180);
          return (
            <div
              key={d}
              className={clsx(
                'absolute transform -translate-x-1/2 -translate-y-1/2 font-black text-lg',
                d === 'N' ? 'text-rose-400' : 'text-amber-200/70',
              )}
              style={{ top: `${top}%`, left: `${left}%` }}
            >
              {DIR_LABEL[d]}
            </div>
          );
        })}
        {/* Tick marks every 30° */}
        {Array(12).fill(0).map((_, i) => {
          const angle = i * 30;
          const isCardinal = i % 3 === 0;
          return (
            <div
              key={i}
              className={clsx(
                'absolute top-1/2 left-1/2 origin-bottom',
                isCardinal ? 'w-1 h-3 bg-amber-300/80' : 'w-0.5 h-2 bg-amber-700/50',
              )}
              style={{
                transform: `translate(-50%, -100%) rotate(${angle}deg) translateY(-46%)`,
              }}
            />
          );
        })}
        {/* Needle */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-1.5 h-[42%] origin-bottom pointer-events-none"
          style={{ transform: 'translate(-50%, -100%)' }}
          animate={{
            rotate: needleDir ? DIR_ANGLE[needleDir] : 0,
            scaleY: needleDir ? 1 : 0.85,
            opacity: needleDir ? 1 : 0.35,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        >
          <div className="w-full h-2/3 bg-gradient-to-t from-rose-700 to-rose-400 rounded-t-full shadow-[0_0_20px_rgba(244,63,94,0.6)]" />
          <div className="w-full h-1/3 bg-stone-700 rounded-b-full" />
        </motion.div>
        {/* Center pin */}
        <div className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 border-2 border-stone-900 shadow-md z-10" />

        {/* Phase indicator overlay */}
        <AnimatePresence>
          {phase === 'show' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500/90 text-stone-950 text-[10px] font-black uppercase tracking-wider z-20"
            >👀 қараңыз</motion.div>
          )}
          {phase === 'input' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500/90 text-stone-950 text-[10px] font-black uppercase tracking-wider z-20"
            >👆 қайталаңыз ({userIdx + 1}/{sequence.length})</motion.div>
          )}
          {phase === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center text-5xl"
            >✨</motion.div>
          )}
          {phase === 'fail' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center text-5xl"
            >😔</motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Direction pad - larger, clearer, full names */}
      <div className="relative" style={{ width: '220px', height: '220px' }}>
        {DIRS.map((d) => {
          const angle = DIR_ANGLE[d];
          const isHL = highlightedBtn === d;
          const top = 50 - 36 * Math.cos((angle * Math.PI) / 180);
          const left = 50 + 36 * Math.sin((angle * Math.PI) / 180);
          return (
            <motion.button
              key={d}
              disabled={phase !== 'input'}
              onClick={() => pressDir(d)}
              whileTap={{ scale: 0.92 }}
              animate={isHL ? { scale: 1.15 } : { scale: 1 }}
              className={clsx(
                'absolute w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center font-black transition-all -translate-x-1/2 -translate-y-1/2 shadow-lg',
                phase === 'input'
                  ? 'bg-gradient-to-br from-amber-500/50 to-rose-500/40 border-amber-300 text-white active:bg-amber-400/70 hover:scale-110'
                  : 'bg-stone-800/40 border-stone-700 text-stone-600',
                isHL && 'ring-4 ring-emerald-400',
              )}
              style={{ top: `${top}%`, left: `${left}%` }}
            >
              <div className="text-3xl leading-none">{DIR_LABEL[d]}</div>
              <div className="text-[10px] opacity-90 leading-none mt-1 font-bold">{DIR_LABEL_FULL[d]}</div>
            </motion.button>
          );
        })}
        {/* Center label */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-stone-500 uppercase tracking-wider text-center pointer-events-none">
          {phase === 'input' ? '👆 түрт' : '⏳ күт'}
        </div>
      </div>

      <div className="text-[11px] text-stone-400 text-center mt-4 leading-relaxed px-2">
        🧭 <b>С</b> — Солтүстік (жоғары) · <b>Ш</b> — Шығыс (оң) · <b>О</b> — Оңтүстік (төмен) · <b>Б</b> — Батыс (сол)
      </div>
    </div>
  );
};

export default function BagdarGame() {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  return (
    <GameWrapper
      title={t('game_bagdar', 'Бағдар')}
      instructions={t('bagdar_desc',
        '🎯 МАҚСАТ: Компас инесі көрсеткен бағытты есте сақтап қайталау.\n\n' +
        '📋 ЕРЕЖЕЛЕР:\n' +
        '1. Компас инесі бірнеше бағытқа кезек-кезек бұрылады.\n' +
        '2. Сіз ретін есте сақтайсыз.\n' +
        '3. Содан кейін астыңғы бағыт батырмаларын сол ретте түртіңіз.\n' +
        '4. Дұрыс → келесі раунд (бағыт көбейеді).\n' +
        '5. Бір қате = ойын аяқталды. 10 раунд жеңіс.\n\n' +
        '🧭 С — Солтүстік, Ш — Шығыс, О — Оңтүстік, Б — Батыс.\n\n' +
        '💡 КЕҢЕС: Бағыттарды дауыстап ішінен айтыңыз ("С-Ш-С-О"). Ритм есте сақтауды жеңілдетеді.',
      )}
    >
      {({ onEnd }) => (
        <BagdarBoard
          onEnd={(score, coins) => {
            setTimeout(() => addGameResult({ gameId: 'bagdar', score, coinsEarned: coins }), 0);
            onEnd(score, coins);
          }}
        />
      )}
    </GameWrapper>
  );
}
