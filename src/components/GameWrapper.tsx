import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, RotateCcw, Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';

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
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { coins } = useStore();

  const handleStart = () => {
    setGameState('playing');
  };

  const handleEnd = (score: any, earnedCoins: number) => {
    setLastScore(score);
    setLastCoins(earnedCoins);
    setGameState('finished');
  };

  const handleRestart = () => {
    setGameState('playing');
  };

  const handleBack = () => {
    if (onExit) {
      onExit();
    } else {
      navigate('/');
    }
  };

  if (gameState === 'instruction') {
    return (
      <div className="flex flex-col h-screen bg-black text-white p-6">
        <button onClick={handleBack} className="mb-6 w-fit">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-bold text-primary mb-8">{title}</h1>
          <div className="bg-secondary p-6 rounded-2xl mb-8 w-full max-w-sm border border-gray-800">
            <h2 className="text-xl font-bold mb-4">{t('instructions', 'Instructions')}</h2>
            <p className="text-gray-300 leading-relaxed">
              {instructions}
            </p>
          </div>
          <button
            onClick={handleStart}
            className="bg-primary text-black font-bold py-4 px-12 rounded-full text-xl hover:scale-105 transition-transform flex items-center gap-2"
          >
            <Play size={24} fill="currentColor" />
            {t('start', 'Start')}
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="flex flex-col h-screen bg-black text-white p-6">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-bold text-primary mb-8">{t('game_over', 'Game Over')}</h1>
          
          <div className="bg-secondary p-8 rounded-2xl mb-8 w-full max-w-sm border border-gray-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
            
            <h2 className="text-2xl font-bold mb-2 text-gray-400">{t('result', 'Result')}</h2>
            <p className="text-4xl font-mono text-white mb-6">
              {typeof lastScore === 'object' ? JSON.stringify(lastScore) : lastScore}
            </p>

            <div className="flex flex-col items-center gap-2 bg-black/30 p-4 rounded-xl border border-primary/20">
              <span className="text-gray-400 text-sm">{t('coins_earned')}</span>
              <div className="flex items-center gap-2 text-primary text-3xl font-bold">
                <Coins size={32} fill="currentColor" />
                +{lastCoins}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full max-w-xs">
            <button
              onClick={handleRestart}
              className="bg-primary text-black font-bold py-3 px-8 rounded-full text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              <RotateCcw size={20} />
              {t('play_again', 'Play Again')}
            </button>
            <button
              onClick={handleBack}
              className="bg-secondary text-white font-bold py-3 px-8 rounded-full text-lg border border-gray-700 hover:bg-gray-800 transition-colors"
            >
              {t('menu', 'Menu')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      <div className="p-4 flex items-center justify-between bg-secondary/50 border-b border-gray-800">
        <button onClick={() => setGameState('instruction')} className="p-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-primary">{title}</h1>
        <div className="flex items-center gap-1 bg-gray-800 px-3 py-1 rounded-full text-xs border border-primary/30 text-primary">
          <Coins size={14} />
          {coins}
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
        {children({ onEnd: handleEnd })}
      </div>
    </div>
  );
};
