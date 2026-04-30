import { useState, useEffect, useRef } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { Brain, Star, Heart, Zap, Coffee, Anchor, Music, Sun } from 'lucide-react';
import { motion } from 'framer-motion';

const ICONS = [Brain, Star, Heart, Zap, Coffee, Anchor, Music, Sun];

export const PairsGame = () => {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  
  return (
    <GameWrapper
      title={t('game_pairs', 'Pairs')}
      instructions={t('pairs_desc', 'Find all matching pairs of cards.')}
    >
      {({ onEnd, isPaused, theme }) => <PairsBoard onEnd={(score, coins) => {
        setTimeout(() => {
          addGameResult({ gameId: 'pairs', score, coinsEarned: coins });
        }, 0);
        onEnd(score, coins);
      }} isPaused={isPaused} theme={theme} />}
    </GameWrapper>
  );
};

interface Card {
  id: number;
  iconIndex: number;
  isFlipped: boolean;
  isMatched: boolean;
}

const PairsBoard = ({ onEnd, isPaused: _isPaused, theme }: { onEnd: (score: string, coins: number) => void, isPaused: boolean, theme: string }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPreviewing, setIsPreviewing] = useState(true);
  
  // Use ref for immediate win check
  const matchesRef = useRef(0);

  // Initialize Game
  useEffect(() => {
    const totalPairs = 6;
    const selectedIcons = ICONS.slice(0, totalPairs);
    const deck = [...selectedIcons, ...selectedIcons]
      .map((_, index) => ({
        id: index,
        iconIndex: index % totalPairs,
        isFlipped: true,
        isMatched: false
      }))
      .sort(() => Math.random() - 0.5);

    setCards(deck);
    matchesRef.current = 0;
    setIsPreviewing(true);

    const previewTimer = setTimeout(() => {
      setCards(prev => prev.map(c => ({ ...c, isFlipped: false })));
      setIsPreviewing(false);

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

      return () => clearInterval(timer);
    }, 2000);

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
    <div className={clsx(
      "h-full flex flex-col items-center justify-center p-4 transition-colors duration-500 relative overflow-hidden",
      theme === 'light' ? 'bg-gradient-to-br from-indigo-50 to-blue-50' : 'bg-transparent'
    )}>
      {theme !== 'light' && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background z-0" />
      )}

      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 flex justify-between items-center w-full max-w-sm z-10 px-4"
      >
        <div className={clsx(
          "flex flex-col items-center px-6 py-3 rounded-2xl backdrop-blur-xl border shadow-lg",
          theme === 'light' ? "bg-white/80 border-indigo-100" : "bg-white/10 border-white/10"
        )}>
           <span className={clsx("text-[10px] font-black uppercase tracking-widest mb-1", theme === 'light' ? "text-indigo-400" : "text-gray-400")}>Time Left</span>
           <span className={clsx(
             "text-3xl font-mono font-black tracking-tighter", 
             timeLeft < 10 
               ? "text-red-500 animate-pulse-glow" 
               : theme === 'light' 
                 ? "text-indigo-600" 
                 : "text-white"
           )}>
             {timeLeft.toFixed(0)}s
           </span>
        </div>
        <div className={clsx(
          "flex flex-col items-center px-6 py-3 rounded-2xl backdrop-blur-xl border shadow-lg",
          theme === 'light' ? "bg-white/80 border-indigo-100" : "bg-white/10 border-white/10"
        )}>
           <span className={clsx("text-[10px] font-black uppercase tracking-widest mb-1", theme === 'light' ? "text-indigo-400" : "text-gray-400")}>Moves</span>
           <span className={clsx("text-3xl font-mono font-black tracking-tighter", theme === 'light' ? "text-indigo-600" : "text-white")}>{moves}</span>
        </div>
      </motion.div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className={clsx(
          "grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-sm p-4 sm:p-6 rounded-[2.5rem] backdrop-blur-2xl border shadow-2xl z-10",
          theme === 'light' ? "bg-white/60 border-white shadow-[0_8px_32px_rgba(0,0,0,0.1)]" : "bg-white/5 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        )}
      >
        {cards.map((card, index) => {
          const Icon = ICONS[card.iconIndex];
          const isRevealed = card.isFlipped || card.isMatched;
          
          return (
            <div key={card.id} className="relative aspect-square perspective-1000">
              <motion.button
                onClick={() => handleCardClick(index)}
                animate={{ rotateY: isRevealed ? 180 : 0, scale: card.isMatched ? [1, 1.1, 1] : 1 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
                whileHover={!isRevealed ? { scale: 1.05, y: -2 } : {}}
                whileTap={!isRevealed ? { scale: 0.95 } : {}}
                className="w-full h-full preserve-3d cursor-pointer focus:outline-none"
              >
                {/* Back of Card */}
                <div className={clsx(
                  "absolute inset-0 backface-hidden rounded-2xl border shadow-lg flex items-center justify-center overflow-hidden",
                  theme === 'light' 
                    ? "bg-gradient-to-br from-indigo-100 to-purple-100 border-white" 
                    : "bg-gradient-to-br from-white/10 to-white/5 border-white/10"
                )}>
                  <div className={clsx(
                    "w-12 h-12 rounded-full border-4 border-dashed opacity-50",
                    theme === 'light' ? "border-indigo-300" : "border-white/20"
                  )} />
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                </div>
                
                {/* Front of Card */}
                <div 
                  className={clsx(
                    "absolute inset-0 backface-hidden rounded-2xl border shadow-xl flex items-center justify-center rotate-y-180 overflow-hidden",
                    card.isMatched 
                      ? theme === 'light' 
                        ? "bg-gradient-to-br from-green-100 to-emerald-100 border-green-200" 
                        : "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30"
                      : theme === 'light'
                        ? "bg-white border-white"
                        : "bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30"
                  )}
                >
                  <motion.div
                    initial={false}
                    animate={card.isMatched ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon 
                      size={40} 
                      strokeWidth={2.5}
                      className={clsx(
                        "drop-shadow-md",
                        card.isMatched
                          ? "text-emerald-500"
                          : theme === 'light' ? "text-indigo-600" : "text-indigo-300"
                      )} 
                    />
                  </motion.div>
                  {/* Glossy reflection */}
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl pointer-events-none" />
                </div>
              </motion.button>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default PairsGame;
