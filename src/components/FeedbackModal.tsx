import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Image as ImageIcon, AlertCircle, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStoreImpl';
import WebApp from '@twa-dev/sdk';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { claudeTokens } from './ui/claudeTokens';
import { readUgcConsent, setUgcConsent } from '../utils/ugcConsent';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [hasUgcConsent, setHasUgcConsent] = useState(false);
  const [ugcChecked, setUgcChecked] = useState(false);
  const { user, addFeedback } = useStore();
  const { isClaude } = useThemeStyles();

  useEffect(() => {
    if (!isOpen) return;
    const accepted = readUgcConsent();
    setHasUgcConsent(accepted);
    setUgcChecked(accepted);
  }, [isOpen]);

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
    if (!ugcChecked) {
      showAlert(t('ugc_accept'));
      return;
    }

    if (!hasUgcConsent) {
      setUgcConsent();
      setHasUgcConsent(true);
    }

    addFeedback({
      userId: user.id,
      username: user.username || user.firstName,
      text: text,
      imageUrl: imageUrl || undefined,
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
                  {t('feedback_title')}
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
                  {t('feedback_message')}
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t('feedback_placeholder')}
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
                  {t('feedback_photo')}
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

              {!hasUgcConsent && (
                <div
                  className="rounded-xl p-3.5 space-y-2"
                  style={{
                    backgroundColor: claudeTokens.surfaceMuted,
                    border: `1px solid ${claudeTokens.border}`,
                  }}
                >
                  <div
                    className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: claudeTokens.accent }}
                  >
                    {t('ugc_heading')}
                  </div>
                  <p
                    className="text-[12px] leading-relaxed"
                    style={{ color: claudeTokens.textBody }}
                  >
                    {t('ugc_intro')}
                  </p>
                  <ul
                    className="text-[12px] leading-relaxed pl-4 space-y-1 list-disc"
                    style={{ color: claudeTokens.textBody }}
                  >
                    <li>{t('ugc_rule_hate')}</li>
                    <li>{t('ugc_rule_explicit')}</li>
                    <li>{t('ugc_rule_illegal')}</li>
                    <li>{t('ugc_rule_third_party')}</li>
                    <li>{t('ugc_rule_spam')}</li>
                  </ul>
                  <a
                    href="#/terms"
                    className="text-[11px] underline inline-block"
                    style={{ color: claudeTokens.accent }}
                  >
                    {t('feedback_terms_link')}
                  </a>
                </div>
              )}

              {!hasUgcConsent && (
                <label
                  className="flex items-start gap-2.5 cursor-pointer select-none"
                >
                  <button
                    type="button"
                    aria-pressed={ugcChecked}
                    aria-label={t('ugc_accept')}
                    onClick={() => setUgcChecked((v) => !v)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-md flex items-center justify-center"
                    style={{
                      backgroundColor: ugcChecked ? claudeTokens.accent : '#FFFFFF',
                      border: `1.5px solid ${ugcChecked ? claudeTokens.accent : claudeTokens.borderStrong}`,
                    }}
                  >
                    {ugcChecked && <Check size={14} strokeWidth={3} color="#FFFFFF" />}
                  </button>
                  <span
                    className="text-[13px] leading-relaxed"
                    style={{ color: claudeTokens.textBody }}
                    onClick={() => setUgcChecked((v) => !v)}
                  >
                    {t('ugc_accept')}
                  </span>
                </label>
              )}

              <button
                onClick={handleSubmit}
                disabled={!ugcChecked}
                className="w-full rounded-lg py-3 text-[14px] font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  backgroundColor: ugcChecked ? claudeTokens.accent : claudeTokens.surfaceSunken,
                  color: ugcChecked ? '#FFFFFF' : claudeTokens.textMuted,
                  cursor: ugcChecked ? 'pointer' : 'not-allowed',
                }}
              >
                <Send size={15} strokeWidth={2} />
                {t('feedback_send')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

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

            {!hasUgcConsent && (
              <div className="rounded-xl p-3 space-y-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  {t('ugc_heading')}
                </div>
                <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-200">
                  {t('ugc_intro')}
                </p>
                <ul className="text-xs leading-relaxed pl-4 space-y-1 list-disc text-gray-700 dark:text-gray-200">
                  <li>{t('ugc_rule_hate')}</li>
                  <li>{t('ugc_rule_explicit')}</li>
                  <li>{t('ugc_rule_illegal')}</li>
                  <li>{t('ugc_rule_third_party')}</li>
                  <li>{t('ugc_rule_spam')}</li>
                </ul>
                <a
                  href="#/terms"
                  className="text-[11px] underline inline-block text-blue-700 dark:text-blue-300"
                >
                  {t('feedback_terms_link')}
                </a>
              </div>
            )}

            {!hasUgcConsent && (
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ugcChecked}
                  onChange={() => setUgcChecked((v) => !v)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  {t('ugc_accept')}
                </span>
              </label>
            )}

            <button
              onClick={handleSubmit}
              disabled={!ugcChecked}
              className="w-full min-h-[44px] py-3 bg-blue-600 disabled:bg-gray-300 disabled:dark:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
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
