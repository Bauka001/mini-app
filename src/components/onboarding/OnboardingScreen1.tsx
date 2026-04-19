import { motion } from 'framer-motion';
import { Rocket, Sparkles, Target } from 'lucide-react';
import { clsx } from 'clsx';
import { useThemeStyles } from '../../hooks/useThemeStyles';

type OnboardingScreen1Props = {
  onStart: () => void;
  onSkip: () => void;
};

export default function OnboardingScreen1({ onStart, onSkip }: OnboardingScreen1Props) {
  const styles = useThemeStyles();
  const { panelClass, textPrimary, textSecondary } = styles;

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md px-4 py-6 flex items-end">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        className={clsx("w-full rounded-[2rem] border p-6 shadow-2xl", panelClass)}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className={clsx("text-xs uppercase tracking-[0.24em] font-semibold", textSecondary)}>
              New Player Flow
            </div>
            <h2 className={clsx("text-3xl font-black mt-3", textPrimary)}>
              Daily Workout ойнаңыз
            </h2>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 flex items-center justify-center shadow-lg">
            <Rocket size={28} />
          </div>
        </div>

        <p className={clsx("text-sm leading-relaxed mt-4", textSecondary)}>
          Алғашқы тәжірибе бірден басталады: бүгінге 3 кездейсоқ ойын таңдалып тұр.
          `Start` батырмасы бірінші ойынды ашады.
        </p>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className={clsx("rounded-2xl p-3", styles.cardClass)}>
            <Sparkles size={18} className={styles.textAccent} />
            <div className={clsx("text-sm font-bold mt-3", textPrimary)}>3 ойын</div>
            <div className={clsx("text-xs mt-1", textSecondary)}>Күндік жинақ</div>
          </div>
          <div className={clsx("rounded-2xl p-3", styles.cardClass)}>
            <Target size={18} className={styles.textAccent} />
            <div className={clsx("text-sm font-bold mt-3", textPrimary)}>1 маршрут</div>
            <div className={clsx("text-xs mt-1", textSecondary)}>Авто бастау</div>
          </div>
          <div className={clsx("rounded-2xl p-3", styles.cardClass)}>
            <Rocket size={18} className={styles.textAccent} />
            <div className={clsx("text-sm font-bold mt-3", textPrimary)}>Жылдам старт</div>
            <div className={clsx("text-xs mt-1", textSecondary)}>Бір басумен</div>
          </div>
        </div>

        <button
          onClick={onStart}
          className={clsx("w-full mt-6 px-4 py-4 rounded-2xl text-lg font-black", styles.btnPrimary)}
        >
          Start
        </button>

        <button
          onClick={onSkip}
          className={clsx("w-full mt-3 px-4 py-3 rounded-2xl text-sm font-semibold", styles.btnSecondary)}
        >
          Кейінірек
        </button>
      </motion.div>
    </div>
  );
}
