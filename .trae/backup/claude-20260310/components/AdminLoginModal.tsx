import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore';
import WebApp from '@twa-dev/sdk';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLoginModal = ({ isOpen, onClose }: AdminLoginModalProps) => {
  const { user, adminIds } = useStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ADMIN_CODE = 'FOCUS_ADMIN_2024';

  const handleSubmit = () => {
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      if (code === ADMIN_CODE) {
        // Grant admin access by adding user ID to adminIds
        // Note: This would normally be done via backend, here it's a demo
        alert('Әкімшілік қатынау сәтті!');
        onClose();
      } else {
        setError('Жарамсыз код');
      }
      setIsLoading(false);
    }, 1000);
  };

  if (!isOpen) return null;

  // If already admin, show different message
  if (user && adminIds.includes(user.id)) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            className="bg-gradient-to-br from-gray-900 to-black w-full max-w-sm rounded-3xl overflow-hidden border border-primary/30 shadow-2xl"
          >
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={32} className="text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Сіз әкімші сіз!</h3>
              <p className="text-gray-400 mb-6">Барлық әкімшілік құраларындағыз.</p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-transform"
              >
                Жабу
              </button>
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
      >
        <motion.div 
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          className="bg-gradient-to-br from-gray-900 to-black w-full max-w-sm rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-orange-500 p-4 flex justify-between items-center">
            <h3 className="text-xl font-bold text-black">Әкімшілік</h3>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-black/20 rounded-full"
            >
              <X size={20} className="text-black" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock size={24} className="text-primary" />
              </div>
              <p className="text-gray-400 text-sm">
                Әкімшілік кіру үшін арнайы код енгізіңіз
              </p>
            </div>

            {/* Code Input */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-300">Әкімшілік коды</label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="XXXXX"
                maxLength={20}
                className={clsx(
                  "w-full px-4 py-3 rounded-xl bg-white/5 border text-white font-mono text-center tracking-widest focus:outline-none focus:ring-2",
                  error ? "border-red-500 focus:ring-red-500/50" : "border-white/10 focus:ring-primary/50"
                )}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || code.length < 5}
              className={clsx(
                "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                isLoading || code.length < 5
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-primary to-orange-500 text-black hover:scale-105 active:scale-95"
              )}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/30 border-t-primary rounded-full animate-spin" />
                  Тексеруде...
                </>
              ) : (
                <>
                  Кіру
                  <Lock size={18} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
