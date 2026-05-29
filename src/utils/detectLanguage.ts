export type SupportedLanguage = 'en' | 'ru' | 'kz';

// Telegram passes IETF-style codes (e.g. 'en-US', 'ru', 'kk'). Map to our
// supported set; anything we don't ship gets English per the Apps Center
// localisation rule (English default, switch only if the Telegram client
// language matches a supported locale).
export const resolveSupportedLanguage = (raw?: string | null): SupportedLanguage => {
  if (!raw) return 'en';
  const primary = raw.toLowerCase().split('-')[0];
  if (primary === 'ru') return 'ru';
  if (primary === 'kk' || primary === 'kz') return 'kz';
  return 'en';
};

export const detectInitialLanguage = (): SupportedLanguage => {
  if (typeof window === 'undefined') return 'en';
  const tgLang =
    (window as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { language_code?: string } } } } })
      ?.Telegram?.WebApp?.initDataUnsafe?.user?.language_code ?? null;
  return resolveSupportedLanguage(tgLang);
};
