import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export const pageFlipVariants = {
  initial: {
    rotateY: 90,
    opacity: 0,
    filter: 'blur(10px)',
    transformOrigin: 'left center',
  },
  animate: {
    rotateY: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transformOrigin: 'left center',
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    rotateY: -90,
    opacity: 0,
    filter: 'blur(10px)',
    transformOrigin: 'right center',
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const slideVariants = {
  initial: {
    x: '100%',
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    x: '-30%',
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const AnimatedRoutes = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageFlipVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          perspective: '1500px',
          transformStyle: 'preserve-3d',
        }}
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
          variants={pageFlipVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            perspective: '1500px',
            transformStyle: 'preserve-3d',
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};