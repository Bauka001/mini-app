import { ReactNode } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

const manifestUrl = window.location.origin + '/tonconnect-manifest.json';

export const TonConnectShell = ({ children }: { children: ReactNode }) => (
  <TonConnectUIProvider manifestUrl={manifestUrl}>{children}</TonConnectUIProvider>
);

export default TonConnectShell;
