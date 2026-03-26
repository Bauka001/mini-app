import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLoginModal = ({ isOpen, onClose }: AdminLoginModalProps) => {
  const { user, adminIds, grantAdmin } = useStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isAlreadyAdmin = user && adminIds.includes(user.id);

  const handleSubmit = () => {
    if (!code.trim()) return;
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const ok = grantAdmin(code.trim());
      if (ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setCode('');
        }, 1500);
      } else {
        setError('Жарамсыз код немесе аккаунт деректері жоқ');
      }
      setIsLoading(false);
    }, 800);
  };

  if (!isOpen) return null;

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
          {/* Header */}
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
            {isAlreadyAdmin ? (
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
            ) : success ? (
              <div className="text-center py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <ShieldCheck size={32} className="text-green-400" />
                </motion.div>
                <h3 className="text-xl font-bold text-green-400">Сәтті қосылды!</h3>
                <p className="text-gray-400 text-sm mt-2">Әкімші рұқсаты берілді</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-2">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock size={24} className="text-primary" />
                  </div>
                  <p className="text-gray-400 text-sm">
                    Әкімшілік кіру үшін арнайы код енгізіңіз
                  </p>
                  {user?.id && (
                    <p className="text-xs text-gray-600 mt-1">
                      Telegram ID: <span className="text-gray-500 font-mono">{user.id}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-300">Әкімшілік коды</label>
                  <input
                    type="password"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && code.length >= 5 && handleSubmit()}
                    placeholder="••••••••••••"
                    maxLength={30}
                    className={clsx(
                      "w-full px-4 py-3 rounded-xl bg-white/5 border text-white font-mono text-center tracking-widest focus:outline-none focus:ring-2 transition-colors",
                      error
                        ? "border-red-500 focus:ring-red-500/50"
                        : "border-white/10 focus:ring-primary/50 focus:border-primary/50"
                    )}
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isLoading || code.length < 5}
                  className={clsx(
                    "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    isLoading || code.length < 5
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-primary to-orange-500 text-black hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
                  )}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Тексеруде...
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      Кіру
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
