import { useEffect, useRef } from 'react';
import { RevealView } from 'reveal-sdk';
import { parseDashboard } from '../lib/dashboard';
import { useApp } from '../lib/appContext';
import { IgrNavbar } from 'igniteui-react';
import { AppIconButton } from './AppIcon';
import { uid } from '../lib/conversations';

/**
 * The "big view" — the full Reveal 2.0 dashboard, slid in from the right and
 * expandable to full-screen. Opened from any inline chart's "Open dashboard".
 */
export function ArtifactPanel() {
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
    // Docked, it fills the splitter's end pane; expanded, it covers the whole window.
    <div className={panel.expanded ? 'fixed inset-0 z-20 flex flex-col bg-white' : 'flex min-w-0 flex-1 flex-col bg-white'}>
      <IgrNavbar className="panel-navbar">
        <div className="text-left">
          <div className="text-sm font-medium text-slate-800">Dashboard</div>
          <div className="text-[11px] text-slate-400">Live · Reveal 2.0</div>
        </div>
        <div slot="end" className="flex items-center gap-1">
          <AppIconButton
            name={panel.expanded ? 'minimize-2' : 'maximize-2'}
            aria-label={panel.expanded ? 'Collapse' : 'Expand to full screen'}
            onClick={toggleExpand}
          />
          <AppIconButton name="x" aria-label="Close dashboard" onClick={closePanel} />
        </div>
      </IgrNavbar>
      <div id={idRef.current} ref={hostRef} className="relative min-h-0 flex-1 bg-slate-50 p-2" />
    </div>
  );
}
