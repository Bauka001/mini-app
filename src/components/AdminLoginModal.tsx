import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, ShieldCheck } from 'lucide-react';
import { useStore } from '../store/useStoreImpl';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { claudeTokens } from './ui/claudeTokens';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLoginModal = ({ isOpen, onClose }: AdminLoginModalProps) => {
  const user = useStore((state) => state.user);
  const { isAdmin, isLoading, error } = useAdminAccess(isOpen);
  const { isClaude } = useThemeStyles();

  if (!isOpen) return null;

  if (isClaude) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(31,30,29,0.55)', backdropFilter: 'blur(6px)' }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              backgroundColor: claudeTokens.surface,
              border: `1px solid ${claudeTokens.border}`,
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
                  <ShieldCheck size={18} strokeWidth={1.75} />
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
                  Admin access
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

            <div className="px-6 py-6">
              {isLoading ? (
                <div className="text-center py-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{
                      backgroundColor: claudeTokens.surfaceMuted,
                      border: `1px solid ${claudeTokens.border}`,
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full animate-spin"
                      style={{
                        border: `2px solid ${claudeTokens.border}`,
                        borderTopColor: claudeTokens.accent,
                      }}
                    />
                  </div>
                  <h3
                    className="italic"
                    style={{
                      color: claudeTokens.textPrimary,
                      fontFamily: claudeTokens.serifStack,
                      fontSize: '18px',
                      fontWeight: 500,
                    }}
                  >
                    Verifying…
                  </h3>
                  <p className="text-[12px] mt-1" style={{ color: claudeTokens.textMuted }}>
                    Server-side role check in progress
                  </p>
                </div>
              ) : isAdmin ? (
                <div className="text-center py-2">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{
                      backgroundColor: claudeTokens.accentSoft,
                      border: `1px solid ${claudeTokens.accent}`,
                      color: claudeTokens.accent,
                    }}
                  >
                    <ShieldCheck size={26} strokeWidth={1.75} />
                  </div>
                  <h3
                    className="italic"
                    style={{
                      color: claudeTokens.textPrimary,
                      fontFamily: claudeTokens.serifStack,
                      fontSize: '20px',
                      fontWeight: 500,
                    }}
                  >
                    You are an admin
                  </h3>
                  <p className="text-[13px] mt-1" style={{ color: claudeTokens.textBody }}>
                    All administrative tools are unlocked.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-5 w-full rounded-lg py-3 text-[14px] font-medium transition-colors"
                    style={{ backgroundColor: claudeTokens.accent, color: '#FFFFFF' }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                      style={{
                        backgroundColor: claudeTokens.surfaceMuted,
                        border: `1px solid ${claudeTokens.border}`,
                      }}
                    >
                      <Lock size={20} strokeWidth={1.75} style={{ color: claudeTokens.textMuted }} />
                    </div>
                    <p className="text-[13px]" style={{ color: claudeTokens.textBody }}>
                      Admin permissions are managed server-side.
                    </p>
                    {user?.id ? (
                      <p
                        className="text-[11px] mt-2 tabular-nums font-mono"
                        style={{ color: claudeTokens.textMuted }}
                      >
                        Telegram ID:{' '}
                        <span style={{ color: claudeTokens.textBody }}>{user.id}</span>
                      </p>
                    ) : null}
                  </div>

                  <div
                    className="rounded-xl px-4 py-3 text-[12px] leading-relaxed"
                    style={{
                      backgroundColor: claudeTokens.surfaceMuted,
                      border: `1px solid ${claudeTokens.border}`,
                      color: claudeTokens.textBody,
                    }}
                  >
                    Telegram identity расталғаннан кейін админ рөлі <code style={{ fontFamily: 'ui-monospace,monospace', color: claudeTokens.textPrimary }}>admin_users</code> кестесі арқылы беріледі.
                  </div>

                  {error ? (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl px-4 py-3 text-[12px] text-center italic"
                      style={{
                        color: claudeTokens.warning,
                        border: `1px solid ${claudeTokens.warning}`,
                        fontFamily: claudeTokens.serifStack,
                      }}
                    >
                      {error}
                    </motion.div>
                  ) : null}

                  <button
                    onClick={onClose}
                    className="w-full rounded-lg py-3 text-[14px] font-medium transition-colors flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: claudeTokens.surfaceMuted,
                      color: claudeTokens.textPrimary,
                      border: `1px solid ${claudeTokens.borderStrong}`,
                    }}
                  >
                    <Lock size={15} strokeWidth={1.75} />
                    Understood
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.85, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.85, y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-gradient-to-br from-gray-900 to-black w-full max-w-sm rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
        >
          <div className="bg-gradient-to-r from-primary to-orange-500 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-black" />
              <h3 className="text-xl font-bold text-black">Әкімшілік кіру</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-black/20 rounded-full transition-colors">
              <X size={20} className="text-black" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {isLoading ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-white">Тексерілуде...</h3>
                <p className="text-gray-400 text-sm mt-2">Server-side рөл тексерісі орындалып жатыр</p>
              </div>
            ) : isAdmin ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={32} className="text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Сіз әкімшісіз!</h3>
                <p className="text-gray-400 text-sm mb-6">Барлық әкімшілік мүмкіндіктер ашық.</p>
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-transform"
                >
                  Жабу
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-2">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock size={24} className="text-primary" />
                  </div>
                  <p className="text-gray-400 text-sm">
                    Әкімшілік құқық енді сервер жағында басқарылады
                  </p>
                  {user?.id && (
                    <p className="text-xs text-gray-600 mt-1">
                      Telegram ID: <span className="text-gray-500 font-mono">{user.id}</span>
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                  Telegram identity расталғаннан кейін админ рөлі `admin_users` кестесі арқылы беріледі.
                </div>

                {error ? (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm text-center"
                  >
                    {error}
                  </motion.div>
                ) : null}

                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-orange-500 text-black hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
                >
                  <Lock size={18} />
                  Түсінікті
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
