import { useState, type CSSProperties, type FormEvent } from 'react';
import {
  IgrBanner,
  IgrButton,
  IgrCard,
  IgrCircularProgress,
  IgrDialog,
  IgrInput,
  IgrSelect,
  IgrSelectItem,
  IgrTextarea,
} from 'igniteui-react';
import {
  PROVIDERS,
  PROVIDER_IDS,
  saveSetup,
  waitUntilConfigured,
  type SetupStatus,
  type ProviderId,
} from '../lib/setup';
import { AppIcon, AppIconButton } from './AppIcon';

const SPINNER_16 = { '--diameter': '16px' } as CSSProperties;

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

  if (starting) return <StartingScreen restarting={dismissable} />;

  const form = (
    <form onSubmit={submit} className="setup-form relative flex flex-col gap-4">
      {dismissable && (
        <AppIconButton name="x" aria-label="Close" onClick={onClose} className="absolute -right-2 -top-2" />
      )}

      <div>
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-600 text-sm font-bold text-white">R</div>
          <div className="text-sm font-semibold text-slate-500">Reveal AI Chat</div>
        </div>
        <h1 className="mt-5 flex items-center gap-2 text-xl font-semibold text-slate-900">
          <AppIcon name="sparkles" size={20} className="text-violet-600" /> {dismissable ? 'AI settings' : 'Get set up'}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          {status.licenseNeeded
            ? 'Add your Reveal license and choose an AI provider. Saved encrypted on this machine; the app restarts once to apply.'
            : 'Choose an AI provider and add your key. The app restarts once to apply.'}
        </p>
      </div>

      {error && (
        <IgrBanner open onClosed={() => setError(null)}>
          <AppIcon slot="prefix" name="circle-alert" size={18} className="text-red-600" />
          {error}
        </IgrBanner>
      )}

      {status.licenseNeeded && (
        <IgrTextarea
          label="Reveal SDK license"
          value={license}
          rows={3}
          resize="none"
          placeholder="Paste your Reveal license key"
          className="font-mono"
          onInput={(e) => setLicense(e.detail)}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <IgrSelect label="AI provider" value={provider} onChange={(e) => onProvider(e.detail.value as ProviderId)}>
          {PROVIDER_IDS.map((id) => (
            <IgrSelectItem key={id} value={id}>
              {PROVIDERS[id].label}
            </IgrSelectItem>
          ))}
        </IgrSelect>

        {p.models.length > 0 ? (
          <IgrSelect label="Model" value={model} onChange={(e) => setModel(e.detail.value)}>
            {p.models.map((m) => (
              <IgrSelectItem key={m} value={m}>
                {m}
              </IgrSelectItem>
            ))}
          </IgrSelect>
        ) : (
          <IgrInput
            label="Deployment"
            value={deployment}
            placeholder="my-gpt-deployment"
            onInput={(e) => setDeployment(e.detail)}
          />
        )}
      </div>

      {p.needsEndpoint && (
        <IgrInput
          label={`${p.label} endpoint`}
          value={endpoint}
          placeholder="https://your-resource.openai.azure.com"
          onInput={(e) => setEndpoint(e.detail)}
        />
      )}

      <IgrInput
        type="password"
        label={`${p.label} API key`}
        value={apiKey}
        placeholder={keyRequired ? p.keyPlaceholder : 'Leave blank to keep current key'}
        onInput={(e) => setApiKey(e.detail)}
      >
        <a
          slot="helper-text"
          href={p.keysUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-violet-600 hover:underline"
        >
          Get a key <AppIcon name="external-link" size={12} />
        </a>
      </IgrInput>

      {p.optionalEndpoint && (
        <div className="-mt-2 flex flex-col items-start gap-2">
          <IgrButton variant="flat" type="button" onClick={() => setShowEndpoint((s) => !s)}>
            {showEndpoint ? '− Hide' : '+ Advanced'} · local / OpenAI-compatible endpoint
          </IgrButton>
          {showEndpoint && (
            <IgrInput
              className="w-full"
              label="Endpoint"
              value={endpoint}
              placeholder="http://localhost:11434/v1"
              onInput={(e) => setEndpoint(e.detail)}
            />
          )}
        </div>
      )}

      <IgrButton type="submit" disabled={busy} className="mt-2 w-full">
        {busy && <IgrCircularProgress slot="prefix" indeterminate hideLabel style={SPINNER_16} />}
        Save &amp; {status.configured ? 'restart' : 'start'}
      </IgrButton>

      <p className="-mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <AppIcon name="lock" size={12} /> Stored encrypted on this machine.
      </p>
    </form>
  );

  if (dismissable) {
    return (
      <IgrDialog open closeOnOutsideClick hideDefaultAction className="setup-dialog" onClosed={onClose}>
        {form}
      </IgrDialog>
    );
  }
  return (
    <div className="grid h-full place-items-center overflow-auto bg-gradient-to-b from-slate-50 to-violet-50 p-6">
      <IgrCard className="setup-card w-full max-w-lg p-7">{form}</IgrCard>
    </div>
  );
}

function StartingScreen({ restarting }: { restarting?: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-50/95 p-6 backdrop-blur-sm">
      <div role="status" className="flex max-w-sm flex-col items-center text-center">
        <IgrCircularProgress indeterminate hideLabel style={{ '--diameter': '32px' } as CSSProperties} />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          {restarting ? 'Restarting…' : 'Starting up…'}
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          {restarting
            ? 'Applying your new AI settings — the server is restarting. This takes a few seconds; the chat will be ready in a moment.'
            : 'Applying your settings, seeding the database, and warming up. This can take up to a minute on the first run.'}
        </p>
      </div>
    </div>
  );
}
