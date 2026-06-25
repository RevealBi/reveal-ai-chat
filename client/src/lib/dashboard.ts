import { RevealUtility } from 'reveal-sdk';

/**
 * Parse a dashboard JSON string into an RVDashboard. Always returns a NEW instance: a RevealView
 * takes ownership of the dashboard it's assigned, so each render surface must build its own —
 * never share one instance across views. Throws on invalid JSON (callers handle it).
 */
export function parseDashboard(dashboardJson: string) {
  return RevealUtility.createDashboardFromJsonObject(JSON.parse(dashboardJson));
}

export interface DashboardMeta {
  /** Title of the first visualization, or null if none. */
  title: string | null;
  /** Number of visualizations in the dashboard. */
  chartCount: number;
}

/**
 * Cheap metadata, computed once when a dashboard arrives from the LLM and stored on the message,
 * so the UI doesn't rebuild a whole dashboard just to read a title or count. Safe on bad JSON.
 */
export function dashboardMeta(dashboardJson: string): DashboardMeta {
  try {
    const vizes: any[] = Array.from(parseDashboard(dashboardJson).visualizations ?? []);
    return { title: vizes[0]?.title ?? null, chartCount: vizes.length };
  } catch {
    return { title: null, chartCount: 0 };
  }
}
