import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Star, Crown, Zap, Coins, Layout, Copy, X, ExternalLink, Gift, Box } from 'lucide-react';
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
  isOpen: boolean; 
  onClose: () => void; 
  planTitle: string; 
  price: string; 
}) => {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText("87071781436");
    WebApp.HapticFeedback.notificationOccurred('success');
    alert(t('copied') || "Copied!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <h3 className="text-xl font-bold mb-2 text-center">{t('payment_method') || "Payment Method"}</h3>
        <p className="text-center text-gray-400 mb-6">Kaspi Gold</p>

        <div className="bg-gray-800 rounded-xl p-4 mb-6 text-center">
          <p className="text-sm text-gray-400 mb-1">{t('amount_to_pay') || "Amount to pay"}</p>
          <div className="text-2xl font-bold text-primary mb-4">{price}</div>
          
          <div className="flex items-center justify-between bg-gray-900 rounded-lg p-3 border border-gray-700">
            <span className="font-mono text-lg font-bold">8 707 178 14 36</span>
            <button 
              onClick={handleCopy}
              className="p-2 hover:bg-gray-800 rounded-lg text-primary transition-colors"
            >
              <Copy size={20} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">Yerassyl U.</p>
        </div>

        <div className="space-y-3">
          <a 
            href="https://kaspi.kz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl font-bold bg-[#f14635] text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            {t('open_kaspi') || "Open Kaspi"} <ExternalLink size={18} />
          </a>
          
          <button
            onClick={() => {
              WebApp.openTelegramLink('https://t.me/yerassyl_u'); // Replace with actual admin username if different
              onClose();
            }}
            className="w-full py-3 rounded-xl font-bold bg-blue-500 text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            {t('send_receipt') || "Send Receipt"} <ExternalLink size={18} />
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
      
      <PaymentModal
        isOpen={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        planTitle={paymentModal?.title || ''}
        price={paymentModal?.price || ''}
      />
    </div>
  );
};

const ShopPage = () => {
  const { t } = useTranslation();
  const { coins, inventory, activeSkin, buySkin, equipSkin, upgradePlan, spendCoins } = useStore();
  const [activeTab, setActiveTab] = useState<'plans' | 'skins' | 'chests'>('plans');
  const [paymentModal, setPaymentModal] = useState<{title: string, price: string} | null>(null);
  const [showChest, setShowChest] = useState(false);

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
      // For paid plans, open the payment modal
      const price = plan === 'gold' ? "$4.99" : "$9.99";
      setPaymentModal({
        title: plan.toUpperCase(),
        price: price
      });
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

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-primary">{t('shop')}</h1>
        <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full border border-primary/30">
          <Coins size={20} className="text-primary" fill="currentColor" />
          <span className="font-bold text-lg text-white">{coins}</span>
        </div>
      </div>

      <div className="flex p-1 bg-secondary rounded-xl mb-6 border border-gray-800">
        <button
          onClick={() => setActiveTab('plans')}
          className={clsx(
            "flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === 'plans' ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-white"
          )}
        >
          <Crown size={16} />
          {t('premium_access')}
        </button>
        <button
          onClick={() => setActiveTab('skins')}
          className={clsx(
            "flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === 'skins' ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-white"
          )}
        >
          <Layout size={16} />
          {t('skins')}
        </button>
        <button
          onClick={() => setActiveTab('chests')}
          className={clsx(
            "flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === 'chests' ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-white"
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
           <div className="p-6 rounded-2xl border border-gray-700 bg-secondary flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="text-4xl">🎁</div>
                 <div>
                   <h3 className="text-xl font-bold text-white">Standard Chest</h3>
                   <p className="text-sm text-gray-400">Contains 50-150 Coins</p>
                 </div>
              </div>
              <button 
                onClick={() => handleBuyChest(100)}
                className="px-6 py-2 bg-primary text-black font-bold rounded-xl flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <Coins size={16} /> 100
              </button>
           </div>

           {/* Rare Chest */}
           <div className="p-6 rounded-2xl border border-blue-500/30 bg-blue-900/10 flex items-center justify-between shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <div className="flex items-center gap-4">
                 <div className="text-4xl">💎</div>
                 <div>
                   <h3 className="text-xl font-bold text-white">Rare Chest</h3>
                   <p className="text-sm text-gray-400">Chance for $FEC & Gems</p>
                 </div>
              </div>
              <button 
                onClick={() => handleBuyChest(300)}
                className="px-6 py-2 bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <Coins size={16} /> 300
              </button>
           </div>
        </div>
      )}
      
      <PaymentModal
        isOpen={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        planTitle={paymentModal?.title || ''}
        price={paymentModal?.price || ''}
      />

      <ChestModal 
        isOpen={showChest} 
        onClose={() => setShowChest(false)} 
        gameTitle="Shop Purchase" 
      />
    </div>
  );
};

export default ShopPage;
