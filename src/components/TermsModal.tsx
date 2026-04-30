import { FileText, CheckCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ClaudeModal, ClaudeButton, ClaudePill, claudeTokens } from './ui/ClaudeModal';

export const TermsModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<'kz' | 'ru' | 'en'>('en');

  const content = {
    kz: {
      title: 'Premium шарттары',
      bundleLabel: 'Premium артықшылықтары',
      bundleTitle: 'VIP analytics + кеңейтілген тренинг',
      cta: 'Түсінікті',
      rules: [
        "'Premium' жоспары VIP analytics, кеңейтілген күнделікті жаттығулар және эксклюзив скиндерді қамтиды.",
        'Әрбір Premium қолданушыға бірегей мүшелік нөмірі беріледі — бұл сатып алу растаушысы, ақшалай немесе заттай ұтыс билеті емес.',
        'Premium тек ойын ішіндегі контент пен функцияларды ашады. Нақты ақшалық, заттай немесе криптовалюталық жүлделер берілмейді.',
        'Премиум-төлемдер Telegram Stars немесе TON әмияны арқылы өңделеді. Ішкі ойын активтері сатылмайды және нақты валютаға айырбасталмайды.',
        'Қолжетімділік жалғасуы үшін минималды жас — 13. Кейбір ауқымды ойын қорытындылары 18+ деп таңбалануы мүмкін.',
        'Біз шарттарды кез келген уақытта жаңарта аламыз; өзгертулер mini app ішінде жарияланады.',
      ],
    },
    ru: {
      title: 'Условия Premium',
      bundleLabel: 'Premium-бенефиты',
      bundleTitle: 'VIP analytics + расширенные тренировки',
      cta: 'Понятно',
      rules: [
        "План 'Premium' включает VIP analytics, расширенные ежедневные тренировки и эксклюзивные скины.",
        'Каждому Premium-пользователю присваивается уникальный номер мембершипа — это подтверждение покупки, а не лотерейный билет.',
        'Premium открывает только внутриигровой контент и функции. Денежные, материальные или криптовалютные призы не выдаются.',
        'Платежи Premium обрабатываются Telegram Stars или TON-кошельком. Игровые активы не продаются и не обмениваются на реальные валюты.',
        'Минимальный возраст использования — 13 лет. Некоторые соревновательные итоги внутри приложения могут иметь возрастную метку 18+.',
        'Мы можем обновлять условия в любое время; изменения публикуются внутри mini app.',
      ],
    },
    en: {
      title: 'Premium Terms',
      bundleLabel: 'Premium benefits',
      bundleTitle: 'VIP analytics + extended training',
      cta: 'Understood',
      rules: [
        "The 'Premium' plan includes VIP analytics, extended daily workouts, and exclusive in-game skins.",
        'Each Premium user is assigned a unique membership number. This is a purchase receipt — not a lottery ticket.',
        'Premium unlocks in-app content and features only. No monetary, physical, or cryptocurrency prizes are awarded.',
        'Premium payments are processed through Telegram Stars or your TON wallet. In-game assets are not sold for and cannot be exchanged into real-world currency.',
        'Minimum age to use the app is 13. Some in-app competitive standings may carry an 18+ label.',
        'We may update these terms at any time; changes are published inside the mini app.',
      ],
    },
  } as const;

  const c = content[activeTab];

  return (
    <ClaudeModal
      isOpen={isOpen}
      onClose={onClose}
      icon={<FileText size={20} />}
      title={c.title}
      size="md"
      footer={
        <>
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold"
            style={{
              backgroundColor: claudeTokens.surface,
              border: `1px solid ${claudeTokens.borderStrong}`,
              color: claudeTokens.textPrimary,
            }}
          >
            <Sparkles size={16} style={{ color: claudeTokens.accent }} />
            {c.bundleTitle}
          </div>
          <ClaudeButton onClick={onClose}>{c.cta}</ClaudeButton>
        </>
      }
    >
      {/* Language tabs — segmented control on the warm sunken surface */}
      <div
        className="flex gap-1 p-1 rounded-lg mb-4"
        style={{ backgroundColor: claudeTokens.surfaceSunken }}
      >
        {(['en', 'ru', 'kz'] as const).map((lang) => (
          <ClaudePill
            key={lang}
            active={activeTab === lang}
            onClick={() => setActiveTab(lang)}
          >
            {lang === 'kz' ? 'KZ' : lang === 'ru' ? 'RU' : 'EN'}
          </ClaudePill>
        ))}
      </div>

      {/* Rules — each on a soft card */}
      <ul className="space-y-2">
        {c.rules.map((rule, i) => (
          <li
            key={i}
            className="flex gap-3 items-start rounded-xl px-4 py-3"
            style={{
              backgroundColor: claudeTokens.surfaceMuted,
              border: `1px solid ${claudeTokens.border}`,
            }}
          >
            <CheckCircle
              size={18}
              className="mt-0.5 shrink-0"
              style={{ color: claudeTokens.success }}
            />
            <p className="text-sm leading-relaxed" style={{ color: claudeTokens.textBody }}>
              {rule}
            </p>
          </li>
        ))}
      </ul>

      {/* Premium bundle callout — replaces the old physical-prize banner */}
      <div
        className="mt-6 rounded-2xl px-5 py-5 text-center"
        style={{
          backgroundColor: '#FFFFFF',
          border: `1px solid ${claudeTokens.borderStrong}`,
        }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.3em] mb-1"
          style={{ color: claudeTokens.accent }}
        >
          {c.bundleLabel}
        </p>
        <p
          className="text-xl font-bold"
          style={{
            color: claudeTokens.textPrimary,
            fontFamily:
              '"Tiempos Headline", "Iowan Old Style", "Georgia", ui-serif, serif',
          }}
        >
          {c.bundleTitle}
        </p>
      </div>
    </ClaudeModal>
  );
};
