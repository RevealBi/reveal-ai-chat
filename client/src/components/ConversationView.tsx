import { useEffect, useRef, useState } from 'react';
import { getClient } from '../lib/revealClient';
import { useApp, estimateTokens } from '../lib/appContext';
import { md } from '../lib/md';
import { titleFrom, uid, type ChatMessage } from '../lib/conversations';
import { useAiSettings } from '../lib/aiSettings';
import { providerLabel } from '../lib/setup';
import { InlineChart } from './InlineChart';
import { clearAll } from '../lib/storage';
import { Sparkles, ArrowUp, RotateCcw, Lightbulb, LayoutDashboard } from 'lucide-react';

interface StreamState {
  html: string;
  logs: string[];
}

function Avatar() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
      <Sparkles className="h-4 w-4" />
    </span>
  );
}

function MessageRow({
  msg,
  onExplain,
  onOpen,
  busy,
}: {
  msg: ChatMessage;
  onExplain: (d: string) => void;
  onOpen: (d: string) => void;
  busy: boolean;
}) {
  const [count, setCount] = useState(0);
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-violet-600 px-4 py-2.5 text-[15px] leading-relaxed text-white">
          {msg.text}
        </div>
      </div>
    );
  }
  if (msg.role === 'error') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700">
        {msg.text}
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <Avatar />
      <div className="min-w-0 flex-1">
        {msg.html && (
          <div
            className="md text-[15px] leading-relaxed text-slate-800"
            dangerouslySetInnerHTML={{ __html: msg.html }}
          />
        )}
        {msg.dashboardJson && (
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-xs font-medium text-slate-600">
                Dashboard{count > 1 ? ` · ${count} charts` : ''}
              </span>
              <div className="flex items-center gap-3">
                <button
                  disabled={busy}
                  onClick={() => onExplain(msg.dashboardJson!)}
                  className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-40"
                >
                  <Lightbulb className="h-3.5 w-3.5" /> Explain
                </button>
                <button
                  onClick={() => onOpen(msg.dashboardJson!)}
                  className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" /> Open dashboard
                </button>
              </div>
            </div>
            <InlineChart dashboardJson={msg.dashboardJson} onCount={setCount} />
          </div>
        )}
      </div>
    </div>
  );
}

