import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStoreImpl';
import WebApp from '@twa-dev/sdk';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const { user, addFeedback } = useStore();

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
      imageUrl: imageUrl || undefined
    });

    WebApp.HapticFeedback.notificationOccurred('success');
    showAlert('Thank you for your feedback!');
    setText('');
    setImageUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-shell fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="modal-card bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle size={20} className="text-blue-500" />
              Шағым немесе Ұсыныс
            </h3>
            <button onClick={onClose} className="p-2 min-h-[44px] min-w-[44px] rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Хабарламаңыз
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Не туралы айтқыңыз келеді?"
                className="w-full h-32 p-3 text-base rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="w-full pl-10 pr-3 py-2 min-h-[44px] text-base rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
              className="w-full min-h-[44px] py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
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
