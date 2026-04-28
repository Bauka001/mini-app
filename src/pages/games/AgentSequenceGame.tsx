import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Compass,
  Flame,
  GitBranch,
  Hourglass,
  Layers3,
  Radar,
  Route,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { GameWrapper } from '../../components/GameWrapper';
import { useStore } from '../../store/useStoreImpl';
import type { Language } from '../../store/useStore';
import { soundManager } from '../../utils/soundManager';
import { Difficulty, DIFFICULTY_COIN_MULT } from '../../types/games';
import { useGameTimer } from '../../hooks/useGameTimer';
import { useLocalBest } from '../../hooks/useLocalBest';
import { useHaptic } from '../../hooks/useHaptic';
import { useGameSettings } from '../../store/gameSettings';

type MissionType = 'trace' | 'reverse' | 'mirror' | 'checkpoint' | 'turns';
type Tier = 'field' | 'stealth' | 'elite';

type Cell = {
  x: number;
  y: number;
};

type RoundData = {
  boardSize: 4 | 5;
  tier: Tier;
  missionType: MissionType;
  route: Cell[];
  expectedRoute: Cell[];
  previewMs: number;
  title: string;
  subtitle: string;
};

type CopySet = {
  title: string;
  instructions: string;
  mission: string;
  objective: string;
  score: string;
  streak: string;
  timer: string;
  strikes: string;
  routeLength: string;
  tier: string;
  round: string;
  ready: string;
  locked: string;
  breach: string;
  perfect: string;
  previewing: string;
  inputPrompt: string;
  recalibrating: string;
  resultsSuffix: string;
  tierLabels: Record<Tier, string>;
  missionLabels: Record<MissionType, { title: string; subtitle: string }>;
};

const GAME_ID = 'agent_sequence';
const MAX_STRIKES = 3;

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { timeMs: number; startLen: number; grid: number; previewMsFloor: number }
> = {
  easy:   { timeMs: 75_000, startLen: 3, grid: 3, previewMsFloor: 700 },
  medium: { timeMs: 60_000, startLen: 4, grid: 4, previewMsFloor: 550 },
  hard:   { timeMs: 45_000, startLen: 5, grid: 5, previewMsFloor: 400 },
};

