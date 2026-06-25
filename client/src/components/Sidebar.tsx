import { useApp } from '../lib/appContext';
import { useAiSettings } from '../lib/aiSettings';
import { groupByRecency } from '../lib/conversations';
import { Sparkles, PencilLine, ChevronDown, Settings, MessageSquare, Trash2 } from 'lucide-react';

export function Sidebar() {
  const { conversations, active, newChat, selectChat, deleteChat, dataset, datasets, setDataset } =
    useApp();
  const { openSettings } = useAiSettings();
  const groups = groupByRecency(conversations);

  return (
    <div className="flex w-[244px] shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
          <Sparkles className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="text-sm font-semibold tracking-tight text-slate-900">Reveal AI Chat</span>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={newChat}
          className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
        >
          <PencilLine className="h-4 w-4 text-violet-600" />
          New chat
        </button>
      </div>

      <div className="px-3 pb-2">
        <label className="mb-1 block px-1 text-[11px] font-medium text-slate-400">Dataset</label>
        <div className="relative">
          <select
            value={dataset.id}
            onChange={(e) => setDataset(datasets.find((d) => d.id === e.target.value) ?? dataset)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none hover:border-slate-300 focus:border-violet-400"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {groups.length === 0 && (
          <p className="px-2 py-3 text-xs text-slate-400">No conversations yet — start one above.</p>
        )}
        {groups.map((g) => (
          <div key={g.label} className="mb-1">
            <div className="px-2 py-1 text-[11px] font-medium text-slate-400">{g.label}</div>
            {g.items.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] ${
                  active?.id === c.id
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <button
                  onClick={() => selectChat(c.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{c.title}</span>
                </button>
                <button
                  onClick={() => deleteChat(c.id)}
                  aria-label="Delete chat"
                  className="shrink-0 opacity-0 transition group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5 border-t border-slate-200 px-3.5 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-[11px] font-medium text-violet-700">
          BL
        </span>
        <span className="text-[13px] text-slate-700">Brian L.</span>
        <span className="flex-1" />
        <button
          onClick={openSettings}
          aria-label="AI settings"
          title="AI settings"
          className="text-slate-400 transition hover:text-violet-600"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
