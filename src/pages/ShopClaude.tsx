// Editorial Claude variant of Shop. Mounted only when the active theme is
// 'claude'. Owns its own PaymentModal so the warm aesthetic carries through
// the checkout sheet too — that's the surface where trust matters most.
//
// Functional contract is identical to ShopPage in Shop.tsx:
// - VIP plan purchase via Telegram Stars (deep-links to bot) or TON
// - Skin purchase + equip
// - Terms modal
// - Premium gate for analytics
// The actual ticket/upgrade write happens server-side in the bot
// payment-webhook after Stars/TON verification — neither this client nor
// the modal grants entitlements directly.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Coins,
  Crown,
  FileText,
  Layout as LayoutIcon,
  Medal,
  Sparkles,
  X,
} from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react';
import { useStore } from '../store/useStoreImpl';
import { TermsModal } from '../components/TermsModal';
import { claudeTokens } from '../components/ui/claudeTokens';

const MONTHLY_VIP_PRICE = '$4.99';
const MONTHLY_VIP_STARS = '150 Stars';
const YEARLY_PASS_PRICE = '$39.99';
const YEARLY_PASS_STARS = '1200 Stars';

type VipPurchaseOption = 'monthly' | 'yearly';

// ---------- Editorial PaymentModal (cream + terracotta) ----------
const PaymentModalClaude = ({
  isOpen,
  onClose,
  planTitle,
  price,
}: {
  isOpen: boolean;
  onClose: () => void;
  planTitle: string;
  price: string;
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'stars' | 'ton'>('stars');
  const [tonUi] = useTonConnectUI();

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
          { address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', amount: nano },
        ],
      });
      onClose();
    } catch {
      WebApp.HapticFeedback.notificationOccurred('error');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: 'rgba(31,30,29,0.55)', backdropFilter: 'blur(6px)' }}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{
              backgroundColor: claudeTokens.surface,
              border: `1px solid ${claudeTokens.border}`,
              maxHeight: '85vh',
            }}
          >
            <header
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: `1px solid ${claudeTokens.border}` }}
            >
              <h3
                className="leading-tight"
                style={{
                  color: claudeTokens.textPrimary,
                  fontFamily: claudeTokens.serifStack,
                  fontSize: '20px',
                  fontWeight: 500,
                }}
              >
                Payment method
              </h3>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[#F0EEE6]"
                style={{ color: claudeTokens.textMuted }}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </header>

            <div className="p-6 space-y-4">
              {/* Item summary */}
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: claudeTokens.surfaceMuted,
                  border: `1px solid ${claudeTokens.border}`,
                }}
              >
                <div
                  className="text-[10px] font-medium uppercase tracking-[0.22em]"
                  style={{ color: claudeTokens.textMuted }}
                >
                  Item summary
                </div>
                <div
                  className="mt-1.5 italic"
                  style={{
                    color: claudeTokens.textPrimary,
                    fontFamily: claudeTokens.serifStack,
                    fontSize: '20px',
                    fontWeight: 500,
                  }}
                >
                  {planTitle}
                </div>
                <div
                  className="mt-1 tabular-nums"
                  style={{
                    color: claudeTokens.accent,
                    fontFamily: claudeTokens.serifStack,
                    fontSize: '24px',
                    fontWeight: 500,
                    fontFeatureSettings: '"lnum","tnum"',
                  }}
                >
                  {price}
                </div>
              </div>

              {/* Method radio cards */}
              <div className="space-y-2.5">
                {[
                  {
                    id: 'stars' as const,
                    title: 'Telegram Stars',
                    body: 'Telegram mini app ішінде жылдам төлем',
                    badge: 'Recommended',
                  },
                  {
                    id: 'ton' as const,
                    title: 'TON · TonConnect',
                    body: 'TonConnect арқылы әмиянмен төлеу',
                  },
                ].map((opt) => {
                  const isActive = selectedMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedMethod(opt.id)}
                      className="w-full text-left rounded-xl p-4 transition-colors"
                      style={{
                        backgroundColor: claudeTokens.surface,
                        border: `1px solid ${isActive ? claudeTokens.accent : claudeTokens.border}`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-[15px]"
                              style={{
                                color: claudeTokens.textPrimary,
                                fontFamily: claudeTokens.serifStack,
                                fontWeight: 500,
                              }}
                            >
                              {opt.title}
                            </span>
                            {opt.badge && (
                              <span
                                className="text-[9px] uppercase tracking-[0.18em] italic"
                                style={{ color: claudeTokens.accent, fontFamily: claudeTokens.serifStack }}
                              >
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-[13px]" style={{ color: claudeTokens.textBody }}>
                            {opt.body}
                          </div>
                        </div>
                        <span
                          className="mt-1 w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                          style={{
                            border: `1.5px solid ${isActive ? claudeTokens.accent : claudeTokens.borderStrong}`,
                          }}
                        >
                          {isActive && (
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: claudeTokens.accent }}
                            />
                          )}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedMethod === 'ton' && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: claudeTokens.surfaceMuted,
                    border: `1px solid ${claudeTokens.border}`,
                  }}
                >
                  <div
                    className="text-[10px] font-medium uppercase tracking-[0.22em] mb-3"
                    style={{ color: claudeTokens.textMuted }}
                  >
                    TonConnect
                  </div>
                  <TonConnectButton />
                </div>
              )}

              <button
                onClick={handlePayNow}
                className="w-full rounded-lg py-3.5 text-[14px] font-medium transition-colors"
                style={{ backgroundColor: claudeTokens.accent, color: '#FFFFFF' }}
              >
                Pay now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ---------- Skins tab ----------
