import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Star, Crown, Zap, Coins, Layout, Box, X, Ticket, Car, Shield, FileText, Snowflake, Brain, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore';
import WebApp from '@twa-dev/sdk';
import { ChestModal } from '../components/ChestModal';
import { TermsModal } from '../components/TermsModal';
import { useThemeStyles } from '../hooks/useThemeStyles';

const CountdownTimer = () => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = +new Date("2026-03-01T00:00:00") - +new Date();
    let timeLeft: any = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    }
    return timeLeft;
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearTimeout(timer);
  });

  return (
    <div className="flex items-center gap-2 text-white font-mono text-xs bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-lg">
      <div className="flex flex-col items-center min-w-[20px]">
        <span className="font-bold text-red-500 text-lg leading-none">{timeLeft.days || '0'}</span>
        <span className="text-[8px] text-gray-400 font-bold tracking-wider">{t('days')}</span>
      </div>
      <span className="text-gray-500 font-bold mb-2">:</span>
      <div className="flex flex-col items-center min-w-[20px]">
        <span className="font-bold text-white text-lg leading-none">{timeLeft.hours || '0'}</span>
        <span className="text-[8px] text-gray-400 font-bold tracking-wider">{t('hours')}</span>
      </div>
      <span className="text-gray-500 font-bold mb-2">:</span>
      <div className="flex flex-col items-center min-w-[20px]">
        <span className="font-bold text-white text-lg leading-none">{timeLeft.minutes || '0'}</span>
        <span className="text-[8px] text-gray-400 font-bold tracking-wider">{t('minutes')}</span>
      </div>
      <span className="text-gray-500 font-bold mb-2">:</span>
      <div className="flex flex-col items-center min-w-[20px]">
        <span className="font-bold text-white text-lg leading-none">{timeLeft.seconds || '0'}</span>
        <span className="text-[8px] text-gray-400 font-bold tracking-wider">{t('seconds')}</span>
      </div>
    </div>
  );
};

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
  const { t } = useTranslation();
  const [promo, setPromo] = useState('');
  const [discount, setDiscount] = useState(0);
  const [showTask, setShowTask] = useState(false);

  if (!isOpen) return null;

  const numericPrice = parseFloat(price.replace('$', ''));
  const finalPrice = discount > 0 
    ? `$${(numericPrice * (1 - discount / 100)).toFixed(2)}`
    : price;

  const handleApplyPromo = () => {
      if (promo.trim().toUpperCase() === 'STARTUP' || promo.trim().toUpperCase() === 'STARTUP10') {
          setDiscount(10);
          WebApp.HapticFeedback.notificationOccurred('success');
      } else {
          WebApp.HapticFeedback.notificationOccurred('error');
          alert('Invalid code');
          setDiscount(0);
      }
  };

  const handleNoPromo = () => {
      setShowTask(true);
  };

  const handleTaskComplete = () => {
      // Simulate task
      window.open('https://www.instagram.com/focus_game_clube/?utm_source=ig_web_button_share_sheet', '_blank');
      
      setTimeout(() => {
          setPromo('STARTUP10');
          setDiscount(10);
          setShowTask(false);
          WebApp.HapticFeedback.notificationOccurred('success');
      }, 3000);
  };

  const handlePaymentMethod = (method: 'kaspi' | 'stars' | 'ton') => {
    WebApp.HapticFeedback.notificationOccurred('success');
    
    if (method === 'stars') {
      const url = 'https://t.me/upgrade_0_bot?start=' + encodeURIComponent(planTitle.toLowerCase());
      
      // Check if running in Telegram
      if (WebApp.platform === 'unknown') {
         window.open(url, '_blank');
      } else {
         WebApp.openTelegramLink(url);
      }
    } else if (method === 'ton') {
      alert('TON payment coming soon!');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-lg text-black">{t('payment_method')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
           <div className="text-center">
             <div className="text-sm text-gray-500 mb-1">{t('paying_for')}</div>
             <div className="font-bold text-xl text-black">{planTitle}</div>
             <div className="flex items-center justify-center gap-2 mt-2">
                {discount > 0 && <span className="text-lg text-gray-400 line-through">{price}</span>}
                <div className="text-2xl font-black text-red-500">{finalPrice}</div>
             </div>
             {discount > 0 && <div className="text-xs font-bold text-green-600 mt-1">{t('discount_applied')}</div>}
           </div>

           {/* Promocode Input */}
           {!showTask ? (
               <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                   <div className="flex gap-2 mb-2">
                       <input 
                           type="text" 
                           placeholder={t('promo_code')}
                           className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-black outline-none focus:border-blue-500"
                           value={promo}
                           onChange={e => setPromo(e.target.value)}
                       />
                       <button 
                           onClick={handleApplyPromo}
                           className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold"
                       >
                           {t('apply')}
                       </button>
                   </div>
                   <button 
                       onClick={handleNoPromo}
                       className="text-xs text-blue-500 font-bold underline w-full text-center hover:text-blue-600"
                   >
                       {t('no_promocode')}
                   </button>
               </div>
           ) : (
               <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
                   <div className="text-sm font-bold text-blue-900 mb-2">{t('get_discount_title')}</div>
                   <p className="text-xs text-blue-700 mb-3">{t('get_discount_desc')}</p>
                   <button 
                       onClick={handleTaskComplete}
                       className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                   >
                       {t('subscribe_insta')}
                   </button>
               </div>
           )}
           
           <div className="space-y-3">
             {/* Telegram Stars */}
             <button 
               onClick={() => handlePaymentMethod('stars')}
               className="w-full p-4 rounded-xl bg-gradient-to-r from-[#2AABEE] to-[#0088CC] hover:from-[#1F8AD9] hover:to-[#0066B8] transition-all group relative overflow-hidden"
             >
               <div className="flex items-center justify-center gap-3">
                 <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                   <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12 2L2 7l1.5 3.5L12 22l1.5-3.5L22 7 12 2z"/>
                   </svg>
                 </div>
                 <div className="text-left">
                   <div className="text-sm font-bold text-white mb-1">Telegram Stars</div>
                   <div className="text-xs text-white/70">{t('pay_with_xtr')}</div>
                 </div>
               </div>
               
               {/* Decorative */}
               <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
             </button>

             {/* TonConnect */}
             <button 
               onClick={() => handlePaymentMethod('ton')}
               className="w-full p-4 rounded-xl bg-gradient-to-r from-[#0098EA] to-[#0059FF] hover:from-[#0077E6] hover:to-[#003EB8] transition-all group relative overflow-hidden"
             >
               <div className="flex items-center justify-center gap-3">
                 <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                   <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12 2L2 7l1.5 3.5L12 22l1.5-3.5L22 7 12 2zM12 6a2 2 0 100 4 2 2 0 100-4zm0 2a2 2 0 100 4 2 2 0 100-4z"/>
                   </svg>
                 </div>
                 <div className="text-left">
                   <div className="text-sm font-bold text-white mb-1">TonConnect</div>
                   <div className="text-xs text-white/70">{t('pay_with_ton')}</div>
                 </div>
               </div>
               
               {/* Decorative */}
               <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
             </button>

             {/* Kaspi.kz */}
             <button 
               onClick={() => {
                 WebApp.HapticFeedback.notificationOccurred('success');
                 alert('Kaspi.kz integration coming soon!');
               }}
               className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group relative overflow-hidden"
             >
               <div className="flex items-center justify-center gap-3">
                 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                   <div className="text-white font-bold text-sm">K</div>
                 </div>
                 <div className="text-left">
                   <div className="text-sm font-bold text-gray-700 mb-1">Kaspi.kz</div>
                   <div className="text-xs text-gray-500">{t('coming_soon')}</div>
                 </div>
               </div>
             </button>
           </div>
        </div>
      </div>
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
    "relative p-6 rounded-2xl border mb-4 transition-all active:scale-95 overflow-hidden",
    styles.isLight ? "bg-white" : "bg-white/5",
    badge 
      ? (styles.isLight ? "border-green-500 shadow-lg" : "border-primary shadow-[0_0_20px_rgba(255,215,0,0.15)]") 
      : (styles.isLight ? "border-gray-200" : "border-white/10")
  )}>
    {badge && (
      <div className="absolute top-0 right-0">
        <div className={clsx(
          "text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest",
          styles.isLight ? "bg-green-600 text-white" : "bg-primary text-black"
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
        <h3 className={clsx("text-xl font-bold", styles.textPrimary)}>{title}</h3>
        <div className="flex items-baseline gap-2">
           {originalPrice && <span className="text-xs line-through opacity-50">{originalPrice}</span>}
           <p className={clsx("text-lg font-black", styles.textAccent)}>{price}</p>
        </div>
      </div>
    </div>

    <ul className="space-y-2 mb-6 relative z-10">
      {features.map((feat, i) => (
        <li key={i} className={clsx("flex items-start gap-2 text-sm", styles.isLight ? "text-gray-600" : "text-gray-300")}>
          <Check size={16} className={clsx("mt-0.5 min-w-[16px]", styles.textAccent)} />
          <span className="leading-tight">{feat}</span>
        </li>
      ))}
    </ul>

    <button 
      onClick={onBuy}
      className={clsx(
        "w-full py-3 rounded-xl font-bold transition-all relative z-10",
        badge 
          ? (styles.isLight ? "bg-green-600 text-white hover:bg-green-700 shadow-md" : "bg-gradient-to-r from-yellow-400 to-primary text-black hover:shadow-lg hover:shadow-primary/50")
          : styles.btnSecondary
      )}
    >
      {t('select_plan')}
    </button>

    {/* Decorative background element */}
    <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
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
      "p-4 rounded-xl border flex flex-col items-center gap-3 transition-all",
      isEquipped 
        ? (styles.isLight ? "border-green-600 bg-green-50" : "border-primary bg-primary/10") 
        : (styles.isLight ? "border-gray-200 bg-white" : "border-white/10 bg-white/5")
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
              ? (styles.isLight ? "bg-green-600 text-white" : "bg-primary text-black cursor-default") 
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

const BoosterCard = ({
  type,
  count,
  cost,
  icon: Icon,
  name,
  description,
  onBuy,
  styles
}: any) => {
  const { t } = useTranslation();
  return (
    <div className={clsx("p-4 rounded-xl border flex flex-col items-center gap-3", styles.isLight ? "bg-white border-gray-200" : "bg-white/5 border-white/10")}>
      <div className={clsx("w-14 h-14 rounded-full flex items-center justify-center mb-2", 
        type === 'freezes' ? "bg-blue-500/20 text-blue-500" :
        type === 'hints' ? "bg-yellow-500/20 text-yellow-500" :
        "bg-green-500/20 text-green-500"
      )}>
        <Icon size={28} />
      </div>
      <div className="text-center h-full flex flex-col justify-between">
        <div>
           <h3 className={clsx("font-bold text-sm", styles.textPrimary)}>{name}</h3>
           <p className={clsx("text-xs mb-2 line-clamp-2", styles.textSecondary)}>{description}</p>
        </div>
        <p className={clsx("text-xs font-bold mb-3", styles.textAccent)}>{t('owned') || 'Owned'}: {count}</p>
      </div>
      <button
        onClick={onBuy}
        className={clsx("w-full py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 mt-auto", styles.btnPrimary)}
      >
        <Coins size={14} /> {cost}
      </button>
    </div>
  );
};

const ShopPage = () => {
  const { t } = useTranslation();
  const { coins, inventory, activeSkin, buySkin, equipSkin, upgradePlan, spendCoins, addCoins, redeemPromocode, buyBooster } = useStore();
  const [activeTab, setActiveTab] = useState<'plans' | 'skins' | 'boosters' | 'chests'>('plans');
  const [showChest, setShowChest] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ title: string; price: string } | null>(null);
  const [promocode, setPromocode] = useState('');

  const styles = useThemeStyles();
  const { bgClass, textPrimary, textSecondary, textAccent, cardClass } = styles;

  const handleRedeemPromocode = () => {
    if (!promocode.trim()) return;
    
    WebApp.HapticFeedback.impactOccurred('medium');
    const result = redeemPromocode(promocode);
    
    if (result.success) {
      WebApp.HapticFeedback.notificationOccurred('success');
      alert(result.message);
      setPromocode('');
    } else {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert(result.message);
    }
  };

  const handleBuyChest = (cost: number) => {
    if (spendCoins(cost)) {
      setShowChest(true);
    } else {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert(t('not_enough_coins'));
    }
  };

  const handleBuyBooster = (type: 'freezes' | 'hints' | 'shields', cost: number) => {
    if (buyBooster(type, cost)) {
      WebApp.HapticFeedback.notificationOccurred('success');
    } else {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert(t('not_enough_coins'));
    }
  };

  const handleBuyPlan = (plan: 'standard' | 'hit' | 'premium') => {
    WebApp.HapticFeedback.notificationOccurred('success');
    
    // In a real app, integrate payment here.
    // For now we simulate.
    let price = "$10";
    if (plan === 'hit') price = "$15";
    if (plan === 'premium') price = "$20";

    setPaymentModal({ title: plan.toUpperCase().replace('_', ' '), price });
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
  
  const handleBuyCoins = (amount: number) => {
    const price = amount === 500 ? "$0.99" : amount === 1200 ? "$1.99" : "$0.99";
    setPaymentModal({ title: `COINS PACK ${amount}`, price });
  };

  // Local helper for tabs
  const getTabClass = (isActive: boolean) => {
    if (isActive) {
        if (styles.isLight) return "bg-white shadow-sm text-black";
        if (styles.isBlue) return "bg-blue-500 text-white shadow-sm shadow-blue-500/30";
        if (styles.isGold) return "bg-yellow-600 text-white shadow-sm shadow-yellow-500/30";
        return "bg-gray-700 text-white shadow-sm";
    }
    return styles.isLight ? "text-gray-400 hover:text-gray-600" : "text-gray-400 hover:text-white";
  };

  return (
    <div className={clsx("p-4 min-h-screen", bgClass)}>
      <div className="flex items-center justify-between mb-6">
        <h1 className={clsx("text-3xl font-bold", textAccent)}>{t('shop')}</h1>
        <div className={clsx("flex items-center gap-2 px-4 py-2 rounded-full border", cardClass)}>
          <Coins size={20} className={textAccent} fill="currentColor" />
          <span className={clsx("font-bold text-lg", textPrimary)}>{coins}</span>
        </div>
      </div>

      <div className={clsx("flex p-1 rounded-xl mb-6 border", cardClass)}>
        <button
          onClick={() => setActiveTab('plans')}
          className={clsx(
            "flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
            getTabClass(activeTab === 'plans')
          )}
        >
          <Crown size={16} />
          {t('premium_access')}
        </button>
        <button
          onClick={() => setActiveTab('skins')}
          className={clsx(
            "flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
            getTabClass(activeTab === 'skins')
          )}
        >
          <Layout size={16} />
          {t('skins')}
        </button>
        <button
          onClick={() => setActiveTab('boosters')}
          className={clsx(
            "flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
            getTabClass(activeTab === 'boosters')
          )}
        >
          <Zap size={16} />
          {t('boosters') || 'Boosters'}
        </button>
        <button
          onClick={() => setActiveTab('chests')}
          className={clsx(
            "flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
            getTabClass(activeTab === 'chests')
          )}
        >
          <Box size={16} />
          {t('chest_tab')}
        </button>
      </div>

      {activeTab === 'plans' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Affordable Standard */}
          <div className={clsx(
            "relative p-6 rounded-2xl border mb-4 transition-all active:scale-95",
            styles.isLight ? "bg-white border-blue-200" : "bg-white/5 border-white/10"
          )}>
             <div className="flex items-center gap-4 mb-4 relative z-10">
               <div className="p-3 rounded-xl bg-blue-500/20 text-blue-500">
                 <Shield size={24} />
               </div>
               <div>
                 <h3 className={clsx("text-xl font-bold", styles.textPrimary)}>{t('plan_standard')}</h3>
                 <div className="flex items-baseline gap-2">
                    <span className="text-xs line-through opacity-50">$20</span>
                    <p className={clsx("text-lg font-black", styles.textAccent)}>$10</p>
                 </div>
               </div>
             </div>

             <div className="space-y-2 mb-6 relative z-10">
               {[
                 t('feat_standard_coins'),
                 t('feat_standard_hp'),
                 t('feat_standard_desc')
               ].map((feat, i) => (
                 <div key={i} className={clsx("flex items-start gap-2 text-sm", styles.isLight ? "text-gray-600" : "text-gray-300")}>
                   <Check size={16} className={clsx("mt-0.5 min-w-[16px]", styles.textAccent)} />
                   <span className="leading-tight">{feat}</span>
                 </div>
               ))}
             </div>

             <button 
               onClick={() => handleBuyPlan('standard')}
               className={clsx(
                 "w-full py-3 rounded-xl font-bold transition-all relative z-10",
                 styles.btnSecondary
               )}
             >
               {t('select_plan')}
             </button>
          </div>

          {/* Hit Sales */}
          <div className={clsx(
            "relative p-6 rounded-2xl border mb-4 transition-all active:scale-95 overflow-hidden",
            styles.isLight ? "bg-orange-50 border-orange-500 shadow-lg" : "bg-gradient-to-br from-orange-900/40 to-black border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]"
          )}>
             <div className="absolute top-0 right-0">
               <div className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-md">
                 {t('badge_hit')}
               </div>
             </div>

             <div className="flex items-center gap-4 mb-4 relative z-10">
               <div className="p-3 rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/40">
                 <Zap size={24} fill="currentColor" />
               </div>
               <div>
                 <h3 className={clsx("text-xl font-bold", styles.isLight ? "text-orange-900" : "text-white")}>{t('plan_hit')}</h3>
                 <div className="flex items-baseline gap-2">
                    <span className="text-xs line-through opacity-50 font-bold">$30</span>
                    <p className="text-lg font-black text-orange-500">$15</p>
                 </div>
               </div>
             </div>

             <div className="space-y-2 mb-6 relative z-10">
               {[
                 t('feat_hit_coins'),
                 t('feat_hit_hp'),
                 t('feat_hit_ads'),
                 t('feat_hit_desc')
               ].map((feat, i) => (
                 <div key={i} className={clsx("flex items-start gap-2 text-sm", styles.isLight ? "text-orange-800" : "text-gray-200")}>
                   <Check size={16} className="mt-0.5 min-w-[16px] text-orange-500" />
                   <span className="leading-tight">{feat}</span>
                 </div>
               ))}
             </div>

             <button 
               onClick={() => handleBuyPlan('hit')}
               className="w-full py-3 rounded-xl font-bold transition-all relative z-10 bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg shadow-orange-500/20"
             >
               {t('select_plan')}
             </button>
             
             {/* Decorative */}
             <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* Premium Standard */}
          <div className={clsx(
            "relative p-6 rounded-2xl border-2 mb-4 transition-all active:scale-95 overflow-hidden group",
            styles.isLight ? "bg-white border-yellow-500 shadow-xl" : "bg-gradient-to-br from-yellow-900/40 to-black border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]"
          )}>
             <div className="absolute top-0 right-0">
               <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest shadow-lg">
                 {t('badge_best')}
               </div>
             </div>

             <div className="flex items-center gap-4 mb-6 relative z-10">
               <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/30">
                 <Crown size={32} className="text-black" strokeWidth={2.5} />
               </div>
               <div>
                 <h3 className={clsx("text-2xl font-black uppercase tracking-tight", styles.isLight ? "text-black" : "text-white")}>
                   {t('plan_premium')}
                 </h3>
                 <div className="flex items-baseline gap-2">
                    <span className="text-sm line-through opacity-50 font-bold">$50</span>
                    <p className="text-2xl font-black text-yellow-500">$20</p>
                 </div>
               </div>
             </div>

             <div className="relative z-10 space-y-3 mb-6">
               {[
                 t('feat_premium_coins'),
                 t('feat_premium_ads'),
                 t('feat_premium_vip'),
                 t('feat_premium_themes'),
                 t('feat_premium_boards')
               ].map((feat, i) => (
                 <div key={i} className="flex items-center gap-3">
                   <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center">
                     <Check size={12} className="text-yellow-500" strokeWidth={3} />
                   </div>
                   <span className={clsx("font-bold text-sm", styles.isLight ? "text-gray-700" : "text-gray-200")}>{feat}</span>
                 </div>
               ))}
               
               {/* Mustang Raffle Ticket - Redesigned */}
               <div className="mt-6 h-auto min-h-[160px] rounded-xl relative overflow-hidden group border border-white/10 shadow-2xl bg-black">
                 {/* Background Image - Car */}
                 <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center opacity-70" />
                 
                 {/* Gradient Overlay for Text Readability */}
                 <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                 
                 {/* Content */}
                 <div className="relative z-10 p-5 flex flex-col justify-center h-full">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-[10px] text-red-500 font-black uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          {t('grand_prize')}
                        </div>
                        <div className="text-3xl font-black text-white italic tracking-tighter leading-none">
                          MUSTANG <span className="text-red-500">GT</span>
                        </div>
                      </div>
                      {/* Timer */}
                      <CountdownTimer />
                   </div>

                   {/* Additional Prizes */}
                   <div className="flex flex-wrap gap-2 mb-4">
                     <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/20 transition-colors">
                         <span className="text-xs">📱</span>
                         <span className="text-[10px] font-bold text-white">iPhone 17 Pro</span>
                     </div>
                     <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/20 transition-colors">
                         <span className="text-xs">🎮</span>
                         <span className="text-[10px] font-bold text-white">PS5</span>
                     </div>
                     <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/20 transition-colors">
                         <span className="text-xs">🎧</span>
                         <span className="text-[10px] font-bold text-white">AirPods</span>
                     </div>
                   </div>

                   <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 px-4 py-1.5 rounded-lg shadow-lg shadow-red-900/40 w-fit">
                     <Ticket size={14} className="text-white" />
                     <span className="text-xs font-bold text-white uppercase tracking-wide">{t('ticket_included')}</span>
                   </div>
                 </div>
               </div>

               {/* Terms and Confidentiality - Blue Button */}
               <button 
                 onClick={() => setShowTerms(true)}
                 className="mt-4 w-full py-3 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 font-bold text-xs hover:bg-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
               >
                 <FileText size={16} />
                 <span>Қатысу шарттары / Условия участия</span>
               </button>
             </div>

             <button 
               onClick={() => handleBuyPlan('premium')}
               className="w-full py-4 rounded-xl font-black text-black bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:shadow-lg hover:shadow-yellow-500/50 transition-all active:scale-95 uppercase tracking-wide relative z-10"
             >
               {t('select_plan')}
             </button>

             {/* Background Effects */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/10 rounded-full blur-[80px] pointer-events-none" />
          </div>
        </div>
      ) : activeTab === 'skins' ? (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SkinCard
            id="default"
            name={t('skin_classic')}
            cost={0}
            previewClass="bg-secondary text-white border border-gray-700"
            isOwned={true} // Default is always owned
            isEquipped={activeSkin === 'default'}
            onBuy={() => {}}
            onEquip={() => handleEquipSkin('default')}
            styles={styles}
          />
          <SkinCard
            id="neon_blue"
            name={t('skin_neon')}
            cost={100}
            previewClass="bg-blue-900/40 text-blue-100 border border-blue-500 shadow-blue-500/20"
            isOwned={inventory.includes('neon_blue')}
            isEquipped={activeSkin === 'neon_blue'}
            onBuy={() => handleBuySkin('neon_blue', 100)}
            onEquip={() => handleEquipSkin('neon_blue')}
            styles={styles}
          />
          <SkinCard
            id="royal_purple"
            name={t('skin_purple')}
            cost={250}
            previewClass="bg-purple-900/40 text-purple-100 border border-purple-500 shadow-purple-500/20"
            isOwned={inventory.includes('royal_purple')}
            isEquipped={activeSkin === 'royal_purple'}
            onBuy={() => handleBuySkin('royal_purple', 250)}
            onEquip={() => handleEquipSkin('royal_purple')}
            styles={styles}
          />
          <SkinCard
            id="matrix"
            name={t('skin_matrix')}
            cost={500}
            previewClass="bg-green-900/40 text-green-400 border border-green-500 font-mono"
            isOwned={inventory.includes('matrix')}
            isEquipped={activeSkin === 'matrix'}
            onBuy={() => handleBuySkin('matrix', 500)}
            onEquip={() => handleEquipSkin('matrix')}
            styles={styles}
          />
        </div>
      ) : activeTab === 'boosters' ? (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <BoosterCard
            type="freezes"
            count={inventory.freezes || 0}
            cost={100}
            icon={Snowflake}
            name={t('booster_freeze') || 'Time Freeze'}
            description={t('booster_freeze_desc') || 'Stop time for 5s'}
            onBuy={() => handleBuyBooster('freezes', 100)}
            styles={styles}
          />
          <BoosterCard
            type="hints"
            count={inventory.hints || 0}
            cost={150}
            icon={Brain}
            name={t('booster_hint') || 'Smart Hint'}
            description={t('booster_hint_desc') || 'Show right answer'}
            onBuy={() => handleBuyBooster('hints', 150)}
            styles={styles}
          />
          <BoosterCard
            type="shields"
            count={inventory.shields || 0}
            cost={200}
            icon={ShieldCheck}
            name={t('booster_shield') || 'Shield'}
            description={t('booster_shield_desc') || 'Protect from 1 mistake'}
            onBuy={() => handleBuyBooster('shields', 200)}
            styles={styles}
          />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
           {/* Standard Chest */}
           <div className={clsx("p-6 rounded-2xl border flex items-center justify-between", cardClass)}>
             <div className="flex items-center gap-4">
                <div className="text-4xl">🎁</div>
                <div>
                  <h3 className={clsx("text-xl font-bold", textPrimary)}>{t('standard_chest')}</h3>
                  <p className={clsx("text-sm", textSecondary)}>{t('standard_chest_desc')}</p>
                </div>
             </div>
             <button 
               onClick={() => handleBuyChest(100)}
               className={clsx("px-6 py-2 font-bold rounded-xl flex items-center gap-2 hover:scale-105 transition-transform", styles.btnPrimary)}
             >
               <Coins size={16} /> 100
             </button>
          </div>

          {/* Rare Chest */}
          <div className={clsx("p-6 rounded-2xl border flex items-center justify-between shadow-[0_0_20px_rgba(59,130,246,0.1)]", cardClass)}>
             <div className="flex items-center gap-4">
                <div className="text-4xl">💎</div>
                <div>
                  <h3 className={clsx("text-xl font-bold", textPrimary)}>{t('rare_chest')}</h3>
                  <p className={clsx("text-sm", textSecondary)}>{t('rare_chest_desc')}</p>
                </div>
             </div>
             <button 
               onClick={() => handleBuyChest(300)}
               className={clsx("px-6 py-2 font-bold rounded-xl flex items-center gap-2 hover:scale-105 transition-transform", styles.btnPrimary)}
             >
               <Coins size={16} /> 300
             </button>
          </div>
          
          <div className={clsx("p-6 rounded-2xl border flex items-center justify-between", cardClass)}>
            <div className="flex items-center gap-4">
              <div className="text-4xl">🪙</div>
              <div>
                <h3 className={clsx("text-xl font-bold", textPrimary)}>{t('coin_packs')}</h3>
                <p className={clsx("text-sm", textSecondary)}>{t('coin_packs_desc')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleBuyCoins(500)}
                className={clsx("px-4 py-2 rounded-xl font-bold hover:scale-105 transition-transform", styles.btnPrimary)}
              >
                +500
              </button>
              <button 
                onClick={() => handleBuyCoins(1200)}
                className={clsx("px-4 py-2 rounded-xl font-bold hover:scale-105 transition-transform", styles.btnPrimary)}
              >
                +1200
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ChestModal 
        isOpen={showChest} 
        onClose={() => setShowChest(false)} 
        gameTitle="Shop Purchase" 
      />

      <TermsModal 
        isOpen={showTerms} 
        onClose={() => setShowTerms(false)} 
      />
      
      <PaymentModal
        isOpen={!!paymentModal}
        onClose={() => {
          if (paymentModal) {
            if (paymentModal.title === 'STANDARD' || paymentModal.title === 'ACCESSIBLE') {
              upgradePlan('standard', 30);
            } else if (paymentModal.title === 'HIT SALES') {
              upgradePlan('hit', 30);
            } else if (paymentModal.title === 'PREMIUM') {
              upgradePlan('premium', 50);
            } else if (paymentModal.title.startsWith('COINS PACK')) {
              const amount = Number(paymentModal.title.replace('COINS PACK ', ''));
              if (!Number.isNaN(amount)) addCoins(amount);
            }
          }
          setPaymentModal(null);
        }}
        planTitle={paymentModal?.title || ''}
        price={paymentModal?.price || ''}
      />
    </div>
  );
};

export default ShopPage;
