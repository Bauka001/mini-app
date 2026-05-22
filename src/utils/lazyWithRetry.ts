import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type ModuleWithDefault<T extends ComponentType<any>> = {
  default: T;
};

const CHUNK_ERROR_FLAG = 'focus-app-lazy-retry';

const shouldRecoverFromImportError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  );
};

export const lazyWithRetry = <T extends ComponentType<any>>(
  importer: () => Promise<ModuleWithDefault<T>>
): LazyExoticComponent<T> =>
  lazy(async () => {
    try {
      const loadedModule = await importer();

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(CHUNK_ERROR_FLAG);
      }

      return loadedModule;
    } catch (error) {
      if (
        typeof window !== 'undefined' &&
        shouldRecoverFromImportError(error) &&
        !sessionStorage.getItem(CHUNK_ERROR_FLAG)
      ) {
        sessionStorage.setItem(CHUNK_ERROR_FLAG, '1');
        window.location.reload();
      }

      throw error;
    }
  });
