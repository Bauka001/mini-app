import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Star, Crown, Zap, Coins, Layout, Copy, X, ExternalLink, Box } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore';
import WebApp from '@twa-dev/sdk';
import { ChestModal } from '../components/ChestModal';

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
  if (!isOpen) return null; // Add simple render check or remove component if not used

  // Since we removed PaymentModal usage from ShopPage (for now, as we focused on Skins/Chests with Coins), 
  // we can keep this component for future or remove it. 
  // Given the warnings, let's just make it use the props or remove it.
  // I will keep it but suppress warnings by using the props.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-lg text-black">Kaspi.kz Payment</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
           <div className="text-center">
             <div className="text-sm text-gray-500 mb-1">Paying for:</div>
             <div className="font-bold text-xl text-black">{planTitle}</div>
             <div className="text-2xl font-black text-red-500 mt-2">{price}</div>
           </div>
           
           <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
             <div className="text-xs text-gray-400 mb-2">Kaspi QR (Mock)</div>
             <div className="w-32 h-32 bg-black mx-auto mb-2 flex items-center justify-center text-white text-xs">
               [QR CODE]
             </div>
             <div className="text-xs text-gray-500">Scan to pay</div>
           </div>

           <button 
             onClick={onClose}
             className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
           >
             Simulate Payment
           </button>
        </div>
      </div>
    </div>
  );
};

const PlanCard = ({ 
  title, 
  price, 
  features, 
  recommended, 
  icon: Icon, 
  color,
  onBuy 
}: { 
  title: string, 
  price: string, 
  features: string[], 
  recommended?: boolean, 
  icon: any, 
  color: string,
  onBuy: () => void 
}) => {
  const { t } = useTranslation();
  return (
  <div className={clsx(
    "relative p-6 rounded-2xl border mb-4 transition-all active:scale-95 bg-secondary overflow-hidden",
    recommended ? "border-primary shadow-[0_0_20px_rgba(255,215,0,0.15)]" : "border-gray-800"
  )}>
    {recommended && (
      <div className="absolute top-0 right-0">
        <div className="bg-primary text-black text-xs font-bold px-3 py-1 rounded-bl-xl">
          {title === 'Premium' ? 'BEST VALUE' : 'POPULAR'}
        </div>
      </div>
    )}
    
    <div className="flex items-center gap-4 mb-4 relative z-10">
      <div className={clsx("p-3 rounded-xl bg-opacity-20", color)}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
      <div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-gray-400 text-sm">{price}</p>
      </div>
    </div>

    <ul className="space-y-2 mb-6 relative z-10">
      {features.map((feat, i) => (
        <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
          <Check size={16} className="text-primary" />
          {feat}
        </li>
      ))}
    </ul>

    <button 
      onClick={onBuy}
      className={clsx(
        "w-full py-3 rounded-xl font-bold transition-all relative z-10",
        recommended 
          ? "bg-gradient-to-r from-yellow-400 to-primary text-black hover:shadow-lg hover:shadow-primary/50" 
          : "bg-gray-800 text-white hover:bg-gray-700"
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
  id,
  name, 
  cost, 
  previewClass,
  isOwned, 
  isEquipped,
  onBuy,
  onEquip
}: { 
  id: string,
  name: string, 
  cost: number, 
  previewClass: string,
  isOwned: boolean, 
  isEquipped: boolean,
  onBuy: () => void,
  onEquip: () => void
}) => {
  const { t } = useTranslation();
  
  return (
    <div className={clsx(
      "p-4 rounded-xl border flex flex-col items-center gap-3 transition-all",
      isEquipped ? "border-primary bg-primary/10" : "border-gray-800 bg-secondary"
    )}>
      <div className={clsx("w-full h-20 rounded-lg flex items-center justify-center font-bold text-lg shadow-inner", previewClass)}>
        123
      </div>
      <div className="text-center w-full">
        <div className="font-bold text-sm mb-1">{name}</div>
        {!isOwned && (
          <div className="flex items-center justify-center gap-1 text-primary text-sm font-bold">
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
            isEquipped ? "bg-primary text-black cursor-default" : "bg-gray-700 text-white hover:bg-gray-600"
          )}
        >
          {isEquipped ? t('equipped') : t('equip')}
        </button>
      ) : (
        <button
          onClick={onBuy}
          className="w-full py-2 rounded-lg text-sm font-bold bg-primary text-black hover:bg-yellow-400 transition-colors flex items-center justify-center gap-1"
        >
          {t('buy')}
        </button>
      )}
    </div>
  );
};

