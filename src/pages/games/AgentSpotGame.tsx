import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Eye,
  Fingerprint,
  ShieldAlert,
  Siren,
  Target,
  TimerReset,
  Zap,
} from 'lucide-react';
import { GameWrapper } from '../../components/GameWrapper';
import { useStore } from '../../store/useStoreImpl';
import type { Language, Theme } from '../../store/useStore';
import { soundManager } from '../../utils/soundManager';
import { Difficulty, DIFFICULTY_COIN_MULT } from '../../types/games';
import { useGameTimer } from '../../hooks/useGameTimer';
import { useLocalBest } from '../../hooks/useLocalBest';
import { useHaptic } from '../../hooks/useHaptic';
import { useGameSettings } from '../../store/gameSettings';
import { DifficultySelector } from '../../components/games/DifficultySelector';
import { GameHUD } from '../../components/games/GameHUD';

type TieColor = {
  id: string;
  label: Record<Language, string>;
  badgeClass: string;
  tieClass: string;
  glowClass: string;
};

type BadgeShape = {
  id: string;
  label: Record<Language, string>;
};

type CardTone = 'slate' | 'blue' | 'violet' | 'amber';
type ChallengeType = 'badge' | 'briefing' | 'intruder' | 'glitch';

type AgentCard = {
  id: string;
  codename: string;
  tieColor: TieColor;
  badge: BadgeShape;
  hasEarpiece: boolean;
  hasGlasses: boolean;
  hasGlitch: boolean;
  isIntruder: boolean;
  faceSeed: number;
  tone: CardTone;
};

type RoundData = {
  cards: AgentCard[];
  answerId: string;
  challengeType: ChallengeType;
  briefingTitle: string;
  briefingSubtitle: string;
  gridColumns: 2 | 3;
};

type CopySet = {
  title: string;
  instructions: string;
  mission: string;
  combo: string;
  streak: string;
  score: string;
  timer: string;
  round: string;
  accuracy: string;
  fastScan: string;
  targetLock: string;
  badTap: string;
  pressure: string;
  resultsSuffix: string;
  badgeTitle: string;
  badgeSubtitle: string;
  intruderTitle: string;
  intruderSubtitle: string;
  glitchTitle: string;
  glitchSubtitle: string;
  briefingTitle: string;
  briefingSubtitlePrefix: string;
  glassesOn: string;
  glassesOff: string;
  earpieceOn: string;
  earpieceOff: string;
};

const GAME_ID = 'agent_spot';

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { timeMs: number; startSize: number; maxSize: number; gracePeriodMs: number }
> = {
  easy:   { timeMs: 60_000, startSize: 3, maxSize: 4, gracePeriodMs: 1500 },
  medium: { timeMs: 60_000, startSize: 4, maxSize: 5, gracePeriodMs: 1000 },
  hard:   { timeMs: 45_000, startSize: 5, maxSize: 6, gracePeriodMs: 600 },
};

