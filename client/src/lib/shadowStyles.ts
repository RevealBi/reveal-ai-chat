// IgrChat portals custom renderer output (messages, composer) into its internal shadow roots, where
// document styles — Tailwind utilities, the .md rules, and the <style> tags the Reveal SDK injects
// into <head> on demand for tooltips/legends — don't reach. The chat's own `adoptRootStyles` option
// snapshots document styles only once, so it misses anything added later. This keeps a live mirror
// instead: one shared set of constructed sheets, rebuilt whenever <head> changes (incl. Vite HMR),
// and adopted by every shadow root that has content registered through `adoptDocumentStyles`.

const roots = new Map<ShadowRoot, number>(); // root → number of registered elements inside it
let mirrored: CSSStyleSheet[] = [];
let observer: MutationObserver | null = null;
let scheduled = false;

function cloneDocumentSheets(): CSSStyleSheet[] {
  const out: CSSStyleSheet[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin (e.g. Google Fonts) — its @font-face applies document-wide anyway
    }
    const copy = new CSSStyleSheet();
    // Leave out Tailwind's preflight (`@layer base`): styles from a component's outer scope beat
    // its own `:host` rules, so mirroring the element reset would zero the padding/margins of
    // IgrChat's internal elements. Utilities, the .md rules and component styles still apply.
    const text = Array.from(rules)
      .filter((r) => !(r instanceof CSSLayerBlockRule && r.name === 'base'))
      .map((r) => r.cssText)
      .join('\n');
    try {
      copy.replaceSync(text); // @import rules are dropped
    } catch {
      continue;
    }
    out.push(copy);
  }
  return out;
}

function adopt(root: ShadowRoot, previous: CSSStyleSheet[]) {
  // Keep the component's own sheets (first, so ours win ties) and swap only the mirrored ones.
  root.adoptedStyleSheets = [
    ...root.adoptedStyleSheets.filter((s) => !previous.includes(s)),
    ...mirrored,
  ];
}

function rebuild() {
  scheduled = false;
  const previous = mirrored;
  mirrored = cloneDocumentSheets();
  for (const root of roots.keys()) adopt(root, previous);
}

function scheduleRebuild() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(rebuild);
}

function watchHead() {
  observer = new MutationObserver((records) => {
    for (const r of records) {
      // A <link rel="stylesheet"> has no cssRules until it loads.
      r.addedNodes.forEach((n) => {
        if (n instanceof HTMLLinkElement) n.addEventListener('load', scheduleRebuild, { once: true });
      });
    }
    scheduleRebuild();
  });
  observer.observe(document.head, { childList: true, subtree: true, characterData: true });
  mirrored = cloneDocumentSheets();
}

/**
 * Ref callback: makes document styles apply inside the shadow root that contains `el`. No-op in the
 * light DOM. Returns a cleanup (React 19 ref-callback cleanup) that releases the root when the last
 * registered element inside it unmounts.
 */
export function adoptDocumentStyles(el: Element | null): (() => void) | undefined {
  const root = el?.getRootNode();
  if (!(root instanceof ShadowRoot)) return;
  return adoptDocumentStylesIn(root);
}

/** Same as `adoptDocumentStyles`, for a shadow root you already hold (e.g. a component's own). */
export function adoptDocumentStylesIn(root: ShadowRoot): () => void {
  if (!observer) watchHead();
  const count = roots.get(root) ?? 0;
  roots.set(root, count + 1);
  if (count === 0) adopt(root, mirrored);
  return () => {
    const n = (roots.get(root) ?? 1) - 1;
    if (n > 0) {
      roots.set(root, n);
      return;
    }
    roots.delete(root);
    root.adoptedStyleSheets = root.adoptedStyleSheets.filter((s) => !mirrored.includes(s));
  };
}
