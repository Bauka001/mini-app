import './polyfills';
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './i18n/i18n.ts';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import WebApp from '@twa-dev/sdk'

WebApp.ready();
try {
  WebApp.expand();
} catch {}

// Use local manifest
const manifestUrl = window.location.origin + '/tonconnect-manifest.json';

async function bootstrap() {
  const [{ default: App }, { TonConnectUIProvider }] = await Promise.all([
    import('./App.tsx'),
    import('@tonconnect/ui-react'),
  ]);

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <GlobalErrorBoundary>
        <TonConnectUIProvider manifestUrl={manifestUrl}>
          <App />
        </TonConnectUIProvider>
      </GlobalErrorBoundary>
    </React.StrictMode>,
  );
}

void bootstrap();
