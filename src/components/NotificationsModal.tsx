import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Check, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useStore, Notification } from '../store/useStore';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal = ({ isOpen, onClose }: NotificationsModalProps) => {
  const { notifications, markNotificationRead } = useStore();
  const { t } = useTranslation();

  if (!isOpen) return null;

  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} className="text-green-500" />;
      case 'warning': return <AlertTriangle size={20} className="text-yellow-500" />;
      case 'error': return <XCircle size={20} className="text-red-500" />;
      default: return <Info size={20} className="text-blue-500" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl h-[80vh] flex flex-col"
        >
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Bell size={20} className="text-yellow-500 fill-current" />
              Notifications
            </h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sortedNotifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Bell size={32} className="text-gray-300 dark:text-gray-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No notifications</h4>
                <p className="text-sm text-gray-500">You're all caught up!</p>
              </div>
            ) : (
              sortedNotifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => markNotificationRead(notif.id)}
                  className={clsx(
                    "p-4 rounded-2xl border transition-all relative overflow-hidden group cursor-pointer",
                    notif.isRead 
                      ? "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-60 hover:opacity-100" 
                      : "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 shadow-sm"
                  )}
                >
                  {!notif.isRead && (
                    <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                  
                  <div className="flex gap-4">
                    <div className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      notif.isRead ? "bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-800 shadow-sm"
                    )}>
                      {getIcon(notif.type)}
                    </div>
                    <div>
                      <h4 className={clsx(
                        "text-sm font-bold mb-1",
                        notif.isRead ? "text-gray-600 dark:text-gray-400" : "text-gray-900 dark:text-white"
                      )}>
                        {notif.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        {new Date(notif.date).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
