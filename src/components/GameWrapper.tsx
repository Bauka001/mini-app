import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Play, RotateCcw, Coins, Share2, Puzzle, Activity, Brain, Calculator, Keyboard, Zap, Trophy, Star, Pause, Home, Target, Route } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStoreImpl';
import { soundManager } from '../utils/soundManager';
import { hapticFeedback } from '../utils/telegram';
import { ChestModal } from './ChestModal';
import { DailyQuestPopup } from './DailyQuestPopup';
import { motion, AnimatePresence } from 'framer-motion';
import { TierBadge, PersonalBestPill, Confetti, RewardLine, useGameResult } from './GameResult';

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

/**
 * Stand-alone post-game screen with tiered ranking, personal-best tracking,
 * confetti for high tiers, and bonus coin display for Diamond / Platinum.
 */
const GameOverScreen: React.FC<{
  gameId: string;
  title: string;
  lastScore: unknown;
  lastCoins: number;
  onRestart: () => void;
  onShare: () => void;
  onBack: () => void;
}> = ({ gameId, title, lastScore, lastCoins, onRestart, onShare, onBack }) => {
  const { t } = useTranslation();
  const { numeric, prevBest, isNewBest, tier, tierBonus } = useGameResult(gameId, lastScore, lastCoins);
  const tierMsg = {
    bronze: 'Бастамашы',
    silver: 'Жақсы',
    gold: 'Ең жоғары',
    platinum: 'Топ',
    diamond: 'Аңыз',
  }[tier];
  return (
    <div className="flex flex-col h-screen bg-black text-white relative overflow-hidden">
      <Confetti tier={tier} />
      <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex-1 overflow-y-auto px-6 pt-6 pb-4 flex flex-col items-center text-center">
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-3">
          <div className="text-xs text-stone-400 uppercase tracking-widest font-bold">{title}</div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-amber-300 to-rose-400 bg-clip-text text-transparent">
            {tierMsg}!
          </h1>
        </motion.div>

        <TierBadge tier={tier} large />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-4 mb-2 px-3 py-1 rounded-full bg-stone-800/80 border border-stone-700 text-[10px] uppercase tracking-widest text-stone-300"
        >Тур қорытындысы</motion.div>

        <motion.div
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.3 }}
          className="mb-1"
        >
          <div className="text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(251,191,36,0.45)]">
            {typeof lastScore === 'object' ? JSON.stringify(lastScore) : lastScore}
          </div>
        </motion.div>

        <div className="mb-4">
          <PersonalBestPill best={prevBest} current={numeric} isNewBest={isNewBest} />
        </div>

        <div className="w-full max-w-sm space-y-2 mb-5">
          <RewardLine icon="🪙" label={t('coins_earned', 'Coins earned')} value={`+${lastCoins}`} tone="primary" />
          {tierBonus > 0 && (
            <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
              <RewardLine
                icon={tier === 'diamond' ? '💎' : '🏆'}
                label={tier === 'diamond' ? 'Алмаз бонусы (×2)' : 'Платина бонусы (+50%)'}
                value={`+${tierBonus}`}
                tone={tier === 'diamond' ? 'focus' : 'gem'}
              />
            </motion.div>
          )}
        </div>

        <div className="w-full max-w-xs flex flex-col gap-2.5">
          <button
            onClick={onRestart}
            className="bg-white text-black font-bold py-3.5 px-8 rounded-xl text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg"
          >
            <RotateCcw size={20} />
            {t('play_again', 'Play Again')}
          </button>
          <button
            onClick={onShare}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-3 px-8 rounded-xl text-base hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg"
          >
            <Share2 size={18} />
            {t('share_result', 'Share')}
          </button>
          <button
            onClick={onBack}
            className="bg-transparent text-white font-bold py-3 px-8 rounded-xl text-base border border-white/20 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <Home size={18} />
            {t('menu', 'Menu')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const GameWrapper: React.FC<GameWrapperProps> = ({ title, instructions, children, onExit }) => {
  const location = useLocation();
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

          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 mb-2 drop-shadow-lg leading-tight">{title}</h1>

          {/* Personal best preview from earlier sessions — motivation pre-play */}
          {(() => {
            const m = /\/game\/([a-z0-9-]+)/.exec(location.pathname);
            const id = m ? m[1] : null;
            if (!id) return null;
            let best = 0;
            try { best = parseInt(localStorage.getItem(`focus-best:${id}`) || '0', 10) || 0; } catch {}
            if (best <= 0) return null;
            return (
              <div className="mb-3 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 inline-flex items-center gap-1.5 text-xs font-bold text-amber-200">
                🏆 Жеке рекорд: <span className="text-amber-100">{best}</span>
              </div>
            );
          })()}

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

  // 2. GAME OVER SCREEN — tiered result + confetti + personal best
  if (gameState === 'finished') {
    // Pull gameId from URL path (/game/<id>) for the per-game personal best
    const pathMatch = /\/game\/([a-z0-9-]+)/.exec(location.pathname);
    const gameId = pathMatch ? pathMatch[1] : 'unknown';
    return <GameOverScreen
      gameId={gameId}
      title={title}
      lastScore={lastScore}
      lastCoins={lastCoins}
      onRestart={handleRestart}
      onShare={handleShare}
      onBack={handleBack}
    />;
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
