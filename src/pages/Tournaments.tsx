import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, Crown, Medal, Play, Smartphone, Sparkles, Trophy } from 'lucide-react';
import { clsx } from 'clsx';
import WebApp from '@twa-dev/sdk';
import { useStore } from '../store/useStoreImpl';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { getTournamentLeaderboard, TournamentLeaderboardEntry } from '../utils/adminApi';
import { getDefaultAvatarUrl } from '../constants/avatars';
import { getTournamentSchedule, TOURNAMENT_GAMES_LIMIT } from '../store/tournament';

/**
 * Brain Champions League — a weekly, FREE, skill-based tournament.
 *
 * Reframed away from the old crypto-cash prize ladder (5/2/1 TON) which read as
 * gambling. Now: free entry for everyone, the grand prize is a physical iPhone 17
 * plus in-game trophies / $FOCUS / coins — a legal-safe skill competition.
 *
 * The schedule mirrors the server's Monday-based UTC week (getServerTournamentWeek)
 * so the client week key, score recording and leaderboard all agree. Fully
 * localized (kz / ru / en) via a self-contained string map.
 */

type Lang = 'kz' | 'ru' | 'en';
const pickLang = (raw?: string): Lang => {
  const l = (raw || 'kz').slice(0, 2);
  return l === 'ru' ? 'ru' : l === 'en' ? 'en' : 'kz';
};

type Strings = {
  badge: string; title: string; subtitle: string;
  grandPrize: string; iphone: string; iphoneNote: string;
  open: string; endsIn: string; nextIn: string; days: string; hours: string; mins: string;
  join: string; joining: string; joined: string; joinedNote: string;
  yourScore: string; brainScore: string; gamesLeft: (n: number) => string; gamesDone: string;
  play: string; waiting: string; notPlayed: string; gameN: (n: number) => string; bs: string;
  prizesTitle: string; prizes: { place: string; reward: string }[];
  rulesTitle: string; rules: string[];
  lbTitle: string; lbDesc: string; yourRank: string; emptyTitle: string; emptyDesc: string;
  you: string; player: string; legal: string;
};