const COPY: Record<Language, CopySet> = {
  en: {
    title: 'Agent Spot',
    instructions: 'Scan the suspects and tap the fake badge, intruder or suspicious clue before time runs out.',
    mission: 'Mission',
    combo: 'Combo',
    streak: 'Streak',
    score: 'Score',
    timer: 'Timer',
    round: 'Round',
    accuracy: 'Accuracy',
    fastScan: 'Fast scan',
    targetLock: 'Target locked',
    badTap: 'False tap',
    pressure: 'Pressure rising',
    resultsSuffix: 'pts',
    badgeTitle: 'Fake badge detected',
    badgeSubtitle: 'One badge does not match the squad.',
    intruderTitle: 'Hidden intruder',
    intruderSubtitle: 'Find the suspect without the agency earpiece.',
    glitchTitle: 'Suspicious visual glitch',
    glitchSubtitle: 'Tap the portrait with the broken scan signal.',
    briefingTitle: 'Match the briefing',
    briefingSubtitlePrefix: 'Locate',
    glassesOn: 'visor',
    glassesOff: 'no visor',
    earpieceOn: 'wired',
    earpieceOff: 'silent',
  },
  ru: {
    title: 'Agent Spot',
    instructions: 'Сканируйте подозреваемых и быстро нажмите на поддельный бейдж, нарушителя или подозрительную улику.',
    mission: 'Миссия',
    combo: 'Комбо',
    streak: 'Серия',
    score: 'Очки',
    timer: 'Таймер',
    round: 'Раунд',
    accuracy: 'Точность',
    fastScan: 'Быстрый скан',
    targetLock: 'Цель захвачена',
    badTap: 'Ложное нажатие',
    pressure: 'Напряжение растет',
    resultsSuffix: 'очк',
    badgeTitle: 'Обнаружен фальшивый бейдж',
    badgeSubtitle: 'Один бейдж не совпадает с группой.',
    intruderTitle: 'Скрытый нарушитель',
    intruderSubtitle: 'Найдите подозреваемого без агентской гарнитуры.',
    glitchTitle: 'Подозрительный визуальный сбой',
    glitchSubtitle: 'Нажмите на портрет со сломанным сканом.',
    briefingTitle: 'Сверьте брифинг',
    briefingSubtitlePrefix: 'Найдите',
    glassesOn: 'визор',
    glassesOff: 'без визора',
    earpieceOn: 'связь',
    earpieceOff: 'тихий',
  },
  kz: {
    title: 'Agent Spot',
    instructions: 'Күдіктілерді scan жасап, жалған badge, intruder немесе күмәнді белгіні уақыт біткенше түртіңіз.',
    mission: 'Миссия',
    combo: 'Комбо',
    streak: 'Серия',
    score: 'Ұпай',
    timer: 'Таймер',
    round: 'Раунд',
    accuracy: 'Дәлдік',
    fastScan: 'Жылдам scan',
    targetLock: 'Нысана бекітілді',
    badTap: 'Қате таңдау',
    pressure: 'Қысым артып тұр',
    resultsSuffix: 'ұп',
    badgeTitle: 'Жалған badge табыңыз',
    badgeSubtitle: 'Топтағы бір badge үлгісі сәйкес емес.',
    intruderTitle: 'Жасырын intruder',
    intruderSubtitle: 'Agency earpiece жоқ күдіктіні табыңыз.',
    glitchTitle: 'Күдікті scan glitch',
    glitchSubtitle: 'Скан белгісі бұзылған портретті түртіңіз.',
    briefingTitle: 'Briefing-пен сәйкестендіріңіз',
    briefingSubtitlePrefix: 'Мынаны табыңыз',
    glassesOn: 'визор',
    glassesOff: 'визорсыз',
    earpieceOn: 'байланыс',
    earpieceOff: 'үнсіз',
  },
};

const TIE_COLORS: TieColor[] = [
  {
    id: 'cyan',
    label: { en: 'Cyan tie', ru: 'Галстук cyan', kz: 'Cyan галстук' },
    badgeClass: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
    tieClass: 'from-cyan-300 to-sky-500',
    glowClass: 'shadow-[0_0_18px_rgba(34,211,238,0.32)]',
  },
  {
    id: 'amber',
    label: { en: 'Amber tie', ru: 'Янтарный галстук', kz: 'Amber галстук' },
    badgeClass: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
    tieClass: 'from-amber-300 to-orange-500',
    glowClass: 'shadow-[0_0_18px_rgba(251,191,36,0.3)]',
  },
  {
    id: 'violet',
    label: { en: 'Violet tie', ru: 'Фиолетовый галстук', kz: 'Violet галстук' },
    badgeClass: 'bg-fuchsia-400/20 text-fuchsia-300 border-fuchsia-400/30',
    tieClass: 'from-fuchsia-300 to-violet-500',
    glowClass: 'shadow-[0_0_18px_rgba(217,70,239,0.28)]',
  },
  {
    id: 'lime',
    label: { en: 'Lime tie', ru: 'Лаймовый галстук', kz: 'Lime галстук' },
    badgeClass: 'bg-lime-400/20 text-lime-300 border-lime-400/30',
    tieClass: 'from-lime-300 to-emerald-500',
    glowClass: 'shadow-[0_0_18px_rgba(132,204,22,0.28)]',
  },
];

