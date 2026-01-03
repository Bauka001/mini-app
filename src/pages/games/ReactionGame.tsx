import { useState, useRef, useEffect } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { clsx } from 'clsx';
import { Zap, AlertCircle, RotateCcw, Home } from 'lucide-react';
import { soundManager } from '../../utils/soundManager';
import { useNavigate } from 'react-router-dom';

const ReactionBoard = ({ onEnd }: { onEnd: (score: string, coins: number) => void }) => {
  const navigate = useNavigate();
  const [state, setState] = useState<'waiting' | 'ready' | 'clicked' | 'early' | 'finished'>('waiting');
  const [startTime, setStartTime] = useState(0);
  const [reactionTime, setReactionTime] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startRound();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const startRound = () => {
    setState('waiting');
    const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
    
    timeoutRef.current = setTimeout(() => {
      setState('ready');
      setStartTime(Date.now());
    }, delay);
  };

  const handleClick = () => {
    if (state === 'waiting') {
      setState('early');
      soundManager.playError();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else if (state === 'ready') {
      const time = Date.now() - startTime;
      setReactionTime(time);
      setState('clicked');
      setScores(prev => [...prev, time]);
      soundManager.playSuccess();
    }
  };

  const handleNext = () => {
    if (attempts >= 4) { // 5 rounds total
      const avg = Math.floor(scores.reduce((a, b) => a + b, 0) / scores.length);
      const coins = Math.max(0, Math.floor((400 - avg) / 5)); // Faster = more coins
      onEnd(`${avg} ms`, coins);
      // We don't set 'finished' state here because onEnd usually switches the view in GameWrapper.
      // But if we want custom buttons inside the board before ending, we can do it.
      // However, GameWrapper handles the "Game Over" screen.
      // The user requested "Play Again" and "Menu" buttons. GameWrapper ALREADY has them!
      // "енді кезекте жалғастыру қайтадан меню кнопкасын қос" -> Add "Next" / "Continue" button during rounds?
      // Or maybe the user means on the final screen?
      // GameWrapper's finished state has "Play Again" and "Menu".
      // Let's assume the user wants better flow BETWEEN rounds.
    } else {
      setAttempts(prev => prev + 1);
      startRound();
    }
  };

  const handleRetry = () => {
    startRound();
  };

  return (
    <div 
      className={clsx(
        "w-full h-full flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 p-6 rounded-3xl select-none",
        state === 'waiting' && "bg-red-500 hover:bg-red-600",
        state === 'ready' && "bg-green-500 active:bg-green-600",
        state === 'early' && "bg-blue-500",
        state === 'clicked' && "bg-blue-500"
      )}
      onMouseDown={handleClick}
      onTouchStart={handleClick}
    >
      {state === 'waiting' && (
        <div className="text-center animate-pulse">
          <h2 className="text-5xl font-black text-white mb-4">WAIT...</h2>
          <Zap size={48} className="text-white/50 mx-auto" />
        </div>
      )}

      {state === 'ready' && (
        <div className="text-center">
          <h2 className="text-6xl font-black text-white animate-bounce">CLICK!</h2>
        </div>
      )}

      {state === 'early' && (
        <div className="text-center w-full h-full flex flex-col items-center justify-center" onClick={(e) => { e.stopPropagation(); handleRetry(); }}>
          <AlertCircle size={80} className="text-white mx-auto mb-6" />
          <h2 className="text-4xl font-black text-white mb-4">Too Early!</h2>
          <p className="text-white/80 text-xl font-bold animate-pulse mb-8">Tap to try again</p>
          
          <div className="flex gap-4">
             <button 
               onClick={(e) => { e.stopPropagation(); navigate('/'); }}
               className="px-6 py-3 bg-white/20 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-white/30"
             >
               <Home size={20} /> Menu
             </button>
             <button 
               onClick={(e) => { e.stopPropagation(); handleRetry(); }}
               className="px-6 py-3 bg-white text-blue-600 font-bold rounded-xl flex items-center gap-2 hover:scale-105 transition-transform"
             >
               <RotateCcw size={20} /> Retry
             </button>
          </div>
        </div>
      )}

      {state === 'clicked' && (
        <div className="text-center w-full h-full flex flex-col items-center justify-center" onClick={(e) => { e.stopPropagation(); handleNext(); }}>
          <Zap size={80} className="text-white mx-auto mb-6" />
          <h2 className="text-7xl font-black text-white mb-4">{reactionTime} ms</h2>
          <p className="text-white/80 text-xl font-bold animate-pulse mb-8">Tap to continue</p>
          
          <button 
             onClick={(e) => { e.stopPropagation(); handleNext(); }}
             className="px-8 py-4 bg-white text-blue-600 font-bold rounded-2xl text-xl hover:scale-105 transition-transform shadow-lg"
           >
             {attempts >= 4 ? "Finish Game" : "Next Round"}
           </button>
        </div>
      )}
      
      <div className="absolute bottom-10 text-white/50 font-bold text-sm">
        Round {attempts + 1} / 5
      </div>
    </div>
  );
};

const ReactionGame = () => {
  return (
    <GameWrapper
      title="Reaction"
      instructions="1. Wait for RED.\n2. Tap when GREEN."
    >
      {({ onEnd }) => <ReactionBoard onEnd={onEnd} />}
    </GameWrapper>
  );
};

export default ReactionGame;
