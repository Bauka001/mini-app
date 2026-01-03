import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy, ArrowRight, Play } from 'lucide-react';
import { useStore } from '../store/useStore';

// We will render the actual game components inside here
// but we need to pass a special onEnd prop that doesn't just navigate back
import { SchulteBoard } from './games/SchulteGame';
import { MathBoard } from './games/MathGame';
import { OddOneOutBoard } from './games/OddOneOutGame';
import { GameWrapper } from '../components/GameWrapper';

// Wrapper for individual games to override their behavior
const GameContainer = ({ 
  gameId, 
  onNext 
}: { 
  gameId: string, 
  onNext: (score: string, coins: number) => void 
}) => {
  const { t } = useTranslation();

  const renderGame = () => {
    switch (gameId) {
      case 'odd-one':
        return (
           <GameWrapper title={t('game_odd_one', 'Odd One Out')} instructions={t('odd_one_desc')}>
              {({ onEnd }) => <OddOneOutBoard onEnd={(s, c) => { onEnd(s, c); onNext(s, c); }} />}
           </GameWrapper>
        );
      case 'schulte':
        return (
          <GameWrapper title={t('game_schulte', 'Schulte Table')} instructions={t('schulte_desc')}>
             {({ onEnd }) => <SchulteBoard onEnd={(s, c) => { onEnd(s, c); onNext(s, c); }} />}
          </GameWrapper>
        );
      case 'math':
        return (
          <GameWrapper title={t('game_math', 'Arithmetic')} instructions={t('math_desc')}>
             {({ onEnd }) => <MathBoard onEnd={(s, c) => { onEnd(s, c); onNext(s, c); }} />}
          </GameWrapper>
        );
      default:
        return <div>Unknown Game</div>;
    }
  };

  return (
    <div className="h-full w-full absolute inset-0 bg-black z-50">
       {renderGame()}
    </div>
  );
};

const WORKOUT_PLAN = ['odd-one', 'schulte', 'math'];

export const DailyWorkoutPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addGameResult } = useStore();

  const [step, setStep] = useState(0); // 0=Intro, 1=Game1, 2=Rest, 3=Game2, 4=Rest, 5=Game3, 6=Summary
  const [results, setResults] = useState<{game: string, score: string, coins: number}[]>([]);
  
  const currentGameIndex = Math.floor((step - 1) / 2);
  const currentGameId = WORKOUT_PLAN[currentGameIndex];

  const handleGameEnd = (score: string, coins: number) => {
    setResults(prev => [...prev, { game: currentGameId, score, coins }]);
    addGameResult({ gameId: currentGameId, score, coinsEarned: coins });
    
    if (currentGameIndex < WORKOUT_PLAN.length - 1) {
      setStep(prev => prev + 1); // Go to Rest
    } else {
      setStep(6); // Go to Summary
    }
  };

  const startNext = () => {
    setStep(prev => prev + 1);
  };

  if (step === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6 animate-pulse">
           <Trophy size={48} className="text-primary" />
        </div>
        <h1 className="text-3xl font-black mb-2">{t('daily_workout')}</h1>
        <p className="text-gray-400 mb-8 max-w-xs">{t('workout_desc')}</p>
        
        <div className="space-y-4 w-full max-w-xs mb-8">
           {WORKOUT_PLAN.map((id, idx) => (
             <div key={id} className="flex items-center gap-4 bg-white/5 p-4 rounded-xl">
               <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
               <span className="capitalize font-bold">{id.replace('-', ' ')}</span>
             </div>
           ))}
        </div>

        <button 
          onClick={() => setStep(1)}
          className="w-full max-w-xs py-4 bg-primary text-black font-bold rounded-xl text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
        >
          <Play size={20} />
          {t('start')}
        </button>
        
        <button onClick={() => navigate(-1)} className="mt-6 text-gray-500 text-sm font-bold">
          {t('cancel')}
        </button>
      </div>
    );
  }

  if (step === 6) {
    const totalCoins = results.reduce((acc, curr) => acc + curr.coins, 0);
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-black mb-6 text-primary">Workout Complete!</h1>
        
        <div className="grid gap-4 w-full max-w-xs mb-8">
          {results.map((res, idx) => (
            <div key={idx} className="bg-white/10 p-4 rounded-xl flex justify-between items-center">
               <span className="capitalize text-gray-400">{res.game.replace('-', ' ')}</span>
               <div className="flex flex-col items-end">
                 <span className="font-bold text-white">{res.score}</span>
                 <span className="text-xs text-yellow-400">+{res.coins} coins</span>
               </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-2xl w-full max-w-xs mb-8">
           <span className="text-black/60 font-bold uppercase text-xs">Total Reward</span>
           <div className="text-4xl font-black text-black">+{totalCoins}</div>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="w-full max-w-xs py-4 bg-white text-black font-bold rounded-xl"
        >
          {t('done')}
        </button>
      </div>
    );
  }

  // Rest Screen
  if (step % 2 === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
         <h2 className="text-2xl font-bold mb-4">Great Job!</h2>
         <p className="text-gray-400 mb-8">Take a breath...</p>
         <button 
           onClick={startNext}
           className="px-8 py-3 bg-primary text-black font-bold rounded-xl flex items-center gap-2"
         >
           Next Game <ArrowRight size={20} />
         </button>
      </div>
    );
  }

  // Game Screen
  // Since we can't easily embed the full game logic without refactoring, 
  // We will redirect for now, but in a real app, we would render the component.
  // FOR THIS DEMO: I will render a text saying "Imagine Game Here" 
  // OR I can use an iframe approach? No.
  // I will just use the Mock GameContainer for now to prove the flow.
  return <GameContainer gameId={currentGameId} onNext={handleGameEnd} />;
};

export default DailyWorkoutPage;
