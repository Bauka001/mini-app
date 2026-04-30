import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown, Coins, Layout, FileText, X, BarChart3, Medal, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStoreImpl';
import WebApp from '@twa-dev/sdk';
import { TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react';
import { TermsModal } from '../components/TermsModal';
import { useThemeStyles } from '../hooks/useThemeStyles';
import ShopClaude from './ShopClaude';

const PaymentModal = ({ 
  isOpen, 
  onClose,
  planTitle,
  price 
}: { 
  isOpen: boolean, 
  onClose: () => void,
  planTitle: string,
  price: string
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'stars' | 'ton'>('stars');
  const [tonUi] = useTonConnectUI();

  if (!isOpen) return null;

  const handlePayNow = async () => {
    WebApp.HapticFeedback.notificationOccurred('success');

    if (selectedMethod === 'stars') {
      const url = 'https://t.me/Focus_game_bot?start=' + encodeURIComponent(planTitle.toLowerCase());

      if (WebApp.platform === 'unknown') {
        window.open(url, '_blank');
      } else {
        WebApp.openTelegramLink(url);
      }
      onClose();
      return;
    }

    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, '')) || 1;
    const tonAmount = numericPrice <= 1 ? 0.5 : numericPrice <= 10 ? 5 : 10;
    const nano = Math.round(tonAmount * 1e9).toString();

    try {
      await tonUi.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
            amount: nano
          }
        ]
      });
      onClose();
    } catch {
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="text-lg font-bold text-black">Payment Method</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-1 text-sm text-gray-500">Item Summary</div>
            <div className="text-xl font-bold text-black">{planTitle}</div>
            <div className="mt-2 text-2xl font-black text-black">{price}</div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setSelectedMethod('stars')}
              className={`w-full rounded-2xl border p-4 text-left transition-all ${
                selectedMethod === 'stars'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-black">Telegram Stars</span>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-green-700">
                      Recommended
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">Telegram mini app ішінде жылдам төлем</div>
                </div>
                <div
                  className={`mt-1 h-5 w-5 rounded-full border-2 ${
                    selectedMethod === 'stars' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                  }`}
                />
              </div>
            </button>

            <button
              onClick={() => setSelectedMethod('ton')}
              className={`w-full rounded-2xl border p-4 text-left transition-all ${
                selectedMethod === 'ton'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-bold text-black">TON (TonConnect)</div>
                  <div className="mt-1 text-sm text-gray-600">TonConnect арқылы әмиянмен төлеу</div>
                </div>
                <div
                  className={`mt-1 h-5 w-5 rounded-full border-2 ${
                    selectedMethod === 'ton' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                  }`}
                />
              </div>
            </button>
          </div>

          {selectedMethod === 'ton' && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 text-sm font-semibold text-black">TonConnect</div>
              <TonConnectButton />
            </div>
          )}

          <button
            onClick={handlePayNow}
            className="w-full rounded-2xl bg-green-500 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-green-600"
          >
            Pay Now
          </button>
        </div>
      </div>
    </div>
  );
};

type VipPurchaseOption = 'monthly' | 'yearly';

