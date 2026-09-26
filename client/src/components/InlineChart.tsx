import { useEffect, useRef, useState } from 'react';
import { RevealView } from 'reveal-sdk';
import { parseDashboard } from '../lib/dashboard';
import { AppIconButton } from './AppIcon';

/**
 * One live Reveal 2.0 visualization inline (singleVisualizationMode, chrome off).
 * If the dashboard has multiple visualizations, a carousel re-points
 * `maximizedVisualization` so you can page through them — real, data-bound charts.
 *
 * The dashboard's visualizations are populated synchronously by
 * createDashboardFromJsonObject. They must be read BEFORE the dashboard is handed
 * to the RevealView — assigning it to the view takes ownership of the collection.
 */
export function InlineChart({ dashboardJson }: { dashboardJson: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rvRef = useRef<any>(null);
  const vizRef = useRef<any[]>([]);
  const [count, setCount] = useState(0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (rvRef.current || !hostRef.current) return;
    try {
      const dashboard = parseDashboard(dashboardJson);

      // Capture the visualizations before the view takes the dashboard.
      const vizes: any[] = Array.from(dashboard.visualizations ?? []);
      vizRef.current = vizes;
      setCount(vizes.length);

      // Pass the element, not an '#id' selector: this renders inside IgrChat's shadow DOM, where
      // document.querySelector can't see it. The SDK accepts an Element despite the string typing.
      const rv = new RevealView(hostRef.current as unknown as string);
      rv.singleVisualizationMode = true;
      rv.dashboard = dashboard;
      if (vizes.length) rv.maximizedVisualization = vizes[0];
      rvRef.current = rv;
    } catch {
      /* invalid dashboard json — skip */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goTo(n: number) {
    const rv = rvRef.current;
    const vizes = vizRef.current;
    if (!rv || vizes.length < 2) return;
    const next = ((n % vizes.length) + vizes.length) % vizes.length;
    setIndex(next);
    rv.maximizedVisualization = vizes[next];
  }

  return (
    <div>
      <div ref={hostRef} className="relative h-[360px] w-full" />
      {count > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-100 bg-white py-1">
          <AppIconButton name="chevron-left" aria-label="Previous chart" onClick={() => goTo(index - 1)} />
          <span className="min-w-12 text-center text-xs tabular-nums text-slate-500" aria-live="polite">
            {index + 1} / {count}
          </span>
          <AppIconButton name="chevron-right" aria-label="Next chart" onClick={() => goTo(index + 1)} />
        </div>
      )}
    </div>
  );
}
