import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { startOutbox } from './offline/outbox';

// Load the offline queue and start syncing writes made while offline
void startOutbox();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