export function ConversationView() {
  const { active, updateActive, dataset, usageTokens, addTokens, openPanel } = useApp();
  const { status, openSettings } = useAiSettings();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState<StreamState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = active?.messages ?? [];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo(0, el.scrollHeight);
  }, [messages.length, stream, active?.id]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy || !active) return;
    setInput('');
    setBusy(true);
    updateActive((c) => {
      c.messages.push({ id: uid(), role: 'user', text: q });
      if (c.title === 'New chat') c.title = titleFrom(q);
    });

    const baseDashboard = active.dashboardJson;
    setStream({ html: '', logs: [] });
    let streamed = '';
    try {
      const s = await getClient().ai.chat.sendMessage({
        message: q,
        datasourceId: dataset.datasourceId,
        dashboard: baseDashboard,
        model: status?.model ?? undefined,
        stream: true,
      });
      s.on('progress', (m: string) => {
        setStream((p) => (p ? { ...p, logs: [...p.logs, m] } : p));
      });
      s.on('text', (chunk: string) => {
        streamed += chunk;
        setStream((p) => (p ? { ...p, html: md(streamed) } : p));
      });
      s.on('error', (e: any) =>
        updateActive((c) => {
          c.messages.push({ id: uid(), role: 'error', text: String(e?.message ?? e) });
        }),
      );
      const result = await s.finalResponse();
      updateActive((c) => {
        c.messages.push({
          id: uid(),
          role: 'assistant',
          html: md(streamed || result.explanation || ''),
          dashboardJson: result.dashboard,
        });
        if (result.dashboard) c.dashboardJson = result.dashboard;
      });
      if (result.error)
        updateActive((c) => {
          c.messages.push({ id: uid(), role: 'error', text: result.error });
        });
      addTokens(estimateTokens(q + streamed));
    } catch (e: any) {
      updateActive((c) => {
        c.messages.push({ id: uid(), role: 'error', text: 'Error: ' + (e?.message ?? e) });
      });
    } finally {
      setStream(null);
      setBusy(false);
    }
  }

  async function explain(dashboardJson: string) {
    if (busy || !active) return;
    setBusy(true);
    updateActive((c) => {
      c.messages.push({ id: uid(), role: 'user', text: 'Explain this chart' });
    });
    setStream({ html: '', logs: [] });
    let streamed = '';
    try {
      const s = await getClient().ai.insights.get({
        dashboard: dashboardJson,
        type: 'summary',
        model: status?.model ?? undefined,
        stream: true,
      });
      s.on('progress', (m: string) => {
        setStream((p) => (p ? { ...p, logs: [...p.logs, m] } : p));
      });
      s.on('text', (chunk: string) => {
        streamed += chunk;
        setStream((p) => (p ? { ...p, html: md(streamed) } : p));
      });
      const result = await s.finalResponse();
      updateActive((c) => {
        c.messages.push({ id: uid(), role: 'assistant', html: md(streamed || result.explanation || '') });
      });
      addTokens(estimateTokens(streamed));
    } catch (e: any) {
      updateActive((c) => {
        c.messages.push({ id: uid(), role: 'error', text: 'Error: ' + (e?.message ?? e) });
      });
    } finally {
      setStream(null);
      setBusy(false);
    }
  }

  function resetWorkspace() {
    clearAll();
    try {
      getClient().ai.chat.resetContext?.();
    } catch {
      /* no provider */
    }
    location.reload();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-white">
      <header className="flex h-12 items-center gap-3 border-b border-slate-200 px-5">
        <span className="truncate text-sm font-medium text-slate-800">{active?.title ?? 'New chat'}</span>
        <span className="flex-1" />
        <button
          onClick={openSettings}
          title="AI provider & model — click to change"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-violet-300 hover:text-violet-700"
        >
          {providerLabel(status?.provider ?? 'OpenAI')}
          <span className="text-slate-400"> · </span>
          {status?.model ?? status?.deployment ?? '—'}
        </button>
        <span
          className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500 sm:inline"
          title="Client-side estimate; production metering uses the SDK's usage events"
        >
          ~{usageTokens.toLocaleString()} tokens
        </span>
        <button
          onClick={resetWorkspace}
          title="Reset workspace"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-6">
          {messages.length === 0 && !stream && (
            <div className="mt-8">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                What do you want to know about your {dataset.label} data?
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Ask in plain language — I'll build the dashboard and explain it.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {dataset.prompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => send(p)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-[13px] text-slate-600 transition hover:border-violet-300 hover:text-violet-700"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageRow key={m.id} msg={m} onExplain={explain} onOpen={openPanel} busy={busy} />
          ))}

          {stream && (
            <div className="flex gap-3">
              <Avatar />
              <div className="min-w-0 flex-1">
                {stream.logs.length > 0 && !stream.html && (
                  <div className="flex items-center gap-2 text-[13px] text-slate-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
                    {stream.logs[stream.logs.length - 1]}
                  </div>
                )}
                {stream.html && (
                  <div
                    className="md text-[15px] leading-relaxed text-slate-800"
                    dangerouslySetInnerHTML={{ __html: stream.html }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-5 pt-2">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 shadow-sm focus-within:border-violet-400">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={`Ask about your ${dataset.label} data…`}
              className="max-h-44 flex-1 resize-none bg-transparent py-1.5 text-[15px] text-slate-800 outline-none placeholder:text-slate-400"
            />
            <button
              disabled={busy || !input.trim()}
              onClick={() => send()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Governed by the Reveal AI SDK — no SQL or raw rows leave to the model.
          </p>
        </div>
      </div>
    </div>
  );
}
