const UGC_CONSENT_STORAGE_KEY = 'focus-ugc-consent-v1';

export const readUgcConsent = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(UGC_CONSENT_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

export const setUgcConsent = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(UGC_CONSENT_STORAGE_KEY, '1');
  } catch {
    // localStorage may be unavailable in private mode — caller proceeds, the
    // worst case is the prompt re-appears next launch.
  }
};
