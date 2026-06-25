import { useEffect, useRef, useState } from 'react';
import { RevealView, RevealUtility } from 'reveal-sdk';
import { uid } from '../lib/conversations';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * One live Reveal 2.0 visualization inline (singleVisualizationMode, chrome off).
 * If the dashboard has multiple visualizations, a carousel re-points
 * `maximizedVisualization` so you can page through them — real, data-bound charts.
 *
 * The dashboard's visualizations are populated synchronously by
 * createDashboardFromJsonObject. They must be read BEFORE the dashboard is handed
 * to the RevealView — assigning it to the view takes ownership of the collection.
 */
export function InlineChart({
  dashboardJson,
  onCount,
}: {
  dashboardJson: string;
  onCount?: (n: number) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const idRef = useRef('rv-inline-' + uid());
  const rvRef = useRef<any>(null);
  const vizRef = useRef<any[]>([]);
  const [count, setCount] = useState(0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (rvRef.current || !hostRef.current) return;
    try {
      const dashboard = RevealUtility.createDashboardFromJsonObject(JSON.parse(dashboardJson));

      // Capture the visualizations before the view takes the dashboard.
      const vizes: any[] = Array.from(dashboard.visualizations ?? []);
      vizRef.current = vizes;
      setCount(vizes.length);
      onCount?.(vizes.length);

      const rv = new RevealView('#' + idRef.current);
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
      <div id={idRef.current} ref={hostRef} className="relative h-[360px] w-full" />
      {count > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-100 bg-white py-2">
          <button
            onClick={() => goTo(index - 1)}
            aria-label="Previous chart"
            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Chart ${i + 1} of ${count}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-4 bg-violet-500' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => goTo(index + 1)}
            aria-label="Next chart"
            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