const BADGES: BadgeShape[] = [
  {
    id: 'hex',
    label: { en: 'HEX badge', ru: 'HEX бейдж', kz: 'HEX badge' },
  },
  {
    id: 'delta',
    label: { en: 'DELTA badge', ru: 'DELTA бейдж', kz: 'DELTA badge' },
  },
  {
    id: 'nova',
    label: { en: 'NOVA badge', ru: 'NOVA бейдж', kz: 'NOVA badge' },
  },
  {
    id: 'arc',
    label: { en: 'ARC badge', ru: 'ARC бейдж', kz: 'ARC badge' },
  },
];

const CODENAMES = [
  'Nova',
  'Vega',
  'Orion',
  'Sable',
  'Mira',
  'Cipher',
  'Nyx',
  'Zero',
  'Astra',
  'Onyx',
  'Flux',
  'Rook',
];

const TONES: CardTone[] = ['slate', 'blue', 'violet', 'amber'];

const randomItem = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const randomItemExcept = <T,>(items: T[], current: T) => {
  const filtered = items.filter((item) => item !== current);
  return filtered[Math.floor(Math.random() * filtered.length)];
};

const shuffle = <T,>(items: T[]) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
};

const getBoardCount = (round: number) => {
  if (round < 4) return 6;
  if (round < 8) return 9;
  return 12;
};

const getGridColumns = (count: number): 2 | 3 => (count <= 6 ? 2 : 3);

const createCard = (overrides: Partial<AgentCard> = {}): AgentCard => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  codename: randomItem(CODENAMES),
  tieColor: randomItem(TIE_COLORS),
  badge: randomItem(BADGES),
  hasEarpiece: true,
  hasGlasses: Math.random() > 0.45,
  hasGlitch: false,
  isIntruder: false,
  faceSeed: Math.floor(Math.random() * 4),
  tone: randomItem(TONES),
  ...overrides,
});

const buildBriefDescriptor = (card: AgentCard, language: Language, copy: CopySet) => {
  const parts = [card.tieColor.label[language], card.badge.label[language]];
  parts.push(card.hasGlasses ? copy.glassesOn : copy.glassesOff);
  return parts.join(' • ');
};

const buildBadgeRound = (round: number, language: Language, copy: CopySet): RoundData => {
  const count = getBoardCount(round);
  const baseTie = randomItem(TIE_COLORS);
  const baseBadge = randomItem(BADGES);
  const answerBadge = randomItemExcept(BADGES, baseBadge);
  const answerIndex = Math.floor(Math.random() * count);

  const cards = Array.from({ length: count }, (_, index) =>
    createCard({
      codename: CODENAMES[index % CODENAMES.length],
      tieColor: baseTie,
      badge: index === answerIndex ? answerBadge : baseBadge,
      hasGlasses: round > 5 ? index % 2 === 0 : false,
      tone: TONES[index % TONES.length],
      faceSeed: index % 4,
    })
  );

  return {
    cards,
    answerId: cards[answerIndex].id,
    challengeType: 'badge',
    briefingTitle: copy.badgeTitle,
    briefingSubtitle: copy.badgeSubtitle,
    gridColumns: getGridColumns(count),
  };
};

const buildIntruderRound = (round: number, language: Language, copy: CopySet): RoundData => {
  const count = getBoardCount(round);
  const sharedTie = randomItem(TIE_COLORS);
  const sharedBadge = randomItem(BADGES);
  const answerIndex = Math.floor(Math.random() * count);

  const cards = Array.from({ length: count }, (_, index) =>
    createCard({
      codename: CODENAMES[(index + round) % CODENAMES.length],
      tieColor: sharedTie,
      badge: sharedBadge,
      hasEarpiece: index !== answerIndex,
      hasGlasses: index % 3 !== 1,
      isIntruder: index === answerIndex,
      tone: index === answerIndex ? 'amber' : TONES[(index + 1) % TONES.length],
      faceSeed: (index + round) % 4,
    })
  );

  return {
    cards,
    answerId: cards[answerIndex].id,
    challengeType: 'intruder',
    briefingTitle: copy.intruderTitle,
    briefingSubtitle: copy.intruderSubtitle,
    gridColumns: getGridColumns(count),
  };
};

