import { useState, type FormEvent } from 'react';
import { KeyRound, ExternalLink, Loader2, AlertCircle, X, Sparkles, Lock } from 'lucide-react';
import {
  PROVIDERS,
  PROVIDER_IDS,
  saveSetup,
  waitUntilConfigured,
  type SetupStatus,
  type ProviderId,
} from '../lib/setup';

const FIELD =
  'mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200';

/**
 * One setup dialog: the Reveal license (only when not already provided) plus the AI provider,
 * key, and model. All of it applies at startup, so saving restarts the app once. Used as the
 * first-run gate (dismissable=false) and as a reopenable Settings panel (dismissable=true).
 */
export function SetupDialog({
  status,
  dismissable,
  onClose,
}: {
  status: SetupStatus;
  dismissable: boolean;
  onClose?: () => void;
}) {
  const initProvider: ProviderId = (status.provider as ProviderId) in PROVIDERS ? (status.provider as ProviderId) : 'OpenAI';
  const [license, setLicense] = useState('');
  const [provider, setProvider] = useState<ProviderId>(initProvider);
  const [model, setModel] = useState(() => {
    const m = PROVIDERS[initProvider].models;
    return m.includes(status.model ?? '') ? status.model! : (m[0] ?? '');
  });
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState(status.endpoint ?? '');
  const [deployment, setDeployment] = useState(status.deployment ?? '');
  const [showEndpoint, setShowEndpoint] = useState(!!status.endpoint && initProvider === 'OpenAI');
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(
    status.licenseError ? 'That license key was not accepted. Double-check it and try again.' : null,
  );

  const p = PROVIDERS[provider];
  const keyRequired = !status.hasKey || provider !== initProvider;

  function onProvider(id: ProviderId) {
    setProvider(id);
    const np = PROVIDERS[id];
    setModel(np.models[0] ?? '');
    setShowEndpoint(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (status.licenseNeeded && !license.trim()) return setError('A Reveal license is required.');
    if (keyRequired && !apiKey.trim()) return setError(`An API key is required for ${p.label}.`);
    if (p.needsEndpoint && !endpoint.trim()) return setError(`${p.label} needs a resource endpoint.`);
    if (p.needsDeployment && !deployment.trim()) return setError(`${p.label} needs a deployment name.`);

    setBusy(true);
    try {
      await saveSetup({
        license: license.trim() || undefined,
        provider,
        apiKey: apiKey.trim() || undefined,
        model: model.trim() || undefined,
        endpoint: endpoint.trim() || undefined,
        deployment: deployment.trim() || undefined,
      });
      setStarting(true);
      const ok = await waitUntilConfigured();
      if (ok) window.location.reload();
      else {
        setStarting(false);
        setBusy(false);
        setError('Taking longer than expected to start. Give it a moment, then refresh.');
      }
    } catch (err) {
      setBusy(false);
      setError((err as Error)?.message || 'Something went wrong.');
    }
  }

  if (starting) return <StartingScreen />;

  const card = (
    <form onSubmit={submit} className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
      {dismissable && (
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
      )}

      <div className="flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-600 text-sm font-bold text-white">R</div>
        <div className="text-sm font-semibold text-slate-500">Reveal AI Chat</div>
      </div>

      <h1 className="mt-5 flex items-center gap-2 text-xl font-semibold text-slate-900">
        <Sparkles className="h-5 w-5 text-violet-600" /> {dismissable ? 'AI settings' : 'Get set up'}
      </h1>
      <p className="mt-1.5 text-sm text-slate-500">
        {status.licenseNeeded
          ? 'Add your Reveal license and choose an AI provider. Saved encrypted on this machine; the app restarts once to apply.'
          : 'Choose an AI provider and add your key. The app restarts once to apply.'}
      </p>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {status.licenseNeeded && (
        <label className="mt-5 block">
          <span className="text-sm font-medium text-slate-700">Reveal SDK license</span>
          <textarea
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            rows={3}
            placeholder="Paste your Reveal license key"
            className={FIELD + ' resize-none font-mono text-xs'}
          />
        </label>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">AI provider</span>
          <select value={provider} onChange={(e) => onProvider(e.target.value as ProviderId)} className={FIELD + ' bg-white'}>
            {PROVIDER_IDS.map((id) => (
              <option key={id} value={id}>{PROVIDERS[id].label}</option>
            ))}
          </select>
        </label>

        {p.models.length > 0 ? (
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Model</span>
            <select value={model} onChange={(e) => setModel(e.target.value)} className={FIELD + ' bg-white'}>
              {p.models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        ) : (
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Deployment</span>
            <input type="text" value={deployment} onChange={(e) => setDeployment(e.target.value)} placeholder="my-gpt-deployment" className={FIELD} />
          </label>
        )}
      </div>

      {p.needsEndpoint && (
        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">{p.label} endpoint</span>
          <input type="text" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://your-resource.openai.azure.com" className={FIELD} />
        </label>
      )}

      <label className="mt-4 block">
        <span className="flex items-center justify-between text-sm font-medium text-slate-700">
          <span className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> {p.label} API key</span>
          <a href={p.keysUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-normal text-violet-600 hover:underline">
            get a key <ExternalLink className="h-3 w-3" />
          </a>
        </span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={keyRequired ? p.keyPlaceholder : 'Leave blank to keep current key'}
          className={FIELD}
        />
      </label>

      {p.optionalEndpoint && (
        <>
          <button type="button" onClick={() => setShowEndpoint((s) => !s)} className="mt-3 text-xs font-medium text-slate-500 hover:text-slate-700">
            {showEndpoint ? '− Hide' : '+ Advanced'} · local / OpenAI-compatible endpoint
          </button>
          {showEndpoint && (
            <input type="text" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="http://localhost:11434/v1" className={FIELD} />
          )}
        </>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Save &amp; {status.configured ? 'restart' : 'start'}
      </button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Lock className="h-3 w-3" /> Stored encrypted on this machine.
      </p>
    </form>
  );

  if (dismissable) {
    return (
      <div
        className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-slate-900/40 p-6"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        {card}
      </div>
    );
  }
  return <div className="grid h-full place-items-center overflow-auto bg-gradient-to-b from-slate-50 to-violet-50 p-6">{card}</div>;
}

function StartingScreen() {
  return (
    <div className="grid h-full place-items-center bg-gradient-to-b from-slate-50 to-violet-50 p-6">
      <div className="flex max-w-sm flex-col items-center text-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Starting up…</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Applying your settings, seeding the database, and warming up. This can take up to a minute
          on the first run.
        </p>
      </div>
    </div>
  );
}
