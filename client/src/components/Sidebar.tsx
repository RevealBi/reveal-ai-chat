import { useState, type KeyboardEvent } from 'react';
import {
  IgrAvatar,
  IgrButton,
  IgrNavDrawer,
  IgrNavDrawerHeaderItem,
  IgrNavDrawerItem,
  IgrSelect,
  IgrSelectItem,
  IgrTooltip,
} from 'igniteui-react';
import { useApp } from '../lib/appContext';
import { useAiSettings } from '../lib/aiSettings';
import { groupByRecency } from '../lib/conversations';
import { load, save } from '../lib/storage';
import { AppIcon, AppIconButton } from './AppIcon';

/** Nav drawer items aren't focusable, so give clickable ones button semantics and keys. */
function asButton(onActivate: () => void) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate();
      }
    },
  };
}

function Brand() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
      <AppIcon name="sparkles" size={16} />
    </span>
  );
}

/**
 * The app sidebar: a relative IgrNavDrawer that collapses to a mini rail (brand, expand, new chat,
 * settings, avatar), like other chat apps. The open/collapsed choice persists per browser.
 */
export function Sidebar() {
  const { conversations, active, newChat, selectChat, deleteChat, dataset, datasets, setDataset } =
    useApp();
  const { openSettings } = useAiSettings();
  const [open, setOpen] = useState(() => load('sidebarOpen', true));
  const groups = groupByRecency(conversations);

  function toggle() {
    const next = !open;
    setOpen(next);
    save('sidebarOpen', next);
  }

  return (
    <IgrNavDrawer position="relative" open={open} label="Conversations" className="app-sidebar">
      {/* Full drawer */}
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <Brand />
          <span className="flex-1 text-sm font-semibold tracking-tight text-slate-900">Reveal AI Chat</span>
          <AppIconButton name="panel-left-close" aria-label="Collapse sidebar" aria-expanded="true" onClick={toggle} />
        </div>

        <div className="px-3 pb-2">
          <IgrButton variant="outlined" className="sidebar-new w-full" onClick={() => newChat()}>
            <AppIcon slot="prefix" name="pencil-line" size={16} />
            New chat
          </IgrButton>
        </div>

        <div className="px-3 pb-2">
          <IgrSelect
            label="Dataset"
            value={dataset.id}
            onChange={(e) => setDataset(datasets.find((d) => d.id === e.detail.value) ?? dataset)}
          >
            {datasets.map((d) => (
              <IgrSelectItem key={d.id} value={d.id}>
                {d.label}
              </IgrSelectItem>
            ))}
          </IgrSelect>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
          {groups.length === 0 && (
            <p className="px-2 py-3 text-xs text-slate-400">No conversations yet — start one above.</p>
          )}
          {groups.map((g) => (
            <div key={g.label} role="group" aria-label={g.label} className="mb-1">
              <IgrNavDrawerHeaderItem>{g.label}</IgrNavDrawerHeaderItem>
              {g.items.map((c) => (
                <IgrNavDrawerItem
                  key={c.id}
                  active={active?.id === c.id}
                  aria-current={active?.id === c.id ? 'page' : undefined}
                  className="group"
                  {...asButton(() => selectChat(c.id))}
                >
                  <AppIcon slot="icon" name="message-square" size={14} />
                  <span slot="content" className="flex min-w-0 items-center gap-1">
                    <span className="flex-1 truncate">{c.title}</span>
                    <AppIconButton
                      name="trash-2"
                      aria-label={`Delete chat "${c.title}"`}
                      className="opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(c.id);
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </span>
                </IgrNavDrawerItem>
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2.5 border-t border-slate-200 px-3.5 py-2.5">
          <IgrAvatar initials="BL" shape="circle" className="user-avatar" aria-hidden="true" />
          <span className="text-[13px] text-slate-700">Brian L.</span>
          <span className="flex-1" />
          <AppIconButton name="settings" aria-label="AI settings" onClick={openSettings} />
        </div>
      </div>

      {/* Mini rail (shown while collapsed) */}
      <div slot="mini" className="flex h-full flex-col items-center gap-1 py-3">
        <Brand />
        <AppIconButton id="sb-expand" name="panel-left-open" aria-label="Expand sidebar" aria-expanded="false" className="mt-2" onClick={toggle} />
        <AppIconButton id="sb-new" name="pencil-line" aria-label="New chat" onClick={() => newChat()} />
        <span className="flex-1" />
        <AppIconButton id="sb-settings" name="settings" aria-label="AI settings" onClick={openSettings} />
        <IgrAvatar initials="BL" shape="circle" aria-hidden="true" className="user-avatar mt-1" />
        <IgrTooltip anchor="sb-expand" placement="right">Expand sidebar</IgrTooltip>
        <IgrTooltip anchor="sb-new" placement="right">New chat</IgrTooltip>
        <IgrTooltip anchor="sb-settings" placement="right">AI settings</IgrTooltip>
      </div>
    </IgrNavDrawer>
  );
}
