import React, { useState, useEffect } from 'react';
import { GameState, GameConfig, GuessAttempt, DIFFICULTY_LEVELS } from '../types';
import { generateSecretCode, checkGuess, calculateScore, generateRestriction, isValidGuess } from '../utils';
import ColorPicker from './ColorPicker';
import GameBoard from './GameBoard';
import DifficultySelector from './DifficultySelector';
import GameModal from './GameModal';
import Timer from './Timer';

const SecretCodeGame: React.FC = () => {
  const [gameConfig, setGameConfig] = useState<GameConfig>(DIFFICULTY_LEVELS.easy.config);
  const [gameState, setGameState] = useState<GameState>({
    secretCode: [],
    currentGuess: [],
    attempts: [],
    currentAttempt: 0,
    gameStatus: 'playing',
    score: 0
  });
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [currentRestriction, setCurrentRestriction] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const initializeGame = (config: GameConfig) => {
    const secretCode = generateSecretCode(config);
    setGameState({
      secretCode,
      currentGuess: [],
      attempts: [],
      currentAttempt: 0,
      gameStatus: 'playing',
      score: 0,
      timeRemaining: config.timeLimit
    });
    setCurrentRestriction(generateRestriction(config));
    setShowModal(false);
  };

  useEffect(() => {
    initializeGame(gameConfig);
  }, [gameConfig]);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  const handleSlotClick = (slotIndex: number) => {
    if (selectedColor && gameState.gameStatus === 'playing') {
      const newGuess = [...gameState.currentGuess];
      newGuess[slotIndex] = selectedColor;
      setGameState(prev => ({ ...prev, currentGuess: newGuess }));
    }
  };

  const handleSubmitGuess = () => {
    if (gameState.currentGuess.length !== gameConfig.slots) {
      alert('Барлық ұяшықтарды толтырыңыз!');
      return;
    }

    if (currentRestriction && !isValidGuess(gameState.currentGuess, currentRestriction, gameConfig)) {
      alert(`Шектеу: ${currentRestriction}`);
      return;
    }

    const feedback = checkGuess(gameState.secretCode, gameState.currentGuess);
    const newAttempts = [...gameState.attempts, feedback];
    const newAttemptNumber = gameState.currentAttempt + 1;

    if (feedback.blackDots === gameConfig.slots) {
      // Жеңіс!
      const score = calculateScore(newAttemptNumber, gameConfig.attempts, gameState.timeRemaining);
      setGameState(prev => ({
        ...prev,
        attempts: newAttempts,
        currentAttempt: newAttemptNumber,
        gameStatus: 'won',
        score
      }));
      setModalMessage(`Құттықтаймыз! Сіз кодты таптыңыз! Ұпай: ${score}`);
      setShowModal(true);
    } else if (newAttemptNumber >= gameConfig.attempts) {
      // Жеңіліс
      setGameState(prev => ({
        ...prev,
        attempts: newAttempts,
        currentAttempt: newAttemptNumber,
        gameStatus: 'lost'
      }));
      setModalMessage(`Ойын аяқталды! Құпия код: ${gameState.secretCode.join(', ')}`);
      setShowModal(true);
    } else {
      // Ойын жалғасуда
      setGameState(prev => ({
        ...prev,
        attempts: newAttempts,
        currentAttempt: newAttemptNumber,
        currentGuess: []
      }));
      setCurrentRestriction(generateRestriction(gameConfig));
    }
  };

  const handleClearGuess = () => {
    setGameState(prev => ({ ...prev, currentGuess: [] }));
  };

  const handleDifficultyChange = (level: string) => {
    setGameConfig(DIFFICULTY_LEVELS[level].config);
  };

  const handleTimeUp = () => {
    if (gameState.gameStatus === 'playing') {
      setGameState(prev => ({ ...prev, gameStatus: 'lost' }));
      setModalMessage('Уақыт аяқталды!');
      setShowModal(true);
    }
  };

  const handlePlayAgain = () => {
    initializeGame(gameConfig);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Құпия код ойыны
        </h1>
        
        <DifficultySelector 
          currentDifficulty={gameConfig.level}
          onDifficultyChange={handleDifficultyChange}
        />

        {gameConfig.timeLimit && (
          <Timer 
            timeRemaining={gameState.timeRemaining || gameConfig.timeLimit}
            onTimeUp={handleTimeUp}
            isActive={gameState.gameStatus === 'playing'}
          />
        )}

        {currentRestriction && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-center">
            <strong>Шектеу:</strong> {currentRestriction}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <GameBoard
              gameState={gameState}
              gameConfig={gameConfig}
              onSlotClick={handleSlotClick}
              onSubmitGuess={handleSubmitGuess}
              onClearGuess={handleClearGuess}
            />
          </div>
          
          <div>
            <ColorPicker
              colors={gameConfig.colors}
              selectedColor={selectedColor}
              onColorSelect={handleColorSelect}
              shapes={gameConfig.shapes}
            />
          </div>
        </div>

        <GameModal
          show={showModal}
          message={modalMessage}
          score={gameState.score}
          onPlayAgain={handlePlayAgain}
          onClose={() => setShowModal(false)}
        />
      </div>
    </div>
  );
};

export default SecretCodeGame;