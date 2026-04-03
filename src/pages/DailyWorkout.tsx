import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy, ArrowRight, Play, Flame, Target, Star, Zap, CheckCircle, Lock, Calendar, TrendingUp, Award } from 'lucide-react';
import { useStore } from '../store/useStore.1';
import { motion } from 'framer-motion';

export default function DailyWorkoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { challenges, claimChallengeReward, updateChallengeProgress, challengeStreak, user, checkAchievements } = useStore();

  const [showCompleted, setShowCompleted] = useState(false);
  
  const completedChallenges = challenges.filter(c => c.isClaimed).length;
  const totalChallenges = challenges.length;
  const progress = (completedChallenges / totalChallenges) * 100;

  const difficultyColors = {
    easy: 'text-green-400 bg-green-400/10 border-green-400/30',
    medium: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    hard: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    expert: 'text-red-400 bg-red-400/10 border-red-400/30'
  };

  const handleClaim = (challengeId: string) => {
    claimChallengeReward(challengeId);
    checkAchievements();
  };

  const handlePlayGame = (gameId?: string) => {
    if (gameId !== undefined && gameId !== null && gameId !== '') {
      navigate(`/game/${gameId}`);
    } else {
      navigate('/');
    }
  };

  const ChallengeCard = ({ challenge }: { challenge: any }) => {
    const progressPercent = (challenge.current / challenge.target) * 100;
    const canClaim = !challenge.isClaimed && challenge.current >= challenge.target;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br ${
          challenge.isClaimed 
            ? 'from-green-900/20 to-green-800/20 border-green-500/30' 
            : canClaim 
              ? 'from-yellow-900/20 to-orange-900/20 border-yellow-500/30'
              : 'from-gray-800/50 to-gray-900/50 border-gray-700'
        } backdrop-blur rounded-2xl p-6 border`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{challenge.icon}</span>
            <div>
              <h3 className="font-bold text-lg">{challenge.title}</h3>
              <p className="text-sm text-gray-400">{challenge.description}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${difficultyColors[challenge.difficulty]}`}>
            {challenge.difficulty}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progress</span>
            <span className="font-bold">
              {challenge.current} / {challenge.target}
            </span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progressPercent || 0))}%` }}
              className={`h-full rounded-full ${
                progressPercent >= 100 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : 'bg-gradient-to-r from-yellow-500 to-orange-500'
              }`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="font-bold">{challenge.reward}</span>
            </div>
            {challenge.bonusReward && (
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-500" />
                <span className="font-bold text-purple-400">+{challenge.bonusReward}</span>
              </div>
            )}
          </div>
          {challenge.isClaimed ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-6 h-6" />
              <span className="font-bold">Claimed</span>
            </div>
          ) : canClaim ? (
            <button
              onClick={() => handleClaim(challenge.id)}
              className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl hover:scale-105 transition-transform"
            >
              Claim Reward
            </button>
          ) : (
            <Lock className="w-6 h-6 text-gray-500" />
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-yellow-500/20"
          >
            <Flame size={64} className="text-black" />
          </motion.div>
          <h1 className="text-4xl font-black mb-2">Күнделікті Міндеттер</h1>
          <p className="text-gray-400">Complete challenges to earn rewards!</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 text-center border border-yellow-500/30"
          >
            <Flame className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
            <p className="text-3xl font-bold">{challengeStreak}</p>
            <p className="text-sm text-gray-400">Day Streak</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-6 text-center border border-green-500/30"
          >
            <Target className="w-12 h-12 mx-auto mb-2 text-green-400" />
            <p className="text-3xl font-bold">{completedChallenges}/{totalChallenges}</p>
            <p className="text-sm text-gray-400">Completed</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-6 text-center border border-purple-500/30"
          >
            <TrendingUp className="w-12 h-12 mx-auto mb-2 text-purple-400" />
            <p className="text-3xl font-bold">{Math.round(progress)}%</p>
            <p className="text-sm text-gray-400">Progress</p>
          </motion.div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Award className="w-6 h-6 text-yellow-500" />
              Daily Challenges
            </h2>
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="w-5 h-5" />
              <span className="text-sm">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {challenges.slice(0, 6).map((challenge, index) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ChallengeCard challenge={challenge} />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => handlePlayGame()}
            className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl text-lg hover:scale-105 transition-transform"
          >
            Continue Playing
          </button>
        </div>
      </div>
    </div>
  );
}
