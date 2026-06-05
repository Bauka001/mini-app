import { calculateBrainScoreMetrics } from '../utils/brainScore';
import type { TournamentPaymentMethod, TournamentState, UserState } from './useStore';

export const TOURNAMENT_ENTRY_FEE = 50;
export const TOURNAMENT_GAMES_LIMIT = 3;
const VIP_TOURNAMENT_PLAN: UserState['plan'] = 'premium';

// Weekly league: Monday 00:00 → Sunday 23:59 (UTC), open ALL week. The week key
// is the Monday ISO date and MUST match the server's getServerTournamentWeek
// (server/index.js) so client join-state, score recording and the leaderboard
// all key off the same week. (Previously the client keyed to Friday and only
// opened Fri–Sun, which never matched the server's Monday key — a real bug.)
export const getTournamentSchedule = (now = new Date()) => {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0=Sun .. 6=Sat
  const mondayUTC = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((day + 6) % 7))
  );
  const sundayEnd = new Date(mondayUTC);
  sundayEnd.setUTCDate(mondayUTC.getUTCDate() + 6);
  sundayEnd.setUTCHours(23, 59, 59, 999);
  const nextMonday = new Date(mondayUTC);
  nextMonday.setUTCDate(mondayUTC.getUTCDate() + 7);

  return {
    weekKey: mondayUTC.toISOString().slice(0, 10),
    isOpen: true, // the league runs the whole week
    startsAtISO: mondayUTC.toISOString(),
    endsAtISO: sundayEnd.toISOString(),
    nextStartsAtISO: nextMonday.toISOString(),
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
    tournament?.paymentMethod === 'ticket' ||
    tournament?.paymentMethod === 'free'
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

  if (paymentMethod === 'free') {
    return {
      success: true,
      message: 'Тегін қатысу белсендірілді! Апта ішінде 3 ойын ойнап, ұпай жинаңыз.',
      statePatch: { tournament },
    };
  }

  return {
    success: true,
    message: 'Қатысу дайын. Енді апта ішінде 3 ойын ойнаңыз.',
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
