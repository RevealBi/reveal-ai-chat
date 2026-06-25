import { useState, type FormEvent } from 'react';
import { Lock, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { saveLicense, waitUntilLicensed, type LicenseStatus } from '../lib/setup';

/** First-run license step. The Reveal license is needed at startup, so saving it restarts
 *  the app once. Only shown when no license is configured anywhere. */
export function LicenseDialog({ status }: { status: LicenseStatus }) {
  const [license, setLicense] = useState('');
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(
    status.licenseError ? 'That license key was not accepted. Double-check it and try again.' : null,
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!license.trim()) { setError('A Reveal license is required.'); return; }
    setBusy(true);
    try {
      await saveLicense(license.trim());
      setStarting(true);
      const ok = await waitUntilLicensed();
      if (ok) window.location.reload();
      else { setStarting(false); setBusy(false); setError('Taking longer than expected to start. Give it a moment, then refresh.'); }
    } catch (err: any) {
      setBusy(false);
      setError(err?.message || 'Something went wrong.');
    }
  }

  if (starting) {
    return (
      <div className="grid h-full place-items-center bg-gradient-to-b from-slate-50 to-violet-50 p-6">
        <div className="flex max-w-sm flex-col items-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Starting up…</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Applying your license, seeding the database, and warming up. This can take up to a
            minute on the first run.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full place-items-center overflow-auto bg-gradient-to-b from-slate-50 to-violet-50 p-6">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-600 text-sm font-bold text-white">R</div>
          <div className="text-sm font-semibold text-slate-500">Reveal AI Chat</div>
        </div>

        <h1 className="mt-5 flex items-center gap-2 text-xl font-semibold text-slate-900">
          <Sparkles className="h-5 w-5 text-violet-600" /> Activate your license
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Paste your Reveal SDK license to get started. It's saved encrypted on this machine; the
          app restarts once to apply it. (You'll set your AI key next — that one's instant.)
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <textarea
          value={license}
          onChange={(e) => setLicense(e.target.value)}
          rows={4}
          placeholder="Paste your Reveal license key"
          className="mt-5 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        />

        <button
          type="submit"
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Save &amp; start
        </button>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Lock className="h-3 w-3" /> Stored encrypted on this machine.
        </p>
      </form>
    </div>
  );
}
