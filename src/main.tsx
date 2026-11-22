import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameService } from './app/gameService';
import { AdjustableDateService, SystemDateService } from './services/dateService';
import { createStorage } from './services/storage';
import { App } from './ui/App';
import { setupPwa } from './services/pwa';
import './ui/styles.css';

setupPwa();

async function boot() {
  const { storage, warning } = await createStorage();
  // I udvikling kan datoen simuleres via udviklerværktøjet. I produktion bruges systemets ur.
  let devDates: AdjustableDateService | undefined;
  if (import.meta.env.DEV) {
    devDates = new AdjustableDateService();
    try {
      const saved = sessionStorage.getItem('dev-date');
      if (saved) devDates.setRunningFrom(new Date(saved));
    } catch {
      /* ignorer */
    }
  }
  const service = new GameService(storage, devDates ?? new SystemDateService());
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App service={service} storageWarning={warning} devDates={devDates} />
    </StrictMode>,
  );
}

void boot();