const SKIN_DEFS: Array<{
  id: string;
  nameKey: string;
  fallbackName: string;
  cost: number;
  preview: string;
}> = [
  { id: 'default', nameKey: 'skin_classic', fallbackName: 'Classic', cost: 0, preview: 'Aa' },
  { id: 'neon_blue', nameKey: 'skin_neon', fallbackName: 'Neon', cost: 100, preview: '01' },
  { id: 'royal_purple', nameKey: 'skin_purple', fallbackName: 'Royal', cost: 250, preview: '★' },
  { id: 'matrix', nameKey: 'skin_matrix', fallbackName: 'Matrix', cost: 500, preview: '{}' },
];

const SkinsTabClaude = ({
  handleBuySkin,
  handleEquipSkin,
  skinInventory,
  activeSkin,
}: {
  handleBuySkin: (id: string, cost: number) => void;
  handleEquipSkin: (id: string) => void;
  skinInventory: string[];
  activeSkin: string;
}) => {
  const { t } = useTranslation();

  return (
    <section
      className="rounded-2xl p-5"
      style={{ backgroundColor: claudeTokens.surface, border: `1px solid ${claudeTokens.border}` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <span
            className="text-[10px] font-medium uppercase tracking-[0.22em]"
            style={{ color: claudeTokens.textMuted }}
          >
            Cosmetics
          </span>
          <h3
            className="mt-1 italic"
            style={{
              color: claudeTokens.textPrimary,
              fontFamily: claudeTokens.serifStack,
              fontSize: '22px',
              fontWeight: 500,
            }}
          >
            {t('skins') || 'Skins'}
          </h3>
        </div>
        <LayoutIcon size={18} strokeWidth={1.75} style={{ color: claudeTokens.textMuted }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SKIN_DEFS.map((skin, idx) => {
          const isOwned = skin.id === 'default' || skinInventory.includes(skin.id);
          const isEquipped = activeSkin === skin.id;
          return (
            <div
              key={skin.id}
              className="rounded-xl p-3 flex flex-col gap-3"
              style={{
                backgroundColor: claudeTokens.surface,
                border: `1px solid ${isEquipped ? claudeTokens.accent : claudeTokens.border}`,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] tracking-[0.18em] uppercase"
                  style={{
                    color: isEquipped ? claudeTokens.accent : claudeTokens.textMuted,
                    fontFamily: claudeTokens.serifStack,
                  }}
                >
                  № {String(idx + 1).padStart(2, '0')}
                </span>
                {isEquipped && (
                  <span
                    className="text-[9px] tracking-[0.18em] uppercase italic"
                    style={{ color: claudeTokens.accent, fontFamily: claudeTokens.serifStack }}
                  >
                    Equipped
                  </span>
                )}
              </div>

              {/* Preview swatch — neutral cream square with serif glyph */}
              <div
                className="w-full h-16 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: claudeTokens.surfaceMuted,
                  border: `1px solid ${claudeTokens.border}`,
                  color: claudeTokens.textPrimary,
                  fontFamily: claudeTokens.serifStack,
                  fontSize: '24px',
                  fontWeight: 500,
                }}
              >
                {skin.preview}
              </div>

              <div>
                <div
                  className="text-[14px] truncate"
                  style={{
                    color: claudeTokens.textPrimary,
                    fontFamily: claudeTokens.serifStack,
                    fontWeight: 500,
                  }}
                >
                  {t(skin.nameKey) || skin.fallbackName}
                </div>
                {!isOwned && (
                  <div className="flex items-center gap-1 mt-1">
                    <Coins size={12} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
                    <span
                      className="text-[12px] tabular-nums"
                      style={{
                        color: claudeTokens.textBody,
                        fontFamily: claudeTokens.serifStack,
                        fontWeight: 500,
                      }}
                    >
                      {skin.cost}
                    </span>
                  </div>
                )}
              </div>

              {isOwned ? (
                <button
                  onClick={() => handleEquipSkin(skin.id)}
                  disabled={isEquipped}
                  className="w-full rounded-lg py-2 text-[12px] font-medium transition-colors"
                  style={
                    isEquipped
                      ? {
                          backgroundColor: claudeTokens.surfaceMuted,
                          color: claudeTokens.textMuted,
                          border: `1px solid ${claudeTokens.border}`,
                          cursor: 'default',
                        }
                      : {
                          backgroundColor: claudeTokens.surfaceMuted,
                          color: claudeTokens.textPrimary,
                          border: `1px solid ${claudeTokens.borderStrong}`,
                        }
                  }
                >
                  {isEquipped ? t('equipped') || 'Equipped' : t('equip') || 'Equip'}
                </button>
              ) : (
                <button
                  onClick={() => handleBuySkin(skin.id, skin.cost)}
                  className="w-full rounded-lg py-2 text-[12px] font-medium transition-colors"
                  style={{ backgroundColor: claudeTokens.accent, color: '#FFFFFF' }}
                >
                  {t('buy') || 'Buy'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ---------- VIP tab ----------
const VIPTabClaude = ({
  currentPlan,
  onBuyPlan,
  onShowTerms,
}: {
  currentPlan: string;
  onBuyPlan: (plan: VipPurchaseOption) => void;
  onShowTerms: () => void;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const features = [
    {
      icon: <BarChart3 size={16} strokeWidth={1.75} />,
      eyebrow: 'Analytics',
      body: '30-day brain-score history & trend charts',
    },
    {
      icon: <Medal size={16} strokeWidth={1.75} />,
      eyebrow: 'Gold border',
      body: 'Visible VIP status across leaderboards & profile',
    },
    {
      icon: <Sparkles size={16} strokeWidth={1.75} />,
      eyebrow: 'Tournament',
      body: 'One free entry to weekend tournament every week',
    },
  ];

  const plans = [
    {
      id: 'monthly' as const,
      name: 'Monthly',
      duration: '30 days',
      priceLabel: MONTHLY_VIP_PRICE,
      starsLabel: MONTHLY_VIP_STARS,
      tag: 'Quick start',
      popular: false,
    },
    {
      id: 'yearly' as const,
      name: 'Yearly',
      duration: '365 days',
      priceLabel: YEARLY_PASS_PRICE,
      starsLabel: YEARLY_PASS_STARS,
      tag: 'Best value',
      popular: true,
    },
  ];

  const planLabel = String(currentPlan || 'free').toUpperCase();

  return (
    <div className="space-y-5">
      {/* VIP hero */}
      <section
        className="rounded-2xl p-6 relative"
        style={{
          backgroundColor: claudeTokens.surface,
          border: `1px solid ${claudeTokens.border}`,
        }}
      >
        <span
          className="absolute top-5 right-6 text-[12px] tracking-[0.2em] uppercase font-medium"
          style={{ color: claudeTokens.accent, fontFamily: claudeTokens.serifStack }}
        >
          Membership
        </span>

        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: claudeTokens.surfaceMuted, border: `1px solid ${claudeTokens.border}` }}
          >
            <Crown size={20} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
          </div>
          <div className="min-w-0">
            <span
              className="text-[10px] font-medium uppercase tracking-[0.22em]"
              style={{ color: claudeTokens.textMuted }}
            >
              Current plan · {planLabel}
            </span>
            <h2
              className="mt-1 leading-tight tracking-tight"
              style={{
                color: claudeTokens.textPrimary,
                fontFamily: claudeTokens.serifStack,
                fontSize: '26px',
                fontWeight: 500,
              }}
            >
              VIP membership
            </h2>
          </div>
        </div>

        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: claudeTokens.textBody }}>
          {t('vip_status') || 'VIP status'} unlocks deeper analytics, a gold-bordered profile, and
          weekend tournament entry — without ads.
        </p>

        {/* Three feature columns separated by hairlines */}
        <div
          className="grid grid-cols-3 mt-5 rounded-xl overflow-hidden"
          style={{ border: `1px solid ${claudeTokens.border}` }}
        >
          {features.map((f, i) => (
            <div
              key={f.eyebrow}
              className="p-3.5"
              style={{
                borderRight: i < features.length - 1 ? `1px solid ${claudeTokens.border}` : 'none',
                backgroundColor: claudeTokens.surface,
              }}
            >
              <div className="flex items-center gap-1.5" style={{ color: claudeTokens.accent }}>
                {f.icon}
                <span
                  className="text-[10px] font-medium uppercase tracking-[0.2em]"
                  style={{ color: claudeTokens.textMuted }}
                >
                  {f.eyebrow}
                </span>
              </div>
              <div
                className="mt-2 text-[12px] leading-snug"
                style={{ color: claudeTokens.textBody }}
              >
                {f.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {plans.map((plan) => (
          <section
            key={plan.id}
            className="relative rounded-2xl p-6"
            style={{
              backgroundColor: plan.popular ? claudeTokens.surfaceMuted : claudeTokens.surface,
              border: `1px solid ${plan.popular ? claudeTokens.accent : claudeTokens.border}`,
            }}
          >
            {plan.popular && (
              <span
                className="absolute left-0 top-6 bottom-6 w-[3px] rounded-full"
                style={{ backgroundColor: claudeTokens.accent }}
              />
            )}
            <div className="pl-3">
              <span
                className="text-[10px] font-medium uppercase tracking-[0.22em]"
                style={{ color: claudeTokens.textMuted }}
              >
                VIP · {plan.duration}
              </span>
              <h3
                className="mt-1 leading-tight italic"
                style={{
                  color: claudeTokens.textPrimary,
                  fontFamily: claudeTokens.serifStack,
                  fontSize: '24px',
                  fontWeight: 500,
                }}
              >
                {plan.name}
              </h3>

              <div
                className="mt-3 tabular-nums"
                style={{
                  color: claudeTokens.textPrimary,
                  fontFamily: claudeTokens.serifStack,
                  fontSize: '32px',
                  fontWeight: 500,
                  fontFeatureSettings: '"lnum","tnum"',
                  lineHeight: 1,
                }}
              >
                {plan.priceLabel}
              </div>
              <div
                className="mt-1 text-[12px] tabular-nums"
                style={{ color: claudeTokens.textMuted }}
              >
                or {plan.starsLabel}
              </div>
              <div
                className="mt-1 text-[11px] uppercase tracking-[0.18em] italic"
                style={{ color: claudeTokens.accent, fontFamily: claudeTokens.serifStack }}
              >
                {plan.tag}
              </div>

              <ul className="mt-4 space-y-1.5">
                {[
                  'Premium analytics',
                  'Gold leaderboard border',
                  'Weekly free tournament entry',
                  'Ad-free experience',
                ].map((feat) => (
                  <li
                    key={feat}
                    className="flex items-start gap-2 text-[12px]"
                    style={{ color: claudeTokens.textBody }}
                  >
                    <span style={{ color: claudeTokens.accent }}>·</span>
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onBuyPlan(plan.id)}
                className="mt-5 w-full rounded-lg py-3 text-[14px] font-medium transition-colors flex items-center justify-center gap-2"
                style={
                  plan.popular
                    ? { backgroundColor: claudeTokens.accent, color: '#FFFFFF' }
                    : {
                        backgroundColor: claudeTokens.surfaceMuted,
                        color: claudeTokens.textPrimary,
                        border: `1px solid ${claudeTokens.borderStrong}`,
                      }
                }
              >
                <span>{t('subscribe') || 'Subscribe'}</span>
                <ArrowRight size={15} strokeWidth={2} />
              </button>
            </div>
          </section>
        ))}
      </div>

      {/* Terms link */}
      <button
        onClick={onShowTerms}
        className="w-full rounded-lg py-3 text-[13px] font-medium transition-colors flex items-center justify-center gap-2"
        style={{
          backgroundColor: claudeTokens.surface,
          color: claudeTokens.textBody,
          border: `1px solid ${claudeTokens.border}`,
        }}
      >
        <FileText size={14} strokeWidth={1.75} />
        {t('premium_terms_link')}
      </button>

      {/* Analytics CTA */}
      <button
        onClick={() => navigate('/analytics')}
        className="w-full rounded-lg py-3 text-[13px] font-medium transition-colors flex items-center justify-center gap-2"
        style={{
          backgroundColor: claudeTokens.surfaceMuted,
          color: claudeTokens.textPrimary,
          border: `1px solid ${claudeTokens.borderStrong}`,
        }}
      >
        <BarChart3 size={14} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
        {currentPlan === 'premium' ? 'Open VIP analytics' : 'Preview VIP analytics'}
      </button>
    </div>
  );
};

// ---------- Page ----------
const ShopClaude = () => {
  const { t } = useTranslation();
  const { coins, skinInventory, activeSkin, buySkin, equipSkin, plan } = useStore();
  const [activeTab, setActiveTab] = useState<'vip' | 'skins'>('vip');
  const [showTerms, setShowTerms] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ title: string; price: string } | null>(null);

  const handleBuyPlan = (planId: VipPurchaseOption) => {
    WebApp.HapticFeedback.notificationOccurred('success');
    const price = planId === 'yearly' ? YEARLY_PASS_PRICE : MONTHLY_VIP_PRICE;
    setPaymentModal({ title: planId === 'yearly' ? 'VIP YEARLY' : 'VIP MONTHLY', price });
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
    <div
      className="min-h-screen pb-24"
      style={{ backgroundColor: claudeTokens.surface, color: claudeTokens.textPrimary }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-5 py-5 backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(250, 249, 245, 0.92)',
          borderBottom: `1px solid ${claudeTokens.border}`,
        }}
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <span
              className="text-[10px] font-medium uppercase tracking-[0.22em]"
              style={{ color: claudeTokens.textMuted }}
            >
              Marketplace
            </span>
            <h1
              className="mt-1 leading-none tracking-tight"
              style={{
                color: claudeTokens.textPrimary,
                fontFamily: claudeTokens.serifStack,
                fontSize: '30px',
                fontWeight: 500,
              }}
            >
              {t('shop') || 'Shop'}
            </h1>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: claudeTokens.surface,
              border: `1px solid ${claudeTokens.borderStrong}`,
            }}
          >
            <Coins size={14} strokeWidth={1.75} style={{ color: claudeTokens.accent }} />
            <span
              className="text-[14px] tabular-nums"
              style={{
                color: claudeTokens.textPrimary,
                fontFamily: claudeTokens.serifStack,
                fontWeight: 500,
                fontFeatureSettings: '"lnum","tnum"',
              }}
            >
              {coins.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="mt-4 rounded-xl p-1 flex gap-1"
          style={{ backgroundColor: claudeTokens.surfaceSunken }}
        >
          {[
            { id: 'vip' as const, label: 'VIP / Pass', icon: <Crown size={14} strokeWidth={1.75} /> },
            { id: 'skins' as const, label: 'Skins', icon: <LayoutIcon size={14} strokeWidth={1.75} /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 rounded-lg px-3 py-2.5 text-[12px] font-medium transition-colors flex items-center justify-center gap-2"
                style={
                  isActive
                    ? { backgroundColor: claudeTokens.accent, color: '#FFFFFF' }
                    : { backgroundColor: 'transparent', color: claudeTokens.textMuted }
                }
              >
                {tab.icon}
                <span className="uppercase tracking-[0.16em]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="px-5 pt-5">
        {activeTab === 'vip' ? (
          <VIPTabClaude
            currentPlan={plan}
            onBuyPlan={handleBuyPlan}
            onShowTerms={() => setShowTerms(true)}
          />
        ) : (
          <SkinsTabClaude
            handleBuySkin={handleBuySkin}
            handleEquipSkin={handleEquipSkin}
            skinInventory={skinInventory}
            activeSkin={activeSkin}
          />
        )}
      </div>

      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PaymentModalClaude
        isOpen={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        planTitle={paymentModal?.title || ''}
        price={paymentModal?.price || ''}
      />
    </div>
  );
};

export default ShopClaude;
