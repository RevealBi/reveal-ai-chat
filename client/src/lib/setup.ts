// Talks to the server's setup/settings endpoints. Kept free of the heavy reveal-sdk import
// so it can run before (and instead of) initializing Reveal.
//
//   License  -> /api/setup        (startup-bound: needs a restart to apply)
//   AI keys  -> /api/settings/ai  (runtime: provider/model/key swap live, no restart)

const HOST = import.meta.env.DEV ? 'http://localhost:5111/' : window.location.origin + '/';

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

async function postJson(path: string, body: unknown): Promise<void> {
  const r = await fetch(HOST + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}) as any);
    throw new Error(e.error || `Save failed (${r.status})`);
  }
}

// ---- License (startup) -----------------------------------------------------

export type LicenseStatus = { configured: boolean; licenseError: boolean };

export async function getLicenseStatus(): Promise<LicenseStatus> {
  const r = await fetch(HOST + 'api/setup/status');
  if (!r.ok) throw new Error('status ' + r.status);
  return r.json();
}

export const saveLicense = (license: string) => postJson('api/setup', { license });

/** After saving a license the server restarts. Poll until it's back and licensed. */
export async function waitUntilLicensed(maxSeconds = 150): Promise<boolean> {
  const deadline = Date.now() + maxSeconds * 1000;
  await sleep(1500);
  while (Date.now() < deadline) {
    try {
      const s = await getLicenseStatus();
      if (s.configured) return true;
    } catch {
      /* restarting — keep waiting */
    }
    await sleep(2000);
  }
  return false;
}

// ---- AI settings (runtime) -------------------------------------------------

export type AiSettings = { provider: string; model: string; endpoint: string | null; hasKey: boolean };

export async function getAiSettings(): Promise<AiSettings> {
  const r = await fetch(HOST + 'api/settings/ai');
  if (!r.ok) throw new Error('ai status ' + r.status);
  return r.json();
}

export type AiSettingsPayload = { provider: string; model: string; apiKey?: string; endpoint?: string };

export const saveAiSettings = (p: AiSettingsPayload) => postJson('api/settings/ai', p);

// ---- Providers (drives the dialog dropdowns) -------------------------------

export type ProviderId = 'OpenAI';

export const PROVIDERS: Record<
  ProviderId,
  { label: string; models: string[]; keyPlaceholder: string; keysUrl: string }
> = {
  OpenAI: {
    label: 'OpenAI',
    models: ['gpt-4.1', 'gpt-4o', 'gpt-4o-mini'],
    keyPlaceholder: 'sk-…',
    keysUrl: 'https://platform.openai.com/api-keys',
  },
  // Phase 2: Anthropic, Google, Azure OpenAI
};
