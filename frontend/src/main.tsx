// App entry point: mounts React and wraps the app in every shared provider.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
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
