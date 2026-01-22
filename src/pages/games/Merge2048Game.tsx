import React, { useState, useEffect, useRef } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { soundManager } from '../../utils/soundManager';
import { ParticleSystem, Particle } from '../../components/effects/ParticleSystem';
import { Zap } from 'lucide-react';
import { ReviveModal } from '../../components/modals/ReviveModal';

const ROWS = 8;
const COLS = 6;
const COLORS: Record<number, string> = {
  2: 'bg-gradient-to-br from-blue-400 to-blue-600',
  4: 'bg-gradient-to-br from-green-400 to-green-600',
  8: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
  16: 'bg-gradient-to-br from-orange-400 to-orange-600',
  32: 'bg-gradient-to-br from-red-400 to-red-600',
  64: 'bg-gradient-to-br from-purple-400 to-purple-600',
  128: 'bg-gradient-to-br from-pink-400 to-pink-600',
  256: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
  512: 'bg-gradient-to-br from-teal-400 to-teal-600',
  1024: 'bg-gradient-to-br from-lime-400 to-lime-600',
  2048: 'bg-gradient-to-br from-amber-400 to-amber-600',
  4096: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
};

const COLOR_HEX: Record<number, string> = {
  2: '#60a5fa',
  4: '#4ade80',
  8: '#facc15',
  16: '#fb923c',
  32: '#f87171',
  64: '#c084fc',
  128: '#f472b6',
  256: '#818cf8',
  512: '#2dd4bf',
  1024: '#a3e635',
  2048: '#fbbf24',
  4096: '#34d399',
};

const GLOW_COLORS: Record<number, string> = {
  128: 'shadow-pink-500/50',
  256: 'shadow-indigo-500/50',
  512: 'shadow-teal-500/50',
  1024: 'shadow-lime-500/50',
  2048: 'shadow-amber-500/50',
  4096: 'shadow-emerald-500/50',
};

const getBlockColor = (value: number) => COLORS[value] || 'bg-gradient-to-br from-gray-500 to-gray-700';
const getGlowEffect = (value: number) => GLOW_COLORS[value] || '';

