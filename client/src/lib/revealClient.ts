import { RevealSdkSettings, MountainLightTheme } from 'reveal-sdk';
import { RevealSdkClient } from '@revealbi/api';
import { API_HOST as HOST } from './serverUrl';

const ACCENT = '#7c3aed';

let client: any;

/** Brand the Reveal canvas to match the app shell (light, Inter, violet accent). */
function applyTheme() {
  const theme = new MountainLightTheme();
  theme.accentColor = ACCENT;
  theme.highlightColor = ACCENT;
  theme.dashboardBackgroundColor = '#f8fafc'; // slate-50 — matches the canvas area
  theme.visualizationBackgroundColor = '#ffffff';
  theme.fontColor = '#0f172a'; // slate-900
  theme.useRoundedCorners = true;
  theme.visualizationMargin = 8;
  theme.chartColors = [
    '#7c3aed', '#0ea5e9', '#f59e0b', '#ec4899', '#10b981',
    '#6366f1', '#ef4444', '#14b8a6', '#a855f7', '#84cc16',
  ];
  RevealSdkSettings.theme = theme; // must be set before any RevealView renders
}

export function initReveal(): any {
  if (client) return client;
  applyTheme();
  RevealSdkSettings.setBaseUrl(HOST);
  RevealSdkClient.initialize({ hostUrl: HOST });
  client = RevealSdkClient.getInstance();
  return client;
}

export function getClient(): any {
  return client ?? initReveal();
}

export const REVEAL_HOST = HOST;
