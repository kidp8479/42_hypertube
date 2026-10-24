// App entry point: mounts React and wraps the app in every shared provider.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted IBM Plex (no request to a font CDN), only the weights and the
// Latin subset the tokens use.
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './styles/tokens.css';
import './styles/base.css';
import './lib/i18n';
import App from './App.tsx';
import { AppProviders } from './app/providers';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
