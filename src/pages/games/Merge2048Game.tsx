import React, { useState, useEffect, useRef } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore.1';
import { soundManager } from '../../utils/soundManager';
import { ParticleSystem, Particle } from '../../components/effects/ParticleSystem';
import { Zap, AlertTriangle } from 'lucide-react';
import { ReviveModal } from '../../components/modals/ReviveModal';
import { clsx } from 'clsx';

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
  8192: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
  16384: 'bg-gradient-to-br from-rose-400 to-rose-600',
  32768: 'bg-gradient-to-br from-fuchsia-400 to-fuchsia-600',
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
  8192: '#22d3ee',
  16384: '#fb7185',
  32768: '#e879f9',
};

const GLOW_COLORS: Record<number, string> = {
  128: 'shadow-pink-500/50',
  256: 'shadow-indigo-500/50',
  512: 'shadow-teal-500/50',
  1024: 'shadow-lime-500/50',
  2048: 'shadow-amber-500/50',
  4096: 'shadow-emerald-500/50',
  8192: 'shadow-cyan-500/50',
  16384: 'shadow-rose-500/50',
  32768: 'shadow-fuchsia-500/50',
};

const getBlockColor = (value: number) => COLORS[value] || 'bg-gradient-to-br from-gray-500 to-gray-700';
const getGlowEffect = (value: number) => GLOW_COLORS[value] || '';

