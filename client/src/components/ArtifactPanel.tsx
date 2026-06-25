import { useEffect, useRef } from 'react';
import { RevealView } from 'reveal-sdk';
import { parseDashboard } from '../lib/dashboard';
import { useApp } from '../lib/appContext';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { uid } from '../lib/conversations';

/**
 * The "big view" — the full Reveal 2.0 dashboard, slid in from the right and
 * expandable to full-screen. Opened from any inline chart's "Open dashboard".
 */
export function ArtifactPanel({ width }: { width?: number }) {
  const { panel, closePanel, toggleExpand } = useApp();
  const hostRef = useRef<HTMLDivElement>(null);
  const idRef = useRef('rv-panel-' + uid());
  const rvRef = useRef<any>(null);

  useEffect(() => {
    if (!panel || !hostRef.current) return;
    if (!rvRef.current) {
      const rv = new RevealView('#' + idRef.current);
      rv.canEdit = false;
      rv.canSaveAs = false;
      rv.canCopyVisualization = false;
      rvRef.current = rv;
    }
    try {
      rvRef.current.dashboard = parseDashboard(panel.dashboardJson);
    } catch {
      /* invalid dashboard json */
    }
  }, [panel?.dashboardJson]);

  if (!panel) return null;

  return (
    <div
      className={
        panel.expanded
          ? 'absolute inset-0 z-20 flex flex-col bg-white'
          : 'flex shrink-0 flex-col bg-white'
      }
      style={panel.expanded ? undefined : { width: width ?? 440 }}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <div>
          <div className="text-sm font-medium text-slate-800">Dashboard</div>
          <div className="text-[11px] text-slate-400">Live · Reveal 2.0</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleExpand}
            aria-label={panel.expanded ? 'Collapse' : 'Expand to full screen'}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            {panel.expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={closePanel}
            aria-label="Close dashboard"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div id={idRef.current} ref={hostRef} className="relative min-h-0 flex-1 bg-slate-50 p-2" />
    </div>
  );
}
