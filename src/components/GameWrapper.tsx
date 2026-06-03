import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, RotateCcw, Coins, Share2, Puzzle, Activity, Brain, Calculator, Keyboard, Zap, Trophy, Star, Pause, Home, Target, Route } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStoreImpl';
import { soundManager } from '../utils/soundManager';
import { hapticFeedback } from '../utils/telegram';
import { ChestModal } from './ChestModal';
import { DailyQuestPopup } from './DailyQuestPopup';
import { motion, AnimatePresence } from 'framer-motion';

type GameState = 'instruction' | 'playing' | 'paused' | 'finished';

interface GameWrapperProps {
  title: string;
  instructions: string;
  children: (props: { onEnd: (score: string | number, coins: number) => void; isPaused: boolean; theme: string }) => React.ReactNode;
  onExit?: () => void;
}

const getGameEmblem = (title: string) => {
  const emblemStyles: Record<string, { icon: React.ReactNode; color: string; glow: string }> = {
    'Tetris': { icon: <Puzzle size={80} strokeWidth={1.5} />, color: 'from-cyan-400 to-blue-600', glow: 'shadow-cyan-500/50' },
    'Merge 2048': { icon: <Zap size={80} strokeWidth={1.5} />, color: 'from-yellow-400 to-orange-600', glow: 'shadow-yellow-500/50' },
    'Memory Matrix': { icon: <Brain size={80} strokeWidth={1.5} />, color: 'from-purple-400 to-pink-600', glow: 'shadow-purple-500/50' },
    'Stroop Test': { icon: <Activity size={80} strokeWidth={1.5} />, color: 'from-red-400 to-rose-600', glow: 'shadow-red-500/50' },
    'Math Challenge': { icon: <Calculator size={80} strokeWidth={1.5} />, color: 'from-green-400 to-emerald-600', glow: 'shadow-green-500/50' },
    'Speed Typing': { icon: <Keyboard size={80} strokeWidth={1.5} />, color: 'from-indigo-400 to-violet-600', glow: 'shadow-indigo-500/50' },
    'Schulte': { icon: <Star size={80} strokeWidth={1.5} />, color: 'from-amber-400 to-yellow-600', glow: 'shadow-amber-500/50' },
    'Agent Spot': { icon: <Target size={80} strokeWidth={1.5} />, color: 'from-cyan-300 to-red-500', glow: 'shadow-cyan-500/50' },
    'Agent Sequence': { icon: <Route size={80} strokeWidth={1.5} />, color: 'from-cyan-300 to-violet-500', glow: 'shadow-cyan-500/50' },
  };
  return emblemStyles[title] || { icon: <Trophy size={80} strokeWidth={1.5} />, color: 'from-gray-400 to-gray-600', glow: 'shadow-gray-500/50' };
};