const STR: Record<Lang, Strings> = {
  kz: {
    badge: 'Апта сайынғы лига',
    title: 'Ми Чемпиондар Лигасы',
    subtitle: 'Апта бойы ойнап, ең жоғары Brain Score жина. Үздіктер нақты жүлде алады — қатысу тегін!',
    grandPrize: 'Бас жүлде',
    iphone: 'iPhone 17',
    iphoneNote: 'Аптаның №1 чемпионына',
    open: 'Лига ашық',
    endsIn: 'Аяқталуына',
    nextIn: 'Жаңа апта',
    days: 'к', hours: 'с', mins: 'м',
    join: '🏆 Тегін қатысу',
    joining: 'Қосылуда…',
    joined: '✓ Сіз қатысып жатырсыз',
    joinedNote: 'Енді 3 ойын ойнап, ұпай жинаңыз.',
    yourScore: 'Сіздің ұпайыңыз',
    brainScore: 'Brain Score',
    gamesLeft: (n) => `Тағы ${n} ойын қалды`,
    gamesDone: 'Барлық ойын ойналды! 🎉',
    play: '▶ Ойнау',
    waiting: 'Күтуде',
    notPlayed: 'Ойналмаған',
    gameN: (n) => `Ойын ${n}`,
    bs: 'BS',
    prizesTitle: 'Жүлделер',
    prizes: [
      { place: '🥇 1-орын', reward: '📱 iPhone 17 + 🏆 Алтын NFT кубок + 1000 $FOCUS' },
      { place: '🥈 2-орын', reward: 'Күміс NFT кубок + 500 $FOCUS' },
      { place: '🥉 3-орын', reward: 'Қола NFT кубок + 250 $FOCUS' },
      { place: '4–10 орын', reward: '100 $FOCUS' },
      { place: '11–50 орын', reward: '5 000 монета' },
    ],
    rulesTitle: 'Ережелер',
    rules: [
      'Апта ішінде кез келген 3 ойынның нәтижесі есептеледі.',
      'Brain Score = сол 3 ойынның қосынды ұпайы.',
      'Қатысу тегін — әркім бәсекеге түсе алады.',
      'Әр ойын апта ішінде бір рет есептеледі.',
      'Апта соңында үздіктер жүлде алады. Жеңімпазбен бот хабарласады.',
    ],
    lbTitle: 'Апталық көшбасшылар',
    lbDesc: 'Нақты қатысушылардың ұпайы. Апта сайын нөлден басталады.',
    yourRank: 'Сіздің орныңыз',
    emptyTitle: 'Әзірше қатысушы жоқ',
    emptyDesc: 'Бірінші болып қатыс — көшбасшы атан! 🏆',
    you: 'Сіз',
    player: 'Ойыншы',
    legal: 'Қатысу тегін. Жеңіс тек шеберлікке байланысты — кездейсоқтық емес.',
  },
  ru: {
    badge: 'Еженедельная лига',
    title: 'Лига Чемпионов Мозга',
    subtitle: 'Играй всю неделю и набирай максимальный Brain Score. Лучшие получают реальные призы — участие бесплатное!',
    grandPrize: 'Главный приз',
    iphone: 'iPhone 17',
    iphoneNote: 'Чемпиону недели №1',
    open: 'Лига открыта',
    endsIn: 'До конца',
    nextIn: 'Новая неделя',
    days: 'д', hours: 'ч', mins: 'м',
    join: '🏆 Участвовать бесплатно',
    joining: 'Подключение…',
    joined: '✓ Вы участвуете',
    joinedNote: 'Теперь сыграйте 3 игры и наберите очки.',
    yourScore: 'Ваши очки',
    brainScore: 'Brain Score',
    gamesLeft: (n) => `Осталось ${n} игр`,
    gamesDone: 'Все игры сыграны! 🎉',
    play: '▶ Играть',
    waiting: 'Ожидание',
    notPlayed: 'Не сыграно',
    gameN: (n) => `Игра ${n}`,
    bs: 'BS',
    prizesTitle: 'Призы',
    prizes: [
      { place: '🥇 1-е место', reward: '📱 iPhone 17 + 🏆 Золотой NFT-кубок + 1000 $FOCUS' },
      { place: '🥈 2-е место', reward: 'Серебряный NFT-кубок + 500 $FOCUS' },
      { place: '🥉 3-е место', reward: 'Бронзовый NFT-кубок + 250 $FOCUS' },
      { place: '4–10 места', reward: '100 $FOCUS' },
      { place: '11–50 места', reward: '5 000 монет' },
    ],
    rulesTitle: 'Правила',
    rules: [
      'Засчитываются результаты любых 3 игр за неделю.',
      'Brain Score = сумма очков этих 3 игр.',
      'Участие бесплатное — соревноваться может каждый.',
      'Каждая игра засчитывается один раз за неделю.',
      'В конце недели лучшие получают призы. С победителем свяжется бот.',
    ],
    lbTitle: 'Лидеры недели',
    lbDesc: 'Очки реальных участников. Каждую неделю — с нуля.',
    yourRank: 'Ваше место',
    emptyTitle: 'Пока нет участников',
    emptyDesc: 'Стань первым — возглавь таблицу! 🏆',
    you: 'Вы',
    player: 'Игрок',
    legal: 'Участие бесплатное. Победа зависит только от навыка, а не от случая.',
  },
  en: {
    badge: 'Weekly league',
    title: 'Brain Champions League',
    subtitle: 'Play all week and rack up the highest Brain Score. Top players win real prizes — entry is free!',
    grandPrize: 'Grand prize',
    iphone: 'iPhone 17',
    iphoneNote: 'For the week’s #1 champion',
    open: 'League open',
    endsIn: 'Ends in',
    nextIn: 'New week',
    days: 'd', hours: 'h', mins: 'm',
    join: '🏆 Join for free',
    joining: 'Joining…',
    joined: '✓ You’re in',
    joinedNote: 'Now play 3 games and rack up points.',
    yourScore: 'Your score',
    brainScore: 'Brain Score',
    gamesLeft: (n) => `${n} games left`,
    gamesDone: 'All games played! 🎉',
    play: '▶ Play',
    waiting: 'Waiting',
    notPlayed: 'Not played',
    gameN: (n) => `Game ${n}`,
    bs: 'BS',
    prizesTitle: 'Prizes',
    prizes: [
      { place: '🥇 1st', reward: '📱 iPhone 17 + 🏆 Gold NFT trophy + 1000 $FOCUS' },
      { place: '🥈 2nd', reward: 'Silver NFT trophy + 500 $FOCUS' },
      { place: '🥉 3rd', reward: 'Bronze NFT trophy + 250 $FOCUS' },
      { place: '4–10', reward: '100 $FOCUS' },
      { place: '11–50', reward: '5,000 coins' },
    ],
    rulesTitle: 'Rules',
    rules: [
      'Your best 3 games of the week count.',
      'Brain Score = the sum of those 3 games.',
      'Entry is free — anyone can compete.',
      'Each game counts once per week.',
      'Top players win prizes at week’s end. The bot contacts the winner.',
    ],
    lbTitle: 'Weekly leaders',
    lbDesc: 'Scores of real participants. Resets every week.',
    yourRank: 'Your rank',
    emptyTitle: 'No participants yet',
    emptyDesc: 'Be the first — top the board! 🏆',
    you: 'You',
    player: 'Player',
    legal: 'Entry is free. Winning depends on skill alone, not chance.',
  },
};

