import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Trophy, Sword, Users, Clock, Coins, Trophy as TrophyIcon, Medal, Award, TrendingUp, Calendar, Zap } from 'lucide-react';

export default function Tournaments() {
  const store = useStore();
  const tournaments = store?.tournaments ?? [];
  const myMatches = store?.myMatches ?? [];
  const user = store?.user ?? { id: 0, firstName: 'Guest' };
  const joinTournament = store?.joinTournament ?? ((_: string) => ({ success: false, message: 'Tournaments are not available' }));
  const refreshTournaments = store?.refreshTournaments ?? (() => {});
  const setActiveMatch = store?.setActiveMatch ?? (() => {});
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    refreshTournaments();
  }, [refreshTournaments]);

  const activeTournaments = tournaments?.filter?.((t: any) => t.status === 'active') ?? [];
  const upcomingTournaments = tournaments?.filter?.((t: any) => t.status === 'upcoming') ?? [];
  const completedTournaments = tournaments?.filter?.((t: any) => t.status === 'completed') ?? [];

  const handleJoin = (tournamentId: string) => {
    const result = joinTournament(tournamentId);
    if (result.success) {
      setSelectedTournament(tournamentId);
    } else {
      alert(result.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'upcoming': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'completed': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      default: return 'text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily': return <Calendar className="w-5 h-5" />;
      case 'weekly': return <TrendingUp className="w-5 h-5" />;
      case 'special': return <Zap className="w-5 h-5" />;
      default: return <Trophy className="w-5 h-5" />;
    }
  };

  const TournamentCard = ({ tournament }: { tournament: any }) => {
    const isJoined = tournament.isJoined || tournament.participants.some((p: any) => p.userId === user.id);
    const myRank = tournament.leaderboard.find((l: any) => l.userId === user.id)?.rank;

    return (
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur rounded-2xl border border-gray-700 overflow-hidden hover:border-yellow-500/30 transition-all duration-300">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {getTypeIcon(tournament.type)}
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(tournament.status)}`}>
                  {tournament.status}
                </span>
                <span className="text-xs text-gray-500">{tournament.type}</span>
              </div>
              <h3 className="text-xl font-bold mb-2">{tournament.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{tournament.description}</p>
            </div>
            <TrophyIcon className="w-12 h-12 text-yellow-500" />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-900/50 rounded-xl">
              <Coins className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">{tournament.prizePool}</p>
              <p className="text-xs text-gray-500">Prize Pool</p>
            </div>
            <div className="text-center p-3 bg-gray-900/50 rounded-xl">
              <Users className="w-6 h-6 mx-auto mb-1 text-blue-400" />
              <p className="text-2xl font-bold">{tournament.participants.length}/{tournament.maxParticipants}</p>
              <p className="text-xs text-gray-500">Participants</p>
            </div>
            <div className="text-center p-3 bg-gray-900/50 rounded-xl">
              <Clock className="w-6 h-6 mx-auto mb-1 text-purple-400" />
              <p className="text-lg font-bold">
                {Math.ceil((new Date(tournament.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d
              </p>
              <p className="text-xs text-gray-500">Remaining</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              <span className="text-sm">Entry Fee: </span>
              <span className="font-bold text-yellow-500">{tournament.entryFee} coins</span>
            </div>
            {isJoined && myRank && (
              <div className="flex items-center gap-2 text-green-400">
                <Medal className="w-5 h-5" />
                <span className="font-bold">Rank #{myRank}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {!isJoined ? (
              <button
                onClick={() => handleJoin(tournament.id)}
                disabled={tournament.status !== 'active' && tournament.status !== 'upcoming'}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join Tournament
              </button>
            ) : (
              <button
                onClick={() => setSelectedTournament(tournament.id)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl transition-all duration-300"
              >
                Play Now
              </button>
            )}
            <button
              onClick={() => setSelectedTournament(tournament.id)}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-all duration-300"
            >
              Details
            </button>
          </div>
        </div>
      </div>
    );
  };

  const TournamentDetails = ({ tournament }: { tournament: any }) => {
    const isJoined = tournament.isJoined || tournament.participants.some((p: any) => p.userId === user.id);
    const myRank = tournament.leaderboard.find((l: any) => l.userId === user.id);
    const myScore = tournament.participants.find((p: any) => p.userId === user.id);

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {getTypeIcon(tournament.type)}
                <div>
                  <h2 className="text-2xl font-bold">{tournament.name}</h2>
                  <p className="text-gray-400">{tournament.description}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTournament(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
                <Award className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <p className="text-2xl font-bold text-yellow-500">{tournament.prizePool}</p>
                <p className="text-sm text-gray-400">Prize Pool</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
                <Users className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                <p className="text-2xl font-bold">{tournament.participants.length}</p>
                <p className="text-sm text-gray-400">Participants</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30">
                <Trophy className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p className="text-2xl font-bold">{myRank?.rank || '-'}</p>
                <p className="text-sm text-gray-400">Your Rank</p>
              </div>
            </div>

            {isJoined && myScore && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30">
                <h3 className="font-bold mb-3">Your Progress</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Score</p>
                    <p className="text-2xl font-bold">{myScore.score}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Games Played</p>
                    <p className="text-2xl font-bold">{myScore.gamesPlayed}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Medal className="w-5 h-5 text-yellow-500" />
                Rewards
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-xl border border-yellow-500/30 text-center">
                  <Medal className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <p className="font-bold text-yellow-500">1st Place</p>
                  <p className="text-2xl font-bold">{tournament.rewards.first} coins</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-gray-400/20 to-gray-500/20 rounded-xl border border-gray-400/30 text-center">
                  <Award className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="font-bold text-gray-400">2nd Place</p>
                  <p className="text-2xl font-bold">{tournament.rewards.second} coins</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-orange-600/20 to-orange-700/20 rounded-xl border border-orange-600/30 text-center">
                  <Award className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                  <p className="font-bold text-orange-600">3rd Place</p>
                  <p className="text-2xl font-bold">{tournament.rewards.third} coins</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-purple-400" />
                Leaderboard
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tournament.leaderboard.slice(0, 20).map((player: any, index: number) => (
                  <div
                    key={player.userId}
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      player.userId === user.id
                        ? 'bg-blue-600/20 border border-blue-500/30'
                        : 'bg-gray-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-bold w-8 text-center ${
                        index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : 'text-gray-500'
                      }`}>
                        #{player.rank}
                      </span>
                      <span className="font-medium">{player.userName}</span>
                      {player.userId === user.id && <span className="text-xs text-blue-400">(You)</span>}
                    </div>
                    <span className="font-bold text-yellow-500">{player.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {!isJoined && (tournament.status === 'active' || tournament.status === 'upcoming') && (
              <div className="mt-6">
                <button
                  onClick={() => handleJoin(tournament.id)}
                  className="w-full px-6 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold rounded-xl transition-all duration-300"
                >
                  Join Tournament for {tournament.entryFee} coins
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (selectedTournament) {
    const tournament = tournaments.find(t => t.id === selectedTournament);
    if (tournament) {
      return <TournamentDetails tournament={tournament} />;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Trophy className="w-10 h-10 text-yellow-500" />
              Tournaments
            </h1>
            <p className="text-gray-400">Compete against players worldwide!</p>
          </div>
          <div className="flex items-center gap-2">
            <Sword className="w-6 h-6 text-red-500" />
            <span className="text-sm text-gray-400">{myMatches.length} Matches</span>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-green-400">
            <Zap className="w-6 h-6" />
            Active Tournaments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTournaments.map(tournament => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
          {activeTournaments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No active tournaments</p>
            </div>
          )}
        </div>

        {upcomingTournaments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-blue-400">
              <Clock className="w-6 h-6" />
              Upcoming Tournaments
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingTournaments.map(tournament => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          </div>
        )}

        {completedTournaments.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-400">
              <Award className="w-6 h-6" />
              Completed Tournaments
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedTournaments.map(tournament => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
