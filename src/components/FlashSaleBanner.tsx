import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { buildApiUrl } from '../utils/apiBase';

type Sale = { id: string; product_code: string; discount_percent: number; ends_at: string; label?: string };

function useCountdown(endsAtIso: string) {
  const [left, setLeft] = useState(() => Math.max(0, Date.parse(endsAtIso) - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, Date.parse(endsAtIso) - Date.now())), 1000);
    return () => clearInterval(id);
  }, [endsAtIso]);
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function FlashSaleBanner() {
  const [sale, setSale] = useState<Sale | null>(null);
  useEffect(() => {
    fetch(buildApiUrl('/flash-sales/active'))
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d?.sales?.length && setSale(d.sales[0]))
      .catch(() => {});
  }, []);
  if (!sale) return null;
  return <FlashSaleBannerInner sale={sale} />;
}

function FlashSaleBannerInner({ sale }: { sale: Sale }) {
  const timer = useCountdown(sale.ends_at);
  return (
    <div className="mb-4 rounded-2xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/20 p-4 animate-pulse-slow">
      <div className="flex items-center gap-2 mb-1">
        <Zap size={18} className="text-amber-300" />
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
          {sale.label || 'FLASH SALE'}
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-black text-white">−{sale.discount_percent}%</div>
          <div className="text-xs text-amber-200/80 font-mono">{sale.product_code}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/70">Қалды</div>
          <div className="text-xl font-black tabular-nums text-white">{timer}</div>
        </div>
      </div>
    </div>
  );
}