const formatRemaining = (ms: number, s: Strings) => {
  if (ms <= 0) return '0' + s.mins;
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}${s.days} ${h}${s.hours}`;
  if (h > 0) return `${h}${s.hours} ${m}${s.mins}`;
  return `${m}${s.mins}`;
};

export default function Tournaments() {
  const { i18n } = useTranslation();
  const lang = pickLang(i18n.language);
  const s = STR[lang];
  const navigate = useNavigate();
  const styles = useThemeStyles();

  const user = useStore((state) => state.user);
  const tournament = useStore((state) => state.tournament);
  const joinTournament = useStore((state) => state.joinTournament);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const schedule = useMemo(() => getTournamentSchedule(new Date(now)), [now]);
  const remainingMs = new Date(schedule.endsAtISO).getTime() - now;

  const joinedThisWeek = tournament.weekKey === schedule.weekKey && Boolean(tournament.joinedAt);
  const gamesPlayed = joinedThisWeek ? tournament.games.length : 0;
  const gamesRemaining = Math.max(0, TOURNAMENT_GAMES_LIMIT - gamesPlayed);
  const isCompleted = joinedThisWeek && gamesPlayed >= TOURNAMENT_GAMES_LIMIT;

  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [board, setBoard] = useState<TournamentLeaderboardEntry[] | null>(null);

  const loadBoard = useMemo(
    () => () => {
      void getTournamentLeaderboard()
        .then((r) => { if (r?.leaderboard) setBoard(r.leaderboard); })
        .catch((err) => console.warn('[Tournaments] leaderboard fetch failed:', err));
    },
    [],
  );
  useEffect(() => { loadBoard(); }, [loadBoard, schedule.weekKey]);

  const handleJoin = () => {
    setBusy(true);
    const result = joinTournament('free');
    setFeedback(result.message);
    WebApp.HapticFeedback?.notificationOccurred?.(result.success ? 'success' : 'error');
    // give the optimistic state a beat, then refresh the board
    setTimeout(() => { setBusy(false); loadBoard(); }, 600);
  };

  const leaderboard = useMemo(() => {
    const rows = (board || []).map((e) => ({
      id: e.userTelegramId,
      name: e.firstName || e.username || `${s.player} ${e.userTelegramId}`,
      score: e.score,
      avatar: e.photoUrl || getDefaultAvatarUrl(e.firstName || String(e.userTelegramId)),
    }));
    return rows
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({ ...p, rank: i + 1, isYou: String(p.id) === String(user.id) }));
  }, [board, user.id, s.player]);

  const yourRow = leaderboard.find((p) => p.isYou);
  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className={clsx('mobile-page min-h-screen px-4 pt-4 sm:pt-6', styles.bgClass)}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">

        {/* ───────── Hero + grand prize ───────── */}
        <section className={clsx('relative overflow-hidden p-5', styles.panelClass)}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-400">
                <Trophy size={13} /> {s.badge}
              </div>
              <h1 className={clsx('text-2xl sm:text-3xl font-black leading-tight', styles.textPrimary)}>{s.title}</h1>
              <p className={clsx('max-w-xl text-sm leading-6', styles.textSecondary)}>{s.subtitle}</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/10 p-3 text-amber-300">
              <Crown size={30} />
            </div>
          </div>

          {/* Grand prize banner */}
          <div className="relative mt-4 flex items-center gap-4 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/15 to-orange-500/5 p-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-stone-900/60 text-4xl">📱</div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/80">{s.grandPrize}</div>
              <div className={clsx('flex items-center gap-2 text-2xl font-black', styles.textPrimary)}>
                <Smartphone size={20} className="text-amber-300" /> {s.iphone}
              </div>
              <div className={clsx('text-xs', styles.textSecondary)}>{s.iphoneNote}</div>
            </div>
          </div>

          {/* Status / countdown */}
          <div className="relative mt-3 flex items-center justify-between gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> {s.open}
            </div>
            <div className={clsx('flex items-center gap-1.5 text-sm font-black', styles.textPrimary)}>
              <Clock size={15} className="text-emerald-300" />
              <span className={clsx('text-xs font-semibold', styles.textSecondary)}>{s.endsIn}:</span>
              {formatRemaining(remainingMs, s)}
            </div>
          </div>
        </section>

        {/* ───────── Join / progress ───────── */}
        <section className={clsx('p-5', styles.panelClass)}>
          {!joinedThisWeek ? (
            <>
              <button
                type="button"
                onClick={handleJoin}
                disabled={busy}
                className={clsx('w-full rounded-2xl px-4 py-4 text-center text-lg font-black active:scale-[0.98] transition-transform disabled:opacity-60', styles.btnPrimary)}
              >
                {busy ? s.joining : s.join}
              </button>
              <p className={clsx('mt-3 text-center text-xs leading-5', styles.textSecondary)}>{s.legal}</p>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                  <CheckCircle2 size={18} /> {s.joined}
                </div>
                <div className="text-right">
                  <div className={clsx('text-[10px] uppercase tracking-[0.2em]', styles.textSecondary)}>{s.yourScore}</div>
                  <div className={clsx('text-2xl font-black', styles.textPrimary)}>{tournament.score}</div>
                  <div className={clsx('text-[10px]', styles.textSecondary)}>{s.brainScore}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: TOURNAMENT_GAMES_LIMIT }).map((_, index) => {
                  const played = tournament.games[index];
                  return (
                    <div key={index} className={clsx('rounded-2xl border p-3 text-center', played ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-white/10 bg-white/5')}>
                      <div className={clsx('text-[10px] uppercase tracking-[0.15em]', styles.textSecondary)}>{s.gameN(index + 1)}</div>
                      <div className={clsx('mt-1 truncate text-xs font-bold', styles.textPrimary)}>{played ? played.gameId : s.waiting}</div>
                      <div className={clsx('mt-0.5 text-[11px]', styles.textSecondary)}>{played ? `${played.tournamentBrainScore} ${s.bs}` : s.notPlayed}</div>
                    </div>
                  );
                })}
              </div>

              <div className={clsx('rounded-2xl p-3 text-sm font-bold', styles.cardClass, styles.textPrimary)}>
                {isCompleted ? s.gamesDone : s.gamesLeft(gamesRemaining)}
              </div>

              <button
                type="button"
                onClick={() => navigate('/')}
                className={clsx('flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-bold active:scale-[0.98] transition-transform', styles.btnPrimary)}
              >
                <Play size={16} /> {s.play}
              </button>
            </div>
          )}

          {feedback && (
            <div className={clsx('mt-3 rounded-2xl border px-4 py-3 text-sm', styles.cardClass, styles.textPrimary)}>{feedback}</div>
          )}
        </section>

        {/* ───────── Prizes ───────── */}
        <section className={clsx('p-5', styles.panelClass)}>
          <div className="flex items-center gap-2">
            <Medal size={20} className="text-amber-400" />
            <h2 className={clsx('text-xl font-black', styles.textPrimary)}>{s.prizesTitle}</h2>
          </div>
          <div className="mt-4 space-y-2.5">
            {s.prizes.map((tier, i) => (
              <div key={tier.place} className={clsx('flex items-center justify-between gap-3 rounded-2xl p-3.5', i === 0 ? 'border border-amber-400/30 bg-amber-500/10' : styles.cardClass)}>
                <div className={clsx('shrink-0 font-bold', styles.textPrimary)}>{tier.place}</div>
                <div className={clsx('text-right text-sm', i === 0 ? 'text-amber-200 font-semibold' : styles.textSecondary)}>{tier.reward}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ───────── Rules ───────── */}
        <section className={clsx('p-5', styles.panelClass)}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <h2 className={clsx('text-xl font-black', styles.textPrimary)}>{s.rulesTitle}</h2>
          </div>
          <div className="mt-4 space-y-2.5">
            {s.rules.map((rule, i) => (
              <div key={rule} className={clsx('flex items-start gap-3 rounded-2xl p-3.5 text-sm leading-6', styles.cardClass, styles.textSecondary)}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-black text-emerald-300">{i + 1}</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ───────── Leaderboard ───────── */}
        <section className={clsx('p-5', styles.panelClass)}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className={clsx('text-xl font-black', styles.textPrimary)}>{s.lbTitle}</h2>
              <p className={clsx('mt-1 text-sm', styles.textSecondary)}>{s.lbDesc}</p>
            </div>
            {yourRow && (
              <div className="rounded-2xl bg-blue-500/10 px-3 py-2 text-right">
                <div className="text-[10px] uppercase tracking-[0.2em] text-blue-300">{s.yourRank}</div>
                <div className="text-lg font-black text-blue-200">#{yourRow.rank}</div>
              </div>
            )}
          </div>

          {leaderboard.length === 0 ? (
            <div className={clsx('mt-5 rounded-2xl border border-dashed border-white/15 p-8 text-center', styles.cardClass)}>
              <Trophy size={32} className="mx-auto mb-2 text-amber-400/70" />
              <div className={clsx('font-bold', styles.textPrimary)}>{s.emptyTitle}</div>
              <div className={clsx('mt-1 text-sm', styles.textSecondary)}>{s.emptyDesc}</div>
            </div>
          ) : (
            <>
              {/* Podium (top 3) */}
              {podium.length > 0 && (
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {podium.map((p) => {
                    const tone = p.rank === 1 ? 'from-amber-400/25 to-amber-500/5 border-amber-400/40'
                      : p.rank === 2 ? 'from-slate-300/20 to-slate-400/5 border-slate-300/30'
                      : 'from-orange-700/25 to-orange-800/5 border-orange-600/30';
                    return (
                      <div key={p.id} className={clsx('flex flex-col items-center gap-1 rounded-2xl border bg-gradient-to-b p-3 text-center', tone)}>
                        <div className="text-lg">{p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉'}</div>
                        <img src={p.avatar} alt={p.name} className="h-12 w-12 rounded-2xl object-cover" />
                        <div className={clsx('w-full truncate text-xs font-bold', styles.textPrimary)}>{p.isYou ? s.you : p.name}</div>
                        <div className={clsx('text-sm font-black', styles.textPrimary)}>{p.score}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Ranks 4+ */}
              {rest.length > 0 && (
                <div className="mt-3 space-y-2">
                  {rest.map((p) => (
                    <div key={p.id} className={clsx('flex items-center justify-between gap-3 rounded-2xl border p-3', p.isYou ? 'border-blue-400/40 bg-blue-500/10' : 'border-white/5', styles.cardClass)}>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={clsx('w-6 text-center text-sm font-black', styles.textSecondary)}>{p.rank}</div>
                        <img src={p.avatar} alt={p.name} className="h-9 w-9 rounded-xl object-cover" />
                        <div className={clsx('truncate font-bold', styles.textPrimary)}>{p.isYou ? `${p.name} (${s.you})` : p.name}</div>
                      </div>
                      <div className={clsx('text-base font-black', styles.textPrimary)}>{p.score}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <div className="flex items-center justify-center gap-2 pb-2 text-center text-[11px] text-stone-500">
          <Sparkles size={12} /> {s.legal}
        </div>
      </div>
    </div>
  );
}
