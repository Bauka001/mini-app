import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// The previous variants used rotateY(90deg) with transformOrigin 'left center'.
// Inside Telegram's WebView the entering animation occasionally got stuck at
// `initial`, leaving the page rotated edge-on so users only saw a thin sliver
// of content along the left edge. A plain opacity transition has no equivalent
// failure mode — the worst case is a hard cut, never an invisible page.
const pageFadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

export const AnimatedRoutes = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageFadeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export const GameTransition = ({ children, isVisible }: { children: React.ReactNode; isVisible: boolean }) => {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          variants={pageFadeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};