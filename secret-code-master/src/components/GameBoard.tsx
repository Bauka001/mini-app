import React from 'react';
import { GameState, GameConfig } from '../types';

interface GameBoardProps {
  gameState: GameState;
  gameConfig: GameConfig;
  onSlotClick: (index: number) => void;
  onSubmitGuess: () => void;
  onClearGuess: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  gameConfig,
  onSlotClick,
  onSubmitGuess,
  onClearGuess
}) => {
  const renderColorSlot = (color: string | undefined, index: number, isClickable: boolean = false) => {
    const baseClasses = `w-12 h-12 rounded-full border-2 border-gray-300 transition-all duration-300`;
    const colorClasses = color ? `bg-game-${color}` : 'bg-gray-100';
    const clickableClasses = isClickable ? 'cursor-pointer hover:scale-110' : '';
    
    return (
      <div
        key={index}
        className={`${baseClasses} ${colorClasses} ${clickableClasses}`}
        onClick={isClickable ? () => onSlotClick(index) : undefined}
      />
    );
  };

  const renderFeedback = (attempt: any) => {
    const totalDots = attempt.blackDots + attempt.whiteDots;
    const dots = [];
    
    // Қара нүктелер
    for (let i = 0; i < attempt.blackDots; i++) {
      dots.push(<div key={`black-${i}`} className="w-3 h-3 bg-gray-800 rounded-full" />);
    }
    
    // Ақ нүктелер
    for (let i = 0; i < attempt.whiteDots; i++) {
      dots.push(<div key={`white-${i}`} className="w-3 h-3 bg-white border border-gray-400 rounded-full" />);
    }
    
    // Бос нүктелер
    const emptyDots = gameConfig.slots - totalDots;
    for (let i = 0; i < emptyDots; i++) {
      dots.push(<div key={`empty-${i}`} className="w-3 h-3 bg-gray-200 rounded-full" />);
    }
    
    return (
      <div className="flex flex-wrap gap-1 justify-center items-center w-16">
        {dots}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Ойын тақтасы</h2>
      
      {/* Құпия код (жасырын) */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Құпия код:</h3>
        <div className="flex gap-2">
          {Array.from({ length: gameConfig.slots }).map((_, index) => (
            <div
              key={index}
              className="w-12 h-12 rounded-full bg-gray-300 border-2 border-gray-400 animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Талпыныстар */}
      <div className="space-y-3 mb-6">
        {gameState.attempts.map((attempt, attemptIndex) => (
          <div key={attemptIndex} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-600 w-8">
              #{attemptIndex + 1}
            </span>
            <div className="flex gap-2">
              {attempt.guess.map((color, colorIndex) => (
                <div
                  key={colorIndex}
                  className={`w-10 h-10 rounded-full bg-game-${color} border-2 border-gray-300`}
                />
              ))}
            </div>
            {renderFeedback(attempt)}
          </div>
        ))}
      </div>

      {/* Ағымдық талпыныс */}
      {gameState.gameStatus === 'playing' && gameState.currentAttempt < gameConfig.attempts && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Сіздің талпынысыңыз:</h3>
          <div className="flex gap-2">
            {Array.from({ length: gameConfig.slots }).map((_, index) => (
              <div key={index}>
                {renderColorSlot(gameState.currentGuess[index], index, true)}
              </div>
            ))}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onSubmitGuess}
              disabled={gameState.currentGuess.length !== gameConfig.slots}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Тексеру
            </button>
            <button
              onClick={onClearGuess}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Тазарту
            </button>
          </div>
        </div>
      )}

      {/* Ойын статусы */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Қалған мүмкіндіктер: {gameConfig.attempts - gameState.currentAttempt}
        </p>
      </div>
    </div>
  );
};

export default GameBoard;