const MONTHLY_VIP_PRICE = '$4.99';
const MONTHLY_VIP_STARS = '150 Stars';
const YEARLY_PASS_PRICE = '$39.99';
const YEARLY_PASS_STARS = '1200 Stars';

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

  const vipFeatures = [
    'Premium Analytics: тарих пен графикалар',
    'Leaderboard ішінде Gold шекара',
    'Аптасына 1 тегін турнир билеті',
    'Жарнамасыз режим',
  ];

  const vipPlans = [
    {
      id: 'monthly' as const,
      name: 'VIP Monthly',
      duration: '30 days',
      badge: 'VIP',
      priceLabel: MONTHLY_VIP_PRICE,
      starsLabel: MONTHLY_VIP_STARS,
      description: 'Ай сайынғы икемді жазылым',
      highlight: 'Жылдам бастау',
      popular: false,
    },
    {
      id: 'yearly' as const,
      name: 'VIP Yearly',
      duration: '365 days',
      badge: 'BEST',
      priceLabel: YEARLY_PASS_PRICE,
      starsLabel: YEARLY_PASS_STARS,
      description: '12 айға тиімді толық access',
      highlight: 'Ең тиімді ұсыныс',
      popular: true,
    },
  ];
  
  return (
    <div className="space-y-6">
      <div className={clsx(
        "p-6 rounded-2xl border relative overflow-hidden",
        "bg-gradient-to-br from-amber-500/15 to-yellow-500/15 border-amber-500/30"
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
              <Crown size={24} fill="currentColor" />
            </div>
            <div>
              <h3 className="text-lg font-black text-amber-950 dark:text-amber-100">
                {t('vip_status') || 'VIP Status'}
              </h3>
              <p className="text-sm font-medium text-amber-900/80 dark:text-amber-200">
                VIP мүшелік енді analytics, gold border және ads-free режимге бағытталған.
              </p>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black shadow-sm shadow-amber-500/40">
            {String(currentPlan || 'free').toUpperCase()}
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-amber-500/30 bg-white/70 dark:bg-white/[0.07] px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">Analytics</div>
            <div className="mt-1 text-sm font-black text-stone-900 dark:text-white">VIP only</div>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-white/70 dark:bg-white/[0.07] px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">Status</div>
            <div className="mt-1 text-sm font-black text-stone-900 dark:text-white">Gold border</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
            <BarChart3 size={18} />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Analytics</span>
          </div>
          <div className="mt-3 text-sm font-bold text-stone-900 dark:text-white">30 күндік график пен Brain Score динамикасы</div>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <Medal size={18} />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Gold border</span>
          </div>
          <div className="mt-3 text-sm font-bold text-stone-900 dark:text-white">Лидерборд пен профильде бірден байқалатын VIP статус</div>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <Sparkles size={18} />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Tournament</span>
          </div>
          <div className="mt-3 text-sm font-bold text-stone-900 dark:text-white">Аптасына 1 тегін кіру weekend tournament монетизациясын ашады</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vipPlans.map((plan) => (
          <div
            key={plan.id}
            className={clsx(
              "p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden",
              plan.popular
                ? "bg-gradient-to-br from-amber-400/30 to-orange-500/30 dark:from-yellow-500/25 dark:to-orange-500/25 border-amber-500/60 ring-2 ring-amber-400 scale-105"
                : "bg-white dark:bg-black/40 border-amber-500/30 hover:border-amber-500/60 shadow-sm"
            )}
          >
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded-bl-xl shadow-md">
                TOP VALUE
              </div>
            )}

            <div className="text-center mb-4">
              <div className={clsx(
                "inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black tracking-[0.18em] mb-3",
                plan.popular ? "bg-amber-500 text-white shadow-sm" : "bg-amber-500 text-white"
              )}>
                {plan.badge}
              </div>
              <h3 className={clsx("text-xl font-black", plan.popular ? "text-amber-900 dark:text-yellow-200" : "text-amber-900 dark:text-amber-100")}>
                {plan.name}
              </h3>
              <p className={clsx("text-sm font-semibold", plan.popular ? "text-amber-800 dark:text-yellow-300" : "text-amber-800 dark:text-amber-300")}>
                ({plan.duration})
              </p>
              <p className={clsx("text-xs mt-2 font-medium", plan.popular ? "text-amber-800 dark:text-yellow-300" : "text-amber-800 dark:text-amber-300")}>
                {plan.description}
              </p>
            </div>

            <div className="text-center mb-4">
              <div className={clsx("text-3xl font-black", plan.popular ? "text-amber-900 dark:text-yellow-300" : "text-amber-900 dark:text-amber-100")}>
                {plan.priceLabel}
              </div>
              <div className={clsx("text-sm font-bold mt-1", plan.popular ? "text-amber-800 dark:text-yellow-300" : "text-amber-800 dark:text-amber-300")}>
                {plan.starsLabel}
              </div>
              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {plan.highlight}
              </div>
            </div>

            <ul className="space-y-2 mb-4">
              {vipFeatures.map((feature, index) => (
                <li key={index} className={clsx("text-xs flex items-start gap-2 font-medium", plan.popular ? "text-amber-900 dark:text-yellow-200" : "text-amber-900 dark:text-amber-200")}>
                  <span className="mt-0.5 text-emerald-600 dark:text-emerald-400 font-black">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => onBuyPlan(plan.id)}
              className={clsx(
              "w-full py-3 rounded-xl font-black text-sm transition-all",
              plan.popular
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:scale-[1.02] shadow-lg shadow-amber-500/40"
                : "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/30"
            )}>
              {t('subscribe') || 'Subscribe'}
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onShowTerms}
        className="w-full py-3 rounded-xl bg-blue-600/10 border border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold text-sm hover:bg-blue-600/20 transition-all flex items-center justify-center gap-2"
      >
        <FileText size={16} />
        {t('premium_terms_link')}
      </button>

      <button
        onClick={() => navigate('/analytics')}
        className="w-full py-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 font-bold text-sm hover:bg-amber-500/25 transition-all flex items-center justify-center gap-2"
      >
        <BarChart3 size={16} />
        {currentPlan === 'premium' ? 'VIP analytics ашу' : 'VIP analytics preview көру'}
      </button>
    </div>
  );
};

// Theme switcher — Claude renders the editorial layout in ShopClaude.tsx;
// the dark / light / blue / gold themes keep the original markup untouched.
const ShopPage = () => {
  const styles = useThemeStyles();
  return styles.isClaude ? <ShopClaude /> : <LegacyShopPage />;
};

const LegacyShopPage = () => {
  const { t } = useTranslation();
  const { coins, skinInventory, activeSkin, buySkin, equipSkin, plan } = useStore();
  const [activeTab, setActiveTab] = useState<'vip' | 'skins'>('vip');
  const [showTerms, setShowTerms] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ title: string; price: string } | null>(null);

  const styles = useThemeStyles();
  const { bgClass, cardClass } = styles;

  const handleBuyPlan = (plan: VipPurchaseOption) => {
    WebApp.HapticFeedback.notificationOccurred('success');

    const price = plan === 'yearly' ? YEARLY_PASS_PRICE : MONTHLY_VIP_PRICE;

    setPaymentModal({ title: plan === 'yearly' ? 'VIP YEARLY' : 'VIP MONTHLY', price });
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
    <div className={clsx("p-4 min-h-screen", bgClass)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className={clsx("text-3xl font-bold", styles.textAccent)}>{t('shop')}</h1>
        </div>
        <div className={clsx("flex items-center gap-2 px-4 py-2 rounded-full border", cardClass)}>
          <Coins size={20} className={styles.textAccent} fill="currentColor" />
          <span className={clsx("font-bold text-lg", styles.textPrimary)}>{coins}</span>
        </div>
      </div>

      <div className={clsx("flex p-1 rounded-xl mb-6 border", cardClass)}>
        <button
          onClick={() => setActiveTab('vip')}
          className={clsx(
            "flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
            getTabClass(activeTab === 'vip')
          )}
        >
          <Crown size={16} />
          {t('vip') || 'VIP/Pass'}
        </button>
        <button
          onClick={() => setActiveTab('skins')}
          className={clsx(
            "flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
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
        onClose={() => {
          // Do NOT grant premium here. The modal closes for any reason
          // (user dismissal, payment cancel, browser back). The actual upgrade
          // must be applied by the bot/payment-webhook after Stars/TON payment
          // verification — never optimistically based on the modal closing.
          setPaymentModal(null);
        }}
        planTitle={paymentModal?.title || ''}
        price={paymentModal?.price || ''}
      />
    </div>
  );
};

export default ShopPage;
