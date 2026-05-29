import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Notification } from '../store/useStore';
import { useStore } from '../store/useStoreImpl';
import clsx from 'clsx';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { claudeTokens } from './ui/claudeTokens';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal = ({ isOpen, onClose }: NotificationsModalProps) => {
  const { notifications, markNotificationRead } = useStore();
  const { isClaude } = useThemeStyles();

  if (!isOpen) return null;

  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (isClaude) {
    const claudeIcon = (type: Notification['type']) => {
      switch (type) {
        case 'success':
          return <CheckCircle size={18} strokeWidth={1.75} style={{ color: claudeTokens.success }} />;
        case 'warning':
          return <AlertTriangle size={18} strokeWidth={1.75} style={{ color: claudeTokens.warning }} />;
        case 'error':
          return <XCircle size={18} strokeWidth={1.75} style={{ color: claudeTokens.warning }} />;
        default:
          return <Info size={18} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />;
      }
    };

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(31,30,29,0.55)', backdropFilter: 'blur(6px)' }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: claudeTokens.surface,
              border: `1px solid ${claudeTokens.border}`,
              maxHeight: '80vh',
            }}
          >
            <header
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: `1px solid ${claudeTokens.border}` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: claudeTokens.accentSoft, color: claudeTokens.accent }}
                >
                  <Bell size={18} strokeWidth={1.75} />
                </div>
                <h3
                  className="leading-tight"
                  style={{
                    color: claudeTokens.textPrimary,
                    fontFamily: claudeTokens.serifStack,
                    fontSize: '20px',
                    fontWeight: 500,
                  }}
                >
                  Notifications
                </h3>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[#F0EEE6]"
                style={{ color: claudeTokens.textMuted }}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto">
              {sortedNotifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-10">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{
                      backgroundColor: claudeTokens.surfaceMuted,
                      border: `1px solid ${claudeTokens.border}`,
                    }}
                  >
                    <Bell size={26} strokeWidth={1.5} style={{ color: claudeTokens.textMuted }} />
                  </div>
                  <h4
                    className="italic"
                    style={{
                      color: claudeTokens.textPrimary,
                      fontFamily: claudeTokens.serifStack,
                      fontSize: '18px',
                      fontWeight: 500,
                    }}
                  >
                    No notifications
                  </h4>
                  <p className="text-[13px] mt-1" style={{ color: claudeTokens.textMuted }}>
                    You are all caught up.
                  </p>
                </div>
              ) : (
                <div>
                  {sortedNotifications.map((notif, idx) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => markNotificationRead(notif.id)}
                      className="relative px-6 py-4 cursor-pointer transition-colors hover:bg-[#F0EEE6]"
                      style={{
                        borderBottom:
                          idx < sortedNotifications.length - 1
                            ? `1px solid ${claudeTokens.border}`
                            : 'none',
                        opacity: notif.isRead ? 0.65 : 1,
                      }}
                    >
                      {!notif.isRead && (
                        <span
                          className="absolute top-5 right-6 w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: claudeTokens.accent }}
                        />
                      )}
                      <div className="flex gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: claudeTokens.surfaceMuted,
                            border: `1px solid ${claudeTokens.border}`,
                          }}
                        >
                          {claudeIcon(notif.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4
                            className="text-[14px] truncate"
                            style={{ color: claudeTokens.textPrimary, fontWeight: 500 }}
                          >
                            {notif.title}
                          </h4>
                          <p
                            className="text-[12px] mt-0.5 leading-relaxed"
                            style={{ color: claudeTokens.textBody }}
                          >
                            {notif.message}
                          </p>
                          <span
                            className="text-[10px] tracking-[0.18em] uppercase mt-2 block"
                            style={{ color: claudeTokens.textMuted, fontFamily: claudeTokens.serifStack }}
                          >
                            {new Date(notif.date).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Legacy themes — original markup
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
      <div className="modal-shell fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="modal-card bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        >
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Bell size={20} className="text-yellow-500 fill-current" />
              Notifications
            </h3>
            <button onClick={onClose} className="p-2 min-h-[44px] min-w-[44px] rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
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
                    <div className="min-w-0">
                      <h4 className={clsx(
                        "text-sm sm:text-base font-bold mb-1 truncate",
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
