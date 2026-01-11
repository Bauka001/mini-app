import { useState, useEffect } from 'react';
import { Video, X, Coins } from 'lucide-react';
import { clsx } from 'clsx';

interface AdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  reward: number;
}

const AdModal = ({ isOpen, onClose, onComplete, reward }: AdModalProps) => {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setIsComplete(false);
      setCanClose(false);
      return;
    }

    const duration = 3000;
    const interval = 100;
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + step;
        if (newProgress >= 100) {
          clearInterval(timer);
          setIsComplete(true);
          setCanClose(true);
          return 100;
        }
        return newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleClose = () => {
    if (isComplete) {
      onComplete();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className={clsx(
          "absolute inset-0 bg-black/70 backdrop-blur-sm",
          canClose ? "cursor-pointer" : "cursor-not-allowed"
        )}
        onClick={canClose ? handleClose : undefined}
      />
      <div className="relative w-full max-w-sm bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <Video size={20} className="text-yellow-400" />
            <span className="text-white font-medium">Реклама көру</span>
          </div>
          <button 
            onClick={handleClose}
            disabled={!canClose}
            className={clsx(
              "p-1 rounded-full transition-colors",
              canClose ? "hover:bg-white/10" : "opacity-50 cursor-not-allowed"
            )}
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Video size={48} className="text-white" />
          </div>

          {isComplete ? (
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">+{reward} 🎉</div>
              <div className="text-white/80 text-sm">Толығымен көрілді!</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-white/80 text-sm mb-4">
                {Math.round(3 - (progress / 100) * 3)} секунд
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-white/60 text-xs mt-2">{Math.round(progress)}%</div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white/5 border-t border-white/10">
          <button
            onClick={handleClose}
            disabled={!canClose}
            className={clsx(
              "w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
              canClose 
                ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:scale-105 active:scale-95" 
                : "bg-white/10 text-white/50 cursor-not-allowed"
            )}
          >
            <Coins size={18} />
            {isComplete ? `${reward} Coin алу` : `${Math.ceil(3 - (progress / 100) * 3)}s күту`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdModal;
