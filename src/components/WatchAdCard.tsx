import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, Coins, Check } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStoreImpl';
import { showRewardedAd } from '../utils/ads';

/**
 * "Watch an ad → earn coins" card. The biggest untapped monetization lever for
 * a Telegram mini app (rewarded video: 20–40% opt-in, $2–5 CPM). The reward is
 * granted by the secure backend (/rewards/grant reason:'ad', capped 5/day, +10
 * coins) via store.watchAd — we only call it AFTER a real ad completes.
 */

const AD_COINS = 10;
const DAILY_CAP = 5;
const KEY = 'focus-ad-watch-v1';

type Lang = 'kz' | 'ru' | 'en';
const pickLang = (raw?: string): Lang => {
  const l = (raw || 'kz').slice(0, 2);
  return l === 'ru' ? 'ru' : l === 'en' ? 'en' : 'kz';
};
const STR: Record<Lang, { title: string; reward: string; left: (n: number) => string; done: string; loading: string }> = {
  kz: { title: 'Тегін монета', reward: `Жарнама көріп +${AD_COINS} монета`, left: (n) => `Бүгін тағы ${n} рет`, done: 'Бүгінгі лимит бітті', loading: 'Жарнама…' },
  ru: { title: 'Бесплатные монеты', reward: `Смотри рекламу: +${AD_COINS} монет`, left: (n) => `Сегодня ещё ${n} раз`, done: 'Лимит на сегодня исчерпан', loading: 'Реклама…' },
  en: { title: 'Free coins', reward: `Watch an ad: +${AD_COINS} coins`, left: (n) => `${n} more today`, done: "Today's limit reached", loading: 'Ad…' },
};

const today = () => new Date().toISOString().slice(0, 10);
function readUsed(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const o = JSON.parse(raw);
    return o?.date === today() ? Number(o.used) || 0 : 0;
  } catch {
    return 0;
  }
}
function writeUsed(used: number) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ date: today(), used }));
  } catch {
    /* noop */
  }
}

export function WatchAdCard() {
  const { i18n } = useTranslation();
  const s = STR[pickLang(i18n.language)];
  const watchAd = useStore((state) => state.watchAd);

  const [used, setUsed] = useState(readUsed);
  const [busy, setBusy] = useState(false);
  const remaining = Math.max(0, DAILY_CAP - used);
  const disabled = busy || remaining <= 0;

  const onClick = async () => {
    if (disabled) return;
    setBusy(true);
    WebApp.HapticFeedback?.impactOccurred?.('light');
    try {
      const result = await showRewardedAd();
      if (result.done) {
        watchAd(AD_COINS); // optimistic +coins, reconciled by the server (cap-aware)
        const next = used + 1;
        setUsed(next);
        writeUsed(next);
        WebApp.HapticFeedback?.notificationOccurred?.('success');
      } else {
        WebApp.HapticFeedback?.notificationOccurred?.('warning');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/15 to-teal-500/5 p-3.5 text-left transition-opacity disabled:opacity-60"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
        {remaining <= 0 ? <Check size={22} /> : busy ? <PlayCircle size={22} className="animate-pulse" /> : <PlayCircle size={22} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/80">{s.title}</div>
        <div className="truncate font-bold text-white">{busy ? s.loading : s.reward}</div>
        <div className="text-xs text-stone-400">{remaining <= 0 ? s.done : s.left(remaining)}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-sm font-black text-amber-300">
        <Coins size={14} /> +{AD_COINS}
      </div>
    </motion.button>
  );
}

export default WatchAdCard;