const COPY: Record<Language, CopySet> = {
  en: {
    title: 'Agent Sequence',
    instructions:
      'Memorize secret route, then rebuild it with taps before the signal collapses.',
    mission: 'Mission',
    objective: 'Objective',
    score: 'Score',
    streak: 'Streak',
    timer: 'Timer',
    strikes: 'Strikes',
    routeLength: 'Route',
    tier: 'Tier',
    round: 'Round',
    ready: 'Signal aligned',
    locked: 'Route reconstructed',
    breach: 'Sequence breach',
    perfect: 'Clean extraction',
    previewing: 'Preview running...',
    inputPrompt: 'Tap the correct cells in sequence.',
    recalibrating: 'Mission control is recalibrating the board.',
    resultsSuffix: 'pts',
    tierLabels: {
      field: 'Field',
      stealth: 'Stealth',
      elite: 'Elite',
    },
    missionLabels: {
      trace: {
        title: 'Trace Route',
        subtitle: 'Tap the exact path in the same order.',
      },
      reverse: {
        title: 'Reverse Extraction',
        subtitle: 'Rebuild the route from the exit back to the origin.',
      },
      mirror: {
        title: 'Mirror Route',
        subtitle: 'Tap the horizontally mirrored version of the route.',
      },
      checkpoint: {
        title: 'Checkpoint Sweep',
        subtitle: 'Tap only checkpoint nodes: every second step plus the exit.',
      },
      turns: {
        title: 'Turn Prediction',
        subtitle: 'Tap only the route turns and the final extraction point.',
      },
    },
  },
  ru: {
    title: 'Agent Sequence',
    instructions:
      'Запомните секретный маршрут, затем восстановите его касаниями до распада сигнала.',
    mission: 'Миссия',
    objective: 'Задача',
    score: 'Очки',
    streak: 'Серия',
    timer: 'Таймер',
    strikes: 'Ошибки',
    routeLength: 'Маршрут',
    tier: 'Уровень',
    round: 'Раунд',
    ready: 'Сигнал выровнен',
    locked: 'Маршрут восстановлен',
    breach: 'Нарушение последовательности',
    perfect: 'Чистая эвакуация',
    previewing: 'Идет показ маршрута...',
    inputPrompt: 'Нажимайте правильные клетки по порядку.',
    recalibrating: 'Центр управления перенастраивает поле.',
    resultsSuffix: 'очк',
    tierLabels: {
      field: 'Field',
      stealth: 'Stealth',
      elite: 'Elite',
    },
    missionLabels: {
      trace: {
        title: 'Прямой маршрут',
        subtitle: 'Нажмите точный путь в том же порядке.',
      },
      reverse: {
        title: 'Обратная эвакуация',
        subtitle: 'Восстановите маршрут от выхода к старту.',
      },
      mirror: {
        title: 'Зеркальный маршрут',
        subtitle: 'Повторите маршрут в горизонтальном отражении.',
      },
      checkpoint: {
        title: 'Контрольные точки',
        subtitle: 'Нажимайте только контрольные узлы: каждый второй шаг и выход.',
      },
      turns: {
        title: 'Прогноз поворотов',
        subtitle: 'Нажимайте только повороты маршрута и финальную точку.',
      },
    },
  },
  kz: {
    title: 'Agent Sequence',
    instructions:
      'Құпия маршрутты жаттап алыңыз да, сигнал өшпей тұрғанда оны түрту арқылы қайта құрыңыз.',
    mission: 'Миссия',
    objective: 'Мақсат',
    score: 'Ұпай',
    streak: 'Серия',
    timer: 'Таймер',
    strikes: 'Қате',
    routeLength: 'Маршрут',
    tier: 'Деңгей',
    round: 'Раунд',
    ready: 'Сигнал тураланды',
    locked: 'Маршрут қалпына келді',
    breach: 'Тізбек бұзылды',
    perfect: 'Таза эвакуация',
    previewing: 'Маршрут көрсетіліп жатыр...',
    inputPrompt: 'Ұяшықтарды дұрыс ретпен түртіңіз.',
    recalibrating: 'Басқару орталығы алаңды қайта баптап жатыр.',
    resultsSuffix: 'ұп',
    tierLabels: {
      field: 'Field',
      stealth: 'Stealth',
      elite: 'Elite',
    },
    missionLabels: {
      trace: {
        title: 'Ізді қайталау',
        subtitle: 'Маршрутты дәл сол ретпен түртіңіз.',
      },
      reverse: {
        title: 'Кері эвакуация',
        subtitle: 'Маршрутты шығу нүктесінен бастап кері құрыңыз.',
      },
      mirror: {
        title: 'Айна маршруты',
        subtitle: 'Маршруттың көлденең айна нұсқасын түртіңіз.',
      },
      checkpoint: {
        title: 'Бақылау нүктелері',
        subtitle: 'Әр екінші қадамды және финал нүктесін ғана түртіңіз.',
      },
      turns: {
        title: 'Бұрылысты болжау',
        subtitle: 'Маршрут бұрылған жерлерді және соңғы шығу нүктесін ғана түртіңіз.',
      },
    },
  },
};

const keyOf = (cell: Cell) => `${cell.x}-${cell.y}`;
const sameCell = (left: Cell, right: Cell) => left.x === right.x && left.y === right.y;

const randomFrom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const shuffle = <T,>(items: T[]) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
};

const getNeighbors = (cell: Cell, boardSize: number) =>
  [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 },
  ].filter((candidate) => candidate.x >= 0 && candidate.y >= 0 && candidate.x < boardSize && candidate.y < boardSize);

const createRoute = (boardSize: 4 | 5, length: number): Cell[] => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const start = {
      x: Math.floor(Math.random() * boardSize),
      y: Math.floor(Math.random() * boardSize),
    };
    const route = [start];
    const visited = new Set([keyOf(start)]);

    while (route.length < length) {
      const current = route[route.length - 1];
      const candidates = shuffle(
        getNeighbors(current, boardSize).filter((neighbor) => !visited.has(keyOf(neighbor)))
      );

      if (candidates.length === 0) {
        break;
      }

      const next = candidates[0];
      route.push(next);
      visited.add(keyOf(next));
    }

    if (route.length === length) {
      return route;
    }
  }

  const fallback: Cell[] = [];
  for (let index = 0; index < length; index += 1) {
    fallback.push({ x: index % boardSize, y: Math.floor(index / boardSize) % boardSize });
  }
  return fallback;
};

