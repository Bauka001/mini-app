import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStoreImpl';
import WebApp from '@twa-dev/sdk';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { claudeTokens } from './ui/claudeTokens';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const { user, addFeedback } = useStore();
  const { isClaude } = useThemeStyles();

  const showAlert = (message: string) => {
    if (WebApp.isVersionAtLeast('6.2')) {
      WebApp.showAlert(message);
    } else {
      alert(message);
    }
  };

  const handleSubmit = () => {
    if (!text.trim()) {
      showAlert('Please enter some text');
      return;
    }

    addFeedback({
      userId: user.id,
      username: user.username || user.firstName,
      text: text,
      imageUrl: imageUrl || undefined,
    });

    WebApp.HapticFeedback.notificationOccurred('success');
    showAlert('Thank you for your feedback!');
    setText('');
    setImageUrl('');
    onClose();
  };

  if (!isOpen) return null;

  if (isClaude) {
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
              maxHeight: '85vh',
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
                  <AlertCircle size={18} strokeWidth={1.75} />
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
                  Feedback
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

            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label
                  className="block text-[10px] font-medium uppercase tracking-[0.22em] mb-2"
                  style={{ color: claudeTokens.textMuted }}
                >
                  Your message
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full h-32 p-3.5 rounded-xl text-[14px] resize-none focus:outline-none transition-colors"
                  style={{
                    backgroundColor: claudeTokens.surfaceMuted,
                    border: `1px solid ${claudeTokens.border}`,
                    color: claudeTokens.textPrimary,
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-[10px] font-medium uppercase tracking-[0.22em] mb-2"
                  style={{ color: claudeTokens.textMuted }}
                >
                  Image link · optional
                </label>
                <div className="relative">
                  <ImageIcon
                    size={16}
                    strokeWidth={1.75}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: claudeTokens.textMuted }}
                  />
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl text-[13px] focus:outline-none transition-colors"
                    style={{
                      backgroundColor: claudeTokens.surfaceMuted,
                      border: `1px solid ${claudeTokens.border}`,
                      color: claudeTokens.textPrimary,
                    }}
                  />
                </div>
                {imageUrl && (
                  <div
                    className="mt-2 h-20 w-20 rounded-lg overflow-hidden"
                    style={{ border: `1px solid ${claudeTokens.border}` }}
                  >
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmit}
                className="w-full rounded-lg py-3 text-[14px] font-medium transition-colors flex items-center justify-center gap-2"
                style={{ backgroundColor: claudeTokens.accent, color: '#FFFFFF' }}
              >
                <Send size={15} strokeWidth={2} />
                Send
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle size={20} className="text-blue-500" />
              Шағым немесе Ұсыныс
            </h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Хабарламаңыз
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Не туралы айтқыңыз келеді?"
                className="w-full h-32 p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Сурет сілтемесі (міндетті емес)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ImageIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              {imageUrl && (
                <div className="mt-2 h-20 w-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Send size={18} />
              Жіберу
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