const buildGlitchRound = (round: number, language: Language, copy: CopySet): RoundData => {
  const count = getBoardCount(round);
  const answerIndex = Math.floor(Math.random() * count);
  const cards = Array.from({ length: count }, (_, index) =>
    createCard({
      codename: CODENAMES[(index + 2) % CODENAMES.length],
      tieColor: TIE_COLORS[index % TIE_COLORS.length],
      badge: BADGES[(index + round) % BADGES.length],
      hasGlitch: index === answerIndex,
      hasEarpiece: true,
      hasGlasses: index % 2 === 0,
      tone: TONES[(index + 2) % TONES.length],
      faceSeed: index % 4,
    })
  );

  return {
    cards,
    answerId: cards[answerIndex].id,
    challengeType: 'glitch',
    briefingTitle: copy.glitchTitle,
    briefingSubtitle: copy.glitchSubtitle,
    gridColumns: getGridColumns(count),
  };
};

const buildBriefingRound = (round: number, language: Language, copy: CopySet): RoundData => {
  const count = getBoardCount(round);
  const answerCard = createCard({
    tieColor: randomItem(TIE_COLORS),
    badge: randomItem(BADGES),
    hasGlasses: Math.random() > 0.5,
    hasEarpiece: true,
    tone: randomItem(TONES),
  });

  const cards: AgentCard[] = [answerCard];

  while (cards.length < count) {
    const candidate = createCard({
      tieColor: randomItem(TIE_COLORS),
      badge: randomItem(BADGES),
      hasGlasses: Math.random() > 0.5,
      hasEarpiece: true,
      tone: randomItem(TONES),
    });

    const duplicate =
      candidate.tieColor.id === answerCard.tieColor.id &&
      candidate.badge.id === answerCard.badge.id &&
      candidate.hasGlasses === answerCard.hasGlasses;

    if (!duplicate) {
      cards.push(candidate);
    }
  }

  const shuffledCards = shuffle(cards);
  return {
    cards: shuffledCards,
    answerId: answerCard.id,
    challengeType: 'briefing',
    briefingTitle: copy.briefingTitle,
    briefingSubtitle: `${copy.briefingSubtitlePrefix}: ${buildBriefDescriptor(answerCard, language, copy)}`,
    gridColumns: getGridColumns(count),
  };
};

const buildRound = (round: number, language: Language, copy: CopySet): RoundData => {
  const typePool: ChallengeType[] =
    round < 3
      ? ['badge', 'briefing', 'intruder']
      : ['badge', 'briefing', 'intruder', 'glitch'];
  const challengeType = randomItem(typePool);

  switch (challengeType) {
    case 'badge':
      return buildBadgeRound(round, language, copy);
    case 'intruder':
      return buildIntruderRound(round, language, copy);
    case 'glitch':
      return buildGlitchRound(round, language, copy);
    default:
      return buildBriefingRound(round, language, copy);
  }
};

const toneStyles: Record<CardTone, { shell: string; glow: string }> = {
  slate: {
    shell: 'from-slate-950 via-slate-900 to-slate-950 border-white/8',
    glow: 'shadow-[0_12px_40px_rgba(15,23,42,0.45)]',
  },
  blue: {
    shell: 'from-[#061730] via-[#0d2345] to-[#081522] border-cyan-400/15',
    glow: 'shadow-[0_12px_42px_rgba(14,116,144,0.26)]',
  },
  violet: {
    shell: 'from-[#1b1034] via-[#201344] to-[#120a25] border-fuchsia-400/15',
    glow: 'shadow-[0_12px_42px_rgba(124,58,237,0.24)]',
  },
  amber: {
    shell: 'from-[#2a1707] via-[#34210d] to-[#1d1107] border-amber-400/20',
    glow: 'shadow-[0_12px_42px_rgba(217,119,6,0.22)]',
  },
};

