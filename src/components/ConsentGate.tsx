import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, FileText, ShieldCheck } from 'lucide-react';
import { claudeTokens } from './ui/claudeTokens';

const CONSENT_STORAGE_KEY = 'focus-consent-v1';
const CONSENT_VERSION = 1;

type StoredConsent = {
  version: number;
  acceptedAt: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  confirmedAge: boolean;
};

const readConsent = (): StoredConsent | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (
      parsed.version === CONSENT_VERSION &&
      parsed.acceptedTerms === true &&
      parsed.acceptedPrivacy === true &&
      parsed.confirmedAge === true
    ) {
      return parsed as StoredConsent;
    }
    return null;
  } catch {
    return null;
  }
};

type CheckboxRowProps = {
  checked: boolean;
  onToggle: () => void;
  label: string;
  link?: { label: string; href: string };
};

const CheckboxRow = ({ checked, onToggle, label, link }: CheckboxRowProps) => (
  <label
    className="flex items-start gap-3 rounded-xl px-4 py-3 cursor-pointer select-none"
    style={{
      backgroundColor: claudeTokens.surfaceMuted,
      border: `1px solid ${checked ? claudeTokens.accent : claudeTokens.border}`,
    }}
  >
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      aria-label={label}
      className="mt-0.5 h-5 w-5 shrink-0 rounded-md flex items-center justify-center"
      style={{
        backgroundColor: checked ? claudeTokens.accent : '#FFFFFF',
        border: `1.5px solid ${checked ? claudeTokens.accent : claudeTokens.borderStrong}`,
      }}
    >
      {checked && <Check size={14} strokeWidth={3} color="#FFFFFF" />}
    </button>
    <div className="text-sm leading-relaxed" style={{ color: claudeTokens.textBody }}>
      <span onClick={onToggle}>{label}</span>
      {link && (
        <>
          {' '}
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="underline"
            style={{ color: claudeTokens.accent }}
          >
            {link.label}
          </a>
        </>
      )}
    </div>
  </label>
);

type ConsentGateProps = {
  children: React.ReactNode;
};

export const ConsentGate = ({ children }: ConsentGateProps) => {
  const { t } = useTranslation();
  const [accepted, setAccepted] = useState<boolean>(() => readConsent() !== null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [confirmedAge, setConfirmedAge] = useState(false);

  useEffect(() => {
    if (accepted) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [accepted]);

  const allChecked = acceptedTerms && acceptedPrivacy && confirmedAge;

  const handleAccept = () => {
    if (!allChecked) return;
    const payload: StoredConsent = {
      version: CONSENT_VERSION,
      acceptedAt: new Date().toISOString(),
      acceptedTerms: true,
      acceptedPrivacy: true,
      confirmedAge: true,
    };
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage may be unavailable in private mode — proceed anyway so the
      // user isn't trapped, but they'll see this gate again next launch.
    }
    setAccepted(true);
  };

  const checkboxes = useMemo(
    () => [
      {
        key: 'terms',
        checked: acceptedTerms,
        onToggle: () => setAcceptedTerms((v) => !v),
        label: t('consent_accept_terms'),
        link: { label: t('consent_view_terms'), href: '#/terms' },
      },
      {
        key: 'privacy',
        checked: acceptedPrivacy,
        onToggle: () => setAcceptedPrivacy((v) => !v),
        label: t('consent_accept_privacy'),
        link: { label: t('consent_view_privacy'), href: '#/privacy' },
      },
      {
        key: 'age',
        checked: confirmedAge,
        onToggle: () => setConfirmedAge((v) => !v),
        label: t('consent_confirm_age'),
      },
    ],
    [acceptedPrivacy, acceptedTerms, confirmedAge, t]
  );

  if (accepted) return <>{children}</>;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center px-4 py-6"
      style={{
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: claudeTokens.surface,
          border: `1px solid ${claudeTokens.borderStrong}`,
          maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 48px)',
        }}
      >
        <header
          className="px-6 pt-6 pb-4"
          style={{ borderBottom: `1px solid ${claudeTokens.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: claudeTokens.surfaceMuted,
                border: `1px solid ${claudeTokens.border}`,
              }}
            >
              <ShieldCheck size={20} style={{ color: claudeTokens.accent }} />
            </div>
            <div>
              <h2
                id="consent-title"
                className="text-xl"
                style={{
                  color: claudeTokens.textPrimary,
                  fontFamily: claudeTokens.serifStack,
                  fontWeight: 600,
                }}
              >
                {t('consent_title')}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: claudeTokens.textMuted }}>
                {t('consent_subtitle')}
              </p>
            </div>
          </div>
        </header>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div
            className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{
              backgroundColor: claudeTokens.accentSoft,
              border: `1px solid ${claudeTokens.accent}`,
            }}
          >
            <FileText size={18} className="mt-0.5 shrink-0" style={{ color: claudeTokens.accent }} />
            <p className="text-sm leading-relaxed" style={{ color: claudeTokens.textBody }}>
              {t('consent_age_rating')}
            </p>
          </div>

          <p className="text-sm leading-relaxed" style={{ color: claudeTokens.textBody }}>
            {t('consent_data_summary')}
          </p>

          <div className="space-y-2">
            {checkboxes.map((c) => (
              <CheckboxRow
                key={c.key}
                checked={c.checked}
                onToggle={c.onToggle}
                label={c.label}
                link={c.link}
              />
            ))}
          </div>
        </div>

        <footer
          className="px-6 py-4"
          style={{ borderTop: `1px solid ${claudeTokens.border}` }}
        >
          <button
            type="button"
            onClick={handleAccept}
            disabled={!allChecked}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: allChecked ? claudeTokens.accent : claudeTokens.surfaceSunken,
              color: allChecked ? '#FFFFFF' : claudeTokens.textMuted,
              cursor: allChecked ? 'pointer' : 'not-allowed',
            }}
          >
            {allChecked ? t('consent_continue') : t('consent_continue_disabled')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ConsentGate;
