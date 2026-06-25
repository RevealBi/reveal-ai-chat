import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { AppProvider, useApp } from './lib/appContext';
import { Sidebar } from './components/Sidebar';
import { ConversationView } from './components/ConversationView';
import { ArtifactPanel } from './components/ArtifactPanel';
import { load, save } from './lib/storage';

/** Drag handle between the conversation and the docked dashboard panel. */
function ResizeDivider({
  width,
  onResize,
  onCommit,
}: {
  width: number;
  onResize: (w: number) => void;
  onCommit: (w: number) => void;
}) {
  function onDown(e: ReactMouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    let latest = startW;
    const move = (ev: MouseEvent) => {
      latest = Math.min(Math.max(startW + (startX - ev.clientX), 340), window.innerWidth - 560);
      onResize(latest);
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      onCommit(latest);
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  return (
    <div
      onMouseDown={onDown}
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize"
      className="w-1.5 shrink-0 cursor-col-resize bg-slate-200 transition-colors hover:bg-violet-400"
    />
  );
}

function Shell() {
  const { active, newChat, panel } = useApp();
  const [panelWidth, setPanelWidth] = useState<number>(() => load('panelWidth', 460));

  // Always have an active conversation (creates one on first load / after delete-all).
  useEffect(() => {
    if (!active) newChat();
  }, [active, newChat]);

  return (
    <div className="relative flex h-full">
      <Sidebar />
      <ConversationView />
      {panel && !panel.expanded && (
        <ResizeDivider
          width={panelWidth}
          onResize={setPanelWidth}
          onCommit={(w) => save('panelWidth', w)}
        />
      )}
      {panel && <ArtifactPanel width={panelWidth} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