const AgentPortraitCard = ({
  card,
  isCorrect,
  isMistake,
  isRevealed,
  onSelect,
  disabled,
}: {
  card: AgentCard;
  isCorrect: boolean;
  isMistake: boolean;
  isRevealed: boolean;
  onSelect: () => void;
  disabled: boolean;
}) => {
  const tone = toneStyles[card.tone];

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      disabled={disabled}
      className={clsx(
        'relative overflow-hidden rounded-[28px] border bg-gradient-to-br p-3 text-left transition-all duration-200',
        tone.shell,
        tone.glow,
        isCorrect && 'ring-2 ring-cyan-300/70 shadow-[0_0_26px_rgba(34,211,238,0.35)]',
        isMistake && 'ring-2 ring-red-400/70 shadow-[0_0_22px_rgba(248,113,113,0.4)]',
        !isCorrect && !isMistake && 'hover:-translate-y-0.5'
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_35%,transparent_65%,rgba(255,255,255,0.04))]" />
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:100%_8px]" />

      {card.hasGlitch && (
        <div className="absolute inset-x-3 top-10 h-10 rounded-2xl bg-gradient-to-r from-transparent via-red-400/35 to-transparent blur-sm" />
      )}

      <div className="relative z-10 flex items-center justify-between">
        <div className={clsx('rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.22em]', card.tieColor.badgeClass)}>
          {card.badge.id.toUpperCase()}
        </div>
        <div className="flex items-center gap-2">
          {card.hasEarpiece ? (
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]" />
          )}
          {card.hasGlasses && <Eye size={14} className="text-white/70" />}
        </div>
      </div>

      <div className="relative z-10 mt-4 rounded-[24px] border border-white/6 bg-black/25 px-4 py-4 backdrop-blur-md">
        <div className="relative mx-auto h-20 w-20">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/18 to-white/5" />
          <div
            className={clsx(
              'absolute left-1/2 top-3 h-10 w-12 -translate-x-1/2 rounded-t-[18px] rounded-b-[14px] bg-gradient-to-b from-[#f3d5c1] to-[#d9a98c]',
              card.faceSeed % 2 === 0 ? 'scale-x-100' : 'scale-x-[0.96]'
            )}
          />
          <div className="absolute left-1/2 top-2 h-5 w-14 -translate-x-1/2 rounded-t-full bg-gradient-to-b from-slate-900 to-slate-700" />
          {card.hasGlasses && (
            <div className="absolute left-1/2 top-8 flex -translate-x-1/2 items-center gap-1">
              <span className="h-2.5 w-4 rounded-full border border-cyan-300/60 bg-cyan-300/10" />
              <span className="h-0.5 w-2 bg-cyan-300/50" />
              <span className="h-2.5 w-4 rounded-full border border-cyan-300/60 bg-cyan-300/10" />
            </div>
          )}
          <div className="absolute bottom-2 left-1/2 h-6 w-12 -translate-x-1/2 rounded-t-[16px] bg-gradient-to-b from-slate-700 to-slate-950" />
          <div className={clsx('absolute bottom-1 left-1/2 h-7 w-4 -translate-x-1/2 rounded-b-full bg-gradient-to-b', card.tieColor.tieClass, card.tieColor.glowClass)} />
          {card.isIntruder && (
            <div className="absolute right-0 top-4 h-6 w-6 rounded-full border border-red-400/50 bg-red-500/20 text-[10px] font-black text-red-300 grid place-items-center">
              !
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Codename</div>
          <div className="mt-1 text-sm font-black tracking-wide text-white">{card.codename}</div>
        </div>
      </div>

      <div className="relative z-10 mt-3 flex items-center justify-between rounded-[20px] border border-white/6 bg-white/4 px-3 py-2 text-[11px] text-white/72">
        <div className="flex items-center gap-2">
          <Fingerprint size={12} />
          <span>{card.tieColor.id.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldAlert size={12} />
          <span>{card.hasEarpiece ? 'LIVE' : 'VOID'}</span>
        </div>
      </div>

      {isRevealed && (
        <div className="absolute inset-0 rounded-[28px] border border-cyan-300/50 bg-cyan-300/6" />
      )}
    </motion.button>
  );
};

const AgentSpotBoard = ({
  onFinish,
  isPaused,
  theme,
  language,
}: {
  onFinish: (score: number, coins: number) => void;
  isPaused: boolean;
  theme: Theme;
  language: Language;
}) => {
  const copy = useMemo(() => COPY[language] || COPY.en, [language]);
  const storedDifficulty = useGameSettings(s => s.difficultyPrefs[GAME_ID] ?? 'medium');
  const setStoredDifficulty = useGameSettings(s => s.setDifficulty);
  const [difficulty, setDifficulty] = useState<Difficulty>(storedDifficulty);
  const config = DIFFICULTY_CONFIG[difficulty];
  const { best, submit } = useLocalBest(GAME_ID, difficulty);
  const haptic = useHaptic();

  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [selectionLocked, setSelectionLocked] = useState(false);
  const [briefingVisible, setBriefingVisible] = useState(true);
  const [currentRound, setCurrentRound] = useState<RoundData>(() => buildRound(1, language, copy));
  const [lastFeedback, setLastFeedback] = useState(copy.fastScan);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [mistakeId, setMistakeId] = useState<string | null>(null);

  const endRef = useRef(false);
  const roundStartedAtRef = useRef(Date.now());

  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 100;

  const { timeLeftMs, reset: resetTimer } = useGameTimer({
    durationMs: config.timeMs,
    tickMs: 100,
    isActive: !briefingVisible && !isPaused,
    isPaused: isPaused,
    onExpire: () => {
      endRef.current = true;
      const finalCoins = Math.max(12, Math.round(score / 220) + Math.floor(bestCombo * 1.5));
      onFinish(score, finalCoins);
    },
  });

  const queueNextRound = useCallback(
    (nextRound: number) => {
      const nextData = buildRound(nextRound, language, copy);
      setCurrentRound(nextData);
      setRound(nextRound);
      setBriefingVisible(true);
      setHighlightedId(null);
      setMistakeId(null);
      setSelectionLocked(true);
      roundStartedAtRef.current = Date.now();

      const revealMs = Math.max(520, 980 - nextRound * 32);
      window.setTimeout(() => {
        setBriefingVisible(false);
        roundStartedAtRef.current = Date.now();
      }, revealMs);
    },
    [copy, language]
  );

  useEffect(() => {
    queueNextRound(1);
  }, []);

  useEffect(() => {
    setLastFeedback(timeLeftMs < 8000 ? copy.pressure : copy.fastScan);
  }, [copy.fastScan, copy.pressure, timeLeftMs]);

  const handleCardSelect = useCallback((card: AgentCard) => {
    if (selectionLocked || briefingVisible || endRef.current) return;

    const isCorrect = card.id === currentRound.answerId;

    if (isCorrect) {
      haptic.notification('success');
      void soundManager.playSuccess();
      setHits((previous) => previous + 1);
      setHighlightedId(card.id);

      const reactionMs = Date.now() - roundStartedAtRef.current;
      const fastBonus = Math.max(0, 180 - Math.floor(reactionMs / 10));
      const nextCombo = combo + 1;
      const multiplier = 1 + Math.min(1.5, Math.floor(nextCombo / 3) * 0.25);
      const gainedScore = Math.round((120 + fastBonus) * multiplier);

      setCombo(nextCombo);
      setBestCombo((previous) => Math.max(previous, nextCombo));
      setScore((previous) => previous + gainedScore);
      setLastFeedback(nextCombo >= 4 ? copy.targetLock : copy.fastScan);

      window.setTimeout(() => {
        setSelectionLocked(false);
        queueNextRound(round + 1);
      }, 320);

      return;
    }

    haptic.impact('heavy');
    void soundManager.playError();
    setMisses((previous) => previous + 1);
    setCombo(0);
    setMistakeId(card.id);
    setHighlightedId(currentRound.answerId);
    setSelectionLocked(true);
    setLastFeedback(copy.badTap);

    window.setTimeout(() => {
      setMistakeId(null);
      setHighlightedId(null);
      setSelectionLocked(false);
    }, 480);
  }, [selectionLocked, briefingVisible, combo, currentRound.answerId, copy.targetLock, copy.fastScan, copy.badTap, haptic, queueNextRound, round]);

  return (
    <div
      className={clsx(
        'relative h-full overflow-hidden px-4 pb-5 pt-4 transition-colors duration-500',
        theme === 'light'
          ? 'bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),transparent_35%),linear-gradient(180deg,#f5fbff_0%,#eff6ff_46%,#eef2ff_100%)]'
          : 'bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_bottom,_rgba(244,63,94,0.12),transparent_26%),linear-gradient(180deg,#030712_0%,#07111f_100%)]'
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col">
        <div className="w-full max-w-md mx-auto z-10 mb-4">
          <GameHUD
            score={score}
            timeLeftSec={timeLeftMs / 1000}
            timeTotalSec={config.timeMs / 1000}
            best={best}
            combo={combo}
            showSoundToggle
            showHapticToggle
          />
        </div>

        <motion.div
          className="mb-4 flex flex-col items-center z-10 w-full gap-3"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <DifficultySelector
            value={difficulty}
            onChange={(next: Difficulty) => {
              setStoredDifficulty(GAME_ID, next);
              setDifficulty(next);
              setRound(1);
              setScore(0);
              setCombo(0);
              setBestCombo(0);
              setHits(0);
              setMisses(0);
              resetTimer();
              queueNextRound(1);
            }}
            size="sm"
            disabled={!briefingVisible || selectionLocked}
          />
        </motion.div>

        <div className="rounded-[28px] border border-white/10 bg-black/18 p-4 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300/80">
                <Target size={13} />
                {copy.mission}
              </div>
              <h2 className="mt-2 text-xl font-black text-white">{currentRound.briefingTitle}</h2>
              <p className="mt-1 max-w-[230px] text-sm leading-relaxed text-white/65">
                {currentRound.briefingSubtitle}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 px-3 py-2 text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-200/75">
                {copy.round}
              </div>
              <div className="mt-1 text-lg font-black text-white">{round}</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/8 bg-white/6 px-3 py-3">
            <div className="flex items-center justify-between text-xs font-semibold text-white/65">
              <span>{lastFeedback}</span>
              <span>{copy.streak}: {bestCombo}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                animate={{ width: `${Math.min(100, (combo / 10) * 100)}%` }}
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400"
              />
            </div>
          </div>
        </div>

        {briefingVisible && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 mt-4 rounded-[24px] border border-red-400/18 bg-gradient-to-r from-red-500/12 via-amber-400/8 to-cyan-400/10 px-4 py-3 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 text-sm font-bold text-white">
              <Siren size={18} className="text-red-300" />
              <span>{currentRound.briefingTitle}</span>
            </div>
            <div className="mt-1 text-xs leading-relaxed text-white/65">
              {currentRound.briefingSubtitle}
            </div>
          </motion.div>
        )}

        <div
          role="grid"
          aria-label="Agent selection grid"
          className={clsx(
            'relative mt-4 grid flex-1 content-start gap-3 pb-1',
            currentRound.gridColumns === 2 ? 'grid-cols-2' : 'grid-cols-3'
          )}
        >
          {currentRound.cards.map((card) => (
            <motion.div
              key={card.id}
              role="gridcell"
              onClick={() => handleCardSelect(card)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardSelect(card);
                }
              }}
              tabIndex={selectionLocked || briefingVisible ? -1 : 0}
              className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-300 rounded-[28px]"
            >
              <AgentPortraitCard
                card={card}
                disabled={selectionLocked || briefingVisible}
                onSelect={() => handleCardSelect(card)}
                isCorrect={highlightedId === card.id && card.id === currentRound.answerId}
                isMistake={mistakeId === card.id}
                isRevealed={highlightedId === card.id}
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-4 rounded-[24px] border border-white/8 bg-black/18 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Zap size={16} className="text-cyan-300" />
              <span>{copy.fastScan}</span>
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
              {copy.resultsSuffix}
            </div>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/58">
            {copy.instructions}
          </p>
        </div>
      </div>
    </div>
  );
};

export const AgentSpotGame = () => {
  const { t } = useTranslation();
  const { addGameResult, theme, language } = useStore();

  return (
    <GameWrapper
      title={t('game_agent_spot', 'Agent Spot')}
      instructions={t('agent_spot_desc', 'Scan the suspects and tap the fake badge, intruder or suspicious clue before time runs out.')}
    >
      {({ onEnd, isPaused }) => (
        <AgentSpotBoard
          isPaused={isPaused}
          theme={theme}
          language={language}
          onFinish={(score, coins) => {
            queueMicrotask(() => addGameResult({ gameId: GAME_ID, score, coinsEarned: coins }));
            onEnd(score, coins);
          }}
        />
      )}
    </GameWrapper>
  );
};

export default AgentSpotGame;
