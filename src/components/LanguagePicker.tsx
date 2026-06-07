import { useState } from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStoreImpl';
import type { SupportedLanguage } from '../utils/detectLanguage';

/**
 * First-open language picker + an always-available switcher.
 *
 *  - <LanguageGate/>  : full-screen overlay shown ONCE on the very first open
 *    ("Тілді таңдаңыз / Выберите язык / Choose your language") with the 3
 *    languages. The choice is remembered so it never asks again.
 *  - <LanguageSwitcher/> : a compact flag pill (e.g. in the Home header) to
 *    change language any time.
 */

const LANGS: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'kz', label: 'Қазақша', flag: '🇰🇿' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

const CHOSEN_KEY = 'focus-lang-chosen-v1';
const markChosen = (code: string) => {
  try { localStorage.setItem(CHOSEN_KEY, code); } catch { /* noop */ }
};

export function LanguageGate() {
  const { i18n } = useTranslation();
  const setLanguage = useStore((s) => s.setLanguage);
  const [open, setOpen] = useState(() => {
    try { return !localStorage.getItem(CHOSEN_KEY); } catch { return true; }
  });

  if (!open) return null;

  const pick = (code: SupportedLanguage) => {
    setLanguage(code);
    void i18n.changeLanguage(code);
    markChosen(code);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-stone-900 p-6 text-center shadow-2xl">
        <div className="mb-2 text-5xl">🌐</div>
        <h2 className="text-xl font-black text-white">Тілді таңдаңыз</h2>
        <p className="mb-5 text-sm text-stone-400">Выберите язык · Choose your language</p>
        <div className="space-y-2.5">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => pick(l.code)}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-white/10 bg-white/5 p-3.5 text-left transition-all hover:border-amber-400 active:scale-[0.98]"
            >
              <span className="text-2xl">{l.flag}</span>
              <span className="font-bold text-white">{l.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LanguageSwitcher({ buttonClass }: { buttonClass?: string }) {
  const { i18n } = useTranslation();
  const setLanguage = useStore((s) => s.setLanguage);
  const language = useStore((s) => s.language);
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.code === language) || LANGS[0];

  const pick = (code: SupportedLanguage) => {
    setLanguage(code);
    void i18n.changeLanguage(code);
    markChosen(code);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx('flex h-[38px] min-w-[38px] items-center justify-center rounded-full text-lg transition-colors', buttonClass)}
        aria-label="Language"
      >
        {current.flag}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-40 overflow-hidden rounded-2xl border border-white/10 bg-stone-900 p-1 shadow-2xl">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => pick(l.code)}
                className={clsx(
                  'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold',
                  l.code === language ? 'bg-amber-500/20 text-amber-200' : 'text-white hover:bg-white/10',
                )}
              >
                <span className="text-lg">{l.flag}</span> {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
