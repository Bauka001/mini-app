import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Play, Brain, Calculator, Type } from 'lucide-react';
import { useStore } from '../store/useStore';

const GameCard = ({ title, icon: Icon, color, onClick }: { title: string, icon: any, color: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full p-4 mb-4 rounded-xl bg-secondary border border-gray-800 flex items-center justify-between active:scale-95 transition-transform`}
  >
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-full ${color} bg-opacity-20`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
      <span className="text-lg font-bold">{title}</span>
    </div>
    <Play size={20} className="text-gray-400" />
  </button>
);

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dailyGoalMinutes, history } = useStore();

  // Calculate daily progress (mock logic for now, using games count * 2 mins approx)
  // Real logic would sum up actual playtime from history
  const today = new Date().toISOString().split('T')[0];
  const todayGames = history.filter(h => h.date === today);
  const minutesPlayed = todayGames.length * 2; // Assuming 2 mins per game avg for demo
  const progressPercent = Math.min(100, (minutesPlayed / dailyGoalMinutes) * 100);

  return (
    <div className="p-4 pb-24">
      <header className="mb-8 text-center pt-4">
        <h1 className="text-4xl font-black text-primary mb-2">focus</h1>
        <p className="text-gray-400 text-sm">
          {t('welcome')}
        </p>
      </header>

      <div className="space-y-2">
        <h2 className="text-xl font-bold mb-4 pl-1">{t('start')}</h2>
        
        <GameCard 
          title="Schulte Table" 
          icon={Brain} 
          color="bg-blue-500 text-blue-500" 
          onClick={() => navigate('/game/schulte')} 
        />
        
        <GameCard 
          title="Arithmetic" 
          icon={Calculator} 
          color="bg-green-500 text-green-500" 
          onClick={() => navigate('/game/math')} 
        />
        
        <GameCard 
          title="Stroop Test" 
          icon={Type} 
          color="bg-red-500 text-red-500" 
          onClick={() => navigate('/game/stroop')} 
        />
      </div>

      <div className="mt-8 p-4 bg-secondary rounded-xl border border-primary/20">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Daily Goal</span>
          <span className="text-primary font-bold">{minutesPlayed}/{dailyGoalMinutes} min</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default Home;
