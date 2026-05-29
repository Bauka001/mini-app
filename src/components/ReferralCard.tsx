import { useEffect, useState } from 'react';
import { Users, Copy, Share2 } from 'lucide-react';
import { clsx } from 'clsx';
import WebApp from '@twa-dev/sdk';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { buildApiUrl } from '../utils/apiBase';

type Stats = { total: number; rewarded: number; pending: number; shareLink: string };

const getInitData = () =>
  (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData
  || WebApp?.initData || '';

export function ReferralCard() {
  const styles = useThemeStyles();
  const { textPrimary, textSecondary, panelClass } = styles;
  const [stats, setStats] = useState<Stats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(buildApiUrl('/referral/stats'), {
      headers: { 'x-telegram-init-data': getInitData() },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setStats(d))
      .catch(() => {});
  }, []);

  const handleShare = () => {
    if (!stats?.shareLink) return;
    WebApp.HapticFeedback?.impactOccurred?.('medium');
    if (WebApp.openTelegramLink) {
      const text = encodeURIComponent('🎮 Join me on Focus — train your brain and earn $FOCUS jetton!');
      WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(stats.shareLink)}&text=${text}`);
    } else {
      navigator.clipboard?.writeText(stats.shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleCopy = async () => {
    if (!stats?.shareLink) return;
    try {
      await navigator.clipboard.writeText(stats.shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      WebApp.HapticFeedback?.notificationOccurred?.('success');
    } catch {}
  };

  return (
    <div className={clsx('w-full max-w-sm rounded-3xl border p-5 mb-6', panelClass)}>
      <div className="flex items-center gap-2 mb-3">
        <Users size={18} className="text-pink-400" />
        <h3 className={clsx('text-base font-bold', textPrimary)}>Дос шақыр — екеуіңе бонус</h3>
      </div>
      <p className={clsx('text-xs mb-4', textSecondary)}>
        Сілтеме арқылы дос app-ты ашып, бірінші сатып алу жасаса — <b>екеуіңе 100 $FOCUS</b>.
      </p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className={clsx('rounded-xl border border-white/10 bg-black/20 p-3 text-center')}>
          <div className={clsx('text-2xl font-black', textPrimary)}>{stats?.total ?? '—'}</div>
          <div className={clsx('text-[10px] uppercase tracking-wider', textSecondary)}>Барлығы</div>
        </div>
        <div className={clsx('rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-center')}>
          <div className="text-2xl font-black text-emerald-300">{stats?.rewarded ?? '—'}</div>
          <div className="text-[10px] uppercase tracking-wider text-emerald-400/80">Сатып алды</div>
        </div>
        <div className={clsx('rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-center')}>
          <div className="text-2xl font-black text-amber-300">{stats?.pending ?? '—'}</div>
          <div className="text-[10px] uppercase tracking-wider text-amber-400/80">Күтуде</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleShare}
          disabled={!stats?.shareLink}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-pink-500 px-3 py-2.5 text-sm font-bold text-white hover:bg-pink-600 disabled:opacity-50 transition-colors"
        >
          <Share2 size={14} /> Достарға жіберу
        </button>
        <button
          onClick={handleCopy}
          disabled={!stats?.shareLink}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
        >
          <Copy size={14} /> {copied ? '✓' : 'Көшіру'}
        </button>
      </div>
      {stats?.shareLink && (
        <div className={clsx('mt-3 text-[10px] font-mono break-all', textSecondary)}>{stats.shareLink}</div>
      )}
    </div>
  );
}
