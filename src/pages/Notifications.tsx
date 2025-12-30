import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, User } from 'lucide-react';

const MOCK_NOTIFICATIONS = [
  { id: 1, user: 'User_9921', action: 'bought_premium', time: '2 min ago', amount: '$9.99' },
  { id: 2, user: 'Alex_K', action: 'bought_skin', skin: 'Neon Blue', time: '5 min ago', amount: '100 coins' },
  { id: 3, user: 'Dana_00', action: 'bought_gold', time: '12 min ago', amount: '$4.99' },
  { id: 4, user: 'Player_1', action: 'bought_skin', skin: 'Matrix', time: '25 min ago', amount: '500 coins' },
  { id: 5, user: 'Guest_55', action: 'bought_premium', time: '1 hour ago', amount: '$9.99' },
];

const NotificationsPage = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      const newNotif = {
        id: Date.now(),
        user: `User_${Math.floor(Math.random() * 9999)}`,
        action: Math.random() > 0.5 ? 'bought_premium' : 'bought_skin',
        time: 'Just now',
        amount: Math.random() > 0.5 ? '$9.99' : '100 coins',
        skin: 'Royal Purple'
      };
      setNotifications(prev => [newNotif, ...prev.slice(0, 9)]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 pb-24">
      <h1 className="text-3xl font-bold text-primary mb-6 flex items-center gap-2">
        <Bell className="fill-current" />
        {t('notifications', 'Notifications')}
      </h1>

      <div className="space-y-4">
        {notifications.map((notif) => (
          <div key={notif.id} className="bg-secondary p-4 rounded-xl border border-gray-800 flex items-center gap-4 animate-in slide-in-from-top-2">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
              <User size={20} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <span className="font-bold text-white">{notif.user}</span>
                <span className="text-xs text-gray-500">{notif.time}</span>
              </div>
              <p className="text-sm text-gray-400">
                {notif.action === 'bought_premium' 
                  ? t('purchased_premium', 'Purchased Premium Plan') 
                  : t('purchased_skin', 'Purchased Skin')} 
                <span className="text-primary font-bold ml-1">{notif.amount}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;
