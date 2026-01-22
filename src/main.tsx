import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/i18n.ts';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

import WebApp from '@twa-dev/sdk'

WebApp.ready();

// Use local manifest
const manifestUrl = window.location.origin + '/tonconnect-manifest.json';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <App />
      </TonConnectUIProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>,
)
