import { useState, useEffect, useRef } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStore';
import { Brain, Star, Heart, Zap, Coffee, Anchor, Music, Sun } from 'lucide-react';

const ICONS = [Brain, Star, Heart, Zap, Coffee, Anchor, Music, Sun];

export const PairsGame = () => {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  
  return (
    <GameWrapper
      title={t('game_pairs', 'Pairs')}
      instructions={t('pairs_desc', 'Find all matching pairs of cards.')}
    >
      {({ onEnd }) => <PairsBoard onEnd={(score, coins) => {
        addGameResult({ gameId: 'pairs', score, coinsEarned: coins });
        onEnd(score, coins);
      }} />}
    </GameWrapper>
  );
};

interface Card {
  id: number;
  iconIndex: number;
  isFlipped: boolean;
  isMatched: boolean;
}

const PairsBoard = ({ onEnd }: { onEnd: (score: string, coins: number) => void }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPreviewing, setIsPreviewing] = useState(true);
  
  // Use ref for immediate win check
  const matchesRef = useRef(0);

  // Initialize Game
  useEffect(() => {
    const totalPairs = 6; // 12 cards total
    const selectedIcons = ICONS.slice(0, totalPairs);
    const deck = [...selectedIcons, ...selectedIcons]
      .map((_, index) => ({
        id: index,
        iconIndex: index % totalPairs,
        isFlipped: true, // Show initially
        isMatched: false
      }))
      .sort(() => Math.random() - 0.5);
    
    setCards(deck);
    matchesRef.current = 0;

    // Preview phase
    const previewTimer = setTimeout(() => {
      setCards(prev => prev.map(c => ({ ...c, isFlipped: false })));
      setIsPreviewing(false);
      
      // Start Game Timer only after preview
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0.1) {
            clearInterval(timer);
            onEnd(`Time's up`, 0);
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
      
      // Cleanup timer if component unmounts
      return () => clearInterval(timer);
    }, 3000); // 3 seconds preview

    return () => clearTimeout(previewTimer);
  }, []);

  const handleCardClick = (index: number) => {
    // Ignore if previewing, already matched, flipped, or if 2 cards already flipped
    if (isPreviewing || cards[index].isMatched || cards[index].isFlipped || flippedIndices.length >= 2) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);
    
    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      
      if (cards[first].iconIndex === cards[second].iconIndex) {
        // Match
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => 
            i === first || i === second ? { ...c, isMatched: true } : c
          ));
          setFlippedIndices([]);
          
          matchesRef.current += 1;
          if (matchesRef.current === 6) {
             // Win
             const score = Math.max(0, 100 - moves * 2 + Math.floor(timeLeft));
             onEnd(`${score} pts`, Math.floor(score / 2));
          }
        }, 500);
      } else {
        // No Match
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => 
            i === first || i === second ? { ...c, isFlipped: false } : c
          ));
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="mb-6 flex justify-between w-full max-w-sm">
        <div className="flex flex-col items-center">
           <span className="text-xs text-gray-400 font-bold uppercase">Time</span>
           <span className={clsx("text-2xl font-mono font-bold", timeLeft < 10 ? "text-red-500" : "text-white")}>
             {timeLeft.toFixed(0)}s
           </span>
        </div>
        <div className="flex flex-col items-center">
           <span className="text-xs text-gray-400 font-bold uppercase">Moves</span>
           <span className="text-2xl font-mono font-bold text-white">{moves}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        {cards.map((card, index) => {
          const Icon = ICONS[card.iconIndex];
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(index)}
              className={clsx(
                "aspect-square rounded-xl transition-all duration-300 transform perspective-1000 relative",
                card.isFlipped || card.isMatched ? "rotate-y-180 bg-white" : "bg-white/10 hover:bg-white/20"
              )}
            >
              <div className={clsx(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
                card.isFlipped || card.isMatched ? "opacity-100" : "opacity-0"
              )}>
                 <Icon size={32} className="text-primary" />
              </div>
              
              <div className={clsx(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
                card.isFlipped || card.isMatched ? "opacity-0" : "opacity-100"
              )}>
                 <div className="w-8 h-8 rounded-full border-2 border-white/10" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PairsGame;