const ShopPage = () => {
  const { t } = useTranslation();
  const { coins, inventory, activeSkin, buySkin, equipSkin, upgradePlan, spendCoins, addCoins, theme } = useStore();
  const [activeTab, setActiveTab] = useState<'plans' | 'skins' | 'chests'>('plans');
  const [showChest, setShowChest] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ title: string; price: string } | null>(null);
  
  const isLight = theme === 'light';
  const isBlue = theme === 'blue';

  // Helper styles based on theme
  const containerClass = isLight ? "bg-white" : isBlue ? "bg-blue-900/20" : "bg-secondary";
  const textClass = isLight ? "text-gray-900" : "text-white";
  const subTextClass = isLight ? "text-gray-500" : "text-gray-400";
  const borderClass = isLight ? "border-gray-200" : isBlue ? "border-blue-400/30" : "border-gray-800";
  const activeTabClass = isLight ? "bg-white shadow-sm text-black" : isBlue ? "bg-blue-500 text-white shadow-sm shadow-blue-500/30" : "bg-gray-700 text-white shadow-sm";
  const inactiveTabClass = isLight ? "text-gray-400 hover:text-gray-600" : isBlue ? "text-blue-200/70 hover:text-white" : "text-gray-400 hover:text-white";

  const handleBuyChest = (cost: number) => {
    if (spendCoins(cost)) {
      setShowChest(true);
    } else {
      WebApp.HapticFeedback.notificationOccurred('error');
      alert(t('not_enough_coins'));
    }
  };

  const handleBuyPlan = (plan: 'silver' | 'gold' | 'premium') => {
    WebApp.HapticFeedback.notificationOccurred('success');
    
    if (plan === 'silver') {
      upgradePlan(plan, 9999);
      alert(t('plan_activated') || `Successfully upgraded to ${plan.toUpperCase()}!`);
    } else {
      const price = plan === 'gold' ? "$4.99" : "$9.99";
      setPaymentModal({ title: plan.toUpperCase(), price });
    }
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

  return (
    <div className={clsx("p-4", containerClass)}>
      <div className="flex items-center justify-between mb-6">
        <h1 className={clsx("text-3xl font-bold", isLight ? "text-[#f14635]" : isBlue ? "text-blue-400" : "text-primary")}>{t('shop')}</h1>
        <div className={clsx("flex items-center gap-2 px-4 py-2 rounded-full border", isLight ? "bg-white border-gray-200 shadow-sm" : isBlue ? "bg-blue-900/30 border-blue-400/30" : "bg-gray-800 border-primary/30")}>
          <Coins size={20} className={clsx(isLight ? "text-[#f14635]" : isBlue ? "text-blue-400" : "text-primary")} fill="currentColor" />
          <span className={clsx("font-bold text-lg", textClass)}>{coins}</span>
        </div>
      </div>

      <div className={clsx("flex p-1 rounded-xl mb-6 border", isLight ? "bg-gray-100 border-gray-200" : isBlue ? "bg-blue-900/20 border-blue-400/30" : "bg-secondary border-gray-800")}>
        <button
          onClick={() => setActiveTab('plans')}
          className={clsx(
            "flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === 'plans' ? activeTabClass : inactiveTabClass
          )}
        >
          <Crown size={16} />
          {t('premium_access')}
        </button>
        <button
          onClick={() => setActiveTab('skins')}
          className={clsx(
            "flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === 'skins' ? activeTabClass : inactiveTabClass
          )}
        >
          <Layout size={16} />
          {t('skins')}
        </button>
        <button
          onClick={() => setActiveTab('chests')}
          className={clsx(
            "flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === 'chests' ? activeTabClass : inactiveTabClass
          )}
        >
          <Box size={16} />
          Chests
        </button>
      </div>

      {activeTab === 'plans' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <PlanCard
            title={t('plan_silver')}
            price={t('plan_free')}
            icon={Zap}
            color="bg-gray-500"
            features={[
              "Stroop Test Only",
              "Ads Enabled",
              "Unlimited Access"
            ]}
            onBuy={() => handleBuyPlan('silver')}
          />

          <PlanCard
            title={t('plan_gold')}
            price="$4.99 / 40 days"
            icon={Star}
            color="bg-yellow-500"
            features={[
              "Arithmetic Game",
              "Ads Enabled",
              "10% Discount included"
            ]}
            onBuy={() => handleBuyPlan('gold')}
          />

          <PlanCard
            title={t('plan_premium')}
            price="$9.99 / 50 days"
            icon={Crown}
            color="bg-purple-500"
            recommended
            features={[
              "All Games Unlocked",
              "No Ads",
              "Priority Support",
              "30% Discount included"
            ]}
            onBuy={() => handleBuyPlan('premium')}
          />
        </div>
      ) : activeTab === 'skins' ? (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SkinCard
            id="default"
            name="Classic Black"
            cost={0}
            previewClass="bg-secondary text-white border border-gray-700"
            isOwned={true} // Default is always owned
            isEquipped={activeSkin === 'default'}
            onBuy={() => {}}
            onEquip={() => handleEquipSkin('default')}
          />
          <SkinCard
            id="neon_blue"
            name="Neon Blue"
            cost={100}
            previewClass="bg-blue-900/40 text-blue-100 border border-blue-500 shadow-blue-500/20"
            isOwned={inventory.includes('neon_blue')}
            isEquipped={activeSkin === 'neon_blue'}
            onBuy={() => handleBuySkin('neon_blue', 100)}
            onEquip={() => handleEquipSkin('neon_blue')}
          />
          <SkinCard
            id="royal_purple"
            name="Royal Purple"
            cost={250}
            previewClass="bg-purple-900/40 text-purple-100 border border-purple-500 shadow-purple-500/20"
            isOwned={inventory.includes('royal_purple')}
            isEquipped={activeSkin === 'royal_purple'}
            onBuy={() => handleBuySkin('royal_purple', 250)}
            onEquip={() => handleEquipSkin('royal_purple')}
          />
          <SkinCard
            id="matrix"
            name="Matrix"
            cost={500}
            previewClass="bg-green-900/40 text-green-400 border border-green-500 font-mono"
            isOwned={inventory.includes('matrix')}
            isEquipped={activeSkin === 'matrix'}
            onBuy={() => handleBuySkin('matrix', 500)}
            onEquip={() => handleEquipSkin('matrix')}
          />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
           {/* Standard Chest */}
           <div className={clsx("p-6 rounded-2xl border flex items-center justify-between",
             isLight ? "border-gray-200 bg-white" : isBlue ? "border-blue-400/30 bg-blue-900/20" : "border-gray-700 bg-secondary"
           )}>
              <div className="flex items-center gap-4">
                 <div className="text-4xl">🎁</div>
                 <div>
                   <h3 className={clsx("text-xl font-bold", isLight ? "text-gray-900" : "text-white")}>Standard Chest</h3>
                   <p className={clsx("text-sm", subTextClass)}>Contains 50-150 Coins</p>
                 </div>
              </div>
              <button 
                onClick={() => handleBuyChest(100)}
                className={clsx("px-6 py-2 font-bold rounded-xl flex items-center gap-2 hover:scale-105 transition-transform",
                  isBlue ? "bg-blue-500 text-white" : "bg-primary text-black"
                )}
              >
                <Coins size={16} /> 100
              </button>
           </div>

           {/* Rare Chest */}
           <div className={clsx("p-6 rounded-2xl border flex items-center justify-between shadow-[0_0_20px_rgba(59,130,246,0.1)]",
             isLight ? "border-blue-500/30 bg-blue-50" : "border-blue-500/30 bg-blue-900/10"
           )}>
              <div className="flex items-center gap-4">
                 <div className="text-4xl">💎</div>
                 <div>
                   <h3 className={clsx("text-xl font-bold", isLight ? "text-gray-900" : "text-white")}>Rare Chest</h3>
                   <p className={clsx("text-sm", subTextClass)}>Chance for $FEC & Gems</p>
                 </div>
              </div>
              <button 
                onClick={() => handleBuyChest(300)}
                className="px-6 py-2 bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <Coins size={16} /> 300
              </button>
           </div>
           
           <div className={clsx("p-6 rounded-2xl border flex items-center justify-between",
             isLight ? "border-gray-200 bg-white" : isBlue ? "border-blue-400/30 bg-blue-900/20" : "border-gray-700 bg-secondary"
           )}>
             <div className="flex items-center gap-4">
               <div className="text-4xl">🪙</div>
               <div>
                 <h3 className={clsx("text-xl font-bold", isLight ? "text-gray-900" : "text-white")}>Coin Packs</h3>
                 <p className={clsx("text-sm", subTextClass)}>Buy coins instantly</p>
               </div>
             </div>
             <div className="flex gap-2">
               <button 
                 onClick={() => handleBuyCoins(500)}
                 className={clsx("px-4 py-2 rounded-xl font-bold hover:scale-105 transition-transform",
                   isBlue ? "bg-blue-500 text-white" : "bg-primary text-black"
                 )}
               >
                 +500
               </button>
               <button 
                 onClick={() => handleBuyCoins(1200)}
                 className={clsx("px-4 py-2 rounded-xl font-bold hover:scale-105 transition-transform",
                   isBlue ? "bg-blue-500 text-white" : "bg-primary text-black"
                 )}
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
      
      <PaymentModal
        isOpen={!!paymentModal}
        onClose={() => {
          if (paymentModal) {
            if (paymentModal.title === 'GOLD') {
              upgradePlan('gold', 40);
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
