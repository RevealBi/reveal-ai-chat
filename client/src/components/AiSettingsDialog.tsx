import { useState, type FormEvent } from 'react';
import { KeyRound, ExternalLink, Loader2, AlertCircle, X, Sparkles } from 'lucide-react';
import { PROVIDERS, saveAiSettings, type AiSettings, type ProviderId } from '../lib/setup';

const FIELD =
  'mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200';

/**
 * AI provider / model / key. Saved to the runtime store, so changes apply to the next
 * message with no restart. Used both as the first-run gate (dismissable=false) and as a
 * reopenable Settings panel (dismissable=true).
 */
export function AiSettingsDialog({
  initial,
  dismissable,
  onClose,
  onSaved,
}: {
  initial: AiSettings;
  dismissable: boolean;
  onClose?: () => void;
  onSaved: () => void;
}) {
  const initProvider = (initial.provider as ProviderId) in PROVIDERS ? (initial.provider as ProviderId) : 'OpenAI';
  const [provider, setProvider] = useState<ProviderId>(initProvider);
  const [model, setModel] = useState(
    PROVIDERS[initProvider].models.includes(initial.model) ? initial.model : PROVIDERS[initProvider].models[0],
  );
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState(initial.endpoint || '');
  const [advanced, setAdvanced] = useState(!!initial.endpoint);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const p = PROVIDERS[provider];
  const keyRequired = !initial.hasKey || provider !== initProvider;

  function onProvider(id: ProviderId) {
    setProvider(id);
    if (!PROVIDERS[id].models.includes(model)) setModel(PROVIDERS[id].models[0]);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (keyRequired && !apiKey.trim()) { setError(`An API key is required for ${p.label}.`); return; }
    setBusy(true);
    try {
      await saveAiSettings({ provider, model, apiKey: apiKey.trim() || undefined, endpoint: endpoint.trim() || undefined });
      onSaved();
    } catch (err: any) {
      setBusy(false);
      setError(err?.message || 'Something went wrong saving your settings.');
    }
  }

  const card = (
    <form onSubmit={submit} className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
      {dismissable && (
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
      )}

      <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
        <Sparkles className="h-5 w-5 text-violet-600" /> {dismissable ? 'AI settings' : 'Connect your AI'}
      </h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Choose a provider and model and add your key. Changes apply to your next message — no restart.
      </p>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">AI provider</span>
          <select value={provider} onChange={(e) => onProvider(e.target.value as ProviderId)} className={FIELD + ' bg-white'}>
            {Object.entries(PROVIDERS).map(([id, v]) => <option key={id} value={id}>{v.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Model</span>
          <select value={model} onChange={(e) => setModel(e.target.value)} className={FIELD + ' bg-white'}>
            {p.models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>

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

      <button type="button" onClick={() => setAdvanced((a) => !a)} className="mt-3 text-xs font-medium text-slate-500 hover:text-slate-700">
        {advanced ? '− Hide' : '+ Advanced'} · local / OpenAI-compatible endpoint
      </button>
      {advanced && (
        <input type="text" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="http://localhost:11434/v1" className={FIELD} />
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {dismissable ? 'Save' : 'Save & continue'}
      </button>
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