const Merge2048Game = () => {
  const { soundEnabled, theme } = useStore();
  const [grid, setGrid] = useState<(number | null)[][]>(
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  const [nextBlock, setNextBlock] = useState<number>(2);
  const [score, setScore] = useState(0);
  const [scorePopup, setScorePopup] = useState<{ x: number; y: number; value: number; combo?: number } | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [mergedPositions, setMergedPositions] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  
  // New Effects State
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(false);
  const [combo, setCombo] = useState(0);
  const [droppingColumn, setDroppingColumn] = useState<number | null>(null);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const generateBlock = () => {
    const values = [2, 4, 8, 16, 32];
    return values[Math.floor(Math.random() * values.length)];
  };

  useEffect(() => {
    setNextBlock(generateBlock());
  }, []);

  // Cleanup particles
  useEffect(() => {
    if (particles.length > 0) {
      const timer = setTimeout(() => {
        setParticles(prev => prev.slice(1));
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

  const showScorePopup = (x: number, y: number, value: number, currentCombo: number) => {
    setScorePopup({ x, y, value, combo: currentCombo > 1 ? currentCombo : undefined });
    setTimeout(() => setScorePopup(null), 1000);
  };

  const handleRevive = () => {
    // Remove top 3 rows to give player a chance
    const newGrid = grid.map((row, r) => r < 3 ? Array(COLS).fill(null) : row);
    setGrid(newGrid);
    setGameOver(false);
    setIsDropping(false);
    soundManager.playSuccess();
  };

  const handleRestart = () => {
     setGrid(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
     setScore(0);
     setGameOver(false);
     setNextBlock(generateBlock());
  };

  return (
    <GameWrapper
      title="2048 Merge"
      instructions="Бағанды басып санды тастаңыз. Бірдей сандар қосылады: 2+2=4, 4+4=8. 2048-ге жетуге тырысыңыз! Баған толса ойын аяқталады."
    >
      {({ onEnd, isPaused }) => {
        
        const handleColumnClick = async (colIndex: number, e: React.MouseEvent) => {
          if (isDropping || gameOver || isPaused) return;
          
          let targetRow = -1;
          for (let r = ROWS - 1; r >= 0; r--) {
            if (grid[r][colIndex] === null) {
              targetRow = r;
              break;
            }
          }
      
          if (targetRow === -1) {
            soundManager.playError();
            setShake(true); // Shake on error
            return;
          }
      
          setIsDropping(true);
          setDroppingColumn(colIndex);
          soundManager.playClick();
          setCombo(0); // Reset combo on new drop
      
          const newGrid = [...grid.map(row => [...row])];
          newGrid[targetRow][colIndex] = nextBlock;
          setGrid(newGrid);
      
          const nextVal = generateBlock();
          setNextBlock(nextVal);
      
          setTimeout(() => {
            setDroppingColumn(null);
            processMerge(newGrid, targetRow, colIndex, 0, onEnd); // Start with combo 0
          }, 300);
        };
      
        const processMerge = (currentGrid: (number | null)[][], r: number, c: number, currentCombo: number, endCallback: any) => {
          let newGrid = [...currentGrid.map(row => [...row])];
          const val = newGrid[r][c];
      
          if (!val) {
            setIsDropping(false);
            return;
          }
      
          const directions = [
            [1, 0],
            [0, -1],
            [0, 1],
            [-1, 0]
          ];
      
          let bestMerge = null;
      
          for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && newGrid[nr][nc] === val) {
              bestMerge = { r: nr, c: nc };
              break; 
            }
          }
      
          if (bestMerge) {
            const newVal = val * 2;
            const newCombo = currentCombo + 1;
            setCombo(newCombo);
            
            newGrid[bestMerge.r][bestMerge.c] = null;
            newGrid[r][c] = newVal;
            
            const scoreAdd = newVal * newCombo;
            setScore(s => s + scoreAdd);
            soundManager.playSuccess();
            
            if (newCombo > 1 || newVal >= 64) {
              setShake(true);
            }
            
            const posKey = `${r}-${c}`;
            setMergedPositions(prev => new Set([...prev, posKey]));
            
            // Visual Effects
            if (containerRef.current) {
              const gridEl = containerRef.current.querySelector('.game-grid');
              if (gridEl) {
                 const gridRect = gridEl.getBoundingClientRect();
                 const cellWidth = gridRect.width / COLS;
                 const cellHeight = gridRect.height / ROWS;
                 
                 const particleX = (c * cellWidth) + (cellWidth / 2);
                 const particleY = (r * cellHeight) + (cellHeight / 2);
                 
                 setParticles(prev => [
                   ...prev, 
                   { 
                     id: Date.now().toString() + Math.random(), 
                     x: particleX, 
                     y: particleY, 
                     color: COLOR_HEX[newVal] || '#ffffff' 
                   }
                 ]);
                 
                 const popupX = gridRect.left + particleX;
                 const popupY = gridRect.top + particleY;
                 showScorePopup(popupX, popupY, scoreAdd, newCombo);
              }
            }
      
            setGrid(newGrid);
            
            setTimeout(() => {
              setMergedPositions(prev => {
                const newSet = new Set(prev);
                newSet.delete(posKey);
                return newSet;
              });
              
              // Special logic: Remove 2048 block automatically to make game easier
              if (newVal >= 2048) {
                setTimeout(() => {
                  const finalGrid = [...newGrid.map(row => [...row])];
                  finalGrid[r][c] = null;
                  setGrid(finalGrid);
                  soundManager.playSuccess();
                  
                  setTimeout(() => {
                    applyGravity(finalGrid, newCombo, endCallback);
                  }, 300);
                }, 500);
              } else {
                applyGravity(newGrid, newCombo, endCallback);
              }
            }, 400);
            return;
          }
      
          if (checkGameOver(newGrid)) {
              setGameOver(true);
              if (endCallback) {
                  endCallback(score, Math.floor(score / 100));
              }
          }
          
          setIsDropping(false);
        };
        
        const applyGravity = (currentGrid: (number | null)[][], currentCombo: number, endCallback: any) => {
          let moved = false;
          const newGrid = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
      
          for (let c = 0; c < COLS; c++) {
            let rIdx = ROWS - 1;
            for (let r = ROWS - 1; r >= 0; r--) {
              if (currentGrid[r][c] !== null) {
                newGrid[rIdx][c] = currentGrid[r][c];
                rIdx--;
              }
            }
          }
          
          for(let r=0; r<ROWS; r++) {
              for(let c=0; c<COLS; c++) {
                  if(newGrid[r][c] !== currentGrid[r][c]) moved = true;
              }
          }
      
          setGrid(newGrid);
      
          if (moved) {
            setTimeout(() => {
              scanForMerges(newGrid, currentCombo, endCallback);
            }, 300);
          } else {
             scanForMerges(newGrid, currentCombo, endCallback);
          }
        };
      
        const scanForMerges = (currentGrid: (number | null)[][], currentCombo: number, endCallback: any) => {
            for (let r = ROWS - 1; r >= 0; r--) {
                for (let c = 0; c < COLS; c++) {
                    const val = currentGrid[r][c];
                    if (val === null) continue;
      
                    const directions = [[1, 0], [0, 1]];
                    for (const [dr, dc] of directions) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr < ROWS && nc < COLS && currentGrid[nr][nc] === val) {
                            processMerge(currentGrid, r, c, currentCombo, endCallback);
                            return;
                        }
                    }
                }
            }
            
            setIsDropping(false);
            if (checkGameOver(currentGrid)) {
              setGameOver(true);
              if (endCallback) {
                  endCallback(score, Math.floor(score / 100));
              }
            }
        };
      
        const checkGameOver = (grid: (number | null)[][]) => {
            for (let c = 0; c < COLS; c++) {
                if (grid[0][c] !== null) return true;
            }
            return false;
        };
        
        // Theme Styles
        const bgStyle = theme === 'light' ? 'bg-white' : 'bg-black';
        const gridBg = theme === 'light' ? 'bg-gray-200/80 border-gray-300' : 'bg-gray-900/80 border-white/10';
        const cellEmpty = theme === 'light' ? 'bg-white/50' : 'bg-white/10';

        return (
        <div ref={containerRef} className={`flex flex-col items-center h-full max-w-lg mx-auto p-4 relative overflow-hidden ${bgStyle}`}>
          <div className="absolute inset-0 pointer-events-none">
             <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-black/50" />
             <motion.div 
               className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"
             />
          </div>

          <ParticleSystem particles={particles} />

          <ReviveModal 
            isOpen={gameOver}
            score={score}
            gameName="2048 Merge"
            onRevive={handleRevive}
            onRestart={handleRestart}
          />

          <AnimatePresence>
            {scorePopup && (
              <motion.div
                initial={{ opacity: 1, y: 0, scale: 0.5, rotate: Math.random() * 30 - 15 }}
                animate={{ opacity: 0, y: -100, scale: 1.5 }}
                exit={{ opacity: 0 }}
                style={{ left: scorePopup.x, top: scorePopup.y }}
                className="fixed pointer-events-none z-[60] flex flex-col items-center"
              >
                <div className="text-yellow-400 font-black text-4xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                  +{scorePopup.value}
                </div>
                {scorePopup.combo && (
                  <div className="text-pink-500 font-bold text-2xl mt-1 animate-pulse">
                    COMBO x{scorePopup.combo}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between items-end w-full mb-6 px-2 z-10">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-lg min-w-[120px]"
            >
              <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Ұпай</div>
              <motion.div 
                key={score}
                initial={{ scale: 1.2, color: '#fbbf24' }}
                animate={{ scale: 1, color: '#ffffff' }}
                className="text-3xl font-black text-white font-mono"
              >
                {score}
              </motion.div>
            </motion.div>

            {combo > 1 && (
               <motion.div 
                 initial={{ scale: 0, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 exit={{ scale: 0, opacity: 0 }}
                 className="flex flex-col items-center"
               >
                 <div className="text-pink-500 font-black text-2xl italic tracking-tighter drop-shadow-lg flex items-center gap-1">
                   <Zap className="w-6 h-6 fill-current" />
                   COMBO x{combo}
                 </div>
                 <div className="w-full h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
                   <motion.div 
                     initial={{ width: "100%" }}
                     animate={{ width: "0%" }}
                     transition={{ duration: 5 }}
                     className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                   />
                 </div>
               </motion.div>
            )}

            <div className="flex flex-col items-center">
               <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-bold">Келесі</div>
               <motion.div
                 key={nextBlock}
                 initial={{ rotate: -180, scale: 0 }}
                 animate={{ rotate: 0, scale: 1 }}
                 transition={{ type: "spring", stiffness: 200, damping: 15 }}
                 className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-2xl ${getBlockColor(nextBlock)} border-2 border-white/20`}
               >
                 {nextBlock}
               </motion.div>
            </div>
          </div>

          <motion.div 
            animate={shake ? { x: [-5, 5, -5, 5, 0], y: [-2, 2, -2, 2, 0] } : {}}
            transition={{ duration: 0.4 }}
            className={`game-grid flex-1 w-full max-w-xl rounded-3xl p-3 flex gap-2 relative overflow-hidden shadow-2xl z-10 border ${gridBg}`}
          >
            <div className="absolute inset-0 p-3 flex gap-2 pointer-events-none opacity-20">
              {Array(COLS).fill(0).map((_, i) => (
                <div key={i} className={`flex-1 h-full rounded-xl ${cellEmpty}`} />
              ))}
            </div>
            
            {Array(COLS).fill(0).map((_, colIndex) => (
              <motion.div
                key={colIndex}
                onClick={(e) => handleColumnClick(colIndex, e)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 h-full flex flex-col justify-end gap-2 cursor-pointer relative z-20"
              >
                <motion.div
                  className="absolute inset-0 bg-white/5 rounded-xl transition-colors opacity-0 hover:opacity-100"
                />
                
                {Array(ROWS).fill(0).map((_, rowIndex) => {
                  const val = grid[rowIndex][colIndex];
                  const isMerged = mergedPositions.has(`${rowIndex}-${colIndex}`);
                  const glowClass = getGlowEffect(val);
                  const hasGlow = val >= 128;
                  
                  return (
                    <div 
                      key={`${rowIndex}-${colIndex}`}
                      className="w-full aspect-square relative flex items-center justify-center"
                    >
                      <AnimatePresence mode='popLayout'>
                        {val && (
                          <motion.div
                            initial={{ scale: 0, y: -200, opacity: 0 }}
                            animate={{ 
                              scale: isMerged ? [1, 1.4, 1] : 1, 
                              scaleY: isDropping && droppingColumn === colIndex && rowIndex === 0 ? [1.5, 1] : 1,
                              y: 0, 
                              opacity: 1,
                              rotate: isMerged ? [0, 5, -5, 0] : 0
                            }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ 
                              y: { type: "spring", stiffness: 400, damping: 25 },
                              opacity: { duration: 0.2 },
                              scale: { 
                                type: isMerged ? "keyframes" : "spring",
                                stiffness: 400, 
                                damping: 25,
                                duration: 0.3 
                              },
                              rotate: { duration: 0.4 }
                            }}
                            className={`w-full h-full rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-lg md:text-2xl border border-white/20 ${getBlockColor(val)} ${glowClass} ${hasGlow ? 'shadow-2xl z-10' : ''}`}
                            style={hasGlow ? {
                              boxShadow: `0 0 20px ${COLORS[val]?.split(' ')[1]?.replace('to-', '') || '#ffffff'}60`
                            } : {}}
                          >
                            <motion.span
                              animate={isMerged ? {
                                scale: [1, 1.5, 1],
                              } : {}}
                              transition={{ duration: 0.3 }}
                            >
                              {val}
                            </motion.span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}}
    </GameWrapper>
  );
};

export default Merge2048Game;
