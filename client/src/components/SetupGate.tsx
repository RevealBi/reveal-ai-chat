import { useEffect, useState } from 'react';
import App from '../App';
import { initReveal } from '../lib/revealClient';
import { AiSettingsContext } from '../lib/aiSettings';
import { getSetupStatus, type SetupStatus } from '../lib/setup';
import { SetupDialog } from './SetupDialog';

const FALLBACK: SetupStatus = {
  configured: false,
  licenseError: false,
  licenseNeeded: true,
  provider: 'OpenAI',
  model: null,
  endpoint: null,
  deployment: null,
  hasKey: false,
};

/**
 * Gate in front of the app:
 *   - Not configured (missing license or AI key) -> one SetupDialog (saves + restarts).
 *   - Configured -> initialize Reveal and render the app, with a reopenable Settings dialog.
 */
export function SetupGate() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setStatus(await getSetupStatus());
      } catch {
        setStatus(FALLBACK);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !status) return <Splash />;
  if (!status.configured) return <SetupDialog status={status} dismissable={false} />;
  return <ConfiguredApp status={status} />;
}

function ConfiguredApp({ status }: { status: SetupStatus }) {
  const [open, setOpen] = useState(false);

  initReveal(); // idempotent — set up the SDK before App renders any RevealView

  return (
    <AiSettingsContext.Provider value={{ status, openSettings: () => setOpen(true) }}>
      <App />
      {open && <SetupDialog status={status} dismissable onClose={() => setOpen(false)} />}
    </AiSettingsContext.Provider>
  );
}

function Splash() {
  return (
    <div className="grid h-full place-items-center bg-slate-50">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-violet-600" />
    </div>
  );
}
