import React, { useEffect, useState } from 'react';

interface TimerProps {
  timeRemaining: number;
  onTimeUp: () => void;
  isActive: boolean;
}

const Timer: React.FC<TimerProps> = ({ timeRemaining, onTimeUp, isActive }) => {
  const [timeLeft, setTimeLeft] = useState(timeRemaining);

  useEffect(() => {
    setTimeLeft(timeRemaining);
  }, [timeRemaining]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, timeLeft, onTimeUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft > 60) return 'text-green-600';
    if (timeLeft > 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg p-4 mb-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Қалған уақыт</h3>
        <div className={`text-2xl font-bold ${getTimerColor()}`}>
          {formatTime(timeLeft)}
        </div>
      </div>
      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-1000 ${
            timeLeft > 60 ? 'bg-green-500' : 
            timeLeft > 30 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${(timeLeft / timeRemaining) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default Timer;