import { useEffect, useState } from 'react';
import App from '../App';
import { initReveal } from '../lib/revealClient';
import { AiSettingsContext } from '../lib/aiSettings';
import { getLicenseStatus, getAiSettings, type LicenseStatus, type AiSettings } from '../lib/setup';
import { LicenseDialog } from './LicenseDialog';
import { AiSettingsDialog } from './AiSettingsDialog';

type Phase = 'loading' | 'license' | 'ai' | 'ready';

/**
 * Gate in front of the app:
 *   1. No license  -> LicenseDialog (saves + restarts).
 *   2. No AI key   -> AiSettingsDialog (runtime, no restart).
 *   3. Otherwise   -> initialize Reveal and render the app (with a reopenable Settings dialog).
 */
export function SetupGate() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [ai, setAi] = useState<AiSettings | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const ls = await getLicenseStatus();
        setLicense(ls);
        if (!ls.configured) { setPhase('license'); return; }
        const a = await getAiSettings();
        setAi(a);
        setPhase(a.hasKey ? 'ready' : 'ai');
      } catch {
        setLicense({ configured: false, licenseError: false });
        setPhase('license');
      }
    })();
  }, []);

  if (phase === 'loading') return <Splash />;
  if (phase === 'license') return <LicenseDialog status={license!} />;
  if (phase === 'ai') return <AiSettingsDialog initial={ai!} dismissable={false} onSaved={() => setPhase('ready')} />;
  return <ConfiguredApp />;
}

function ConfiguredApp() {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<AiSettings | null>(null);

  initReveal(); // idempotent — set up the SDK before App renders any RevealView

  async function openSettings() {
    try {
      setInitial(await getAiSettings());
      setOpen(true);
    } catch {
      /* ignore */
    }
  }

  return (
    <AiSettingsContext.Provider value={{ openSettings }}>
      <App />
      {open && initial && (
        <AiSettingsDialog
          initial={initial}
          dismissable
          onClose={() => setOpen(false)}
          onSaved={() => setOpen(false)}
        />
      )}
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
