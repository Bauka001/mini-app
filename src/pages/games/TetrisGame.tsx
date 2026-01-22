import { useState, useEffect, useCallback, useRef } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore, Theme } from '../../store/useStore';
import { ArrowLeft, ArrowRight, RotateCw, ArrowDown, ArrowBigDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParticleSystem, Particle } from '../../components/effects/ParticleSystem';
import { ReviveModal } from '../../components/modals/ReviveModal';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: 'from-cyan-400 to-cyan-600', shadow: 'shadow-cyan-400/50', hex: '#22d3ee' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-400/50', hex: '#60a5fa' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'from-orange-400 to-orange-600', shadow: 'shadow-orange-400/50', hex: '#fb923c' },
  O: { shape: [[1, 1], [1, 1]], color: 'from-yellow-400 to-yellow-600', shadow: 'shadow-yellow-400/50', hex: '#facc15' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'from-green-400 to-green-600', shadow: 'shadow-green-400/50', hex: '#4ade80' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-400/50', hex: '#c084fc' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'from-red-400 to-red-600', shadow: 'shadow-red-400/50', hex: '#f87171' },
};

type TetrominoType = keyof typeof TETROMINOS;

const TETROMINO_KEYS = Object.keys(TETROMINOS) as TetrominoType[];

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

let pieceBag: TetrominoType[] = [];

const getNextTetromino = () => {
  if (pieceBag.length === 0) {
    pieceBag = shuffleArray([...TETROMINO_KEYS]);
  }
  return pieceBag.pop()!;
};

export const TetrisGame = () => {
  const { t } = useTranslation();
  const { addGameResult, theme } = useStore();

  return (
    <GameWrapper
      title="Tetris"
      instructions={t('tetris_desc', 'Stack blocks to clear lines.')}
    >
      {({ onEnd, isPaused }) => <TetrisBoard onEnd={(score) => {
        addGameResult({ gameId: 'tetris', score, coinsEarned: Math.floor(score / 10) });
        onEnd(`${score}`, Math.floor(score / 10));
      }} isGamePaused={isPaused} theme={theme} />}
    </GameWrapper>
  );
};