export const GameWrapper: React.FC<GameWrapperProps> = ({ title, instructions, children, onExit }) => {
  const [gameState, setGameState] = useState<GameState>('instruction');
  const [lastScore, setLastScore] = useState<any>(null);
  const [lastCoins, setLastCoins] = useState<number>(0);
  const [showChest, setShowChest] = useState(false);
  const [showQuestPopup, setShowQuestPopup] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { coins, soundEnabled, dailyQuest, claimDailyQuestReward, theme } = useStore();

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const handleShare = () => {
    hapticFeedback.click();
    soundManager.playClick();
    const shareText = `Менде ${title} ойынын ойнадым! 🎮\nҰпай: ${lastScore} | Coins: +${lastCoins}`;
    const botUrl = 'https://t.me/Focus_game_bot';

    try {
      if (navigator.share) {
        navigator.share({
          title: `${title} - Focus App`,
          text: shareText,
          url: botUrl
        });
      } else if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        if (tg.openTelegramLink) {
          const encodedText = encodeURIComponent(shareText);
          tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(botUrl)}&text=${encodedText}`);
        } else {
          navigator.clipboard.writeText(shareText + ' ' + botUrl);
          alert('Мәтін көшірілді! 📋');
        }
      } else {
        navigator.clipboard.writeText(shareText + ' ' + botUrl);
        alert('Мәтін көшірілді! 📋');
      }
    } catch (error) {
      console.error('Share error:', error);
      navigator.clipboard.writeText(shareText + ' ' + botUrl);
      alert('Мәтін көшірілді! 📋');
    }
  };

  const handleStart = () => {
    hapticFeedback.impact('medium');
    soundManager.playClick();
    setGameState('playing');
  };

  const handlePause = () => {
    hapticFeedback.click();
    soundManager.playClick();
    setGameState('paused');
  };

  const handleResume = () => {
    hapticFeedback.impact('light');
    soundManager.playClick();
    setGameState('playing');
  };

  const handleEnd = (score: any, earnedCoins: number) => {
    setLastScore(score);
    setLastCoins(earnedCoins);

    if (earnedCoins > 0) {
      hapticFeedback.notification('success');
      soundManager.playWin();
      setShowChest(true);
    } else {
      hapticFeedback.notification('success');
      soundManager.playSuccess();
      setGameState('finished');
    }
  };

  const handleChestClose = () => {
    hapticFeedback.click();
    setShowChest(false);
    setGameState('finished');

    const currentQuest = useStore.getState().dailyQuest;

    if (currentQuest.isCompleted && !currentQuest.isClaimed) {
      setShowQuestPopup(true);
    }
  };

  const handleRestart = () => {
    hapticFeedback.impact('medium');
    soundManager.playClick();
    setGameState('playing');
  };

  const handleBack = () => {
    hapticFeedback.click();
    soundManager.playClick();
    if (onExit) {
      onExit();
    } else {
      navigate('/');
    }
  };

  // 1. INSTRUCTION SCREEN
  if (gameState === 'instruction') {
    const emblem = getGameEmblem(title);
    return (
      <div className="flex flex-col h-screen bg-black text-white relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Bar — sticky so the back button stays reachable while scrolling */}
        <div className="relative z-20 p-4 flex justify-between items-center bg-black/30 backdrop-blur-sm shrink-0">
            <button onClick={handleBack} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <ArrowLeft size={24} />
            </button>
        </div>

        {/* Scrollable instruction area — long rulebooks no longer hide the Start
            button below the fold. flex-1 + overflow-y-auto lets the body grow
            and scroll while the top bar + bottom Start CTA stay anchored. */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 pt-2 pb-4 text-center"
             style={{ WebkitOverflowScrolling: 'touch' as never }}>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.8, bounce: 0.5 }}
            className={`mx-auto mb-4 p-5 rounded-full bg-gradient-to-br ${emblem.color} shadow-2xl ${emblem.glow} w-fit`}
          >
            <div className="text-white drop-shadow-lg scale-110">
              {emblem.icon}
            </div>
          </motion.div>

          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 mb-4 drop-shadow-lg leading-tight">{title}</h1>

          <div className="bg-secondary/80 backdrop-blur-xl p-5 rounded-3xl mb-4 w-full max-w-sm mx-auto border border-white/10 shadow-2xl text-left">
            <h2 className="text-base font-bold mb-2 text-white uppercase tracking-wider text-center">{t('instructions', 'Instructions')}</h2>
            <div className="text-gray-300 leading-relaxed text-sm space-y-2 whitespace-pre-line">
              {instructions.split(/\n\s*\n/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky bottom CTA — always visible regardless of instruction length */}
        <div className="relative z-20 px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black via-black/95 to-transparent shrink-0">
          <button
            onClick={handleStart}
            className="w-full max-w-xs mx-auto group bg-gradient-to-r from-primary to-orange-400 text-black font-black py-4 px-8 rounded-2xl text-xl hover:scale-105 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-4"
          >
            <Play size={24} fill="currentColor" className="group-hover:translate-x-1 transition-transform" />
            {t('start', 'Start')}
          </button>
        </div>
      </div>
    );
  }

  // 2. GAME OVER SCREEN
  if (gameState === 'finished') {
    return (
      <div className="flex flex-col h-screen bg-black text-white p-6 relative overflow-hidden">
        <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-black text-white mb-8">{t('game_over', 'Game Over')}</h1>
          
          <div className="bg-secondary/80 backdrop-blur-xl p-8 rounded-3xl mb-8 w-full max-w-sm border border-white/10 shadow-2xl">
            <div className="text-gray-400 text-sm font-medium uppercase tracking-wide mb-2">{t('final_score', 'Final Score')}</div>
            <p className="text-6xl font-black text-white mb-8">
              {typeof lastScore === 'object' ? JSON.stringify(lastScore) : lastScore}
            </p>

            <div className="flex flex-col items-center gap-2 bg-black/40 p-4 rounded-2xl border border-white/5">
              <span className="text-gray-400 text-sm font-medium uppercase tracking-wide">{t('coins_earned', 'Coins Earned')}</span>
              <div className="flex items-center gap-2 text-primary text-4xl font-black">
                <Coins size={32} fill="currentColor" />
                +{lastCoins}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={handleRestart}
              className="bg-white text-black font-bold py-3.5 px-8 rounded-xl text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg"
            >
              <RotateCcw size={20} />
              {t('play_again', 'Play Again')}
            </button>
            <button
              onClick={handleShare}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-3.5 px-8 rounded-xl text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg"
            >
              <Share2 size={20} />
              {t('share_result')}
            </button>
            <button
              onClick={handleBack}
              className="bg-transparent text-white font-bold py-3.5 px-8 rounded-xl text-lg border border-white/20 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <Home size={20} />
              {t('menu', 'Menu')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. PLAYING SCREEN
  return (
    <div className="h-screen bg-black text-white flex flex-col relative">
      {/* Background */}
      <div className="absolute top-[-50%] left-[-50%] w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Bar */}
      <div className="relative z-20 px-4 py-3 flex items-center justify-between bg-secondary/30 backdrop-blur-md border-b border-white/5 shadow-md">
        <button onClick={handlePause} className="p-2 rounded-full hover:bg-white/10 transition-colors active:scale-95">
          <Pause size={24} className="text-white" fill="currentColor" />
        </button>
        
        <h1 className="font-bold text-lg text-primary tracking-wide absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
            {title}
        </h1>
        
        <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full text-sm border border-primary/20 text-primary font-bold">
          <Coins size={16} fill="currentColor" />
          {coins}
        </div>
      </div>

      {/* Game Content */}
      <div className="flex-1 overflow-y-auto relative z-10">
        {children({ onEnd: handleEnd, isPaused: gameState === 'paused', theme })}
      </div>

      {/* Pause Modal */}
      <AnimatePresence>
        {gameState === 'paused' && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-gray-900 border border-white/10 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl"
                >
                    <h2 className="text-3xl font-black text-white mb-2">{t('paused_title')}</h2>
                    <p className="text-gray-400 mb-8">{t('paused_desc')}</p>
                    
                    <div className="space-y-3">
                        <button 
                            onClick={handleResume}
                            className="w-full py-4 bg-primary text-black font-black rounded-xl text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                        >
                            <Play size={24} fill="currentColor" />
                            {t('resume')}
                        </button>
                        
                        <button 
                            onClick={handleRestart}
                            className="w-full py-4 bg-white/10 text-white font-bold rounded-xl text-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={20} />
                            {t('restart')}
                        </button>
                        
                        <button 
                            onClick={handleBack}
                            className="w-full py-4 bg-transparent border border-white/10 text-gray-300 font-bold rounded-xl text-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                        >
                            <Home size={20} />
                            {t('exit')}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      <ChestModal
        isOpen={showChest}
        onClose={handleChestClose}
        gameTitle={title}
      />

      <DailyQuestPopup
        isOpen={showQuestPopup}
        onClose={() => setShowQuestPopup(false)}
        onClaim={claimDailyQuestReward}
        gamesPlayed={dailyQuest.gamesPlayed}
        isClaimed={dailyQuest.isClaimed}
      />
    </div>
  );
};
