import WebApp from '@twa-dev/sdk';

type ThemeParams = Partial<{
  bg_color: string;
  text_color: string;
  hint_color: string;
  link_color: string;
  button_color: string;
  button_text_color: string;
  secondary_bg_color: string;
  header_bg_color: string;
  accent_text_color: string;
  section_bg_color: string;
  section_header_text_color: string;
  subtitle_text_color: string;
  destructive_text_color: string;
}>;

const tryCall = (fn: () => void, label: string) => {
  try {
    fn();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[telegram] ${label} unavailable:`, err);
    }
  }
};

const applyThemeParams = (params: ThemeParams) => {
  const root = document.documentElement;
  const set = (key: string, value?: string) => {
    if (value) root.style.setProperty(key, value);
  };
  set('--tg-bg-color', params.bg_color);
  set('--tg-text-color', params.text_color);
  set('--tg-hint-color', params.hint_color);
  set('--tg-link-color', params.link_color);
  set('--tg-button-color', params.button_color);
  set('--tg-button-text-color', params.button_text_color);
  set('--tg-secondary-bg-color', params.secondary_bg_color);
  set('--tg-header-bg-color', params.header_bg_color);
  set('--tg-accent-text-color', params.accent_text_color);
  set('--tg-section-bg-color', params.section_bg_color);
  set('--tg-destructive-text-color', params.destructive_text_color);

  const colorScheme = WebApp.colorScheme;
  if (colorScheme === 'dark' || colorScheme === 'light') {
    root.style.colorScheme = colorScheme;
    root.dataset.tgColorScheme = colorScheme;
  }
};

let bootstrapped = false;

export function bootstrapTelegram(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  tryCall(() => WebApp.ready(), 'ready()');
  tryCall(() => WebApp.expand(), 'expand()');
  tryCall(() => WebApp.disableVerticalSwipes(), 'disableVerticalSwipes()');

  applyThemeParams(WebApp.themeParams as ThemeParams);
  tryCall(() => {
    WebApp.onEvent('themeChanged', () => applyThemeParams(WebApp.themeParams as ThemeParams));
  }, 'onEvent(themeChanged)');

  tryCall(() => WebApp.setHeaderColor('bg_color'), 'setHeaderColor');
  tryCall(() => WebApp.setBackgroundColor('bg_color'), 'setBackgroundColor');
}

export const isTelegramHost = (): boolean => {
  return typeof WebApp.platform === 'string' && WebApp.platform !== 'unknown';
};
