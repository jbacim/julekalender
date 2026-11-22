import { useEffect, useState } from 'react';
import { installState, onInstallStateChange, promptInstall, type InstallState } from '../../services/pwa';
import { useApp } from '../AppContext';
import { Dialog } from './common';

/** Hvor længe forsiden skal have været vist, før vi spørger (så barnet først ser kalenderen). */
const DELAY_MS = 2500;

/**
 * Spørger én gang pr. enhed, om spillet skal gemmes som app – kun hvis det ikke allerede er
 * installeret, og enheden faktisk kan installere (installationsknap eller iOS-vejledning).
 * Markeres som set, så snart dialogen vises, så den aldrig kommer igen.
 */
export function InstallPrompt() {
  const { settings, updateSettings } = useApp();
  const [state, setState] = useState<InstallState>(installState);
  const [open, setOpen] = useState(false);

  useEffect(() => onInstallStateChange(() => setState(installState())), []);

  const eligible = !settings.installPromptSeen && (state === 'promptable' || state === 'ios');

  useEffect(() => {
    if (!eligible || open) return;
    const t = setTimeout(() => {
      setOpen(true);
      void updateSettings({ installPromptSeen: true });
    }, DELAY_MS);
    return () => clearTimeout(t);
    // updateSettings ændrer identitet ved hver indstillingsændring; timeren skal ikke genstartes af det
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, open]);

  if (!open) return null;
  const close = () => setOpen(false);

  return (
    <Dialog
      title="Gem Julekalender som app?"
      onClose={close}
      actions={
        state === 'promptable' ? (
          <>
            <button type="button" className="btn btn--ghost" onClick={close}>
              Ikke nu
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                close();
                void promptInstall();
              }}
            >
              Installer
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--primary" onClick={close}>
            OK
          </button>
        )
      }
    >
      <p>Så ligger kalenderen på hjemmeskærmen, åbner i fuld skærm og virker også uden internet. Spørg gerne en voksen.</p>
      {state === 'ios' && (
        <ol className="install-steps">
          <li>
            Tryk på <strong>Del</strong>-knappen i Safari (firkanten med en pil op).
          </li>
          <li>
            Vælg <strong>Føj til hjemmeskærm</strong> og tryk <strong>Tilføj</strong>.
          </li>
        </ol>
      )}
      <p className="small-print">Du kan altid finde det igen under Forældre → Gem som app.</p>
    </Dialog>
  );
}
