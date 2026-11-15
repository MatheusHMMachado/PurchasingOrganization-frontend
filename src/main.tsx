import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { startOutbox } from './offline/outbox';
import { startTheme } from './theme/theme';

// Follow the device theme (light/dark); the header button overrides it for this session
startTheme();

// Load the offline queue and start syncing writes made while offline
void startOutbox();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
