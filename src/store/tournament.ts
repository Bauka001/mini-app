import { calculateBrainScoreMetrics } from '../utils/brainScore';
import type { TournamentPaymentMethod, TournamentState, UserState } from './useStore';
import { toDateKey } from './analytics';

export const TOURNAMENT_ENTRY_FEE = 50;
export const TOURNAMENT_GAMES_LIMIT = 3;
const VIP_TOURNAMENT_PLAN: UserState['plan'] = 'premium';

export const getTournamentSchedule = (now = new Date()) => {
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
    startsAtISO: friday.toISOString(),
    endsAtISO: sunday.toISOString(),
    nextStartsAtISO: nextFriday.toISOString(),
  };
};

export const normalizeTournamentState = (
  tournament?: Partial<TournamentState> | null
): TournamentState => ({
  weekKey: typeof tournament?.weekKey === 'string' ? tournament.weekKey : null,
  joinedAt: typeof tournament?.joinedAt === 'string' ? tournament.joinedAt : null,
  paymentMethod:
    tournament?.paymentMethod === 'ton' ||
    tournament?.paymentMethod === 'vip' ||
    tournament?.paymentMethod === 'ticket'
      ? tournament.paymentMethod
      : null,
  games: Array.isArray(tournament?.games)
    ? tournament.games
        .filter(
          (
            game
          ): game is {
            gameId: string;
            score: number | string;
            playedAt: string;
            tournamentBrainScore?: number;
          } => typeof game?.gameId === 'string'
        )
        .map((game) => ({
          gameId: game.gameId,
          score: typeof game.score === 'number' || typeof game.score === 'string' ? game.score : 0,
          playedAt: typeof game.playedAt === 'string' ? game.playedAt : new Date().toISOString(),
          tournamentBrainScore: Number.isFinite(Number(game.tournamentBrainScore))
            ? Number(game.tournamentBrainScore)
            : 0,
        }))
    : [],
  score: Number.isFinite(Number(tournament?.score)) ? Number(tournament.score) : 0,
  vipFreeEntryWeek: typeof tournament?.vipFreeEntryWeek === 'string' ? tournament.vipFreeEntryWeek : null,
});

export const isVipTournamentEligible = (plan: UserState['plan']) => plan === VIP_TOURNAMENT_PLAN;

export const calculateTournamentScoreProgress = (games: TournamentState['games']) =>
  games.map((game, index) => {
    const nextScore = calculateBrainScoreMetrics(
      games.slice(0, index + 1).map((entry) => ({
        gameId: entry.gameId,
        score: entry.score,
        timestamp: Date.parse(entry.playedAt) || Date.now(),
        coinsEarned: 0,
      }))
    ).combinedScore;

    return {
      ...game,
      tournamentBrainScore: nextScore,
    };
  });

type JoinTournamentState = Pick<UserState, 'plan' | 'tournament' | 'tournamentTickets'>;

export const buildJoinTournamentOutcome = (
  state: JoinTournamentState,
  paymentMethod: TournamentPaymentMethod,
  now = new Date()
):
  | { success: false; message: string }
  | {
      success: true;
      message: string;
      statePatch: Pick<UserState, 'tournament'> | Pick<UserState, 'tournament' | 'tournamentTickets'>;
    } => {
  const schedule = getTournamentSchedule(now);

  if (!schedule.isOpen) {
    return { success: false, message: 'Турнир тек жұма мен жексенбі аралығында ашық болады.' };
  }

  if (state.tournament.weekKey === schedule.weekKey && state.tournament.joinedAt) {
    return { success: false, message: 'Сіз осы аптаның турниріне кіріп қойғансыз.' };
  }

  if (paymentMethod === 'vip') {
    if (!isVipTournamentEligible(state.plan)) {
      return { success: false, message: 'VIP тегін кіру premium жоспарымен ғана ашылады.' };
    }

    if (state.tournament.vipFreeEntryWeek === schedule.weekKey) {
      return { success: false, message: 'Осы аптадағы VIP тегін кіру әлдеқашан қолданылған.' };
    }
  }

  if (paymentMethod === 'ticket' && (state.tournamentTickets || 0) <= 0) {
    return { success: false, message: 'Тегін tournament ticket жоқ.' };
  }

  const tournament: UserState['tournament'] = {
    weekKey: schedule.weekKey,
    joinedAt: now.toISOString(),
    paymentMethod,
    games: [],
    score: 0,
    vipFreeEntryWeek: paymentMethod === 'vip' ? schedule.weekKey : state.tournament.vipFreeEntryWeek,
  };

  if (paymentMethod === 'vip') {
    return {
      success: true,
      message: 'VIP тегін кіру белсендірілді. Енді 3 ойын ойнап, нәтиже жинаңыз.',
      statePatch: { tournament },
    };
  }

  if (paymentMethod === 'ticket') {
    return {
      success: true,
      message: 'Tournament ticket қолданылды. Енді 3 ойын ойнаңыз.',
      statePatch: {
        tournament,
        tournamentTickets: Math.max(0, (state.tournamentTickets || 0) - 1),
      },
    };
  }

  return {
    success: true,
    message: `${TOURNAMENT_ENTRY_FEE} TON арқылы кіру дайын. Енді 3 ойын ойнаңыз.`,
    statePatch: { tournament },
  };
};

type TournamentGameInput = Pick<UserState['history'][number], 'gameId' | 'score'>;

export const buildTournamentStateAfterGame = (
  tournament: UserState['tournament'],
  result: TournamentGameInput,
  playedAt: string
) => {
  const schedule = getTournamentSchedule(new Date(playedAt));
  const isCurrentTournamentRun = Boolean(
    tournament.joinedAt &&
      tournament.weekKey === schedule.weekKey &&
      tournament.games.length < TOURNAMENT_GAMES_LIMIT
  );

  if (!schedule.isOpen || !isCurrentTournamentRun) {
    return tournament;
  }

  const tournamentGames = calculateTournamentScoreProgress([
    ...tournament.games,
    {
      gameId: result.gameId,
      score: result.score,
      playedAt,
      tournamentBrainScore: 0,
    },
  ]);

  return {
    ...tournament,
    games: tournamentGames,
    score: tournamentGames[tournamentGames.length - 1]?.tournamentBrainScore || tournament.score,
  };
};
