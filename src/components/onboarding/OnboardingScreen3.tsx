import { motion } from 'framer-motion';
import { BarChart3, Crown, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useThemeStyles } from '../../hooks/useThemeStyles';

type OnboardingScreen3Props = {
  onOpenShop: () => void;
  onSkip: () => void;
};

export default function OnboardingScreen3({
  onOpenShop,
  onSkip,
}: OnboardingScreen3Props) {
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
              Next Upgrade
            </div>
            <h2 className={clsx("text-3xl font-black mt-3", textPrimary)}>
              VIP-мен аналитика алыңыз
            </h2>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-500 text-stone-950 flex items-center justify-center shadow-lg">
            <Crown size={28} />
          </div>
        </div>

        <p className={clsx("text-sm leading-relaxed mt-4", textSecondary)}>
          VIP арқылы кеңейтілген метрикалар, тереңірек аналитика және өнімдірек жаттығу
          бақылауын ашуға болады. Толық ұсыныстар Shop ішінде тұр.
        </p>

        <div className="space-y-3 mt-5">
          <div className={clsx("rounded-2xl p-4 flex items-start gap-3", styles.cardClass)}>
            <BarChart3 size={20} className={clsx("mt-0.5 shrink-0", styles.textAccent)} />
            <div>
              <div className={clsx("text-sm font-bold", textPrimary)}>Терең аналитика</div>
              <div className={clsx("text-xs mt-1", textSecondary)}>
                Brain Score өзгерісін уақыт бойынша көруге ыңғайлы.
              </div>
            </div>
          </div>

          <div className={clsx("rounded-2xl p-4 flex items-start gap-3", styles.cardClass)}>
            <Sparkles size={20} className={clsx("mt-0.5 shrink-0", styles.textAccent)} />
            <div>
              <div className={clsx("text-sm font-bold", textPrimary)}>Артықшылықтар пакеті</div>
              <div className={clsx("text-xs mt-1", textSecondary)}>
                Premium flow Shop бетінен бірден ашылады.
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenShop}
          className={clsx("w-full mt-6 px-4 py-4 rounded-2xl text-base font-black", styles.btnPrimary)}
        >
          Shop-қа өту
        </button>

        <button
          onClick={onSkip}
          className={clsx("w-full mt-3 px-4 py-3 rounded-2xl text-sm font-semibold", styles.btnSecondary)}
        >
          Дайын
        </button>
      </motion.div>
    </div>
  );
}
