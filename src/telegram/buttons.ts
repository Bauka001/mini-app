import WebApp from '@twa-dev/sdk';
import { useEffect } from 'react';

const safe = <T,>(fn: () => T): T | undefined => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

// Caller must memoize `handler` (e.g. with useCallback) to avoid re-binding every render.
export function useBackButton(handler: (() => void) | null): void {
  useEffect(() => {
    const back = safe(() => WebApp.BackButton);
    if (!back) return;

    if (!handler) {
      safe(() => back.hide());
      return;
    }

    safe(() => back.onClick(handler));
    safe(() => back.show());

    return () => {
      safe(() => back.offClick(handler));
      safe(() => back.hide());
    };
  }, [handler]);
}

interface MainButtonOptions {
  text: string;
  onClick: () => void;
  visible?: boolean;
  active?: boolean;
  showProgress?: boolean;
}

// Caller must memoize `options.onClick` (useCallback) and the options object (useMemo).
export function useMainButton(options: MainButtonOptions | null): void {
  useEffect(() => {
    const main = safe(() => WebApp.MainButton);
    if (!main) return;

    if (!options) {
      safe(() => main.hide());
      return;
    }

    const onClick = options.onClick;
    safe(() => main.setText(options.text));
    safe(() => (options.active === false ? main.disable() : main.enable()));
    if (options.showProgress) safe(() => main.showProgress(false));
    else safe(() => main.hideProgress());

    safe(() => main.onClick(onClick));
    if (options.visible !== false) safe(() => main.show());

    return () => {
      safe(() => main.offClick(onClick));
      safe(() => main.hide());
      safe(() => main.hideProgress());
    };
  }, [options]);
}
