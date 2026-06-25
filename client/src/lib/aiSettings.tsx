import { createContext, useContext } from 'react';
import type { SetupStatus } from './setup';

/**
 * Carries the active setup status (provider / model / license) and lets anything in the app
 * open the Settings dialog to change the provider, model, or key.
 */
export const AiSettingsContext = createContext<{ status: SetupStatus | null; openSettings: () => void }>({
  status: null,
  openSettings: () => {},
});

export const useAiSettings = () => useContext(AiSettingsContext);
