import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { clsx } from 'clsx';

const CalendarPage = () => {
  const { t } = useTranslation();
  const { history } = useStore();
  
  // Generate calendar days for current month
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Calculate daily progress
  const getDayStatus = (day: number) => {
    const dateStr = new Date(today.getFullYear(), today.getMonth(), day).toISOString().split('T')[0];
    // Filter games played on this date
    const gamesPlayed = history.filter(h => h.date === dateStr);
    
    // Logic: If played at least once, mark as done (Green). 
    // In a real app, we would sum up duration and compare with dailyGoalMinutes.
    // For now, simple check: > 0 games = done.
    if (gamesPlayed.length > 0) return 'success';
    
    // If day is in the past and no games, fail (Red)
    if (day < today.getDate()) return 'fail';
    
    return 'pending';
  };

  return (
    <div className="p-4 pb-24">
      <h1 className="text-3xl font-bold text-primary mb-6">{t('calendar', 'Calendar')}</h1>

      {/* Brain Visualization Placeholder */}
      <div className="bg-secondary p-6 rounded-2xl mb-8 flex flex-col items-center">
        <div className="w-32 h-32 relative mb-4">
          <svg viewBox="0 0 100 100" className="w-full h-full text-gray-700">
            <path 
              d="M50 15 C30 15 15 30 15 50 C15 75 35 90 50 90 C65 90 85 75 85 50 C85 30 70 15 50 15 Z" 
              fill="currentColor"
            />
          </svg>
          <div 
            className="absolute inset-0 flex items-center justify-center text-primary font-bold text-xl"
          >
            {/* Logic to fill brain based on streak would go here */}
            Brain
          </div>
        </div>
        <p className="text-gray-400 text-center text-sm">
          Keep playing to develop your brain!
        </p>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-8">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="text-center text-gray-500 text-xs font-bold uppercase">
            {d}
          </div>
        ))}
        {days.map(day => {
          const status = getDayStatus(day);
          return (
            <div 
              key={day}
              className={clsx(
                "aspect-square rounded-lg flex items-center justify-center text-sm font-bold border border-gray-800",
                status === 'success' && "bg-green-500/20 text-green-500 border-green-500/50",
                status === 'fail' && "bg-red-500/20 text-red-500 border-red-500/50",
                status === 'pending' && "bg-secondary text-gray-400",
                day === today.getDate() && "ring-2 ring-primary"
              )}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="bg-secondary p-4 rounded-xl">
        <h3 className="font-bold text-white mb-2">Legend</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/50"></div>
            <span className="text-gray-400">Goal Achieved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/50"></div>
            <span className="text-gray-400">Missed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
