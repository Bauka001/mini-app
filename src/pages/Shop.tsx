import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle, Crown, Coins, Layout, FileText, X, BarChart3, Medal, Sparkles, Car, Gift, Gem, Zap, Ticket as TicketIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useStore } from '../store/useStoreImpl';
import type { CaseId, MysteryBox, Ticket } from '../store/useStore';
import WebApp from '@twa-dev/sdk';
import { TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react';
import { TermsModal } from '../components/TermsModal';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { createTonPaymentIntent, getPaymentStatus, TonPlanCode } from '../utils/paymentApi';
import { CASE_LIST } from '../store/cases';
import { CaseList } from '../components/shop/CaseList';
import { CaseOpeningModal } from '../components/shop/CaseOpeningModal';
import { CaseIcon } from '../components/shop/CaseIcon';

const PaymentModal = ({ 
  isOpen, 
  onClose,
  planCode,
  planTitle,
  price,
  basePriceKzt
}: { 
  isOpen: boolean, 
  onClose: () => void,
  planCode: TonPlanCode,
  planTitle: string,
  price: string,
  basePriceKzt: number
}) => {
  const { t } = useTranslation();
  const fetchEntitlements = useStore((state) => state.fetchEntitlements);
  const [tonUi] = useTonConnectUI();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [serverTonAmount, setServerTonAmount] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PaymentPromoDefinition | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const discountedPriceKzt = appliedPromo
    ? Math.max(0, Math.round(basePriceKzt * ((100 - appliedPromo.discountPercent) / 100)))
    : basePriceKzt;
  const displayedPrice = formatKztPrice(discountedPriceKzt);

  useEffect(() => {
    if (!isOpen) {
      setPendingPaymentId(null);
      setStatusMessage('');
      setErrorMessage('');
      setServerTonAmount(null);
      setIsSubmitting(false);
      setPromoInput('');
      setAppliedPromo(null);
      setPromoFeedback(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    WebApp.BackButton.show();
    WebApp.BackButton.onClick(onClose);

    return () => {
      WebApp.BackButton.offClick(onClose);
      WebApp.BackButton.hide();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!pendingPaymentId) return;

    let active = true;
    let timeoutId: number | null = null;
    let attempts = 0;

    const pollStatus = async () => {
      try {
        const status = await getPaymentStatus(pendingPaymentId);
        if (!active) return;

        setServerTonAmount(status.amountTon);

        if (status.status === 'paid') {
          setStatusMessage(`Payment confirmed. ${status.entitlement?.tierCode?.toUpperCase() || 'VIP'} is active.`);
          setErrorMessage('');
          setPendingPaymentId(null);
          fetchEntitlements();
          WebApp.HapticFeedback.notificationOccurred('success');
          timeoutId = window.setTimeout(() => {
            if (active) {
              onClose();
            }
          }, 1200);
          return;
        }

        if (status.status === 'expired' || status.status === 'failed' || status.status === 'canceled') {
          setErrorMessage('Payment was not confirmed. Please create a new payment.');
          setStatusMessage('');
          setPendingPaymentId(null);
          return;
        }

        attempts += 1;
        setStatusMessage('Transaction sent. Waiting for TON verification on the server...');

        if (attempts >= 24) {
          setStatusMessage('Payment is still pending. You can close this window and check again later.');
          return;
        }

        timeoutId = window.setTimeout(pollStatus, 5000);
      } catch (error) {
        if (!active) return;

        attempts += 1;
        setErrorMessage(error instanceof Error ? error.message : 'Unable to refresh payment status');

        if (attempts < 24) {
          timeoutId = window.setTimeout(pollStatus, 5000);
        }
      }
    };

    void pollStatus();

    return () => {
      active = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [pendingPaymentId, onClose]);

  if (!isOpen) return null;

  const handleApplyPromo = () => {
    const normalizedCode = normalizePromoCode(promoInput);

    if (!normalizedCode) {
      setAppliedPromo(null);
      setPromoFeedback({
        type: 'error',
        message: t('shop_promo_enter_code', 'Промокодты енгізіңіз.'),
      });
      return;
    }

    const promo = PAYMENT_PROMO_CODES[normalizedCode];
    if (!promo || !promo.applicablePlans.includes(planCode)) {
      setAppliedPromo(null);
      setPromoFeedback({
        type: 'error',
        message: t('shop_promo_invalid', 'Промокод жарамсыз немесе бұл пакетке қолданылмайды.'),
      });
      return;
    }

    setPromoInput(normalizedCode);
    setAppliedPromo(promo);
    setPromoFeedback({
      type: 'success',
      message: t('shop_promo_applied', '{{code}} промокоды қолданылды. -{{percent}}%', {
        code: promo.code,
        percent: promo.discountPercent,
      }),
    });
  };

  const handlePayNow = async () => {
    WebApp.HapticFeedback.notificationOccurred('success');
    setErrorMessage('');

    try {
      setIsSubmitting(true);
      const paymentIntent = await createTonPaymentIntent(planCode, appliedPromo?.code);
      const { beginCell } = await import('@ton/core');
      const payload = beginCell().storeUint(0, 32).storeStringTail(paymentIntent.memo).endCell().toBoc().toString('base64');

      await tonUi.sendTransaction({
        validUntil: Math.floor(new Date(paymentIntent.expiresAt).getTime() / 1000),
        messages: [
          {
            address: paymentIntent.address,
            amount: String(paymentIntent.amountNano),
            payload,
          }
        ]
      });

      setServerTonAmount(paymentIntent.amountTon);
      if (paymentIntent.promoCode && paymentIntent.discountPercent) {
        setAppliedPromo({
          code: paymentIntent.promoCode,
          discountPercent: paymentIntent.discountPercent,
          applicablePlans: [planCode],
        });
        setPromoFeedback({
          type: 'success',
          message: t('shop_promo_applied', '{{code}} промокоды қолданылды. -{{percent}}%', {
            code: paymentIntent.promoCode,
            percent: paymentIntent.discountPercent,
          }),
        });
      }
      setStatusMessage('Transaction sent. Waiting for TON verification on the server...');
      setPendingPaymentId(paymentIntent.paymentOrderId);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'TON payment failed');
      WebApp.HapticFeedback.notificationOccurred('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-shell fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="modal-card w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="text-lg font-bold text-black">{t('payment_method')}</h3>
          <button onClick={onClose} className="rounded-full p-2 min-h-[44px] min-w-[44px] text-gray-500 transition-colors hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-6 overflow-y-auto">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-1 text-sm text-gray-500">{t('item_summary')}</div>
            <div className="text-xl font-bold text-black">{planTitle}</div>
            {appliedPromo ? (
              <div className="mt-2">
                <div className="text-sm font-semibold text-gray-400 line-through">{price}</div>
                <div className="text-2xl font-black text-emerald-600">{displayedPrice}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-emerald-600">
                  {appliedPromo.code} · -{appliedPromo.discountPercent}%
                </div>
              </div>
            ) : (
              <div className="mt-2 text-2xl font-black text-black">{price}</div>
            )}
            {serverTonAmount && (
              <div className="mt-2 text-sm font-semibold text-green-700">Exact TON amount: {serverTonAmount}</div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 text-sm font-semibold text-black">{t('promo_code', 'Promo Code')}</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(event) => setPromoInput(event.target.value)}
                placeholder={t('enter_code', 'Enter Code')}
                autoCapitalize="characters"
                className="min-h-[44px] flex-1 rounded-2xl border border-gray-300 bg-white px-4 text-sm font-semibold uppercase text-black outline-none transition-colors focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                disabled={isSubmitting || Boolean(pendingPaymentId)}
                className="min-h-[44px] rounded-2xl bg-black px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {t('apply', 'Apply')}
              </button>
            </div>
            {promoFeedback ? (
              <div
                className={clsx(
                  'mt-3 rounded-2xl border px-3 py-2 text-sm',
                  promoFeedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                )}
              >
                {promoFeedback.message}
              </div>
            ) : (
              <div className="mt-3 text-xs text-gray-500">
                {t('shop_promo_hint', 'Қолжетімді код: FOCUS10')}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 text-sm font-semibold text-black">TON (TonConnect)</div>
            <TonConnectButton />
            <div className="mt-3 text-xs text-gray-600">
              Server creates the exact TON amount and memo. Plan unlocks only after backend verification.
            </div>
          </div>

          {(statusMessage || errorMessage) && (
            <div className={`rounded-2xl border p-3 text-sm ${
              errorMessage ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'
            }`}>
              {errorMessage || statusMessage}
            </div>
          )}

          <button
            onClick={handlePayNow}
            disabled={isSubmitting || Boolean(pendingPaymentId)}
            className="w-full min-h-[44px] rounded-2xl bg-green-500 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-300"
          >
            {isSubmitting ? 'Creating payment...' : pendingPaymentId ? 'Waiting for confirmation...' : t('pay_now')}
          </button>
        </div>
      </div>
    </div>
  );
};

const CountdownTimer = ({ targetDateISO }: { targetDateISO: string }) => {
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = new Date(targetDateISO).getTime() - Date.now();
    return Math.max(0, diff);
  });

  useEffect(() => {
    const id = setInterval(() => {
      const diff = new Date(targetDateISO).getTime() - Date.now();
      setTimeLeft(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(id);
  }, [targetDateISO]);

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <div className="flex gap-1 justify-center mt-1.5">
      {[
        { label: 'КҮН', value: days },
        { label: 'САҒ', value: hours },
        { label: 'МИН', value: minutes },
        { label: 'СЕК', value: seconds },
      ].map((item, idx) => (
        <div key={idx} className="flex flex-col items-center bg-black/40 rounded-md p-1 min-w-[36px] border border-amber-500/30">
          <span className="text-xs font-black text-amber-400">{item.value.toString().padStart(2, '0')}</span>
          <span className="text-[7px] text-amber-200/70 uppercase font-bold">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

const PlanCard = ({ 
  title, 
  price,
  originalPrice,
  features, 
  badge, 
  icon: Icon, 
  color,
  onBuy,
  styles
}: { 
  title: string, 
  price: string,
  originalPrice?: string,
  features: string[], 
  badge?: string, 
  icon: any, 
  color: string,
  onBuy: () => void,
  styles: any
}) => {
  const { t } = useTranslation();
  return (
  <div className={clsx(
    "relative p-4 sm:p-6 rounded-2xl border mb-4 transition-all active:scale-95 overflow-hidden duration-300",
    styles.panelClass,
    badge ? "border-amber-500 shadow-lg shadow-amber-500/20" : ""
  )}>
    {badge && (
      <div className="absolute top-0 right-0 z-20">
        <div className={clsx(
          "text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest bg-gradient-to-r from-amber-400 to-yellow-600 text-stone-900 shadow-md"
        )}>
          {badge}
        </div>
      </div>
    )}
    
    <div className="flex items-center gap-4 mb-4 relative z-10">
      <div className={clsx("p-3 rounded-xl bg-opacity-20", color)}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
      <div>
        <h3 className={clsx("text-lg sm:text-xl font-bold", styles.textPrimary)}>{title}</h3>
        <div className="flex items-baseline gap-2">
           {originalPrice && <span className="text-xs line-through opacity-50 text-gray-500">{originalPrice}</span>}
           <p className={clsx("text-lg font-black", styles.textAccent)}>{price}</p>
        </div>
      </div>
    </div>

    <ul className="space-y-2 mb-6 relative z-10">
      {features.map((feat, i) => (
        <li key={i} className={clsx("flex items-start gap-2 text-sm", styles.textSecondary)}>
          <Check size={16} className={clsx("mt-0.5 min-w-[16px]", styles.textAccent)} />
          <span className="leading-tight">{feat}</span>
        </li>
      ))}
    </ul>

    <button 
      onClick={onBuy}
      className={clsx(
        "w-full min-h-[44px] py-3 rounded-xl font-bold transition-all relative z-10",
        badge ? styles.btnPrimary : styles.btnSecondary
      )}
    >
      {t('select_plan')}
    </button>

    {/* Decorative background element */}
    <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none z-0" />
  </div>
);
};

const SkinCard = ({ 
  name, 
  cost, 
  previewClass,
  isOwned, 
  isEquipped,
  onBuy,
  onEquip,
  styles
}: { 
  id: string,
  name: string, 
  cost: number, 
  previewClass: string,
  isOwned: boolean, 
  isEquipped: boolean,
  onBuy: () => void,
  onEquip: () => void,
  styles: any
}) => {
  const { t } = useTranslation();
  
  return (
    <div className={clsx(
      "p-4 rounded-xl border flex flex-col items-center gap-3 transition-colors duration-300",
      isEquipped 
        ? "border-green-500 bg-green-500/10" 
        : styles.panelClass
    )}>
      <div className={clsx("w-full h-20 rounded-lg flex items-center justify-center font-bold text-lg shadow-inner", previewClass)}>
        123
      </div>
      <div className="text-center w-full">
        <div className={clsx("font-bold text-sm mb-1", styles.textPrimary)}>{name}</div>
        {!isOwned && (
          <div className={clsx("flex items-center justify-center gap-1 text-sm font-bold", styles.textAccent)}>
            <Coins size={14} />
            {cost}
          </div>
        )}
      </div>
      
      {isOwned ? (
        <button
          onClick={onEquip}
          disabled={isEquipped}
          className={clsx(
            "w-full py-2 rounded-lg text-sm font-bold transition-colors",
            isEquipped 
              ? "bg-green-600 text-white cursor-default" 
              : styles.btnSecondary
          )}
        >
          {isEquipped ? t('equipped') : t('equip')}
        </button>
      ) : (
        <button
          onClick={onBuy}
          className={clsx(
            "w-full py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1",
            styles.btnPrimary
          )}
        >
          {t('buy')}
        </button>
      )}
    </div>
  );
};

type VipPurchaseOption = 'basic' | 'pro' | 'premium';

type PaymentPromoDefinition = {
  code: string;
  discountPercent: number;
  applicablePlans: TonPlanCode[];
};

const formatKztPrice = (amount: number) =>
  `${new Intl.NumberFormat('ru-RU').format(Math.max(0, Math.round(amount)))} ₸`;

const normalizePromoCode = (value: string) => value.trim().toUpperCase();

const BASIC_PRICE_KZT = 6990;
const PRO_PRICE_KZT = 8590;
const PREMIUM_PRICE_KZT = 9990;
const BASIC_PRICE = formatKztPrice(BASIC_PRICE_KZT);
const PRO_PRICE = formatKztPrice(PRO_PRICE_KZT);
const PREMIUM_PRICE = formatKztPrice(PREMIUM_PRICE_KZT);
const PAYMENT_PROMO_CODES: Record<string, PaymentPromoDefinition> = {
  FOCUS10: {
    code: 'FOCUS10',
    discountPercent: 10,
    applicablePlans: ['basic', 'pro', 'premium'],
  },
};
const CASE_REEL_CARD_WIDTH = 112;
const CASE_REEL_GAP = 12;
const CASE_REEL_TARGET_INDEX = 12;

const getMysteryBoxRewardLabel = (reward: MysteryBox | null, t: ReturnType<typeof useTranslation>['t']) => {
  if (!reward) return '';

  switch (reward.type) {
    case 'coins':
      return `+${reward.amount} ${t('coins', 'Coins')}`;
    case 'crystals':
      return `+${reward.amount} ${t('crystals', 'Crystals')}`;
    case 'fec':
      return `+${reward.amount} FEC`;
    case 'skin':
      return t('skin_neon', 'Neon Skin');
    case 'booster':
      return `+${reward.amount} ${t('hints', 'Hints')}`;
    default:
      return '';
  }
};

const getMysteryBoxRewardDescription = (reward: MysteryBox | null, t: ReturnType<typeof useTranslation>['t']) => {
  if (!reward) return '';

  switch (reward.type) {
    case 'coins':
      return t('shop_case_reward_coins', 'Монета бірден балансыңызға қосылды.');
    case 'crystals':
      return t('shop_case_reward_crystals', 'Кристалдар аккаунтқа бірден түсті.');
    case 'fec':
      return t('shop_case_reward_fec', 'FEC балансыңыз жаңартылды.');
    case 'skin':
      return t('shop_case_reward_skin', 'Жаңа скин инвентарьға қосылды.');
    case 'booster':
      return t('shop_case_reward_booster', 'Hint booster-лері инвентарьға сақталды.');
    default:
      return '';
  }
};

type MysteryRewardPreview = {
  id: string;
  icon: string;
  title: string;
  rarity: string;
  accentClass: string;
  glowClass: string;
};

const getMysteryBoxRewardPreview = (
  reward: MysteryBox,
  t: ReturnType<typeof useTranslation>['t']
): MysteryRewardPreview => {
  switch (reward.type) {
    case 'coins':
      return {
        id: 'coins',
        icon: '🪙',
        title: `+${reward.amount}`,
        rarity: t('shop_case_rarity_common', 'Common'),
        accentClass: 'from-amber-300 via-yellow-300 to-orange-400',
        glowClass: 'shadow-[0_0_30px_rgba(251,191,36,0.35)]',
      };
    case 'crystals':
      return {
        id: 'crystals',
        icon: '💎',
        title: `+${reward.amount}`,
        rarity: t('shop_case_rarity_rare', 'Rare'),
        accentClass: 'from-cyan-300 via-sky-300 to-blue-400',
        glowClass: 'shadow-[0_0_30px_rgba(56,189,248,0.35)]',
      };
    case 'fec':
      return {
        id: 'fec',
        icon: '✨',
        title: `+${reward.amount} FEC`,
        rarity: t('shop_case_rarity_epic', 'Epic'),
        accentClass: 'from-emerald-300 via-teal-300 to-cyan-400',
        glowClass: 'shadow-[0_0_30px_rgba(16,185,129,0.35)]',
      };
    case 'skin':
      return {
        id: 'skin',
        icon: '🎨',
        title: t('skin_neon', 'Neon Skin'),
        rarity: t('shop_case_rarity_legendary', 'Legendary'),
        accentClass: 'from-fuchsia-300 via-violet-300 to-purple-400',
        glowClass: 'shadow-[0_0_36px_rgba(192,132,252,0.45)]',
      };
    case 'booster':
      return {
        id: 'booster',
        icon: '🧠',
        title: `+${reward.amount} ${t('hints', 'Hints')}`,
        rarity: t('shop_case_rarity_rare', 'Rare'),
        accentClass: 'from-pink-300 via-rose-300 to-red-400',
        glowClass: 'shadow-[0_0_30px_rgba(251,113,133,0.35)]',
      };
    default:
      return {
        id: 'unknown',
        icon: '🎁',
        title: t('mystery_box_title', 'Mystery Box'),
        rarity: t('shop_case_rarity_common', 'Common'),
        accentClass: 'from-slate-300 via-slate-200 to-zinc-300',
        glowClass: 'shadow-[0_0_30px_rgba(148,163,184,0.35)]',
      };
  }
};

const buildMysteryBoxOpeningReel = (
  reward: MysteryBox,
  t: ReturnType<typeof useTranslation>['t']
) => {
  const fillerRewards: MysteryBox[] = [
    { id: 'preview-coins', type: 'coins', amount: 180 },
    { id: 'preview-crystals', type: 'crystals', amount: 9 },
    { id: 'preview-fec', type: 'fec', amount: 1.25 },
    { id: 'preview-skin', type: 'skin', amount: 1, skinId: 'neon_blue' },
    { id: 'preview-booster', type: 'booster', amount: 3, boosterType: 'hints' },
  ];

  return Array.from({ length: 20 }, (_, index) => {
    const picked = index === CASE_REEL_TARGET_INDEX
      ? reward
      : fillerRewards[Math.floor(Math.random() * fillerRewards.length)];

    return {
      ...getMysteryBoxRewardPreview(picked, t),
      id: `${picked.type}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    };
  });
};

const MysteryBoxRewardModal = ({
  reward,
  onClose,
}: {
  reward: MysteryBox | null;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'opening' | 'revealed'>('opening');
  const [reelItems, setReelItems] = useState<MysteryRewardPreview[]>([]);
  const rewardPreview = reward ? getMysteryBoxRewardPreview(reward, t) : null;

  useEffect(() => {
    if (!reward) return;

    WebApp.BackButton.show();
    WebApp.BackButton.onClick(onClose);

    return () => {
      WebApp.BackButton.offClick(onClose);
      WebApp.BackButton.hide();
    };
  }, [reward, onClose]);

  useEffect(() => {
    if (!reward) return;

    setPhase('opening');
    setReelItems(buildMysteryBoxOpeningReel(reward, t));

    const revealTimer = window.setTimeout(() => {
      setPhase('revealed');
      WebApp.HapticFeedback.notificationOccurred('success');
    }, 2600);

    return () => window.clearTimeout(revealTimer);
  }, [reward, t]);

  if (!reward) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-shell fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.94, y: 24 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 24 }}
          transition={{ duration: 0.25 }}
          className="modal-card relative flex w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#090b14] shadow-2xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_38%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.14),transparent_42%)]" />

          <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-fuchsia-300/80">
                {phase === 'opening'
                  ? t('opening_case', 'Opening Case')
                  : t('reward_revealed', 'Reward Revealed')}
              </div>
              <h3 className="mt-1 text-lg font-black text-white">{t('mystery_box_title', 'Mystery Box')}</h3>
            </div>
            {phase === 'revealed' ? (
              <button
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] rounded-full bg-white/5 p-2 text-gray-300 transition-colors hover:bg-white/10"
              >
                <X size={20} />
              </button>
            ) : (
              <div className="min-h-[44px] min-w-[44px]" />
            )}
          </div>

          <div className="relative overflow-hidden px-4 pb-4 pt-5 sm:px-5 sm:pb-5">
            <div className="pointer-events-none absolute left-1/2 top-4 z-10 h-[190px] w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-b from-transparent via-amber-300 to-transparent shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
            <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0d1220] py-8">
              <motion.div
                className="flex gap-3"
                style={{ paddingLeft: 'calc(50% - 56px)', paddingRight: 'calc(50% - 56px)' }}
                initial={false}
                animate={{
                  x: phase === 'opening'
                    ? -(CASE_REEL_TARGET_INDEX * (CASE_REEL_CARD_WIDTH + CASE_REEL_GAP))
                    : -(CASE_REEL_TARGET_INDEX * (CASE_REEL_CARD_WIDTH + CASE_REEL_GAP)),
                }}
                transition={{ duration: 2.4, ease: [0.12, 0.78, 0.18, 1] }}
              >
                {reelItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={false}
                    animate={{
                      scale: phase === 'revealed' && index === CASE_REEL_TARGET_INDEX ? 1.03 : 0.94,
                      opacity: phase === 'revealed' && index !== CASE_REEL_TARGET_INDEX ? 0.35 : 1,
                    }}
                    className={clsx(
                      'relative shrink-0 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03] p-3 text-center',
                      index === CASE_REEL_TARGET_INDEX && phase === 'revealed' && item.glowClass
                    )}
                    style={{ width: CASE_REEL_CARD_WIDTH }}
                  >
                    <div className={clsx('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', item.accentClass)} />
                    <div className="mt-2 text-4xl">{item.icon}</div>
                    <div className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-white/45">
                      {item.rarity}
                    </div>
                    <div className="mt-2 text-sm font-black text-white">{item.title}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <AnimatePresence mode="wait">
              {phase === 'opening' ? (
                <motion.div
                  key="opening"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="px-2 pb-2 pt-5 text-center"
                >
                  <div className="text-sm font-semibold uppercase tracking-[0.28em] text-white/45">
                    {t('opening_sequence', 'Scanning drops')}
                  </div>
                  <div className="mt-3 text-xl font-black text-white">
                    {t('shop_case_opening_subtitle', 'Сыйлық тоқтағанша күтіңіз...')}
                  </div>
                  <div className="mx-auto mt-4 h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 via-amber-300 to-cyan-300"
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="revealed"
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="px-2 pb-2 pt-5 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.8, rotate: -8 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    className={clsx(
                      'mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-white/5 text-6xl ring-1 ring-white/10',
                      rewardPreview?.glowClass
                    )}
                  >
                    {rewardPreview?.icon}
                  </motion.div>
                  <div className="mt-5 text-sm font-black uppercase tracking-[0.28em] text-amber-300">
                    {t('you_found', 'You found')}
                  </div>
                  <div className="mt-2 text-3xl font-black text-white">{getMysteryBoxRewardLabel(reward, t)}</div>
                  <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/65">
                    {getMysteryBoxRewardDescription(reward, t)}
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-6 w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-base font-black text-stone-950 transition-transform hover:scale-[1.01]"
                  >
                    {t('claim_reward', 'Claim reward')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const CasesTab = ({
  coins,
  gems,
  fecBalance,
  hints,
  freeMysteryBoxes,
  price,
  isAvailable,
  onOpen,
}: {
  coins: number;
  gems: number;
  fecBalance: number;
  hints: number;
  freeMysteryBoxes: number;
  price: number;
  isAvailable: boolean;
  onOpen: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 via-violet-500/10 to-cyan-500/10 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-fuchsia-300">
              <Gift size={18} />
              <span className="text-xs font-black uppercase tracking-[0.22em]">
                {t('chest_tab', 'Cases')}
              </span>
            </div>
            <h3 className="mt-2 text-2xl font-black text-white">
              {t('mystery_box_title', 'Mystery Box')}
            </h3>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              {t('mystery_box_description', 'Rare skins, crystals and coins!')}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-right">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {t('shop_price', 'Бағасы')}
            </div>
            <div className="mt-1 flex items-center gap-2 text-2xl font-black text-white">
              <Coins size={20} className="text-amber-300" />
              {price}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{t('coins', 'Coins')}</div>
            <div className="mt-2 text-xl font-black text-white">{coins}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{t('crystals', 'Crystals')}</div>
            <div className="mt-2 text-xl font-black text-white">{gems}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">FEC</div>
            <div className="mt-2 text-xl font-black text-white">{fecBalance.toFixed(2)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{t('hints', 'Hints')}</div>
            <div className="mt-2 text-xl font-black text-white">{hints}</div>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 col-span-2 md:col-span-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
              {t('shop_case_free_opens', 'Free opens')}
            </div>
            <div className="mt-2 text-xl font-black text-white">{freeMysteryBoxes}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-5">
          <div className="inline-flex rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-stone-950">
            {t('badge_best', 'Best')}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-4xl">
              🎁
            </div>
            <div>
              <div className="text-xl font-black text-white">{t('mystery_box_title', 'Mystery Box')}</div>
              <div className="mt-1 text-sm text-slate-300">{t('shop_case_subtitle', 'Әр ашқанда рандом сыйлық түседі')}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-200">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="font-black text-amber-300">{t('shop_case_drop_1', '100-299 coins')}</div>
              <div className="mt-1 text-slate-400">{t('shop_case_drop_1_desc', 'Ең жиі түсетін базалық дроп')}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="font-black text-cyan-300">{t('shop_case_drop_2', '5-14 crystals')}</div>
              <div className="mt-1 text-slate-400">{t('shop_case_drop_2_desc', 'Кристалл балансты өсіреді')}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="font-black text-emerald-300">{t('shop_case_drop_3', '0.50-2.00 FEC')}</div>
              <div className="mt-1 text-slate-400">{t('shop_case_drop_3_desc', 'Сирек крипто дроп')}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="font-black text-fuchsia-300">{t('shop_case_drop_4', 'Skin немесе boosters')}</div>
              <div className="mt-1 text-slate-400">{t('shop_case_drop_4_desc', 'Ең құнды сыйлықтар')}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpen}
            disabled={false}
            className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-base font-black text-stone-950 transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={18} />
            {freeMysteryBoxes > 0
              ? t('open_mystery_box_free', 'Open Mystery Box for free')
              : t('open_mystery_box', 'Open Mystery Box')}
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
            {t('shop_case_rules', 'Case ережесі')}
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              <div className="font-bold text-white">{t('shop_case_rule_1_title', 'Ашу құны')}</div>
              <div className="mt-1">
                {freeMysteryBoxes > 0
                  ? t('shop_case_rule_free_desc', 'Алғашқы ашулар тегін, содан кейін {{price}} coin жұмсалады.', { price })
                  : t('shop_case_rule_1_desc', 'Әр ашылу кезінде {{price}} coin жұмсалады.', { price })}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              <div className="font-bold text-white">{t('shop_case_rule_2_title', 'Сыйлық бірден беріледі')}</div>
              <div className="mt-1">{t('shop_case_rule_2_desc', 'Ұтқан reward store-ға автоматты түрде жазылады.')}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              <div className="font-bold text-white">{t('shop_case_rule_3_title', 'Жеткілікті coin керек')}</div>
              <div className="mt-1">
                {freeMysteryBoxes > 0
                  ? t('shop_case_rule_free_ready', 'Сізде тегін ашылулар бар.')
                  : coins >= price
                  ? t('shop_case_rule_3_ready', 'Сіз case ашуға дайынсыз.')
                  : t('shop_case_rule_3_locked', 'Case ашу үшін coin жинаңыз.')}
              </div>
            </div>
            {!isAvailable && (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                {t('shop_case_unavailable', 'Қазір case уақытша өшірулі.')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SkinsTab = ({ styles, handleBuySkin, handleEquipSkin, skinInventory, activeSkin }: any) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className={clsx(
        "p-6 rounded-2xl border",
        "bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/20"
      )}>
        <div className="flex items-center gap-2 mb-4">
          <Layout size={24} className="text-pink-500" />
          <h2 className={clsx("text-xl font-bold", "text-pink-900 dark:text-pink-100")}>
            {t('skins') || 'Skins'}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={clsx(
            "p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors duration-300",
            activeSkin === 'default' ? "border-green-500 bg-green-500/10" : styles.panelClass
          )}>
            <div className={clsx("w-full h-16 rounded-lg flex items-center justify-center font-bold text-sm shadow-inner", "bg-secondary text-white border border-gray-700")}>
              123
            </div>
            <div className="text-center w-full">
              <div className={clsx("text-sm font-bold", styles.textPrimary)}>{t('skin_classic')}</div>
            </div>
            <button
              onClick={() => handleEquipSkin('default')}
              disabled={activeSkin === 'default'}
              className={clsx(
                "w-full py-2 rounded-lg text-sm font-bold transition-colors",
                activeSkin === 'default' ? "bg-green-600 text-white cursor-default" : styles.btnSecondary
              )}
            >
              {activeSkin === 'default' ? t('equipped') : t('equip')}
            </button>
          </div>

          <div className={clsx(
            "p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors duration-300",
            activeSkin === 'neon_blue' ? "border-green-500 bg-green-500/10" : styles.panelClass
          )}>
            <div className={clsx("w-full h-16 rounded-lg flex items-center justify-center font-bold text-sm shadow-inner", "bg-blue-900/40 text-blue-100 border border-blue-500 shadow-blue-500/20")}>
              123
            </div>
            <div className="text-center w-full">
              <div className={clsx("text-sm font-bold", styles.textPrimary)}>{t('skin_neon')}</div>
              {!skinInventory.includes('neon_blue') && (
                <div className={clsx("flex items-center justify-center gap-1 text-xs font-bold", styles.textAccent)}>
                  <Coins size={12} />
                  100
                </div>
              )}
            </div>
            {skinInventory.includes('neon_blue') ? (
              <button
                onClick={() => handleEquipSkin('neon_blue')}
                disabled={activeSkin === 'neon_blue'}
                className={clsx(
                  "w-full py-2 rounded-lg text-xs font-bold transition-colors",
                  activeSkin === 'neon_blue' ? "bg-green-600 text-white cursor-default" : styles.btnSecondary
                )}
              >
                {activeSkin === 'neon_blue' ? t('equipped') : t('equip')}
              </button>
            ) : (
              <button
                onClick={() => handleBuySkin('neon_blue', 100)}
                className={clsx("w-full py-2 rounded-lg text-xs font-bold transition-colors", styles.btnPrimary)}
              >
                {t('buy')}
              </button>
            )}
          </div>

          <div className={clsx(
            "p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors duration-300",
            activeSkin === 'royal_purple' ? "border-green-500 bg-green-500/10" : styles.panelClass
          )}>
            <div className={clsx("w-full h-16 rounded-lg flex items-center justify-center font-bold text-sm shadow-inner", "bg-purple-900/40 text-purple-100 border border-purple-500 shadow-purple-500/20")}>
              123
            </div>
            <div className="text-center w-full">
              <div className={clsx("text-sm font-bold", styles.textPrimary)}>{t('skin_purple')}</div>
              {!skinInventory.includes('royal_purple') && (
                <div className={clsx("flex items-center justify-center gap-1 text-xs font-bold", styles.textAccent)}>
                  <Coins size={12} />
                  250
                </div>
              )}
            </div>
            {skinInventory.includes('royal_purple') ? (
              <button
                onClick={() => handleEquipSkin('royal_purple')}
                disabled={activeSkin === 'royal_purple'}
                className={clsx(
                  "w-full py-2 rounded-lg text-xs font-bold transition-colors",
                  activeSkin === 'royal_purple' ? "bg-green-600 text-white cursor-default" : styles.btnSecondary
                )}
              >
                {activeSkin === 'royal_purple' ? t('equipped') : t('equip')}
              </button>
            ) : (
              <button
                onClick={() => handleBuySkin('royal_purple', 250)}
                className={clsx("w-full py-2 rounded-lg text-xs font-bold transition-colors", styles.btnPrimary)}
              >
                {t('buy')}
              </button>
            )}
          </div>

          <div className={clsx(
            "p-4 rounded-xl border flex flex-col items-center gap-2 transition-colors duration-300",
            activeSkin === 'matrix' ? "border-green-500 bg-green-500/10" : styles.panelClass
          )}>
            <div className={clsx("w-full h-16 rounded-lg flex items-center justify-center font-bold text-sm shadow-inner", "bg-green-900/40 text-green-400 border border-green-500 font-mono")}>
              123
            </div>
            <div className="text-center w-full">
              <div className={clsx("text-sm font-bold", styles.textPrimary)}>{t('skin_matrix')}</div>
              {!skinInventory.includes('matrix') && (
                <div className={clsx("flex items-center justify-center gap-1 text-xs font-bold", styles.textAccent)}>
                  <Coins size={12} />
                  500
                </div>
              )}
            </div>
            {skinInventory.includes('matrix') ? (
              <button
                onClick={() => handleEquipSkin('matrix')}
                disabled={activeSkin === 'matrix'}
                className={clsx(
                  "w-full py-2 rounded-lg text-xs font-bold transition-colors",
                  activeSkin === 'matrix' ? "bg-green-600 text-white cursor-default" : styles.btnSecondary
                )}
              >
                {activeSkin === 'matrix' ? t('equipped') : t('equip')}
              </button>
            ) : (
              <button
                onClick={() => handleBuySkin('matrix', 500)}
                className={clsx("w-full py-2 rounded-lg text-xs font-bold transition-colors", styles.btnPrimary)}
              >
                {t('buy')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const VIPTab = ({ currentPlan, onBuyPlan, onShowTerms }: {
  currentPlan: string;
  onBuyPlan: (plan: VipPurchaseOption) => void;
  onShowTerms: () => void;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const basicFeatures = [
    t('basic_f1'),
    t('basic_f2'),
    t('basic_f3'),
    t('basic_f4'),
  ];
  const proFeatures = [
    t('pro_f1'),
    t('pro_f2'),
    t('pro_f3'),
    t('pro_f4'),
    t('pro_f5'),
  ];
  const premiumFeatures = [
    t('premium_f1'),
    t('premium_f2'),
    t('premium_f3'),
    t('premium_f4'),
    t('premium_f5'),
    t('premium_f6'),
    t('premium_f7'),
  ];

  const vipPlans = [
    {
      id: 'basic' as const,
      name: t('plan_standard'),
      duration: '365 days',
      badge: 'BASIC',
      priceLabel: BASIC_PRICE,
      description: t('plan_basic_desc'),
      highlight: 'Жылдық',
      popular: false,
      isPremium: false,
      features: basicFeatures,
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      duration: '365 days',
      badge: t('badge_best'),
      priceLabel: PRO_PRICE,
      description: t('plan_pro_desc'),
      highlight: 'Ең танымал',
      popular: true,
      isPremium: false,
      features: proFeatures,
    },
    {
      id: 'premium' as const,
      name: t('plan_premium'),
      duration: '365 days',
      badge: '👑 ' + t('plan_premium'),
      priceLabel: PREMIUM_PRICE,
      originalPrice: '15 990 ₸',
      description: t('plan_premium_desc'),
      highlight: '🚗 ' + t('car_raffle'),
      popular: false,
      isPremium: true,
      features: premiumFeatures,
    },
  ];
  
  return (
    <div className="space-y-6">
      <div className={clsx(
        "p-4 rounded-xl border relative overflow-hidden",
        "bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/20"
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-yellow-400/5 to-transparent" />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500 text-white">
              <Crown size={18} fill="currentColor" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                {t('vip_status') || 'VIP Status'}
              </h3>
              <p className="text-[10px] text-amber-700 dark:text-amber-300">
                {t('vip_membership_desc')}
              </p>
            </div>
          </div>
          <div className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
            {String(currentPlan || 'free').toUpperCase()}
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-amber-500/20 bg-white/5 px-2 py-1.5">
            <div className="text-[9px] uppercase tracking-[0.18em] text-amber-100/70">Analytics</div>
            <div className="mt-0.5 text-[10px] font-black text-white">Pro & Premium</div>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-white/5 px-2 py-1.5">
            <div className="text-[9px] uppercase tracking-[0.18em] text-amber-100/70">Status</div>
            <div className="mt-0.5 text-[10px] font-black text-white">Gold border</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
          <div className="flex items-center gap-1.5 text-cyan-300">
            <BarChart3 size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Analytics</span>
          </div>
          <div className="mt-2 text-[10px] font-bold text-white">{t('analytics_desc')}</div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-center gap-1.5 text-amber-300">
            <Medal size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Gold border</span>
          </div>
          <div className="mt-2 text-[10px] font-bold text-white">{t('gold_border_desc')}</div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-1.5 text-emerald-300">
            <Sparkles size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Tournament</span>
          </div>
          <div className="mt-2 text-[10px] font-bold text-white">{t('tournament_desc')}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {vipPlans.map((plan) => (
          <div
            key={plan.id}
            className={clsx(
              "p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden",
              plan.isPremium
                ? "bg-gradient-to-br from-amber-900 via-stone-900 to-rose-950 border-amber-400 ring-2 ring-amber-300 shadow-xl shadow-amber-500/30"
                : plan.popular
                  ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/40 ring-2 ring-yellow-400 scale-[1.02]"
                  : "bg-white/50 dark:bg-black/30 border-amber-500/20 hover:border-amber-500/40"
            )}
          >
            {(plan.popular || plan.isPremium) && (
              <div className={clsx(
                "absolute top-0 right-0 text-[10px] font-bold px-2 py-1 rounded-bl-xl",
                plan.isPremium ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-stone-950" : "bg-yellow-500 text-white"
              )}>
                {plan.isPremium ? '👑 BEST' : 'TOP VALUE'}
              </div>
            )}

            <div className="text-center mb-3">
              <div className={clsx(
                "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-[0.18em] mb-2",
                plan.isPremium
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/30"
                  : plan.popular
                    ? "bg-yellow-400 text-stone-950"
                    : "bg-amber-500 text-white"
              )}>
                {plan.badge}
              </div>
              <h3 className={clsx(
                "text-lg font-black",
                plan.isPremium ? "text-amber-500 dark:text-amber-300 drop-shadow-sm" : plan.popular ? "text-yellow-600 dark:text-yellow-400" : "text-amber-900 dark:text-amber-100"
              )}>
                {plan.name}
              </h3>
            </div>

            <div className="text-center mb-3">
              {plan.isPremium && plan.originalPrice && (
                <div className="text-sm font-bold text-gray-400 line-through mb-0.5">
                  {plan.originalPrice}
                </div>
              )}
              <div className={clsx(
                "text-2xl font-black",
                plan.isPremium ? "bg-gradient-to-b from-amber-200 to-yellow-500 bg-clip-text text-transparent drop-shadow-md" : plan.popular ? "text-yellow-600 dark:text-yellow-400" : "text-amber-900 dark:text-amber-100"
              )}>
                {plan.priceLabel}
              </div>
              {plan.isPremium && (
                <div className="mt-1">
                  <CountdownTimer targetDateISO="2026-05-25T23:59:59.000Z" />
                </div>
              )}
            </div>

            {plan.isPremium && (
              <div className="mb-3 space-y-2">
                <div className="relative w-full aspect-video rounded-lg border-2 border-amber-400 p-0.5 bg-amber-500/10 shadow-[0_0_15px_rgba(251,191,36,0.5)] overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10 rounded pointer-events-none" />
                  <img 
                    src="/mustang.jpg" 
                    alt="Ford Mustang" 
                    className="w-full h-full object-cover rounded transform group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-1.5 left-2 z-20 flex items-center gap-1">
                    <Car size={12} className="text-amber-400" />
                    <span className="text-[10px] font-black text-white uppercase tracking-wider drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                      Ford Mustang
                    </span>
                  </div>
                  <div className="absolute top-1.5 right-1.5 z-20">
                    <div className="px-1.5 py-0.5 rounded bg-amber-500 text-[8px] font-black text-black uppercase shadow-lg border border-amber-300">
                      {t('main_prize')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-500/10 p-2">
                  <div className="rounded bg-amber-500 p-1.5">
                    <Gift size={14} className="text-black" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider text-amber-500 drop-shadow-sm">
                      {t('car_raffle')}
                    </div>
                    <div className="mt-0.5 text-[9px] font-bold leading-tight text-white drop-shadow-sm">
                      {t('car_raffle_desc')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <ul className="space-y-1 mb-3">
              {plan.features.map((feature, index) => (
                <li key={index} className={clsx(
                  "text-[10px] flex items-start gap-1.5 font-medium leading-tight",
                  plan.isPremium ? "text-amber-100 drop-shadow-sm" : plan.popular ? "text-yellow-800 dark:text-yellow-200" : "text-amber-800 dark:text-amber-200"
                )}>
                  <span className="font-black text-amber-400 text-[9px]">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => onBuyPlan(plan.id)}
              className={clsx(
                "w-full py-2 rounded-lg font-bold text-xs transition-all",
                plan.isPremium
                  ? "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-stone-950 hover:scale-105 shadow-lg shadow-amber-500/40"
                  : plan.popular
                    ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:scale-105 shadow-lg shadow-yellow-500/30"
                    : "bg-amber-500 text-white hover:bg-amber-600"
              )}>
              {plan.isPremium ? t('get_premium') : (t('subscribe') || 'Subscribe')}
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onShowTerms}
        className="w-full py-3 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 font-bold text-sm hover:bg-blue-600/20 transition-all flex items-center justify-center gap-2"
      >
        <FileText size={16} />
        {t('terms_link')}
      </button>

      <button
        onClick={() => navigate('/analytics')}
        className="w-full py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-sm hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
      >
        <BarChart3 size={16} />
        {currentPlan === 'pro' || currentPlan === 'premium' ? t('open_vip_analytics') : t('preview_vip_analytics')}
      </button>
    </div>
  );
};

const ShopPage = () => {
  const { t } = useTranslation();
  const {
    coins,
    gems,
    freeMysteryBoxes,
    premiumGiftMysteryBoxes,
    tickets,
    mysteryBoxAvailable,
    skinInventory,
    activeSkin,
    buySkin,
    equipSkin,
    openCase,
    plan,
  } = useStore();
  const totalFreeCaseOpens = freeMysteryBoxes + premiumGiftMysteryBoxes;
  const [activeTab, setActiveTab] = useState<'vip' | 'skins' | 'cases'>('vip');
  const [showTerms, setShowTerms] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ planCode: TonPlanCode; title: string; price: string; basePriceKzt: number } | null>(null);
  const [openedCaseReward, setOpenedCaseReward] = useState<{ caseId: CaseId; reward: MysteryBox } | null>(null);
  const [caseErrorMessage, setCaseErrorMessage] = useState<string | null>(null);

  const styles = useThemeStyles();
  const { bgClass, cardClass } = styles;

  const handleBuyPlan = (plan: VipPurchaseOption) => {
    WebApp.HapticFeedback.notificationOccurred('success');

    const map = {
      basic:   { planCode: 'basic' as const, title: 'BASIC YEARLY', price: BASIC_PRICE, basePriceKzt: BASIC_PRICE_KZT },
      pro:     { planCode: 'pro' as const, title: 'PRO YEARLY', price: PRO_PRICE, basePriceKzt: PRO_PRICE_KZT },
      premium: { planCode: 'premium' as const, title: 'PREMIUM YEARLY', price: PREMIUM_PRICE, basePriceKzt: PREMIUM_PRICE_KZT },
    } as const;
    const picked = map[plan];
    setPaymentModal({ planCode: picked.planCode, title: picked.title, price: picked.price });
  };

  const handleBuySkin = (id: string, cost: number) => {
    const success = buySkin(id, cost);
    if (success) {
      WebApp.HapticFeedback.notificationOccurred('success');
    } else {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert(t('not_enough_coins'));
    }
  };

  const handleEquipSkin = (id: string) => {
    equipSkin(id);
    WebApp.HapticFeedback.selectionChanged();
  };

  const handleOpenCase = (caseId: CaseId) => {
    const result = openCase(caseId);

    if (!result.success || !result.reward) {
      WebApp.HapticFeedback.notificationOccurred('error');
      setCaseErrorMessage(
        result.error === 'case_unavailable'
          ? t('shop_case_service_offline')
          : result.error === 'not_enough_crystals'
            ? t('not_enough_crystals')
            : t('not_enough_coins')
      );
      return;
    }

    setCaseErrorMessage(null);
    WebApp.HapticFeedback.notificationOccurred('success');
    setOpenedCaseReward({ caseId, reward: result.reward });
  };

  // Local helper for tabs
  const getTabClass = (isActive: boolean) => {
    if (isActive) {
        if (styles.isLight) return "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30";
        if (styles.isBlue) return "bg-blue-600 text-white shadow-sm shadow-blue-600/30";
        if (styles.isGold) return "bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 shadow-sm shadow-amber-500/30";
        return "bg-cyan-500 text-black shadow-sm shadow-cyan-500/30";
    }
    return styles.isLight ? "text-slate-500 hover:text-slate-800" : "text-zinc-500 hover:text-zinc-300";
  };

  return (
    <div className={clsx("mobile-page p-4 min-h-screen", bgClass)}>
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <h1 className={clsx("text-2xl sm:text-3xl font-bold", styles.textAccent)}>{t('shop')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={clsx("flex items-center gap-2 px-3 py-2 rounded-full border shrink-0", cardClass)}>
            <Coins size={20} className={styles.textAccent} fill="currentColor" />
            <span className={clsx("font-bold text-lg", styles.textPrimary)}>{coins}</span>
          </div>
          <div className={clsx("flex items-center gap-2 px-3 py-2 rounded-full border shrink-0", cardClass)}>
            <Gem size={18} className="text-cyan-300" />
            <span className={clsx("font-bold text-lg", styles.textPrimary)}>{gems}</span>
          </div>
        </div>
      </div>

      <div className={clsx("flex p-1 rounded-xl mb-6 border", cardClass)}>
        <button
          onClick={() => setActiveTab('vip')}
          className={clsx(
            "flex-1 min-h-[44px] py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
            getTabClass(activeTab === 'vip')
          )}
        >
          <Crown size={16} />
          {t('vip') || 'VIP/Pass'}
        </button>
        <button
          onClick={() => setActiveTab('skins')}
          className={clsx(
            "flex-1 min-h-[44px] py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
            getTabClass(activeTab === 'skins')
          )}
        >
          <Layout size={16} />
          {t('skins') || 'Skins'}
        </button>
        <button
          onClick={() => setActiveTab('cases')}
          className={clsx(
            "flex-1 min-h-[44px] py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
            getTabClass(activeTab === 'cases')
          )}
        >
          <Gift size={16} />
          {t('shop_cases_title')}
        </button>
      </div>

      {activeTab === 'vip' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <VIPTab currentPlan={plan} onBuyPlan={handleBuyPlan} onShowTerms={() => setShowTerms(true)} />
        </div>
      ) : activeTab === 'skins' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SkinsTab 
            styles={styles} 
            handleBuySkin={handleBuySkin}
            handleEquipSkin={handleEquipSkin}
            skinInventory={skinInventory}
            activeSkin={activeSkin}
          />
        </div>
      ) : activeTab === 'cases' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ShopInventorySection
            styles={styles}
            tickets={tickets}
            starterCases={freeMysteryBoxes}
            premiumCases={premiumGiftMysteryBoxes}
            isOpening={Boolean(openedCaseReward)}
            caseErrorMessage={caseErrorMessage}
            onOpenCase={handleOpenCase}
          />
          <CaseList
            cases={CASE_LIST}
            coins={coins}
            gems={gems}
            freeOpens={totalFreeCaseOpens}
            starterFreeOpens={freeMysteryBoxes}
            premiumGiftCases={premiumGiftMysteryBoxes}
            errorMessage={caseErrorMessage}
            isOpening={Boolean(openedCaseReward)}
            onOpen={handleOpenCase}
          />
        </div>
      ) : null}

      <TermsModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
      />

      <PaymentModal
        isOpen={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        planCode={paymentModal?.planCode || 'basic'}
        planTitle={paymentModal?.title || ''}
        price={paymentModal?.price || ''}
        basePriceKzt={paymentModal?.basePriceKzt || BASIC_PRICE_KZT}
      />

      <CaseOpeningModal
        caseId={openedCaseReward?.caseId ?? null}
        reward={openedCaseReward?.reward ?? null}
        onClose={() => setOpenedCaseReward(null)}
      />
    </div>
  );
};

export default ShopPage;

const ShopInventorySection = ({
  styles,
  tickets,
  starterCases,
  premiumCases,
  isOpening,
  caseErrorMessage,
  onOpenCase,
}: {
  styles: ReturnType<typeof useThemeStyles>;
  tickets: Ticket[];
  starterCases: number;
  premiumCases: number;
  isOpening: boolean;
  caseErrorMessage: string | null;
  onOpenCase: (caseId: CaseId) => void;
}) => {
  const { t } = useTranslation();
  const totalCases = starterCases + premiumCases;

  return (
    <div className="mb-6 space-y-6">
      <div className={clsx("rounded-[28px] border p-5", styles.cardClass)}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className={clsx("text-[10px] font-black uppercase tracking-widest", styles.textSecondary)}>
              {t('inventory', 'Inventory')}
            </div>
            <h3 className={clsx("mt-2 text-xl font-black", styles.textPrimary)}>
              {t('profile_inventory_title', 'Cases & Tickets')}
            </h3>
            <p className={clsx("mt-2 text-sm", styles.textSecondary)}>
              {t('profile_inventory_desc', 'Your free starter cases, premium gift cases and tickets are stored here.')}
            </p>
          </div>
          <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-400">
            <Gift size={22} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <ShopInventoryStatCard label={t('profile_inventory_total_cases', 'Total Cases')} value={totalCases} accent="text-amber-400" styles={styles} />
          <ShopInventoryStatCard label={t('profile_inventory_starter_cases', 'Starter')} value={starterCases} accent="text-cyan-400" styles={styles} />
          <ShopInventoryStatCard label={t('profile_inventory_premium_cases', 'Premium')} value={premiumCases} accent="text-fuchsia-400" styles={styles} />
        </div>

        {caseErrorMessage ? (
          <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {caseErrorMessage}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {CASE_LIST.map((caseDefinition) => (
          <div
            key={caseDefinition.id}
            className={clsx("rounded-[24px] border p-4", styles.cardClass)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-2xl bg-black/5 p-2 dark:bg-white/5">
                  <CaseIcon caseId={caseDefinition.id} className="h-full w-full" />
                </div>
                <div>
                  <div className={clsx("text-sm font-black", styles.textPrimary)}>{t(caseDefinition.titleKey)}</div>
                  <div className={clsx("mt-1 text-xs", styles.textSecondary)}>{t(caseDefinition.descriptionKey)}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenCase(caseDefinition.id)}
                disabled={isOpening}
                className={clsx("rounded-2xl px-4 py-2 text-xs font-black", isOpening ? "bg-white/10 text-white/50" : styles.btnSecondary)}
              >
                {isOpening ? t('shop_case_opening_cta') : t('shop_case_open_cta')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={clsx("rounded-[28px] border p-5", styles.cardClass)}>
        <div className="flex items-center justify-between px-1">
          <h3 className={clsx("text-lg font-black flex items-center gap-2", styles.textPrimary)}>
            <TicketIcon size={18} className="text-yellow-400" />
            {t('profile_inventory_tickets', 'Tickets')}
          </h3>
          <span className={clsx("text-[10px] font-black uppercase tracking-widest", styles.textSecondary)}>
            {tickets.length}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {tickets.length > 0 ? tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="relative bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 rounded-2xl p-1 shadow-2xl"
            >
              <div className="bg-gradient-to-br from-yellow-100 to-amber-200 rounded-xl p-4 h-full">
                <div className="absolute top-2 right-2">
                  {ticket.isUsed ? (
                    <div className="bg-green-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5">
                      <CheckCircle className="w-2.5 h-2.5" />
                      VERIFIED
                    </div>
                  ) : (
                    <div className="bg-yellow-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                      ACTIVE
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 border-yellow-500/30 shadow-lg">
                    <img src="/mustang.jpg" alt="Mustang" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-2xl font-black text-yellow-800 font-mono tracking-wider">
                      {String(ticket.ticketNumber).padStart(8, '0')}
                    </div>
                    <div className="text-[9px] text-yellow-600 font-medium tracking-widest uppercase">Ticket Number</div>
                    <p className="text-xs font-bold text-yellow-800 truncate">{ticket.eventName}</p>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className={clsx("rounded-3xl border border-dashed p-6 text-center", styles.cardClass)}>
              <div className={clsx("text-sm font-bold", styles.textSecondary)}>
                {t('no_tickets_found')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ShopInventoryStatCard = ({
  label,
  value,
  accent,
  styles,
}: {
  label: string;
  value: number;
  accent: string;
  styles: ReturnType<typeof useThemeStyles>;
}) => (
  <div className={clsx("rounded-2xl border p-3", styles.cardClass)}>
    <div className={clsx("text-[10px] font-black uppercase tracking-widest", styles.textSecondary)}>{label}</div>
    <div className={clsx("mt-2 text-2xl font-black", accent)}>{value}</div>
  </div>
);