const TetrisBoard = ({ onEnd, isGamePaused, theme }: { onEnd: (score: number) => void; isGamePaused: boolean; theme: Theme }) => {
  const [board, setBoard] = useState<string[][]>(Array(BOARD_HEIGHT).fill(Array(BOARD_WIDTH).fill(null)));
  const [activePiece, setActivePiece] = useState<{ type: TetrominoType, x: number, y: number, shape: number[][] } | null>(null);
  const [nextPiece, setNextPiece] = useState<TetrominoType | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [speed, setSpeed] = useState(800);
  const [cellSize, setCellSize] = useState(20);
  
  // Effects
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      // Dynamic calculation: height - (header + info + controls + padding)
      // Approx 280px reserved for UI elements
      const availableHeight = window.innerHeight - 280;
      const calculatedSize = Math.floor(availableHeight / BOARD_HEIGHT);
      // Clamp between 16px (very small) and 26px (comfortable)
      setCellSize(Math.min(Math.max(calculatedSize, 16), 26));
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup particles
  useEffect(() => {
    if (particles.length > 0) {
      const timer = setTimeout(() => {
        setParticles(prev => prev.slice(5)); // Remove chunks
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [particles]);

  // Reset shake
  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 200);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  const spawnPiece = useCallback(() => {
    const type = getNextTetromino();
    const piece = TETROMINOS[type];
    setActivePiece({
      type,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
      y: 0,
      shape: piece.shape
    });
    if (!nextPiece) {
      setNextPiece(getNextTetromino());
    } else {
      setNextPiece(type);
    }
  }, [nextPiece]);

  useEffect(() => {
    if (!activePiece && !gameOver) {
      spawnPiece();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || isGamePaused) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          move(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          move(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotate();
          break;
        case 'ArrowDown':
          e.preventDefault();
          softDrop();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, isGamePaused, activePiece]);

  const checkCollision = useCallback((pieceX: number, pieceY: number, shape: number[][], currentBoard?: string[][]) => {
    const b = currentBoard || board;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const newX = pieceX + x;
          const newY = pieceY + y;
          
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return true;
          }
          
          if (newY >= 0 && b[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  }, [board]);

  const calculateGhostPosition = useCallback(() => {
    if (!activePiece) return null;
    let ghostY = activePiece.y;
    while (!checkCollision(activePiece.x, ghostY + 1, activePiece.shape)) {
      ghostY++;
    }
    return ghostY;
  }, [activePiece, checkCollision]);

  const triggerLineClearEffects = (clearedIndices: number[]) => {
      setShake(true);
      
      // Spawn particles along the cleared lines
      if (boardRef.current) {
          const newParticles: Particle[] = [];
          
          clearedIndices.forEach(yIndex => {
              const yPos = yIndex * cellSize + cellSize / 2;
              
              // Spawn particles across the width
              for (let i = 0; i < 10; i++) {
                   const xPos = Math.random() * (BOARD_WIDTH * cellSize);
                   newParticles.push({
                       id: `p-${Date.now()}-${yIndex}-${i}`,
                       x: xPos,
                       y: yPos,
                       color: '#ffffff' // White flash for line clear
                   });
              }
          });
          
          setParticles(prev => [...prev, ...newParticles]);
      }
  };

  const mergePiece = () => {
    if (!activePiece) return;

    const newBoard = board.map(row => [...row]);
    activePiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          const boardY = activePiece.y + y;
          const boardX = activePiece.x + x;
          
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
             newBoard[boardY][boardX] = activePiece.type;
          }
        }
      });
    });

    const clearedIndices: number[] = [];
    const clearedBoard = newBoard.filter((row, index) => {
      if (row.every(cell => cell !== null)) {
        clearedIndices.push(index); 
        return false;
      }
      return true;
    });
    
    const linesToClearIndices: number[] = [];
    newBoard.forEach((row, idx) => {
        if (row.every(cell => cell !== null)) {
            linesToClearIndices.push(idx);
        }
    });
    
    const linesCleared = linesToClearIndices.length;

    if (linesCleared > 0) {
        triggerLineClearEffects(linesToClearIndices);
    }

    while (clearedBoard.length < BOARD_HEIGHT) {
      clearedBoard.unshift(Array(BOARD_WIDTH).fill(null));
    }

    setBoard(clearedBoard);
    const newLines = lines + linesCleared;
    setLines(newLines);
    setScore(s => s + linesCleared * 100 * level * (linesCleared > 1 ? linesCleared : 1));

    if (newLines >= level * 10) {
      setLevel(l => l + 1);
      setSpeed(sp => Math.max(100, sp - 50));
    }

    const type = nextPiece || getNextTetromino();
    const piece = TETROMINOS[type];
    const newPiece = {
      type,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
      y: 0,
      shape: piece.shape
    };

    if (checkCollision(newPiece.x, newPiece.y, newPiece.shape, clearedBoard)) {
       setGameOver(true);
       onEnd(score + linesCleared * 100 * level);
    } else {
       setActivePiece(newPiece);
       setNextPiece(getNextTetromino());
    }
  };

  // Custom hook for interval
  const useInterval = (callback: () => void, delay: number | null) => {
    const savedCallback = useRef(callback);

    useEffect(() => {
      savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
      function tick() {
        savedCallback.current();
      }
      if (delay !== null) {
        const id = setInterval(tick, delay);
        return () => clearInterval(id);
      }
    }, [delay]);
  };

  useInterval(() => {
    if (!activePiece) return;

    if (!checkCollision(activePiece.x, activePiece.y + 1, activePiece.shape)) {
      setActivePiece(p => ({ ...p!, y: p!.y + 1 }));
    } else {
      if (activePiece.y <= 0) {
        setGameOver(true);
        onEnd(score);
        return;
      }

      const newBoard = board.map(row => [...row]);
      const currentPiece = activePiece; 
      
      currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            const boardY = currentPiece.y + y;
            const boardX = currentPiece.x + x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
               newBoard[boardY][boardX] = currentPiece.type;
            }
          }
        });
      });

      const linesToClearIndices: number[] = [];
      newBoard.forEach((row, idx) => {
          if (row.every(cell => cell !== null)) {
              linesToClearIndices.push(idx);
          }
      });
      
      const linesCleared = linesToClearIndices.length;
      if (linesCleared > 0) {
           setShake(true);
           if (boardRef.current) {
              const newParticles: Particle[] = [];
              linesToClearIndices.forEach(yIndex => {
                  const yPos = yIndex * cellSize + cellSize / 2;
                  for (let i = 0; i < 10; i++) {
                       const xPos = Math.random() * (BOARD_WIDTH * cellSize);
                       newParticles.push({
                           id: `p-${Date.now()}-${yIndex}-${i}`,
                           x: xPos,
                           y: yPos,
                           color: '#ffffff'
                       });
                  }
              });
              setParticles(prev => [...prev, ...newParticles]);
           }
      }

      const clearedBoard = newBoard.filter(row => !row.every(cell => cell !== null));
      while (clearedBoard.length < BOARD_HEIGHT) {
        clearedBoard.unshift(Array(BOARD_WIDTH).fill(null));
      }

      setBoard(clearedBoard);
      const newLines = lines + linesCleared;
      setLines(newLines);
      setScore(s => s + linesCleared * 100 * level * (linesCleared > 1 ? linesCleared : 1));

      if (newLines >= level * 10) {
        setLevel(l => l + 1);
        setSpeed(sp => Math.max(100, sp - 50));
      }

      const type = nextPiece || getNextTetromino();
      const piece = TETROMINOS[type];
      const newPiece = {
        type,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
        y: 0,
        shape: piece.shape
      };

      if (checkCollision(newPiece.x, newPiece.y, newPiece.shape, clearedBoard)) {
         setGameOver(true);
         onEnd(score + linesCleared * 100 * level);
      } else {
         setActivePiece(newPiece);
         setNextPiece(getNextTetromino());
      }
    }
  }, (gameOver || isGamePaused) ? null : speed);

  const move = (dir: number) => {
    if (!activePiece || gameOver || isGamePaused) return;
    if (!checkCollision(activePiece.x + dir, activePiece.y, activePiece.shape)) {
      setActivePiece(p => ({ ...p!, x: p!.x + dir }));
    }
  };

  const rotate = () => {
    if (!activePiece || gameOver || isGamePaused) return;
    const newShape = activePiece.shape[0].map((_, index) => activePiece.shape.map(row => row[index]).reverse());
    
    let newX = activePiece.x;
    if (newX + newShape[0].length > BOARD_WIDTH) {
      newX = BOARD_WIDTH - newShape[0].length;
    }
    
    if (!checkCollision(newX, activePiece.y, newShape)) {
      setActivePiece(p => ({ ...p!, shape: newShape, x: newX }));
    }
  };
  
  const softDrop = () => {
     if (!activePiece || gameOver || isGamePaused) return;
     if (!checkCollision(activePiece.x, activePiece.y + 1, activePiece.shape)) {
       setActivePiece(p => ({ ...p!, y: p!.y + 1 }));
       setScore(s => s + 1);
     }
  };

  const hardDrop = () => {
     if (!activePiece || gameOver || isGamePaused) return;
     let dropY = activePiece.y;
     while (!checkCollision(activePiece.x, dropY + 1, activePiece.shape)) {
       dropY++;
     }
     setActivePiece(p => ({ ...p!, y: dropY }));
     setShake(true);
     setTimeout(() => {
       mergePiece();
     }, 0);
  };

  const handleRevive = () => {
    const newBoard = board.map((row, y) => {
       if (y < BOARD_HEIGHT / 2) {
         return Array(BOARD_WIDTH).fill(null);
       }
       return [...row];
    });
    
    setBoard(newBoard);
    setGameOver(false);
    
    if (!activePiece) {
      spawnPiece();
    } else {
      const piece = TETROMINOS[activePiece.type];
      setActivePiece({
        ...activePiece,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
        y: 0
      });
    }
  };

  const handleRestart = () => {
    setBoard(Array(BOARD_HEIGHT).fill(Array(BOARD_WIDTH).fill(null)));
    setScore(0);
    setLevel(1);
    setLines(0);
    setGameOver(false);
    setSpeed(800);
    setActivePiece(null);
    setNextPiece(null);
    setTimeout(() => spawnPiece(), 0);
  };

  const ghostPosition = calculateGhostPosition();

  // Theme Styles
  const bgStyle = theme === 'light' ? 'bg-white' : 'bg-transparent';
  const boardBg = theme === 'light' ? 'bg-gray-200 border-gray-300' : 'bg-gray-900/90 border-white/10';
  const cellGrid = theme === 'light' 
    ? 'linear-gradient(to right, #000000 1px, transparent 1px), linear-gradient(to bottom, #000000 1px, transparent 1px)' 
    : 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)';

  return (
    <div className={`flex flex-col items-center justify-between h-full p-2 gap-2 relative overflow-hidden ${bgStyle}`}>
      {theme !== 'light' && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-gray-900 to-black z-0" />
      )}
      
      <div className="absolute inset-0 pointer-events-none z-50">
        <ParticleSystem particles={particles} />
      </div>

      <div className="flex items-center gap-4 z-10 scale-90 sm:scale-100 origin-top">
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-3 border border-white/10 shadow-2xl transform hover:scale-105 transition-transform">
          <div className="text-[10px] text-gray-400 mb-1 font-bold tracking-wider">SCORE</div>
          <div className="text-2xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">{score.toLocaleString()}</div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-3 border border-white/10 shadow-2xl transform hover:scale-105 transition-transform">
          <div className="text-[10px] text-gray-400 mb-1 font-bold tracking-wider">LEVEL</div>
          <div className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">{level}</div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-3 border border-white/10 shadow-2xl transform hover:scale-105 transition-transform">
          <div className="text-[10px] text-gray-400 mb-1 font-bold tracking-wider">LINES</div>
          <div className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">{lines}</div>
        </div>
      </div>

      <div className="flex gap-4 items-start z-10 flex-1 justify-center min-h-0">
        <div className="hidden sm:block bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-2xl">
          <div className="text-xs text-gray-400 mb-2 text-center font-bold tracking-wider">NEXT</div>
          <div className="w-20 h-20 flex items-center justify-center">
            {nextPiece && (
              <div className="flex gap-1">
                {TETROMINOS[nextPiece].shape.map((row, y) => (
                  <div key={y} className="flex flex-col">
                    {row.map((cell, x) => (
                      <div
                        key={x}
                        className={clsx(
                          "w-5 h-5 rounded-sm border border-white/10",
                          cell ? `bg-gradient-to-br ${TETROMINOS[nextPiece].color} shadow-lg ${TETROMINOS[nextPiece].shadow}` : "bg-transparent"
                        )}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <motion.div 
            animate={shake ? { x: [-3, 3, -3, 3, 0], y: [-2, 2, 0] } : {}}
            transition={{ duration: 0.2 }}
            className={`relative bg-gradient-to-br from-gray-900 to-black rounded-xl p-1 shadow-2xl overflow-hidden border ${theme === 'light' ? 'border-gray-300' : 'border-white/10'}`}
        >
          {theme !== 'light' && <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5 pointer-events-none" />}
          
          <div 
            ref={boardRef}
            className={`relative rounded-lg overflow-hidden ${boardBg}`}
            style={{ width: cellSize * BOARD_WIDTH, height: cellSize * BOARD_HEIGHT }}
          >
             <div className="absolute inset-0 opacity-10 pointer-events-none" 
                  style={{ 
                      backgroundImage: cellGrid,
                      backgroundSize: `${cellSize}px ${cellSize}px`
                  }} 
             />

            {board.map((row, y) => (
              <div key={y} className="flex" style={{ height: cellSize }}>
                {row.map((cell, x) => (
                  <div 
                    key={x} 
                    className={clsx(
                      "transition-all duration-200",
                      cell ? `bg-gradient-to-br ${TETROMINOS[cell as TetrominoType].color} shadow-lg ${TETROMINOS[cell as TetrominoType].shadow} border border-white/20 rounded-sm` : "bg-transparent"
                    )}
                    style={{ width: cellSize, height: cellSize }} 
                  />
                ))}
              </div>
            ))}

            {ghostPosition !== null && activePiece && activePiece.shape.map((row, r) => (
              row.map((val, c) => {
                if (val !== 0) {
                  const absX = activePiece.x + c;
                  const absY = ghostPosition + r;
                  if (absY >= 0 && absY < BOARD_HEIGHT && absX >= 0 && absX < BOARD_WIDTH) {
                    return (
                      <div 
                        key={`ghost-${r}-${c}`}
                        className={clsx(
                          "absolute border-2 border-white/20 border-dashed box-border z-10 opacity-30 rounded-sm",
                          `bg-gradient-to-br ${TETROMINOS[activePiece.type].color}`
                        )}
                        style={{ 
                          width: cellSize,
                          height: cellSize,
                          left: absX * cellSize, 
                          top: absY * cellSize,
                        }}
                      />
                    );
                  }
                }
                return null;
              })
            ))}

            {activePiece && activePiece.shape.map((row, r) => (
              row.map((val, c) => {
                if (val !== 0) {
                  const absX = activePiece.x + c;
                  const absY = activePiece.y + r;
                  if (absY >= 0 && absY < BOARD_HEIGHT && absX >= 0 && absX < BOARD_WIDTH) {
                    return (
                      <div 
                        key={`active-${r}-${c}`}
                        className={clsx(
                          "absolute border border-white/30 box-border z-20 transition-all duration-75 rounded-sm",
                          `bg-gradient-to-br ${TETROMINOS[activePiece.type].color} shadow-lg ${TETROMINOS[activePiece.type].shadow}`
                        )}
                        style={{ 
                          width: cellSize,
                          height: cellSize,
                          left: absX * cellSize, 
                          top: absY * cellSize,
                        }}
                      />
                    );
                  }
                }
                return null;
              })
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-5 gap-2 w-full max-w-[400px] z-10 pb-4">
         <button onClick={() => move(-1)} disabled={gameOver || isGamePaused} className="p-3 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-xl flex justify-center items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg border border-white/10">
           <ArrowLeft size={20} className="text-white" />
         </button>
         <button onClick={rotate} disabled={gameOver || isGamePaused} className="p-3 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-xl flex justify-center items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg border border-white/10">
           <RotateCw size={20} className="text-white" />
         </button>
         <button onClick={() => move(1)} disabled={gameOver || isGamePaused} className="p-3 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-xl flex justify-center items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg border border-white/10">
           <ArrowRight size={20} className="text-white" />
         </button>
         <button onClick={softDrop} disabled={gameOver || isGamePaused} className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl flex justify-center items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg border border-white/10">
           <ArrowDown size={20} className="text-white" />
         </button>
         <button onClick={hardDrop} disabled={gameOver || isGamePaused} className="p-3 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 rounded-xl flex justify-center items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg border border-white/10">
           <ArrowBigDown size={20} className="text-white" />
         </button>
      </div>

      <AnimatePresence>
      <ReviveModal 
        isOpen={gameOver}
        score={score}
        gameName="Tetris"
        onRevive={handleRevive}
        onRestart={handleRestart}
      />
      </AnimatePresence>
    </div>
  );
};

export default TetrisGame;
