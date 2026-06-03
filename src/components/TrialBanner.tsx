import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, Clock } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { getTrialStatus, activateTrial, type TrialStatus } from '../utils/starsApi';
import { useStore } from '../store/useStoreImpl';

/**
 * 7-day free Premium trial banner.
 *
 * States:
 *   - loading        → render nothing (avoid layout flash)
 *   - available      → "Start 7-day free trial" CTA
 *   - active         → "Premium trial · X days left"
 *   - used (expired) → render nothing (don't nag; the Premium plans below sell)
 *
 * After activation, refreshes entitlements so the rest of the app unlocks
 * without a reload.
 */
export function TrialBanner() {
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchEntitlements = useStore((s) => s.fetchEntitlements);

  useEffect(() => {
    getTrialStatus().then(setStatus).catch(() => setStatus({ available: false, used: true, active: false }));
  }, []);

  const handleActivate = async () => {
    setActivating(true);
    setError(null);
    try {
      WebApp.HapticFeedback?.impactOccurred?.('medium');
      const r = await activateTrial();
      setStatus({ available: false, used: true, active: true, endsAt: r.endsAt, daysLeft: r.daysLeft });
      try { await fetchEntitlements?.(); } catch {}
      WebApp.HapticFeedback?.notificationOccurred?.('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'trial_error');
    } finally {
      setActivating(false);
    }
  };

  if (!status) return null;
  // Used + not active → nothing (the paid plans take over)
  if (status.used && !status.active) return null;

  return (
    <AnimatePresence>
      {status.active ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mb-3 w-full max-w-md rounded-2xl border border-emerald-400/40 bg-gradient-to-r from-emerald-600/25 to-teal-600/20 px-4 py-3 flex items-center gap-3"
        >
          <Clock size={22} className="text-emerald-300 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold text-emerald-100">PREMIUM сынақ белсенді</div>
            <div className="text-xs text-emerald-200/80">
              {status.daysLeft ?? 0} күн қалды · ұнаса жазылыңыз
            </div>
          </div>
        </motion.div>
      ) : status.available ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mb-3 w-full max-w-md rounded-2xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-rose-500/15 p-4 shadow-lg"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Gift size={20} className="text-amber-300" />
            <h3 className="text-base font-black text-amber-100">7 күн тегін PREMIUM</h3>
            <Sparkles size={16} className="text-amber-300 ml-auto" />
          </div>
          <p className="text-xs text-amber-100/80 mb-3 leading-relaxed">
            Барлық 11 ойын, adaptive қиындық, NFT trophies, $FOCUS, Brain Champions League —
            <b> тегін сынап көріңіз. Карта қажет емес.</b>
          </p>
          {error && (
            <div className="text-[11px] text-rose-300 mb-2">
              {error === 'already_premium' ? 'Сізде Premium бар.' : error === 'trial_already_used' ? 'Сынақ бұрын қолданылған.' : 'Қате: ' + error}
            </div>
          )}
          <button
            onClick={handleActivate}
            disabled={activating}
            className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-sm font-black text-stone-950 hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {activating ? 'Іске қосылуда…' : <>🎁 Тегін бастау (7 күн)</>}
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
