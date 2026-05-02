import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brain, CalendarDays, CheckCircle2, Crown, Lock, Medal, Sparkles, Trophy, Wallet } from 'lucide-react';
import { clsx } from 'clsx';
import WebApp from '@twa-dev/sdk';
import { useStore } from '../store/useStoreImpl';
import { useThemeStyles } from '../hooks/useThemeStyles';

const MAX_TOURNAMENT_GAMES = 3;

const PRIZE_TIERS = [
  { label: 'Top 1', reward: '1000 Airdrop + 5 TON' },
  { label: 'Top 2-3', reward: '500 Airdrop + 2 TON' },
  { label: 'Top 4-10', reward: '200 Airdrop + 0.5 TON' },
  { label: 'Top 11-50', reward: '100 Airdrop' },
];

const SEEDED_PLAYERS = [
  { id: 701, name: 'Aruzhan', score: 286, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aruzhan' },
  { id: 702, name: 'Maksat', score: 272, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maksat' },
  { id: 703, name: 'Amina', score: 264, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amina' },
  { id: 704, name: 'Dias', score: 251, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dias' },
  { id: 705, name: 'Nurai', score: 238, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nurai' },
  { id: 706, name: 'Arman', score: 224, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arman' },
  { id: 707, name: 'Saniya', score: 216, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Saniya' },
  { id: 708, name: 'Nursultan', score: 209, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nursultan' },
];

const toDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTournamentSchedule = (now = new Date()) => {
  const friday = new Date(now);
  friday.setHours(0, 0, 0, 0);
  friday.setDate(friday.getDate() - ((friday.getDay() + 2) % 7));

  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);

  const nextFriday = new Date(now);
  nextFriday.setHours(0, 0, 0, 0);
  nextFriday.setDate(nextFriday.getDate() + (((5 - now.getDay() + 7) % 7) || 7));

  return {
    weekKey: toDateKey(friday),
    isOpen: now >= friday && now <= sunday,
    friday,
    sunday,
    nextFriday,
  };
};

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat('kk-KZ', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);

export default function Tournaments() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const styles = useThemeStyles();
  const [feedback, setFeedback] = useState<string | null>(null);

  const plan = useStore((state) => state.plan);
  const user = useStore((state) => state.user);
  const tournament = useStore((state) => state.tournament);
  const joinTournament = useStore((state) => state.joinTournament);
  const tournamentTickets = useStore((state) => state.tournamentTickets);

  const schedule = useMemo(() => getTournamentSchedule(), []);
  const isVip = plan === 'premium';
  const joinedCurrentWeek = tournament.weekKey === schedule.weekKey && Boolean(tournament.joinedAt);
  const vipUsedThisWeek = tournament.vipFreeEntryWeek === schedule.weekKey;
  const gamesPlayed = joinedCurrentWeek ? tournament.games.length : 0;
  const gamesRemaining = Math.max(0, MAX_TOURNAMENT_GAMES - gamesPlayed);
  const isCompleted = joinedCurrentWeek && gamesPlayed >= MAX_TOURNAMENT_GAMES;

  const leaderboard = useMemo(() => {
    const base = [...SEEDED_PLAYERS];

    if (joinedCurrentWeek) {
      base.push({
        id: user.id || 999999,
        name: user.firstName || t('you'),
        score: tournament.score,
        avatar: user.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.firstName || 'player'}`,
      });
    }

    return base
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({ ...player, rank: index + 1, isCurrentUser: player.id === user.id }));
  }, [joinedCurrentWeek, tournament.score, user.firstName, user.id, user.photoUrl, t]);

  const currentUserRank = leaderboard.find((player) => player.isCurrentUser);

  const handleJoin = (paymentMethod: 'ton' | 'vip' | 'ticket') => {
    const result = joinTournament(paymentMethod);
    setFeedback(result.message);

    if (result.success) {
      WebApp.HapticFeedback?.notificationOccurred?.('success');
    } else {
      WebApp.HapticFeedback?.notificationOccurred?.('error');
    }
  };

  return (
    <div className={clsx('mobile-page min-h-screen px-4 pt-4 sm:pt-6', styles.bgClass)}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <section className={clsx('overflow-hidden p-5', styles.panelClass)}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                <Trophy size={14} />
                Weekly Tournament
              </div>
              <div>
                <h1 className={clsx('text-2xl sm:text-3xl font-black', styles.textPrimary)}>{t('tournaments_title')}</h1>
                <p className={clsx('mt-2 max-w-xl text-sm leading-6', styles.textSecondary)}>
                  {t('tournaments_desc')}
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/10 p-3 text-amber-300">
              <Crown size={32} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className={clsx('rounded-2xl p-4', styles.cardClass)}>
              <div className={clsx('text-xs uppercase tracking-[0.2em]', styles.textSecondary)}>{t('entry_fee')}</div>
              <div className={clsx('mt-2 flex items-center gap-2 text-lg font-black', styles.textPrimary)}>
                <Wallet size={18} className={styles.textAccent} />
                TON
              </div>
            </div>
            <div className={clsx('rounded-2xl p-4', styles.cardClass)}>
              <div className={clsx('text-xs uppercase tracking-[0.2em]', styles.textSecondary)}>{t('format')}</div>
              <div className={clsx('mt-2 flex items-center gap-2 text-lg font-black', styles.textPrimary)}>
                <Brain size={18} className={styles.textAccent} />
                {t('games_1_result')}
              </div>
            </div>
            <div className={clsx('rounded-2xl p-4', styles.cardClass)}>
              <div className={clsx('text-xs uppercase tracking-[0.2em]', styles.textSecondary)}>{t('vip_perk')}</div>
              <div className={clsx('mt-2 flex items-center gap-2 text-lg font-black', styles.textPrimary)}>
                <Sparkles size={18} className="text-emerald-400" />
                {t('free_entry_per_week')}
              </div>
            </div>
          </div>
        </section>

        <section className={clsx('grid gap-4 md:grid-cols-[1.2fr_0.8fr]', styles.panelClass, 'p-5')}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CalendarDays size={20} className={styles.textAccent} />
              <div>
                <div className={clsx('font-bold', styles.textPrimary)}>
                  {schedule.isOpen ? t('tournament_open') : t('tournament_closed')}
                </div>
                <div className={clsx('text-sm', styles.textSecondary)}>
                  {schedule.isOpen
                    ? `${t('closes_at')}: ${formatDate(schedule.sunday)}`
                    : `${t('next_opens_at')}: ${formatDate(schedule.nextFriday)}`}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleJoin('ton')}
              disabled={!schedule.isOpen || joinedCurrentWeek}
              className={clsx(
                'w-full rounded-2xl px-4 py-4 min-h-[44px] text-left transition-all disabled:cursor-not-allowed disabled:opacity-50',
                styles.btnSecondary
              )}
            >
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em]">
                <Wallet size={16} />
                TON
              </div>
              <div className={clsx('mt-2 text-2xl font-black', styles.textPrimary)}>TON</div>
              <div className={clsx('mt-1 text-xs', styles.textSecondary)}>{t('ton_payment_desc')}</div>
            </button>

            {tournamentTickets > 0 ? (
              <button
                type="button"
                onClick={() => handleJoin('ticket')}
                disabled={!schedule.isOpen || joinedCurrentWeek}
                className={clsx(
                  'w-full rounded-2xl border px-4 py-4 min-h-[44px] text-left transition-all disabled:cursor-not-allowed disabled:opacity-50',
                  'border-purple-400/30 bg-purple-500/10'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-purple-200">
                      <Trophy size={16} />
                      Ticket entry
                    </div>
                    <div className={clsx('mt-2 text-lg font-black', styles.textPrimary)}>
                      {t('free_entry')}
                    </div>
                    <div className={clsx('mt-1 text-xs', styles.textSecondary)}>
                      {t('tickets_available', { count: tournamentTickets })}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-purple-400/15 p-3 text-purple-200">
                    <Trophy size={20} />
                  </div>
                </div>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => handleJoin('vip')}
              disabled={!schedule.isOpen || joinedCurrentWeek || !isVip || vipUsedThisWeek}
              className={clsx(
                'w-full rounded-2xl border px-4 py-4 min-h-[44px] text-left transition-all disabled:cursor-not-allowed disabled:opacity-50',
                isVip ? 'border-emerald-400/30 bg-emerald-500/10' : styles.cardClass
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className={clsx('flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em]', isVip ? 'text-emerald-300' : styles.textSecondary)}>
                    {isVip ? <Sparkles size={16} /> : <Lock size={16} />}
                    {t('vip_free_entry')}
                  </div>
                  <div className={clsx('mt-2 text-lg font-black', styles.textPrimary)}>
                    {isVip ? t('premium_once_a_week') : t('unlocks_with_premium')}
                  </div>
                  <div className={clsx('mt-1 text-xs', styles.textSecondary)}>
                    {vipUsedThisWeek ? t('free_entry_used') : t('replaces_ton')}
                  </div>
                </div>
                <div className={clsx('rounded-2xl p-3', isVip ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-white/60')}>
                  <Sparkles size={20} />
                </div>
              </div>
            </button>

            {feedback && (
              <div className={clsx('rounded-2xl border px-4 py-3 text-sm', styles.cardClass, styles.textPrimary)}>
                {feedback}
              </div>
            )}
          </div>

          <div className={clsx('rounded-3xl p-4', styles.cardClass)}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className={clsx('text-xs uppercase tracking-[0.2em]', styles.textSecondary)}>{t('your_progress')}</div>
                <div className={clsx('mt-2 text-3xl font-black', styles.textPrimary)}>{joinedCurrentWeek ? tournament.score : 0}</div>
                <div className={clsx('text-sm', styles.textSecondary)}>{t('tournament_brain_score')}</div>
              </div>
              <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-300">
                <Brain size={24} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {Array.from({ length: MAX_TOURNAMENT_GAMES }).map((_, index) => {
                const playedGame = tournament.games[index];
                return (
                  <div
                    key={index}
                    className={clsx(
                      'rounded-2xl border p-3 text-center',
                      playedGame ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-white/10 bg-white/5'
                    )}
                  >
                    <div className={clsx('text-xs uppercase tracking-[0.2em]', styles.textSecondary)}>{t('game_index', { index: index + 1 })}</div>
                    <div className={clsx('mt-2 text-sm font-bold', styles.textPrimary)}>
                      {playedGame ? playedGame.gameId : t('waiting')}
                    </div>
                    <div className={clsx('mt-1 text-xs', styles.textSecondary)}>
                      {playedGame ? `${playedGame.tournamentBrainScore} BS` : t('not_played')}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={clsx('mt-4 rounded-2xl p-4', styles.cardClass)}>
              <div className={clsx('font-bold', styles.textPrimary)}>
                {isCompleted ? t('games_completed') : t('games_left', { count: gamesRemaining })}
              </div>
              <div className={clsx('mt-1 text-sm leading-6', styles.textSecondary)}>
                {t('tournament_auto_count_desc')}
              </div>
              <button
                type="button"
                onClick={() => navigate('/daily-workout')}
                className={clsx('mt-4 w-full rounded-2xl px-4 py-3 min-h-[44px] font-bold', styles.btnPrimary)}
              >
                {t('start_games')}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
          <div className={clsx('p-5', styles.panelClass)}>
            <div className="flex items-center gap-2">
              <Medal size={20} className="text-amber-400" />
              <h2 className={clsx('text-xl font-black', styles.textPrimary)}>{t('prizes')}</h2>
            </div>
            <div className="mt-4 space-y-3">
              {PRIZE_TIERS.map((tier) => (
                <div key={tier.label} className={clsx('flex items-center justify-between rounded-2xl p-4', styles.cardClass)}>
                  <div className={clsx('font-bold', styles.textPrimary)}>{tier.label}</div>
                  <div className={clsx('text-sm text-right', styles.textSecondary)}>{tier.reward}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={clsx('p-5', styles.panelClass)}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-400" />
              <h2 className={clsx('text-xl font-black', styles.textPrimary)}>{t('rules')}</h2>
            </div>
            <div className="mt-4 space-y-3">
              {[
                t('rule_1'),
                t('rule_2'),
                t('rule_3'),
                t('rule_4'),
                t('rule_5'),
              ].map((rule) => (
                <div key={rule} className={clsx('rounded-2xl p-4 text-sm leading-6', styles.cardClass, styles.textSecondary)}>
                  {rule}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={clsx('p-5', styles.panelClass)}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className={clsx('text-xl font-black', styles.textPrimary)}>{t('weekly_leaderboard')}</h2>
              <p className={clsx('mt-1 text-sm', styles.textSecondary)}>
                {t('leaderboard_desc')}
              </p>
            </div>
            {currentUserRank && (
              <div className="rounded-2xl bg-blue-500/10 px-3 py-2 text-right">
                <div className="text-xs uppercase tracking-[0.2em] text-blue-300">{t('your_rank')}</div>
                <div className="text-lg font-black text-blue-200">#{currentUserRank.rank}</div>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3">
            {leaderboard.map((player) => (
              <div
                key={player.id}
                className={clsx(
                  'flex items-center justify-between gap-3 rounded-2xl border p-3 sm:p-4',
                  player.isCurrentUser ? 'border-blue-400/30 bg-blue-500/10' : 'border-white/5',
                  styles.cardClass
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={clsx('w-8 text-center text-lg font-black', styles.textPrimary)}>{player.rank}</div>
                  <img src={player.avatar} alt={player.name} className="h-11 w-11 rounded-2xl object-cover" />
                  <div className="min-w-0">
                    <div className={clsx('font-bold truncate', styles.textPrimary)}>
                      {player.name}
                      {player.isCurrentUser ? ` (${t('you')})` : ''}
                    </div>
                    <div className={clsx('text-xs', styles.textSecondary)}>
                      {player.rank <= 1 ? 'Grand Final' : player.rank <= 10 ? 'Prize Zone' : 'Tournament Pool'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={clsx('text-lg font-black', styles.textPrimary)}>{player.score}</div>
                  <div className={clsx('text-xs', styles.textSecondary)}>Brain Score</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
