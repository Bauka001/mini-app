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
let lifecycleListenersAttached = false;

// Telegram on Android/iOS may restore the WebView from BFCache on second
// launch instead of re-executing the page scripts. The `bootstrapped` flag
// stays true, but the host expects another `ready()`/`expand()` call to
// re-sync the viewport. Without it the viewport reports zero height and the
// React tree mounts off-screen → blank app.
const reSyncWithHost = () => {
  tryCall(() => WebApp.ready(), 'ready() resync');
  tryCall(() => WebApp.expand(), 'expand() resync');
  applyThemeParams(WebApp.themeParams as ThemeParams);
};

const attachLifecycleListeners = () => {
  if (lifecycleListenersAttached) return;
  lifecycleListenersAttached = true;

  window.addEventListener('pageshow', (event) => {
    if ((event as PageTransitionEvent).persisted) reSyncWithHost();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reSyncWithHost();
  });
};

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

  attachLifecycleListeners();
}

export const isTelegramHost = (): boolean => {
  return typeof WebApp.platform === 'string' && WebApp.platform !== 'unknown';
};
