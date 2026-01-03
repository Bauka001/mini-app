import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, RotateCcw, Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { soundManager } from '../utils/soundManager';
import { ChestModal } from './ChestModal';

type GameState = 'instruction' | 'playing' | 'finished';

interface GameWrapperProps {
  title: string;
  instructions: string;
  children: (props: { onEnd: (score: any, coins: number) => void }) => React.ReactNode;
  onExit?: () => void;
}

export const GameWrapper: React.FC<GameWrapperProps> = ({ title, instructions, children, onExit }) => {
  const [gameState, setGameState] = useState<GameState>('instruction');
  const [lastScore, setLastScore] = useState<any>(null);
  const [lastCoins, setLastCoins] = useState<number>(0);
  const [showChest, setShowChest] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { coins, soundEnabled } = useStore();

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const handleStart = () => {
    soundManager.playClick();
    setGameState('playing');
  };

  const handleEnd = (score: any, earnedCoins: number) => {
    setLastScore(score);
    setLastCoins(earnedCoins);
    
    if (earnedCoins > 0) {
      soundManager.playWin();
      setShowChest(true); // Show chest if user won
    } else {
      soundManager.playSuccess();
      setGameState('finished');
    }
  };

  const handleChestClose = () => {
    setShowChest(false);
    setGameState('finished');
  };

  const handleRestart = () => {
    soundManager.playClick();
    setGameState('playing');
  };

  const handleBack = () => {
    soundManager.playClick();
    if (onExit) {
      onExit();
    } else {
      navigate('/');
    }
  };

  if (gameState === 'instruction') {
    return (
      <div className="flex flex-col h-screen bg-black text-white p-6 relative overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        
        <button onClick={handleBack} className="relative z-10 mb-6 w-fit p-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft size={24} />
        </button>
        
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 mb-8 drop-shadow-lg">{title}</h1>
          
          <div className="bg-secondary/80 backdrop-blur-xl p-8 rounded-3xl mb-12 w-full max-w-sm border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-white uppercase tracking-wider">{t('instructions', 'Instructions')}</h2>
            <p className="text-gray-300 leading-relaxed text-lg">
              {instructions}
            </p>
          </div>
          
          <button
            onClick={handleStart}
            className="group bg-gradient-to-r from-primary to-orange-400 text-black font-black py-5 px-16 rounded-full text-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_40px_rgba(255,215,0,0.5)] flex items-center gap-3"
          >
            <Play size={28} fill="currentColor" className="group-hover:translate-x-1 transition-transform" />
            {t('start', 'Start')}
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="flex flex-col h-screen bg-black text-white p-6 relative overflow-hidden">
        <div className="absolute bottom-[-20%] left-[-20%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-bold text-white mb-8">{t('game_over', 'Game Over')}</h1>
          
          <div className="bg-secondary/80 backdrop-blur-xl p-8 rounded-3xl mb-8 w-full max-w-sm border border-white/10 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
            
            <h2 className="text-2xl font-bold mb-2 text-gray-400">{t('result', 'Result')}</h2>
            <p className="text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 mb-8">
              {typeof lastScore === 'object' ? JSON.stringify(lastScore) : lastScore}
            </p>

            <div className="flex flex-col items-center gap-2 bg-black/40 p-4 rounded-2xl border border-white/5">
              <span className="text-gray-400 text-sm font-medium uppercase tracking-wide">{t('coins_earned')}</span>
              <div className="flex items-center gap-2 text-primary text-4xl font-black">
                <Coins size={32} fill="currentColor" />
                +{lastCoins}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full max-w-xs">
            <button
              onClick={handleRestart}
              className="bg-white text-black font-bold py-4 px-8 rounded-full text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg"
            >
              <RotateCcw size={20} />
              {t('play_again', 'Play Again')}
            </button>
            <button
              onClick={handleBack}
              className="bg-transparent text-white font-bold py-4 px-8 rounded-full text-lg border border-white/20 hover:bg-white/10 transition-colors"
            >
              {t('menu', 'Menu')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col relative">
       {/* In-game background glow */}
      <div className="absolute top-[-50%] left-[-50%] w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="relative z-10 p-4 flex items-center justify-between bg-secondary/30 backdrop-blur-md border-b border-white/5">
        <button onClick={() => setGameState('instruction')} className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-lg text-primary tracking-wide">{title}</h1>
        <div className="flex items-center gap-1.5 bg-black/40 px-4 py-1.5 rounded-full text-sm border border-primary/20 text-primary font-bold">
          <Coins size={16} fill="currentColor" />
          {coins}
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative z-10">
        {children({ onEnd: handleEnd })}
      </div>

      <ChestModal 
        isOpen={showChest} 
        onClose={handleChestClose} 
        gameTitle={title} 
      />
    </div>
  );
};
