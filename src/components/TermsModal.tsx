import { FileText, CheckCircle, Trophy } from 'lucide-react';
import { useState } from 'react';
import { ClaudeModal, ClaudeButton, ClaudePill, claudeTokens } from './ui/ClaudeModal';

export const TermsModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<'kz' | 'ru' | 'en'>('kz');

  const content = {
    kz: {
      title: 'Қатысу шарттары',
      grandPrizeLabel: 'Бас жүлде',
      cta: 'Түсінікті',
      rules: [
        "Ұтыс ойынына тек 'Premium' жоспарын сатып алған қолданушылар қатыса алады.",
        'Әрбір Premium қолданушыға бірегей билет нөмірі беріледі.',
        'Ұтыс нәтижесі mini app ішіндегі турнир және VIP analytics бөліктерінде жарияланады.',
        'Жеңімпаз кездейсоқ сандар генераторы арқылы анықталады.',
        'Бас жүлде: Ford Mustang GT.',
        'Қосымша жүлделер: iPhone 17 Pro, PlayStation 5, AirPods Pro.',
        'Қатысушы кәмелетке толған (18+) болуы тиіс.',
        'Ұйымдастырушылар ережелерді өзгертуге құқылы.',
      ],
    },
    ru: {
      title: 'Условия участия',
      grandPrizeLabel: 'Главный приз',
      cta: 'Понятно',
      rules: [
        "В розыгрыше могут участвовать только пользователи, купившие план 'Premium'.",
        'Каждому Premium пользователю присваивается уникальный номер билета.',
        'Результаты розыгрыша будут официально объявлены в мини-приложении через турнирный и VIP analytics разделы.',
        'Победитель будет определен с помощью генератора случайных чисел.',
        'Главный приз: Ford Mustang GT.',
        'Дополнительные призы: iPhone 17 Pro, PlayStation 5, AirPods Pro.',
        'Участник должен быть совершеннолетним (18+).',
        'Организаторы оставляют за собой право изменять правила.',
      ],
    },
    en: {
      title: 'Terms & Conditions',
      grandPrizeLabel: 'Grand Prize',
      cta: 'Understood',
      rules: [
        "Only users who purchased the 'Premium' plan can participate in the raffle.",
        'Each Premium user is assigned a unique ticket number.',
        'The raffle results will be officially announced inside the mini app through the tournament and VIP analytics sections.',
        'The winner will be determined using a random number generator.',
        'Grand Prize: Ford Mustang GT.',
        'Additional Prizes: iPhone 17 Pro, PlayStation 5, AirPods Pro.',
        'Participants must be of legal age (18+).',
        'Organizers reserve the right to modify the rules.',
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
            <Trophy size={16} style={{ color: claudeTokens.accent }} />
            VIP Analytics + Weekend Tournament
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
        {(['kz', 'ru', 'en'] as const).map((lang) => (
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

      {/* Grand prize callout — keeps the celebratory feel but on the warm palette */}
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
          {c.grandPrizeLabel}
        </p>
        <p
          className="text-2xl font-bold"
          style={{
            color: claudeTokens.textPrimary,
            fontFamily:
              '"Tiempos Headline", "Iowan Old Style", "Georgia", ui-serif, serif',
          }}
        >
          Ford Mustang GT
        </p>
      </div>
    </ClaudeModal>
  );
};
