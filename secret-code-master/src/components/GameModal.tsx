import React from 'react';

interface GameModalProps {
  show: boolean;
  message: string;
  score: number;
  onPlayAgain: () => void;
  onClose: () => void;
}

const GameModal: React.FC<GameModalProps> = ({
  show,
  message,
  score,
  onPlayAgain,
  onClose
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 animate-bounce-in">
        <div className="text-center">
          <div className="mb-4">
            {score > 0 ? (
              <div className="text-6xl mb-4">🏆</div>
            ) : (
              <div className="text-6xl mb-4">😔</div>
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {score > 0 ? 'Құттықтаймыз!' : 'Ойын аяқталды!'}
          </h2>
          
          <p className="text-gray-600 mb-4">{message}</p>
          
          {score > 0 && (
            <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 font-semibold">
                Жинаған ұпайыңыз: {score}
              </p>
            </div>
          )}
          
          <div className="flex gap-3 justify-center">
            <button
              onClick={onPlayAgain}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Қайта ойнау
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Жабу
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameModal;