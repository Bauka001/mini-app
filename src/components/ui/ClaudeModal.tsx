// Shared modal shell using the Anthropic / claude.ai visual language:
// warm cream surface, terracotta accent, soft serif heading, generous padding.
// The wider app stays dark-mode; modals pop as a warm light card on the dark
// shell. All product modals (Terms, Feedback, Daily Reward, etc.) should
// route through this shell so the look stays consistent.
//
// Design tokens are inlined as Tailwind arbitrary values rather than
// extending the Tailwind config, so this PR doesn't touch the design system
// for the rest of the app.

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import type { ReactNode, MouseEvent } from 'react';
import { claudeTokens } from './claudeTokens';

interface ClaudeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  // Set to false to prevent dismissing the modal by clicking the dim
  // overlay. Defaults to true.
  dismissOnBackdrop?: boolean;
}

const sizeClass: Record<NonNullable<ClaudeModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export const ClaudeModal = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  size = 'md',
  dismissOnBackdrop = true,
}: ClaudeModalProps) => {
  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!dismissOnBackdrop) return;
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={clsx(
              'relative flex flex-col w-full overflow-hidden rounded-2xl shadow-[0_28px_56px_-16px_rgba(31,30,29,0.45)]',
              sizeClass[size]
            )}
            style={{
              backgroundColor: claudeTokens.surface,
              color: claudeTokens.textBody,
              border: `1px solid ${claudeTokens.border}`,
              maxHeight: '85vh',
            }}
          >
            {(title || icon) && (
              <header
                className="flex items-center justify-between gap-4 px-6 py-5"
                style={{ borderBottom: `1px solid ${claudeTokens.border}` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {icon && (
                    <div
                      className="flex shrink-0 items-center justify-center w-10 h-10 rounded-xl"
                      style={{
                        backgroundColor: claudeTokens.accentSoft,
                        color: claudeTokens.accent,
                      }}
                    >
                      {icon}
                    </div>
                  )}
                  {title && (
                    <h2
                      className="font-semibold text-[1.125rem] leading-tight truncate"
                      style={{
                        color: claudeTokens.textPrimary,
                        fontFamily: claudeTokens.serifStack,
                      }}
                    >
                      {title}
                    </h2>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-[rgba(31,30,29,0.06)]"
                  style={{ color: claudeTokens.textMuted }}
                >
                  <X size={18} />
                </button>
              </header>
            )}

            <div className="overflow-y-auto px-6 py-5 flex-1">{children}</div>

            {footer && (
              <footer
                className="px-6 py-4 flex flex-col gap-2"
                style={{
                  borderTop: `1px solid ${claudeTokens.border}`,
                  backgroundColor: claudeTokens.surfaceMuted,
                }}
              >
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ---------- Buttons + small primitives matching the modal aesthetic ----------

interface ClaudeButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  children: ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

export const ClaudeButton = ({
  variant = 'primary',
  onClick,
  children,
  type = 'button',
  disabled,
  className,
  fullWidth = true,
}: ClaudeButtonProps) => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
  const variantStyle: Record<NonNullable<ClaudeButtonProps['variant']>, string> = {
    primary: '',
    secondary: '',
    ghost: '',
  };
  const inlineStyle =
    variant === 'primary'
      ? { backgroundColor: claudeTokens.accent, color: '#FFFFFF' }
      : variant === 'secondary'
      ? {
          backgroundColor: claudeTokens.surfaceMuted,
          color: claudeTokens.textPrimary,
          border: `1px solid ${claudeTokens.borderStrong}`,
        }
      : { backgroundColor: 'transparent', color: claudeTokens.textBody };

  const hoverClass =
    variant === 'primary'
      ? 'hover:brightness-95'
      : variant === 'secondary'
      ? 'hover:bg-[#E8E5DA]'
      : 'hover:bg-[rgba(31,30,29,0.06)]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={inlineStyle}
      className={clsx(base, variantStyle[variant], hoverClass, fullWidth && 'w-full', className)}
    >
      {children}
    </button>
  );
};

interface ClaudePillProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

export const ClaudePill = ({ active, onClick, children }: ClaudePillProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors"
    style={
      active
        ? { backgroundColor: claudeTokens.accent, color: '#FFFFFF' }
        : { backgroundColor: 'transparent', color: claudeTokens.textMuted }
    }
  >
    {children}
  </button>
);