const mirrorRoute = (route: Cell[], boardSize: number) =>
  route.map((cell) => ({ x: boardSize - 1 - cell.x, y: cell.y }));

const checkpointRoute = (route: Cell[]) =>
  route.filter((_, index) => index === 0 || index === route.length - 1 || index % 2 === 0);

const turnRoute = (route: Cell[]) => {
  if (route.length <= 2) return route;

  const selected = [route[0]];
  for (let index = 1; index < route.length - 1; index += 1) {
    const previous = route[index - 1];
    const current = route[index];
    const next = route[index + 1];
    const dxA = current.x - previous.x;
    const dyA = current.y - previous.y;
    const dxB = next.x - current.x;
    const dyB = next.y - current.y;

    if (dxA !== dxB || dyA !== dyB) {
      selected.push(current);
    }
  }

  selected.push(route[route.length - 1]);
  return selected;
};

const buildRound = (round: number, copy: CopySet): RoundData => {
  const tier: Tier = round <= 4 ? 'field' : round <= 8 ? 'stealth' : 'elite';
  const boardSize: 4 | 5 = round >= 7 ? 5 : 4;
  const routeLength =
    tier === 'field' ? randomFrom([4, 5, 6]) : tier === 'stealth' ? randomFrom([6, 7, 8]) : randomFrom([8, 9, 10]);
  const missionPool: MissionType[] =
    tier === 'field'
      ? ['trace', 'checkpoint']
      : tier === 'stealth'
        ? ['trace', 'reverse', 'mirror', 'checkpoint']
        : ['trace', 'reverse', 'mirror', 'checkpoint', 'turns'];

  const missionType = randomFrom(missionPool);
  const route = createRoute(boardSize, routeLength);
  let expectedRoute = route;

  if (missionType === 'reverse') {
    expectedRoute = [...route].reverse();
  }

  if (missionType === 'mirror') {
    expectedRoute = mirrorRoute(route, boardSize);
  }

  if (missionType === 'checkpoint') {
    expectedRoute = checkpointRoute(route);
  }

  if (missionType === 'turns') {
    expectedRoute = turnRoute(route);
  }

  return {
    boardSize,
    tier,
    missionType,
    route,
    expectedRoute,
    previewMs: tier === 'field' ? 420 : tier === 'stealth' ? 330 : 250,
    title: copy.missionLabels[missionType].title,
    subtitle: copy.missionLabels[missionType].subtitle,
  };
};

export const AgentSequenceGame = () => {
  const { t } = useTranslation();
  const { addGameResult, language } = useStore();

  return (
    <GameWrapper
      title={t('game_agent_sequence', 'Agent Sequence')}
      instructions={t('agent_sequence_desc', 'Memorize secret route, then rebuild it with taps before the signal collapses.')}
    >
      {({ onEnd, isPaused }) => (
        <AgentSequenceBoard
          language={language}
          isPaused={isPaused}
          onFinish={(score, coins) => {
            queueMicrotask(() => addGameResult({ gameId: GAME_ID, score, coinsEarned: coins }));
            onEnd(score, coins);
          }}
        />
      )}
    </GameWrapper>
  );
};

export default AgentSequenceGame;

