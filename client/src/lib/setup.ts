// Talks to the server's /api/setup endpoint. Kept free of the heavy reveal-sdk import so it
// can run before (and instead of) initializing Reveal.
//
// One dialog captures the Reveal license (only when one isn't already present) plus the AI
// provider, key, and model. The server applies all of it at startup, so saving restarts the app.

import { API_HOST as HOST } from './serverUrl';

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

export type SetupStatus = {
  configured: boolean;
  licenseError: boolean;
  licenseNeeded: boolean;
  provider: string;
  model: string | null;
  endpoint: string | null;
  deployment: string | null;
  hasKey: boolean;
};

export async function getSetupStatus(): Promise<SetupStatus> {
  const r = await fetch(HOST + 'api/setup/status');
  if (!r.ok) throw new Error('status ' + r.status);
  return r.json();
}

export type SetupPayload = {
  license?: string;
  provider: string;
  apiKey?: string;
  model?: string;
  endpoint?: string;
  deployment?: string;
};

export async function saveSetup(p: SetupPayload): Promise<void> {
  const r = await fetch(HOST + 'api/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}) as { error?: string });
    throw new Error(e.error || `Save failed (${r.status})`);
  }
}

/** After saving, the server restarts to apply. Poll until it's back and fully configured. */
export async function waitUntilConfigured(maxSeconds = 150): Promise<boolean> {
  const deadline = Date.now() + maxSeconds * 1000;
  await sleep(1500);
  while (Date.now() < deadline) {
    try {
      const s = await getSetupStatus();
      if (s.configured) return true;
    } catch {
      /* restarting — keep waiting */
    }
    await sleep(2000);
  }
  return false;
}

// ---- Providers (drives the setup dialog) -----------------------------------

export type ProviderId = 'OpenAI' | 'Anthropic' | 'AzureOpenAI';

export interface ProviderInfo {
  label: string;
  models: string[]; // empty -> the provider uses a deployment name instead (Azure)
  keyPlaceholder: string;
  keysUrl: string;
  needsEndpoint: boolean; // required resource endpoint (Azure)
  needsDeployment: boolean; // required deployment name (Azure)
  optionalEndpoint: boolean; // optional OpenAI-compatible / local base URL
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  OpenAI: {
    label: 'OpenAI',
    models: ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-4.1', 'gpt-4.1-mini'],
    keyPlaceholder: 'sk-…',
    keysUrl: 'https://platform.openai.com/api-keys',
    needsEndpoint: false,
    needsDeployment: false,
    optionalEndpoint: true,
  },
  Anthropic: {
    label: 'Anthropic',
    models: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
    keyPlaceholder: 'sk-ant-…',
    keysUrl: 'https://console.anthropic.com/settings/keys',
    needsEndpoint: false,
    needsDeployment: false,
    optionalEndpoint: false,
  },
  AzureOpenAI: {
    label: 'Azure OpenAI',
    models: [], // uses a deployment name
    keyPlaceholder: 'your Azure OpenAI key',
    keysUrl: 'https://portal.azure.com',
    needsEndpoint: true,
    needsDeployment: true,
    optionalEndpoint: false,
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export function providerLabel(id: string): string {
  return (PROVIDERS as Record<string, ProviderInfo>)[id]?.label ?? id;
}