const Merge2048Game = () => {
  const { soundEnabled, theme } = useStore();
  const [grid, setGrid] = useState<(number | null)[][]>(
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  const [minBlockValue, setMinBlockValue] = useState<number>(2); // Start with 2
  const minBlockValueRef = useRef(2);
  const [nextBlock, setNextBlock] = useState<number>(2);
  const [score, setScore] = useState(0);
  const [scorePopup, setScorePopup] = useState<{ x: number; y: number; value: number; combo?: number } | null>(null);
  const [levelUpPopup, setLevelUpPopup] = useState<string | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [mergedPositions, setMergedPositions] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(false);
  const [combo, setCombo] = useState(0);
  const [droppingColumn, setDroppingColumn] = useState<number | null>(null);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const generateBlock = (minVal: number) => {
    // Generate block based on current minBlockValue
    // Example: if minVal is 2 -> [2, 4, 8, 16, 32]
    // Example: if minVal is 4 -> [4, 8, 16, 32, 64]
    
    const values = [];
    let val = minVal;
    for(let i=0; i<5; i++) {
        values.push(val);
        val *= 2;
    }
    return values[Math.floor(Math.random() * values.length)];
  };

  useEffect(() => {
    setNextBlock(generateBlock(minBlockValue));
  }, [minBlockValue]); // Regenerate if minBlockValue changes

  // Cleanup particles
  useEffect(() => {
    if (particles.length > 0) {
      const timer = setTimeout(() => {
        setParticles(prev => prev.slice(1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [particles]);

  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 200);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  useEffect(() => {
    if (levelUpPopup) {
        const timer = setTimeout(() => setLevelUpPopup(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [levelUpPopup]);

  const showScorePopup = (x: number, y: number, value: number, currentCombo: number) => {
    setScorePopup({ x, y, value, combo: currentCombo > 1 ? currentCombo : undefined });
    setTimeout(() => setScorePopup(null), 1000);
  };

  const handleRevive = () => {
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
     setMinBlockValue(2);
     minBlockValueRef.current = 2;
     setNextBlock(2);
  };

  return (
    <GameWrapper
      title="Merge 2048"
      instructions="Бағанды басып санды тастаңыз. Бірдей сандар қосылады. 4096-ға жеткенде 2 саны ойыннан алынады! 8192-де 4 саны алынады..."
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
            setShake(true);
            return;
          }
      
          setIsDropping(true);
          setDroppingColumn(colIndex);
          soundManager.playClick();
          setCombo(0);
      
          const newGrid = [...grid.map(row => [...row])];
          newGrid[targetRow][colIndex] = nextBlock;
          setGrid(newGrid);
      
          const nextVal = generateBlock(minBlockValue);
          setNextBlock(nextVal);
      
          setTimeout(() => {
            setDroppingColumn(null);
            processMerge(newGrid, targetRow, colIndex, 0, onEnd);
          }, 300);
        };
      
        const processMerge = (currentGrid: (number | null)[][], r: number, c: number, currentCombo: number, endCallback: any) => {
          let newGrid = [...currentGrid.map(row => [...row])];
          const val = newGrid[r][c];
      
          if (!val) {
            setIsDropping(false);
            return;
          }
      
          const directions = [[1, 0], [0, -1], [0, 1], [-1, 0]];
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
            
            if (newCombo > 1 || newVal >= 64) setShake(true);
            
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
                 
                 setParticles(prev => [...prev, { id: Date.now() + Math.random().toString(), x: particleX, y: particleY, color: COLOR_HEX[newVal] || '#ffffff' }]);
                 showScorePopup(gridRect.left + particleX, gridRect.top + particleY, scoreAdd, newCombo);
              }
            }
      
            setGrid(newGrid);
            
            setTimeout(() => {
              setMergedPositions(prev => {
                const newSet = new Set(prev);
                newSet.delete(posKey);
                return newSet;
              });
              
              applyGravity(newGrid, newCombo, endCallback);
            }, 400);
            return;
          }
      
          // No more merges for this block, check for Level Up BEFORE gravity stop
          checkForLevelUp(newGrid, endCallback);
        };
        
        const checkForLevelUp = (currentGrid: (number | null)[][], endCallback: any) => {
            let max = 0;
            for(let r=0; r<ROWS; r++) {
                for(let c=0; c<COLS; c++) {
                    const v = currentGrid[r][c];
                    if(v && v > max) max = v;
                }
            }

            // Level Up Logic using REF
            const currentMin = minBlockValueRef.current;
            let newMin = currentMin;
            let removeValue = 0;

            if (max >= 4096 && currentMin === 2) {
                newMin = 4;
                removeValue = 2;
            } else if (max >= 8192 && currentMin === 4) {
                newMin = 8;
                removeValue = 4;
            } else if (max >= 16384 && currentMin === 8) {
                newMin = 16;
                removeValue = 8;
            }

            if (removeValue > 0) {
                // Perform Level Up
                setMinBlockValue(newMin);
                minBlockValueRef.current = newMin;
                
                setLevelUpPopup(`${removeValue} саны ойыннан алынды!`);
                soundManager.playWin();

                // Remove all instances of 'removeValue'
                const clearedGrid = currentGrid.map(row => row.map(cell => cell === removeValue ? null : cell));
                setGrid(clearedGrid);

                // Apply gravity again because we removed blocks
                setTimeout(() => {
                    applyGravity(clearedGrid, 0, endCallback);
                }, 2000);
                return;
            }

            // If no level up, just check game over
            if (checkGameOver(currentGrid)) {
                setGameOver(true);
                if (endCallback) endCallback(score, Math.floor(score / 100));
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
            
            // No merges found, check for level up
            checkForLevelUp(currentGrid, endCallback);
        };
      
        const checkGameOver = (grid: (number | null)[][]) => {
            for (let c = 0; c < COLS; c++) {
                if (grid[0][c] !== null) return true;
            }
            return false;
        };
        
        const bgStyle = theme === 'light' ? 'bg-gradient-to-br from-indigo-50 to-blue-50' : 'bg-transparent';
        const gridBg = theme === 'light' ? 'bg-white/60 border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-xl' : 'bg-white/5 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-2xl';
        const cellEmpty = theme === 'light' ? 'bg-indigo-900/5' : 'bg-white/5';

        return (
        <div ref={containerRef} className={`flex flex-col items-center h-full max-w-lg mx-auto p-4 relative overflow-hidden ${bgStyle} transition-colors duration-500`}>
          {theme !== 'light' && (
            <div className="absolute inset-0 pointer-events-none">
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background" />
               <motion.div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
            </div>
          )}

          <ParticleSystem particles={particles} />

          <ReviveModal 
            isOpen={gameOver}
            score={score}
            gameName="Merge 2048"
            onRevive={handleRevive}
            onRestart={handleRestart}
          />

          <AnimatePresence>
            {levelUpPopup && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-3xl shadow-2xl border-4 border-white text-center"
                >
                    <AlertTriangle size={48} className="mx-auto text-white mb-2" />
                    <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Level Up!</h2>
                    <p className="text-white font-bold text-lg">{levelUpPopup}</p>
                </motion.div>
            )}

            {scorePopup && (
              <motion.div
                initial={{ opacity: 1, y: 0, scale: 0.5, rotate: Math.random() * 30 - 15 }}
                animate={{ opacity: 0, y: -100, scale: 1.5 }}
                exit={{ opacity: 0 }}
                style={{ left: scorePopup.x, top: scorePopup.y }}
                className="fixed pointer-events-none z-[60] flex flex-col items-center"
              >
                <div className="text-yellow-400 font-black text-4xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">+{scorePopup.value}</div>
                {scorePopup.combo && <div className="text-pink-500 font-bold text-2xl mt-1 animate-pulse">COMBO x{scorePopup.combo}</div>}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between items-end w-full mb-6 px-2 z-10">
            <motion.div whileHover={{ scale: 1.05 }} className={clsx("backdrop-blur-xl rounded-[1.5rem] p-4 border shadow-lg min-w-[120px]", theme === 'light' ? 'bg-white/80 border-white text-indigo-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)]' : 'bg-white/10 border-white/10 text-white')}>
              <div className={clsx("text-xs uppercase tracking-wider font-bold mb-1", theme === 'light' ? 'text-indigo-400' : 'text-gray-400')}>Ұпай</div>
              <motion.div key={score} initial={{ scale: 1.2, color: '#fbbf24' }} animate={{ scale: 1, color: theme === 'light' ? '#312e81' : '#ffffff' }} className="text-3xl font-black font-mono">{score}</motion.div>
            </motion.div>

            {combo > 1 && (
               <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="flex flex-col items-center bg-white/10 backdrop-blur-md rounded-2xl p-2 px-4 border border-white/20 shadow-xl">
                 <div className="text-pink-500 font-black text-2xl italic tracking-tighter drop-shadow-lg flex items-center gap-1"><Zap className="w-6 h-6 fill-current" />COMBO x{combo}</div>
                 <div className="w-full h-1.5 bg-gray-900/50 rounded-full mt-1 overflow-hidden"><motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 5 }} className="h-full bg-gradient-to-r from-pink-500 to-purple-500" /></div>
               </motion.div>
            )}

            <div className={clsx("flex flex-col items-center backdrop-blur-xl rounded-[1.5rem] p-3 px-5 border shadow-lg", theme === 'light' ? 'bg-white/80 border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]' : 'bg-white/10 border-white/10')}>
               <div className={clsx("text-xs mb-2 uppercase tracking-wider font-bold", theme === 'light' ? 'text-indigo-400' : 'text-gray-400')}>Келесі</div>
               <motion.div key={nextBlock} initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-[0_8px_16px_rgba(0,0,0,0.2)] ${getBlockColor(nextBlock)} border-2 border-white/30`}>{nextBlock}</motion.div>
            </div>
          </div>

          <motion.div animate={shake ? { x: [-5, 5, -5, 5, 0], y: [-2, 2, -2, 2, 0] } : {}} transition={{ duration: 0.4 }} className={`game-grid flex-1 w-full max-w-xl rounded-3xl p-3 flex gap-2 relative overflow-hidden shadow-2xl z-10 border ${gridBg}`}>
            <div className="absolute inset-0 p-3 flex gap-2 pointer-events-none opacity-20">
              {Array(COLS).fill(0).map((_, i) => <div key={i} className={`flex-1 h-full rounded-xl ${cellEmpty}`} />)}
            </div>
            
            {Array(COLS).fill(0).map((_, colIndex) => (
              <motion.div key={colIndex} onClick={(e) => handleColumnClick(colIndex, e)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 h-full flex flex-col justify-end gap-2 cursor-pointer relative z-20">
                <motion.div className="absolute inset-0 bg-white/5 rounded-xl transition-colors opacity-0 hover:opacity-100" />
                
                {Array(ROWS).fill(0).map((_, rowIndex) => {
                  const val = grid[rowIndex][colIndex];
                  const isMerged = mergedPositions.has(`${rowIndex}-${colIndex}`);
                  const glowClass = getGlowEffect(val);
                  const hasGlow = val >= 128;
                  
                  return (
                    <div key={`${rowIndex}-${colIndex}`} className="w-full aspect-square relative flex items-center justify-center">
                      <AnimatePresence mode='popLayout'>
                        {val && (
                          <motion.div
                            initial={{ scale: 0, y: -200, opacity: 0 }}
                            animate={{ scale: isMerged ? [1, 1.4, 1] : 1, scaleY: isDropping && droppingColumn === colIndex && rowIndex === 0 ? [1.5, 1] : 1, y: 0, opacity: 1, rotate: isMerged ? [0, 5, -5, 0] : 0 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ y: { type: "spring", stiffness: 400, damping: 25 }, opacity: { duration: 0.2 }, scale: { type: isMerged ? "keyframes" : "spring", stiffness: 400, damping: 25, duration: 0.3 }, rotate: { duration: 0.4 } }}
                            className={`w-full h-full rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-lg md:text-2xl border border-white/20 ${getBlockColor(val)} ${glowClass} ${hasGlow ? 'shadow-2xl z-10' : ''}`}
                            style={hasGlow ? { boxShadow: `0 0 20px ${COLORS[val]?.split(' ')[1]?.replace('to-', '') || '#ffffff'}60` } : {}}
                          >
                            <motion.span animate={isMerged ? { scale: [1, 1.5, 1] } : {}} transition={{ duration: 0.3 }}>{val}</motion.span>
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
