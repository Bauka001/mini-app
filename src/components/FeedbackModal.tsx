import { useTranslation } from 'react-i18next';
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

  const { t } = useTranslation();

  const showAlert = (message: string) => {
    if (WebApp.isVersionAtLeast('6.2')) {
      WebApp.showAlert(message);
    } else {
      alert(message);
    }
  };

  const handleSubmit = () => {
    if (!text.trim()) {
      showAlert(t('feedback_err_text'));
      return;
    }

    addFeedback({
      userId: user.id,
      username: user.username || user.firstName,
      text: text,
      imageUrl: imageUrl || undefined
    });

    WebApp.HapticFeedback.notificationOccurred('success');
    showAlert(t('feedback_success'));
    setText('');
    setImageUrl('');
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAlert(t('feedback_err_image'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setImageUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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
              {t('feedback_title')}
            </h3>
            <button onClick={onClose} className="p-2 min-h-[44px] min-w-[44px] rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('feedback_message')}
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('feedback_placeholder')}
                className="w-full h-32 p-3 text-base rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('feedback_photo')}
              </label>
              {!imageUrl ? (
                <label className="flex flex-col items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <ImageIcon size={24} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('feedback_photo_select')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative inline-block mt-2">
                  <div className="h-24 w-24 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <button
                    onClick={() => setImageUrl('')}
                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              className="w-full min-h-[44px] py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Send size={18} />
              {t('feedback_send')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
