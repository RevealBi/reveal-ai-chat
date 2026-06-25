// Shapes returned by the Reveal AI client (see help.revealbi.io/ai/sdk-chat &
// /ai/sdk-insights). Kept intentionally small — just what the UI consumes.

export type ChatResponse = {
  explanation?: string;
  dashboard?: string; // dashboard JSON the AI built/edited
  error?: string;
};

export type InsightResponse = {
  explanation: string;
};

export type InsightType = 'summary' | 'analysis' | 'forecast';

export interface VerticalConfig {
  /** Stable id; also the Chat `datasourceId` unless overridden. */
  id: string;
  label: string;
  tagline: string;
  /** Must match the server DataSourceProvider + Reveal/Metadata/catalog.json. */
  datasourceId: string;
  /** Reveal dashboard id (.rdash on the server) used as the Explain default. */
  defaultDashboardId?: string;
  /** Accent color (hex) for light branding per vertical. */
  accent: string;
  /** Golden-path starter prompts that always demo well. */
  prompts: string[];
}
