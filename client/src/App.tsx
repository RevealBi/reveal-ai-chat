import { useEffect, useRef, useState } from 'react';
import { IgrSplitter } from 'igniteui-react';
import { AppProvider, useApp } from './lib/appContext';
import { Sidebar } from './components/Sidebar';
import { ConversationView } from './components/ConversationView';
import { ArtifactPanel } from './components/ArtifactPanel';
import { load, save } from './lib/storage';

function Shell() {
  const { active, newChat, panel } = useApp();
  const [panelWidth, setPanelWidth] = useState<number>(() => load('panelWidth', 460));
  const docked = !!panel && !panel.expanded;
  const splitterRef = useRef<IgrSplitter>(null);

  // Always have an active conversation (creates one on first load / after delete-all).
  useEffect(() => {
    if (!active) newChat();
  }, [active, newChat]);

  return (
    <div className="relative flex h-full">
      <Sidebar />
      {/* Always mounted (so opening a dashboard never remounts the chat mid-response); with no
          docked dashboard the end pane is collapsed to 0 and the bar is hidden (see index.css). */}
      <IgrSplitter
        ref={splitterRef}
        className={`app-splitter min-w-0 flex-1 ${docked ? '' : 'no-panel'}`}
        endSize={docked ? `${panelWidth}px` : '0px'}
        endMinSize={docked ? '340px' : '0px'}
        startMinSize="480px"
        disableResize={!docked}
        hideCollapseButtons
        onResizeEnd={(e) => {
          // A drag pins both panes (the chat pane as a percentage), which would leave it stuck at
          // that share when the sidebar collapses or the dashboard closes. Keep the chat pane
          // flexible; only the dashboard width is fixed, and remembered.
          const width = Math.round(e.detail.endPanelSize);
          if (splitterRef.current) {
            splitterRef.current.startSize = 'auto';
            splitterRef.current.endSize = `${width}px`;
          }
          setPanelWidth(width);
          save('panelWidth', width);
        }}
      >
        <div slot="start" className="flex h-full min-w-0">
          <ConversationView />
        </div>
        <div slot="end" className="flex h-full min-w-0">
          <ArtifactPanel />
        </div>
      </IgrSplitter>
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