function AgentSequenceBoard({
  onFinish,
  isPaused,
  language,
}: {
  onFinish: (score: number, coins: number) => void;
  isPaused: boolean;
  language: Language;
}) {
  const copy = useMemo(() => COPY[language] || COPY.en, [language]);
  const storedDifficulty = useGameSettings(s => s.difficultyPrefs[GAME_ID] ?? 'medium');
  const setStoredDifficulty = useGameSettings(s => s.setDifficulty);
  const [difficulty, setDifficulty] = useState<Difficulty>(storedDifficulty);
  const config = DIFFICULTY_CONFIG[difficulty];
  const { best, submit } = useLocalBest(GAME_ID, difficulty);
  const haptic = useHaptic();

  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [feedback, setFeedback] = useState(copy.ready);
  const [phase, setPhase] = useState<'briefing' | 'preview' | 'input' | 'resolve'>('briefing');
  const [previewIndex, setPreviewIndex] = useState(-1);
  const [currentRound, setCurrentRound] = useState<RoundData>(() => buildRound(1, copy));
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedKeysSet, setSelectedKeysSet] = useState<Set<string>>(new Set());
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [lastUndoTime, setLastUndoTime] = useState(0);

  const endRef = useRef(false);
  const previewTimerRef = useRef<number | null>(null);
  const roundStartedAtRef = useRef(Date.now());
  const processingRef = useRef(false);
  const isMountedRef = useRef(true);

  const clearPreviewTimer = () => {
    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  };

  const startRound = useCallback(
    (nextRound: number) => {
      if (processingRef.current || !isMountedRef.current) return;
      processingRef.current = true;

      clearPreviewTimer();

      const nextData = buildRound(nextRound, copy);
      const previewMs = Math.max(config.previewMsFloor, 850 - nextRound * 28);

      setCurrentRound(nextData);
      setRound(nextRound);
      setPhase('briefing');
      setPreviewIndex(-1);
      setSelectedKeys([]);
      setSelectedKeysSet(new Set());
      setWrongKey(null);
      setLastUndoTime(0);
      setFeedback(copy.ready);

      previewTimerRef.current = window.setTimeout(() => {
        if (!isMountedRef.current) return;
        setPhase('preview');
        let step = 0;

        const revealStep = () => {
          if (!isMountedRef.current) return;
          setPreviewIndex(step);
          if (step < nextData.route.length - 1) {
            step += 1;
            previewTimerRef.current = window.setTimeout(revealStep, previewMs);
            return;
          }

          previewTimerRef.current = window.setTimeout(() => {
            if (isMountedRef.current) {
              setPreviewIndex(-1);
              setPhase('input');
              roundStartedAtRef.current = Date.now();
              processingRef.current = false;
            }
          }, Math.max(260, previewMs));
        };

        revealStep();
      }, 720);
    },
    [copy, config.previewMsFloor]
  );

  useEffect(() => {
    isMountedRef.current = true;
    startRound(1);
    return () => {
      isMountedRef.current = false;
      clearPreviewTimer();
    };
  }, []);

  const { timeLeftMs } = useGameTimer({
    durationMs: config.timeMs,
    tickMs: 100,
    isActive: phase === 'input' && !isPaused,
    isPaused: isPaused,
    onExpire: () => {
      if (endRef.current) return;
      endRef.current = true;
      clearPreviewTimer();
      const coins = Math.max(14, Math.round(score / 240) + completedRounds + bestStreak * 2);
      onFinish(score, coins);
    },
  });

  useEffect(() => {
    if (endRef.current) return;
    if (timeLeftMs > 0 && strikes < MAX_STRIKES) return;

    endRef.current = true;
    clearPreviewTimer();
    const coins = Math.max(14, Math.round(score / 240) + completedRounds + bestStreak * 2);
    onFinish(score, coins);
  }, [bestStreak, completedRounds, onFinish, score, strikes, timeLeftMs]);

  const handleSuccess = useCallback(() => {
    haptic.notification('success');
    void soundManager.playSuccess();

    const reactionMs = Date.now() - roundStartedAtRef.current;
    const fastBonus = Math.max(0, 220 - Math.floor(reactionMs / 10));
    const nextStreak = streak + 1;
    const multiplier = 1 + Math.min(1.2, Math.floor(nextStreak / 3) * 0.15);
    const gainedScore = Math.round((130 + currentRound.expectedRoute.length * 26 + fastBonus) * multiplier);

    setPhase('resolve');
    setFeedback(nextStreak >= 3 ? copy.perfect : copy.locked);
    setStreak(nextStreak);
    setBestStreak((previous) => Math.max(previous, nextStreak));
    setCompletedRounds((previous) => previous + 1);
    setScore((previous) => previous + gainedScore);

    window.setTimeout(() => {
      if (!endRef.current) {
        processingRef.current = false;
        startRound(round + 1);
      }
    }, 520);
  }, [streak, currentRound.expectedRoute.length, haptic, copy.perfect, copy.locked, round, startRound]);

  const handleFailure = useCallback((cellKey: string) => {
    haptic.impact('heavy');
    void soundManager.playError();

    setPhase('resolve');
    setWrongKey(cellKey);
    setFeedback(copy.breach);
    setStreak(0);
    setStrikes((previous) => previous + 1);

    window.setTimeout(() => {
      if (endRef.current) return;
      setWrongKey(null);
      setSelectedKeys([]);
      setSelectedKeysSet(new Set());
      setLastUndoTime(0);
      setPhase('input');
      roundStartedAtRef.current = Date.now();
    }, 640);
  }, [haptic, copy.breach]);

  const handleCellTap = useCallback((cell: Cell) => {
    if (phase !== 'input' || endRef.current || processingRef.current) return;

    const nextExpected = currentRound.expectedRoute[selectedKeys.length];
    const cellKey = keyOf(cell);

    if (!nextExpected || selectedKeysSet.has(cellKey)) {
      return;
    }

    if (!sameCell(cell, nextExpected)) {
      handleFailure(cellKey);
      return;
    }

    const nextSelected = [...selectedKeys, cellKey];
    const nextSet = new Set([...selectedKeysSet, cellKey]);
    setSelectedKeys(nextSelected);
    setSelectedKeysSet(nextSet);
    setLastUndoTime(Date.now());
    haptic.impact('light');

    if (nextSelected.length >= currentRound.expectedRoute.length) {
      handleSuccess();
    }
  }, [phase, currentRound.expectedRoute, selectedKeys, selectedKeysSet, handleFailure, handleSuccess, haptic]);

  const handleUndo = useCallback(() => {
    if (selectedKeys.length === 0 || Date.now() - lastUndoTime > 2000) return;

    const nextSelected = selectedKeys.slice(0, -1);
    const nextSet = new Set(nextSelected);
    setSelectedKeys(nextSelected);
    setSelectedKeysSet(nextSet);
    haptic.impact('medium');
  }, [selectedKeys, lastUndoTime, haptic]);

  const previewVisibleKeys = useMemo(() => {
    if (phase !== 'preview' || previewIndex < 0) return new Set<string>();
    return new Set(currentRound.route.slice(0, previewIndex + 1).map(keyOf));
  }, [currentRound.route, phase, previewIndex]);

  const expectedKeys = useMemo(
    () => new Set(currentRound.expectedRoute.map(keyOf)),
    [currentRound.expectedRoute]
  );

  const boardCells = useMemo(() => {
    const cells: Cell[] = [];
    for (let y = 0; y < currentRound.boardSize; y += 1) {
      for (let x = 0; x < currentRound.boardSize; x += 1) {
        cells.push({ x, y });
      }
    }
    return cells;
  }, [currentRound.boardSize]);

  return (
    <div className="relative h-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),transparent_32%),radial-gradient(circle_at_bottom,_rgba(168,85,247,0.14),transparent_28%),linear-gradient(180deg,#020617_0%,#06111f_45%,#030712_100%)] px-4 pb-5 pt-4 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,0.08),transparent_34%)]" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col">
        <div className="rounded-[28px] border border-cyan-300/12 bg-black/24 p-4 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300/80">
                <Radar size={13} />
                {copy.mission}
              </div>
              <h2 className="mt-2 text-xl font-black text-white">{currentRound.title}</h2>
              <p className="mt-1 max-w-[240px] text-sm leading-relaxed text-white/65">
                {currentRound.subtitle}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 px-3 py-2 text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-200/75">
                {copy.round}
              </div>
              <div className="mt-1 text-lg font-black text-white">{round}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <StatCard label={copy.score} value={String(score)} icon={Sparkles} />
            <StatCard label={copy.streak} value={`x${streak}`} icon={Flame} />
            <StatCard label={copy.strikes} value={`${strikes}/${MAX_STRIKES}`} icon={ShieldAlert} danger={strikes >= 2} />
            <StatCard label={copy.timer} value={(timeLeftMs / 1000).toFixed(1)} icon={Hourglass} danger={timeLeftMs < 10_000} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/6 px-3 py-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                <Layers3 size={12} />
                {copy.routeLength}
              </div>
              <div className="mt-2 text-base font-black text-white">{currentRound.expectedRoute.length} taps</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/6 px-3 py-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                <Compass size={12} />
                {copy.tier}
              </div>
              <div className="mt-2 text-base font-black text-white">{copy.tierLabels[currentRound.tier]}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[24px] border border-white/8 bg-black/20 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Route size={16} className="text-cyan-300" />
            <span>{copy.objective}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            {currentRound.subtitle}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs font-semibold text-white/60">
            <span>{feedback}</span>
            <span>{copy.streak}: {bestStreak}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              animate={{ width: `${Math.min(100, (selectedKeys.length / currentRound.expectedRoute.length) * 100)}%` }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400"
            />
          </div>
        </div>

        <div
          role="grid"
          aria-label="Sequence grid"
          className="relative mt-4 grid flex-1 gap-3 rounded-[28px] border border-white/8 bg-black/16 p-3 backdrop-blur-xl"
          style={{ gridTemplateColumns: `repeat(${currentRound.boardSize}, minmax(0, 1fr))` }}
        >
          {boardCells.map((cell) => {
            const cellKey = keyOf(cell);
            const selectedIndex = selectedKeys.indexOf(cellKey);
            const previewIndexForCell = currentRound.route.findIndex((point) => sameCell(point, cell));
            const isPreview = previewVisibleKeys.has(cellKey);
            const isExpected = expectedKeys.has(cellKey);
            const isWrong = wrongKey === cellKey;
            const isResolved = phase === 'resolve' && isExpected;

            return (
              <motion.button
                key={cellKey}
                role="gridcell"
                type="button"
                whileTap={{ scale: phase === 'input' ? 0.96 : 1 }}
                onClick={() => handleCellTap(cell)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCellTap(cell);
                  } else if (e.key === 'Backspace' || e.key === 'z' && e.ctrlKey) {
                    e.preventDefault();
                    handleUndo();
                  }
                }}
                disabled={phase !== 'input'}
                className={clsx(
                  'relative aspect-square overflow-hidden rounded-[22px] border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-300',
                  'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
                  isPreview && 'border-cyan-300/70 shadow-[0_0_24px_rgba(34,211,238,0.28)]',
                  selectedIndex >= 0 && 'border-emerald-300/70 shadow-[0_0_24px_rgba(74,222,128,0.28)]',
                  isResolved && 'border-fuchsia-300/55',
                  isWrong && 'border-red-400/80 shadow-[0_0_24px_rgba(248,113,113,0.32)]',
                  !isPreview && selectedIndex < 0 && !isWrong && 'border-white/8'
                )}
              >
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_35%,transparent_65%,rgba(255,255,255,0.04))]" />
                <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:100%_10px]" />

                {(isPreview || isResolved || selectedIndex >= 0) && (
                  <div
                    className={clsx(
                      'absolute inset-2 rounded-[18px] border',
                      selectedIndex >= 0
                        ? 'border-emerald-300/70 bg-emerald-400/12'
                        : isWrong
                          ? 'border-red-400/60 bg-red-400/10'
                          : 'border-cyan-300/70 bg-cyan-300/10'
                    )}
                  />
                )}

                <div className="relative z-10 flex h-full items-center justify-center">
                  {selectedIndex >= 0 ? (
                    <span className="text-xl font-black text-emerald-200">{selectedIndex + 1}</span>
                  ) : isPreview && previewIndexForCell >= 0 ? (
                    <span className="text-xl font-black text-cyan-100">{previewIndexForCell + 1}</span>
                  ) : isResolved && previewIndexForCell >= 0 ? (
                    <span className="text-lg font-black text-fuchsia-100/90">{previewIndexForCell + 1}</span>
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-4 rounded-[24px] border border-white/8 bg-black/18 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <GitBranch size={16} className="text-cyan-300" />
            <span>{copy.instructions}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/58">
            {phase === 'preview'
              ? copy.previewing
              : phase === 'input'
                ? copy.inputPrompt
                : copy.recalibrating}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  danger = false,
}: {
  label: string;
  value: string;
  icon: typeof Flame;
  danger?: boolean;
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl border px-3 py-2',
        danger ? 'border-red-400/35 bg-red-400/12' : 'border-white/8 bg-white/6'
      )}
    >
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
        <Icon size={11} />
        {label}
      </div>
      <div className={clsx('mt-1 text-base font-black', danger ? 'text-red-300' : 'text-white')}>
        {value}
      </div>
    </div>
  );
}
