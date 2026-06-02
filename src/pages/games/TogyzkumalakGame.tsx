import { useState, useMemo, useCallback } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Тоғызқұмалақ — abridged mental-math puzzle inspired by the classic Kazakh
 * board game.
 *
 * Setup: 9 holes (kazandar) on user's side, each with 1-7 kumalaks (stones).
 *        Goal: empty enough holes to win the round.
 *
 * Mechanic: Pick a hole. Its kumalaks are distributed left-to-right one per
 *           adjacent hole, wrapping around. If the LAST kumalak lands in a
 *           hole that now has an EVEN count, you capture all kumalaks in that
 *           hole into your goal (қазан). Aim: 30+ kumalaks captured in 7 moves.
 *
 * Trains: planning, addition/subtraction prediction, working memory.
 */

const HOLE_COUNT = 9;
const MAX_MOVES = 7;
const TARGET_CAPTURED = 30;

const initialBoard = (): number[] => Array.from({ length: HOLE_COUNT }, () => 1 + Math.floor(Math.random() * 7));

const TogyzBoard = ({ onEnd }: { onEnd: (score: number, coins: number) => void }) => {
  const [board, setBoard] = useState<number[]>(() => initialBoard());
  const [captured, setCaptured] = useState(0);
  const [movesLeft, setMovesLeft] = useState(MAX_MOVES);
  const [animating, setAnimating] = useState<number | null>(null);
  const [finished, setFinished] = useState<'won' | 'lost' | null>(null);
  const [lastMove, setLastMove] = useState<{ from: number; landed: number; captured: number } | null>(null);
  const [startedAt] = useState(Date.now());

  const sum = useMemo(() => board.reduce((a, b) => a + b, 0), [board]);

  const playHole = useCallback((idx: number) => {
    if (finished || animating !== null) return;
    if (board[idx] <= 0) return;
    setAnimating(idx);

    // Distribute stones
    const next = [...board];
    const stones = next[idx];
    next[idx] = 0;
    let pos = idx;
    for (let i = 0; i < stones; i++) {
      pos = (pos + 1) % HOLE_COUNT;
      next[pos] += 1;
    }
    const landed = pos;
    const landedCount = next[landed];

    // Capture rule: last hole now has even count AND ≥2
    let gained = 0;
    if (landedCount % 2 === 0 && landedCount >= 2) {
      gained = landedCount;
      next[landed] = 0;
    }

    const nextCaptured = captured + gained;
    const nextMoves = movesLeft - 1;

    setTimeout(() => {
      setBoard(next);
      setCaptured(nextCaptured);
      setMovesLeft(nextMoves);
      setLastMove({ from: idx, landed, captured: gained });
      setAnimating(null);

      // End conditions
      const noStonesOnBoard = next.every((v) => v === 0);
      if (nextCaptured >= TARGET_CAPTURED || noStonesOnBoard) {
        endRound(nextCaptured, true);
      } else if (nextMoves <= 0) {
        endRound(nextCaptured, false);
      }
    }, 400);
  }, [board, captured, movesLeft, finished, animating]);

  const endRound = (finalCaptured: number, won: boolean) => {
    setFinished(won ? 'won' : 'lost');
    const elapsedSec = (Date.now() - startedAt) / 1000;
    const baseScore = finalCaptured * 20;
    const speedBonus = won ? Math.max(0, 120 - Math.round(elapsedSec)) * 5 : 0;
    const winBonus = won ? 200 : 0;
    const total = baseScore + speedBonus + winBonus;
    setTimeout(() => onEnd(total, Math.round(total / 10)), 1500);
  };

  const renderHole = (count: number, idx: number) => {
    const isAnimating = animating === idx;
    const isLastFrom = lastMove?.from === idx;
    const isLastLanded = lastMove?.landed === idx && (lastMove?.captured || 0) > 0;
    return (
      <motion.button
        key={idx}
        disabled={finished !== null || animating !== null || count === 0}
        onClick={() => playHole(idx)}
        whileTap={{ scale: 0.92 }}
        animate={isAnimating ? { rotate: [0, -8, 8, -4, 0] } : isLastLanded ? { scale: [1, 1.18, 1] } : {}}
        transition={{ duration: 0.4 }}
        className={clsx(
          'aspect-square rounded-full border-2 flex flex-col items-center justify-center transition-all',
          'shadow-inner',
          count === 0 && 'bg-stone-900/60 border-stone-700 opacity-60',
          count > 0 && !finished && 'bg-gradient-to-br from-amber-900/80 to-amber-950 border-amber-600/50 hover:border-amber-400 hover:scale-105 cursor-pointer',
          finished && count > 0 && 'bg-stone-800/60 border-stone-700',
          isLastFrom && 'ring-2 ring-rose-400',
          isLastLanded && 'ring-2 ring-emerald-400',
        )}
      >
        <div className="text-2xl font-black text-amber-100">{count}</div>
        <div className="text-[9px] uppercase text-amber-400/60 tracking-wider">{idx + 1}</div>
      </motion.button>
    );
  };

  return (
    <div className="flex flex-col items-center px-4 pb-4 max-w-md mx-auto">
      {/* Stats bar */}
      <div className="w-full grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2 text-center">
          <div className="text-[10px] text-emerald-300/70 uppercase">Қазан</div>
          <div className="text-xl font-black text-emerald-300">{captured}<span className="text-xs text-emerald-400/60">/{TARGET_CAPTURED}</span></div>
        </div>
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2 text-center">
          <div className="text-[10px] text-amber-300/70 uppercase">Қалған жүріс</div>
          <div className="text-xl font-black text-amber-300">{movesLeft}</div>
        </div>
        <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 p-2 text-center">
          <div className="text-[10px] text-sky-300/70 uppercase">Тақтада</div>
          <div className="text-xl font-black text-sky-300">{sum}</div>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-3 w-full mb-4">
        {board.map((count, idx) => renderHole(count, idx))}
      </div>

      {/* Last move info */}
      {lastMove && !finished && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-stone-400 mb-3 text-center"
        >
          {lastMove.captured > 0
            ? <>🎉 Қазанға <span className="text-emerald-300 font-bold">+{lastMove.captured}</span> құмалақ! ({lastMove.from + 1} → {lastMove.landed + 1})</>
            : <>{lastMove.from + 1} → {lastMove.landed + 1} · ұстатыс жоқ</>}
        </motion.div>
      )}

      <AnimatePresence>
        {finished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={clsx(
              'mt-2 px-5 py-3 rounded-xl border-2 font-bold text-center',
              finished === 'won' ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200' : 'bg-rose-500/15 border-rose-400 text-rose-200',
            )}
          >
            {finished === 'won'
              ? <>🏆 Жеңіс! Қазанға {captured} құмалақ</>
              : <>😔 Жеңілдік. Қазанда {captured} құмалақ — мақсат {TARGET_CAPTURED}</>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions hint */}
      {!lastMove && !finished && (
        <div className="text-[11px] text-stone-500 text-center mt-2 leading-relaxed px-2">
          💡 Шұңқырды басыңыз — құмалақтар сағат тілімен таралады. Соңғы құмалақ <b>жұп</b> санда қалса — ҚАЗАНға өтеді.
        </div>
      )}
    </div>
  );
};

export default function TogyzkumalakGame() {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  return (
    <GameWrapper
      title={t('game_togyzkumalak', 'Тоғызқұмалақ')}
      instructions={t('togyzkumalak_desc', 'Қазақтың дәстүрлі ой ойыны. 9 шұңқырдан құмалақтарды қазанға жинаңыз. 30+ жеңіс.')}
    >
      {({ onEnd }) => (
        <TogyzBoard
          onEnd={(score, coins) => {
            setTimeout(() => addGameResult({ gameId: 'togyzkumalak', score, coinsEarned: coins }), 0);
            onEnd(score, coins);
          }}
        />
      )}
    </GameWrapper>
  );
}
