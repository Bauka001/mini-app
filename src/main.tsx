import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/i18n.ts';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

import WebApp from '@twa-dev/sdk'

WebApp.ready();

// Ensure the manifest URL is correct based on your deployment or local environment
const manifestUrl = 'https://raw.githubusercontent.com/ton-community/tutorials/main/03-client/test/public/tonconnect-manifest.json'; 
// For production, you should use your own manifest: window.location.origin + '/tonconnect-manifest.json'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <App />
      </TonConnectUIProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>,
)
