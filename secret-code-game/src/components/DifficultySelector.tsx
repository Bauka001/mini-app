import React from 'react';
import { DIFFICULTY_LEVELS } from '../types';

interface DifficultySelectorProps {
  currentDifficulty: string;
  onDifficultyChange: (level: string) => void;
}

const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  currentDifficulty,
  onDifficultyChange
}) => {
  return (
    <div className="bg-white rounded-lg p-4 mb-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-3">Қиындық деңгейі</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.entries(DIFFICULTY_LEVELS).map(([key, level]) => (
          <button
            key={key}
            onClick={() => onDifficultyChange(key)}
            className={`p-3 rounded-lg border-2 transition-all duration-200 ${
              currentDifficulty === level.config.level
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <div className="font-medium">{level.name}</div>
            <div className="text-xs text-gray-500 mt-1">
              {level.config.slots} ұяшық, {level.config.attempts} мүмкіндік
              {level.config.timeLimit && `, ${level.config.timeLimit}с`}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DifficultySelector;