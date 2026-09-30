// Registers the app's icons (lucide, ISC license) with Ignite UI's icon registry, so every
// IgrIcon / IgrIconButton can use them by name: <IgrIcon collection={ICONS} name="sparkles" />.
import { registerIconFromText, setIconRef } from 'igniteui-react';
import {
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  Lightbulb,
  Lock,
  Maximize2,
  MessageSquare,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  PencilLine,
  RotateCcw,
  Settings,
  Sparkles,
  Trash2,
  X,
  type IconNode,
} from 'lucide';

/** The icon collection name to pass as `collection` on IgrIcon / IgrIconButton. */
export const ICONS = 'app';

const NODES = {
  'arrow-up': ArrowUp,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'circle-alert': CircleAlert,
  'external-link': ExternalLink,
  'key-round': KeyRound,
  'layout-dashboard': LayoutDashboard,
  lightbulb: Lightbulb,
  lock: Lock,
  'maximize-2': Maximize2,
  'message-square': MessageSquare,
  'minimize-2': Minimize2,
  'panel-left-close': PanelLeftClose,
  'panel-left-open': PanelLeftOpen,
  'pencil-line': PencilLine,
  'rotate-ccw': RotateCcw,
  settings: Settings,
  sparkles: Sparkles,
  'trash-2': Trash2,
  x: X,
} satisfies Record<string, IconNode>;

export type IconName = keyof typeof NODES;

function toSvg(node: IconNode): string {
  const children = node
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      return `<${tag} ${a}/>`;
    })
    .join('');
  // Inline `fill:none`: igc-icon's stylesheet fills SVGs, which beats a presentation attribute.
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="fill:none" stroke="currentColor" ' +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`
  );
}

for (const [name, node] of Object.entries(NODES)) registerIconFromText(name, toSvg(node), ICONS);

// IgrChat's built-in send button uses the "send_message" icon reference; point it at arrow-up.
setIconRef('send_message', 'default', { name: 'arrow-up', collection: ICONS });
