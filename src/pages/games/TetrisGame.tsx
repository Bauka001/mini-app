import { useState, useEffect, useCallback } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStore';
import { ArrowLeft, ArrowRight, RotateCw, ArrowDown } from 'lucide-react';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 25;

const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: 'bg-cyan-400' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'bg-blue-500' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'bg-orange-500' },
  O: { shape: [[1, 1], [1, 1]], color: 'bg-yellow-400' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'bg-green-500' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'bg-purple-500' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'bg-red-500' },
};

type TetrominoType = keyof typeof TETROMINOS;

const getRandomTetromino = () => {
  const keys = Object.keys(TETROMINOS) as TetrominoType[];
  return keys[Math.floor(Math.random() * keys.length)];
};

export const TetrisGame = () => {
  const { t } = useTranslation();
  const { addGameResult } = useStore();

  return (
    <GameWrapper
      title="Tetris"
      instructions={t('tetris_desc', 'Stack blocks to clear lines.')}
    >
      {({ onEnd }) => <TetrisBoard onEnd={(score) => {
        addGameResult({ gameId: 'tetris', score, coinsEarned: Math.floor(score / 10) });
        onEnd(`${score}`, Math.floor(score / 10));
      }} />}
    </GameWrapper>
  );
};

const TetrisBoard = ({ onEnd }: { onEnd: (score: number) => void }) => {
  const [board, setBoard] = useState<string[][]>(Array(BOARD_HEIGHT).fill(Array(BOARD_WIDTH).fill(null)));
  const [activePiece, setActivePiece] = useState<{ type: TetrominoType, x: number, y: number, shape: number[][] } | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [speed] = useState(800); // Removed unused setSpeed

  const spawnPiece = useCallback(() => {
    const type = getRandomTetromino();
    const piece = TETROMINOS[type];
    setActivePiece({
      type,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
      y: 0,
      shape: piece.shape
    });
  }, []);

  useEffect(() => {
    spawnPiece();
  }, [spawnPiece]);

  const checkCollision = useCallback((pieceX: number, pieceY: number, shape: number[][], currentBoard?: string[][]) => {
    const b = currentBoard || board;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const newX = pieceX + x;
          const newY = pieceY + y;
          
          // 1. Out of bounds (Left/Right/Bottom)
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return true;
          }
          
          // 2. Collision with existing blocks
          // Only check if newY is within board area (ignore collision above board)
          if (newY >= 0 && b[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  }, [board]); // Add dependency on board

  const mergePiece = () => {
    if (!activePiece) return;

    // 2. Merge piece into board
    const newBoard = board.map(row => [...row]);
    activePiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          const boardY = activePiece.y + y;
          const boardX = activePiece.x + x;
          
          // Only merge if within bounds
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
             newBoard[boardY][boardX] = activePiece.type;
          }
        }
      });
    });

    // 3. Clear lines
    let linesCleared = 0;
    const clearedBoard = newBoard.filter(row => {
      if (row.every(cell => cell !== null)) {
        linesCleared++;
        return false;
      }
      return true;
    });

    while (clearedBoard.length < BOARD_HEIGHT) {
      clearedBoard.unshift(Array(BOARD_WIDTH).fill(null));
    }

    // 4. Update state
    setBoard(clearedBoard);
    setScore(s => s + linesCleared * 100);
    
    // 5. Spawn new piece immediately
    const type = getRandomTetromino();
    const piece = TETROMINOS[type];
    const newPiece = {
      type,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
      y: 0,
      shape: piece.shape
    };

    // Check if new piece collides immediately (Game Over condition 2)
    if (checkCollision(newPiece.x, newPiece.y, newPiece.shape)) {
       setGameOver(true);
       onEnd(score + linesCleared * 100);
    } else {
       setActivePiece(newPiece);
    }
  };
  
  // Game Loop
  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      if (!activePiece) return;

      // Check if can move down
      if (!checkCollision(activePiece.x, activePiece.y + 1, activePiece.shape)) {
        setActivePiece(p => ({ ...p!, y: p!.y + 1 }));
      } else {
        // Collision detected! Lock the piece.
        
        // 1. Check for Game Over (collision at top)
        if (activePiece.y <= 0) {
          setGameOver(true);
          onEnd(score);
          return;
        }

        // 2. Merge piece into board
        const newBoard = board.map(row => [...row]);
        activePiece.shape.forEach((row, y) => {
          row.forEach((value, x) => {
            if (value) {
              const boardY = activePiece.y + y;
              const boardX = activePiece.x + x;
              
              // Only merge if within bounds
              if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
                 newBoard[boardY][boardX] = activePiece.type;
              }
            }
          });
        });

        // 3. Clear lines
        let linesCleared = 0;
        const clearedBoard = newBoard.filter(row => {
          if (row.every(cell => cell !== null)) {
            linesCleared++;
            return false;
          }
          return true;
        });

        while (clearedBoard.length < BOARD_HEIGHT) {
          clearedBoard.unshift(Array(BOARD_WIDTH).fill(null));
        }

        // 4. Update state
        setBoard(clearedBoard);
        setScore(s => s + linesCleared * 100);
        
        // 5. Spawn new piece immediately
        const type = getRandomTetromino();
        const piece = TETROMINOS[type];
        const newPiece = {
          type,
          x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
          y: 0,
          shape: piece.shape
        };

        // Check if new piece collides immediately (Game Over condition 2)
        // IMPORTANT: Pass newBoard to checkCollision, because state 'board' hasn't updated yet!
        if (checkCollision(newPiece.x, newPiece.y, newPiece.shape, newBoard)) {
           setGameOver(true);
           onEnd(score + linesCleared * 100);
        } else {
           setActivePiece(newPiece);
        }
      }
    }, speed);

    return () => clearInterval(interval);
  }, [activePiece, board, gameOver, score, speed, onEnd, checkCollision]);

  const move = (dir: number) => {
    if (!activePiece || gameOver) return;
    if (!checkCollision(activePiece.x + dir, activePiece.y, activePiece.shape)) {
      setActivePiece(p => ({ ...p!, x: p!.x + dir }));
    }
  };

  const rotate = () => {
    if (!activePiece || gameOver) return;
    // Simple rotation logic (matrix transpose + reverse rows)
    const newShape = activePiece.shape[0].map((_, index) => activePiece.shape.map(row => row[index]).reverse());
    
    // Wall kick check (simple)
    let newX = activePiece.x;
    if (newX + newShape[0].length > BOARD_WIDTH) {
      newX = BOARD_WIDTH - newShape[0].length;
    }
    
    if (!checkCollision(newX, activePiece.y, newShape)) {
      setActivePiece(p => ({ ...p!, shape: newShape, x: newX }));
    }
  };
  
  const drop = () => {
     if (!activePiece || gameOver) return;
     let dropY = activePiece.y;
     while (!checkCollision(activePiece.x, dropY + 1, activePiece.shape)) {
       dropY++;
     }
     setActivePiece(p => ({ ...p!, y: dropY }));
     setTimeout(() => {
       mergePiece();
     }, 0);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="text-white font-bold mb-4 text-xl">Score: {score}</div>
      
      <div className="relative bg-gray-900 border-2 border-gray-700 rounded-lg overflow-hidden" style={{ width: CELL_SIZE * BOARD_WIDTH, height: CELL_SIZE * BOARD_HEIGHT }}>
        {/* Render Board */}
        {board.map((row, y) => (
          <div key={y} className="flex" style={{ height: CELL_SIZE }}>
            {row.map((cell, x) => (
              <div 
                key={x} 
                className={clsx(
                  "box-border border border-white/5",
                  cell ? TETROMINOS[cell as TetrominoType].color : "bg-transparent"
                )}
                style={{ width: CELL_SIZE, height: CELL_SIZE }} 
              />
            ))}
          </div>
        ))}

        {/* Render Active Piece */}
        {activePiece && activePiece.shape.map((row, r) => (
          row.map((val, c) => {
            if (val !== 0) {
              const absX = activePiece.x + c;
              const absY = activePiece.y + r;
              // Render if within board bounds (even partial visibility at top)
              if (absY >= 0 && absY < BOARD_HEIGHT && absX >= 0 && absX < BOARD_WIDTH) {
                return (
                  <div 
                    key={`active-${r}-${c}`}
                    className={clsx(
                      "absolute border border-white/20 box-border z-10",
                      TETROMINOS[activePiece.type].color
                    )}
                    style={{ 
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      left: absX * CELL_SIZE, 
                      top: absY * CELL_SIZE,
                      transition: 'top 0.1s linear' 
                    }}
                  />
                );
              }
            }
            return null;
          })
        ))}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 gap-4 mt-6 w-[250px]">
         <button onClick={() => move(-1)} className="p-4 bg-white/10 rounded-full flex justify-center"><ArrowLeft size={24} /></button>
         <button onClick={rotate} className="p-4 bg-white/10 rounded-full flex justify-center"><RotateCw size={24} /></button>
         <button onClick={() => move(1)} className="p-4 bg-white/10 rounded-full flex justify-center"><ArrowRight size={24} /></button>
         <div />
         <button onClick={drop} className="p-4 bg-white/10 rounded-full flex justify-center"><ArrowDown size={24} /></button>
         <div />
      </div>
    </div>
  );
};

export default TetrisGame;
