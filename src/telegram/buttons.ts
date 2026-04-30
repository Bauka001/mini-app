import WebApp from '@twa-dev/sdk';
import { useEffect, useRef } from 'react';

const noop = () => {};

const safe = <T,>(fn: () => T): T | undefined => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

export function useBackButton(handler: (() => void) | null): void {
  const handlerRef = useRef<() => void>(noop);
  handlerRef.current = handler ?? noop;

  useEffect(() => {
    const back = safe(() => WebApp.BackButton);
    if (!back) return;

    if (!handler) {
      safe(() => back.hide());
      return;
    }

    const onClick = () => handlerRef.current();
    safe(() => back.onClick(onClick));
    safe(() => back.show());

    return () => {
      safe(() => back.offClick(onClick));
      safe(() => back.hide());
    };
  }, [handler === null]);
}

interface MainButtonOptions {
  text: string;
  onClick: () => void;
  visible?: boolean;
  active?: boolean;
  showProgress?: boolean;
}

export function useMainButton(options: MainButtonOptions | null): void {
  const optsRef = useRef<MainButtonOptions | null>(null);
  optsRef.current = options;

  useEffect(() => {
    const main = safe(() => WebApp.MainButton);
    if (!main) return;

    if (!options) {
      safe(() => main.hide());
      return;
    }

    const onClick = () => optsRef.current?.onClick();

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
  }, [options?.text, options?.visible, options?.active, options?.showProgress]);
}
