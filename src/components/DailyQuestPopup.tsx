import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Coins, X, CheckCircle } from 'lucide-react';

interface DailyQuestPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: () => void;
  gamesPlayed: string[];
  isClaimed: boolean;
}

const gameNames: Record<string, string> = {
  'schulte': 'Schulte',
  'math': 'Math Challenge',
  'stroop': 'Stroop Test',
  'memory': 'Memory Matrix',
  'odd-one': 'Odd One Out',
  'pairs': 'Pairs',
  'tetris': 'Tetris',
  '2048': 'Merge 2048'
};

export const DailyQuestPopup: React.FC<DailyQuestPopupProps> = ({
  isOpen,
  onClose,
  onClaim,
  gamesPlayed,
  isClaimed
}) => {
  const uniqueGames = [...new Set(gamesPlayed)];
  const progress = Math.min(uniqueGames.length, 3);
  const progressSlots = [...Array.from({ length: progress }, (_, index) => uniqueGames[index]), ...Array.from({ length: Math.max(0, 3 - progress) }, (_, index) => `slot-${index}`)];

  useEffect(() => {
    if (isOpen && uniqueGames.length >= 3 && !isClaimed) {
      const timer = setTimeout(() => {
        onClaim();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, uniqueGames.length, isClaimed, onClaim]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 50 }}
            transition={{ type: 'spring', duration: 0.6, bounce: 0.4 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 w-full max-w-md border border-yellow-500/30 shadow-2xl shadow-yellow-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', duration: 0.5 }}
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/40"
              >
                <Trophy size={48} className="text-black" />
              </motion.div>

              <h2 className="text-3xl font-black text-white mb-2">
                {progress >= 3 && !isClaimed ? 'Quest Complete!' : 'Daily Quest'}
              </h2>
              <p className="text-gray-400 mb-6">
                {progress >= 3
                  ? 'Congratulations! You played 3 different games!'
                  : `Play 3 different games today. Keep going!`}
              </p>

              <div className="bg-black/30 rounded-2xl p-4 mb-6 border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-400 text-sm font-medium">Progress</span>
                  <span className="text-white font-bold">{progress}/3</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress / 3) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      progress >= 3
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    }`}
                  />
                </div>

                <div className="flex justify-center gap-2 flex-wrap">
                  {progressSlots.map((gameId) => {
                    const isCompletedGame = uniqueGames.includes(gameId);
                    const isPlaceholder = gameId.startsWith('slot-');

                    return (
                      <div
                        key={gameId}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                          isCompletedGame
                            ? 'bg-green-500/20 border-green-500/50 text-green-400'
                            : 'bg-gray-800 border-gray-600 text-gray-500'
                        }`}
                      >
                        {isCompletedGame && (
                          <CheckCircle size={12} className="inline mr-1" />
                        )}
                        {isPlaceholder ? 'Empty Slot' : gameNames[gameId] || gameId}
                      </div>
                    );
                  })}
                </div>
              </div>

              {progress >= 3 && !isClaimed && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-2 bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6"
                >
                  <Coins size={24} className="text-yellow-500" />
                  <span className="text-yellow-500 font-black text-xl">+50 Coins!</span>
                </motion.div>
              )}

              <div className="flex gap-3">
                {progress >= 3 && !isClaimed ? (
                  <button
                    onClick={() => {
                      onClaim();
                      onClose();
                    }}
                    className="flex-1 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-black rounded-xl text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                  >
                    <Trophy size={20} />
                    Claim Reward
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 bg-white/10 text-white font-bold rounded-xl text-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                  >
                    Continue
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
