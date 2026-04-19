import { motion } from 'framer-motion';
import { Activity, Brain, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { useThemeStyles } from '../../hooks/useThemeStyles';

type OnboardingScreen2Props = {
  value: number;
  onContinue: () => void;
  onSkip: () => void;
};

export default function OnboardingScreen2({
  value,
  onContinue,
  onSkip,
}: OnboardingScreen2Props) {
  const styles = useThemeStyles();
  const { panelClass, textPrimary, textSecondary } = styles;
  const progress = Math.max(0, Math.min(100, (value / 300) * 100));

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
              First Result
            </div>
            <h2 className={clsx("text-3xl font-black mt-3", textPrimary)}>
              Brain Score жоғарылатыңыз
            </h2>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white flex items-center justify-center shadow-lg">
            <Brain size={28} />
          </div>
        </div>

        <p className={clsx("text-sm leading-relaxed mt-4", textSecondary)}>
          Алғашқы қадам сәтті өтті. Енді Brain Score-ды `0-300` аралығында өсіріп,
          күндік прогресті күшейтіңіз.
        </p>

        <div className={clsx("rounded-3xl p-5 mt-5", styles.cardClass)}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className={clsx("text-xs uppercase tracking-[0.22em] font-semibold", textSecondary)}>
                Brain Meter
              </div>
              <div className={clsx("text-4xl font-black mt-2", textPrimary)}>
                {Math.round(value)}
                <span className={clsx("text-lg ml-1", textSecondary)}>/ 300</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <TrendingUp size={22} />
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className={clsx("text-sm font-medium", textSecondary)}>Прогресс</span>
              <span className={clsx("text-sm font-bold", textPrimary)}>{Math.round(progress)}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className={clsx("rounded-2xl p-4", styles.cardClass)}>
            <Activity size={18} className={styles.textAccent} />
            <div className={clsx("text-sm font-bold mt-3", textPrimary)}>Your memory speed is high!</div>
            <div className={clsx("text-xs mt-1", textSecondary)}>Алғашқы нәтиже бойынша қысқа insight</div>
          </div>
          <div className={clsx("rounded-2xl p-4", styles.cardClass)}>
            <Brain size={18} className={styles.textAccent} />
            <div className={clsx("text-sm font-bold mt-3", textPrimary)}>Тағы 2 ойын</div>
            <div className={clsx("text-xs mt-1", textSecondary)}>Daily Workout толық жабылады</div>
          </div>
        </div>

        <button
          onClick={onContinue}
          className={clsx("w-full mt-6 px-4 py-4 rounded-2xl text-base font-black", styles.btnPrimary)}
        >
          Жалғастыру
        </button>

        <button
          onClick={onSkip}
          className={clsx("w-full mt-3 px-4 py-3 rounded-2xl text-sm font-semibold", styles.btnSecondary)}
        >
          Жабу
        </button>
      </motion.div>
    </div>
  );
}
