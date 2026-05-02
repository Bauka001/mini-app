import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Crown, Coins, Layout, FileText, X, BarChart3, Medal, Sparkles, Car, Gift } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStoreImpl';
import WebApp from '@twa-dev/sdk';
import { TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react';
import { beginCell } from '@ton/core';
import { TermsModal } from '../components/TermsModal';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { createTonPaymentIntent, getPaymentStatus, TonPlanCode } from '../utils/paymentApi';

const PaymentModal = ({ 
  isOpen, 
  onClose,
  planCode,
  planTitle,
  price
}: { 
  isOpen: boolean, 
  onClose: () => void,
  planCode: TonPlanCode,
  planTitle: string,
  price: string
}) => {
  const { t } = useTranslation();
  const fetchEntitlements = useStore((state) => state.fetchEntitlements);
  const [tonUi] = useTonConnectUI();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [serverTonAmount, setServerTonAmount] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPendingPaymentId(null);
      setStatusMessage('');
      setErrorMessage('');
      setServerTonAmount(null);
      setIsSubmitting(false);
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

  const handlePayNow = async () => {
    WebApp.HapticFeedback.notificationOccurred('success');
    setErrorMessage('');

    try {
      setIsSubmitting(true);
      const paymentIntent = await createTonPaymentIntent(planCode);
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
            <div className="mt-2 text-2xl font-black text-black">{price}</div>
            {serverTonAmount && (
              <div className="mt-2 text-sm font-semibold text-green-700">Exact TON amount: {serverTonAmount}</div>
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

const BASIC_PRICE = '6 990 ₸';
const PRO_PRICE = '8 590 ₸';
const PREMIUM_PRICE = '9 990 ₸';

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
            <div className="mt-0.5 text-[10px] font-black text-white">VIP only</div>
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
        {currentPlan === 'premium' ? t('open_vip_analytics') : t('preview_vip_analytics')}
      </button>
    </div>
  );
};

const ShopPage = () => {
  const { t } = useTranslation();
  const { coins, skinInventory, activeSkin, buySkin, equipSkin, plan } = useStore();
  const [activeTab, setActiveTab] = useState<'vip' | 'skins'>('vip');
  const [showTerms, setShowTerms] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ planCode: TonPlanCode; title: string; price: string } | null>(null);

  const styles = useThemeStyles();
  const { bgClass, cardClass } = styles;

  const handleBuyPlan = (plan: VipPurchaseOption) => {
    WebApp.HapticFeedback.notificationOccurred('success');

    const map = {
      basic:   { planCode: 'basic' as const, title: 'BASIC YEARLY',   price: BASIC_PRICE },
      pro:     { planCode: 'pro' as const, title: 'PRO YEARLY',     price: PRO_PRICE },
      premium: { planCode: 'premium' as const, title: 'PREMIUM YEARLY', price: PREMIUM_PRICE },
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
        <div className={clsx("flex items-center gap-2 px-3 py-2 rounded-full border shrink-0", cardClass)}>
          <Coins size={20} className={styles.textAccent} fill="currentColor" />
          <span className={clsx("font-bold text-lg", styles.textPrimary)}>{coins}</span>
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
      />
    </div>
  );
};

export default ShopPage;
