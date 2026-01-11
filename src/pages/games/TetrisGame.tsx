import { useState, useEffect, useCallback } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStore';
import { ArrowLeft, ArrowRight, RotateCw, ArrowDown, Play, Pause, Trophy, ArrowBigDown } from 'lucide-react';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 28;

const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: 'from-cyan-400 to-cyan-600', shadow: 'shadow-cyan-400/50' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-400/50' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'from-orange-400 to-orange-600', shadow: 'shadow-orange-400/50' },
  O: { shape: [[1, 1], [1, 1]], color: 'from-yellow-400 to-yellow-600', shadow: 'shadow-yellow-400/50' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'from-green-400 to-green-600', shadow: 'shadow-green-400/50' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-400/50' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'from-red-400 to-red-600', shadow: 'shadow-red-400/50' },
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
  const [nextPiece, setNextPiece] = useState<TetrominoType | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(800);

  const spawnPiece = useCallback(() => {
    const type = getRandomTetromino();
    const piece = TETROMINOS[type];
    setActivePiece({
      type,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
      y: 0,
      shape: piece.shape
    });
    if (!nextPiece) {
      setNextPiece(getRandomTetromino());
    } else {
      setNextPiece(type);
    }
  }, [nextPiece]);

  useEffect(() => {
    spawnPiece();
  }, [spawnPiece]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

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
        case 'p':
        case 'P':
          e.preventDefault();
          togglePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, isPaused, activePiece]);

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

    setBoard(clearedBoard);
    const newLines = lines + linesCleared;
    setLines(newLines);
    setScore(s => s + linesCleared * 100 * level);

    if (newLines >= level * 10) {
      setLevel(l => l + 1);
      setSpeed(sp => Math.max(100, sp - 50));
    }

    const type = nextPiece || getRandomTetromino();
    const piece = TETROMINOS[type];
    const newPiece = {
      type,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
      y: 0,
      shape: piece.shape
    };

    if (checkCollision(newPiece.x, newPiece.y, newPiece.shape, clearedBoard)) {
       setGameOver(true);
       setIsPaused(true);
       onEnd(score + linesCleared * 100 * level);
    } else {
       setActivePiece(newPiece);
       setNextPiece(getRandomTetromino());
    }
  };

  useEffect(() => {
    if (gameOver || isPaused) return;

    const interval = setInterval(() => {
      if (!activePiece) return;

      if (!checkCollision(activePiece.x, activePiece.y + 1, activePiece.shape)) {
        setActivePiece(p => ({ ...p!, y: p!.y + 1 }));
      } else {
        if (activePiece.y <= 0) {
          setGameOver(true);
          setIsPaused(true);
          onEnd(score);
          return;
        }

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

        setBoard(clearedBoard);
        const newLines = lines + linesCleared;
        setLines(newLines);
        setScore(s => s + linesCleared * 100 * level);

        if (newLines >= level * 10) {
          setLevel(l => l + 1);
          setSpeed(sp => Math.max(100, sp - 50));
        }

        const type = nextPiece || getRandomTetromino();
        const piece = TETROMINOS[type];
        const newPiece = {
          type,
          x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
          y: 0,
          shape: piece.shape
        };

        if (checkCollision(newPiece.x, newPiece.y, newPiece.shape, clearedBoard)) {
           setGameOver(true);
           setIsPaused(true);
           onEnd(score + linesCleared * 100 * level);
        } else {
           setActivePiece(newPiece);
           setNextPiece(getRandomTetromino());
        }
      }
    }, speed);

    return () => clearInterval(interval);
  }, [activePiece, board, gameOver, isPaused, score, speed, onEnd, checkCollision, nextPiece, lines, level]);

  const move = (dir: number) => {
    if (!activePiece || gameOver || isPaused) return;
    if (!checkCollision(activePiece.x + dir, activePiece.y, activePiece.shape)) {
      setActivePiece(p => ({ ...p!, x: p!.x + dir }));
    }
  };

  const rotate = () => {
    if (!activePiece || gameOver || isPaused) return;
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
     if (!activePiece || gameOver || isPaused) return;
     if (!checkCollision(activePiece.x, activePiece.y + 1, activePiece.shape)) {
       setActivePiece(p => ({ ...p!, y: p!.y + 1 }));
       setScore(s => s + 1);
     }
  };

  const hardDrop = () => {
     if (!activePiece || gameOver || isPaused) return;
     let dropY = activePiece.y;
     while (!checkCollision(activePiece.x, dropY + 1, activePiece.shape)) {
       dropY++;
     }
     setActivePiece(p => ({ ...p!, y: dropY }));
     setTimeout(() => {
       mergePiece();
     }, 0);
  };

  const togglePause = () => {
    if (gameOver) return;
    setIsPaused(p => !p);
  };

  const ghostPosition = calculateGhostPosition();

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 gap-4">
      <div className="flex items-center gap-6">
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-2xl">
          <div className="text-xs text-gray-400 mb-1">SCORE</div>
          <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">{score.toLocaleString()}</div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-2xl">
          <div className="text-xs text-gray-400 mb-1">LEVEL</div>
          <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">{level}</div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-2xl">
          <div className="text-xs text-gray-400 mb-1">LINES</div>
          <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">{lines}</div>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-2xl">
          <div className="text-xs text-gray-400 mb-2 text-center">NEXT</div>
          <div className="w-20 h-20 flex items-center justify-center">
            {nextPiece && (
              <div className="flex gap-1">
                {TETROMINOS[nextPiece].shape.map((row, y) => (
                  <div key={y} className="flex flex-col">
                    {row.map((cell, x) => (
                      <div
                        key={x}
                        className={clsx(
                          "w-5 h-5 rounded-sm",
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

        <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-2xl p-1 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
          
          <div className="relative bg-gray-900/80 rounded-xl overflow-hidden" style={{ width: CELL_SIZE * BOARD_WIDTH, height: CELL_SIZE * BOARD_HEIGHT }}>
            {board.map((row, y) => (
              <div key={y} className="flex" style={{ height: CELL_SIZE }}>
                {row.map((cell, x) => (
                  <div 
                    key={x} 
                    className={clsx(
                      "border border-white/5 transition-all duration-300",
                      cell ? `bg-gradient-to-br ${TETROMINOS[cell as TetrominoType].color} shadow-lg ${TETROMINOS[cell as TetrominoType].shadow}` : "bg-transparent"
                    )}
                    style={{ width: CELL_SIZE, height: CELL_SIZE }} 
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
                          "absolute border-2 border-white/30 border-dashed box-border z-10 opacity-40",
                          `bg-gradient-to-br ${TETROMINOS[activePiece.type].color}`
                        )}
                        style={{ 
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          left: absX * CELL_SIZE, 
                          top: absY * CELL_SIZE,
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
                          "absolute border border-white/20 box-border z-20 transition-all duration-100",
                          `bg-gradient-to-br ${TETROMINOS[activePiece.type].color} shadow-lg ${TETROMINOS[activePiece.type].shadow}`
                        )}
                        style={{ 
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          left: absX * CELL_SIZE, 
                          top: absY * CELL_SIZE,
                        }}
                      />
                    );
                  }
                }
                return null;
              })
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={togglePause}
          disabled={gameOver}
          className={clsx(
            "px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 shadow-lg",
            "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 active:scale-95",
            gameOver && "opacity-50 cursor-not-allowed"
          )}
        >
          {isPaused ? <Play size={20} /> : <Pause size={20} />}
          {isPaused ? 'RESUME' : 'PAUSE'}
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3 w-[400px]">
         <button onClick={() => move(-1)} disabled={gameOver || isPaused} className="p-4 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-2xl flex justify-center items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-xl shadow-gray-900/50 border border-white/10">
           <ArrowLeft size={24} className="text-white" />
         </button>
         <button onClick={rotate} disabled={gameOver || isPaused} className="p-4 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-2xl flex justify-center items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-xl shadow-purple-900/50 border border-white/10">
           <RotateCw size={24} className="text-white" />
         </button>
         <button onClick={() => move(1)} disabled={gameOver || isPaused} className="p-4 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-2xl flex justify-center items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-xl shadow-gray-900/50 border border-white/10">
           <ArrowRight size={24} className="text-white" />
         </button>
         <button onClick={softDrop} disabled={gameOver || isPaused} className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-2xl flex justify-center items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-xl shadow-blue-900/50 border border-white/10">
           <ArrowDown size={24} className="text-white" />
         </button>
         <button onClick={hardDrop} disabled={gameOver || isPaused} className="p-4 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 rounded-2xl flex justify-center items-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-xl shadow-orange-900/50 border border-white/10">
           <ArrowBigDown size={24} className="text-white" />
         </button>
      </div>

      {gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-white/10 shadow-2xl text-center max-w-sm mx-4">
            <Trophy size={64} className="text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Game Over!</h2>
            <p className="text-gray-400 mb-2">Final Score</p>
            <div className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-6">{score.toLocaleString()}</div>
            <div className="flex gap-3 justify-center">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-xs text-gray-400">Level</div>
                <div className="text-2xl font-bold text-purple-400">{level}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-xs text-gray-400">Lines</div>
                <div className="text-2xl font-bold text-cyan-400">{lines}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPaused && !gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-white/10 shadow-2xl text-center">
            <Pause size={64} className="text-purple-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Paused</h2>
            <p className="text-gray-400">Press Resume to continue</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TetrisGame;
