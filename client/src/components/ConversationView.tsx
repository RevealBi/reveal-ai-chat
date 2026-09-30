import { createContext, use, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  IgrAvatar,
  IgrBadge,
  IgrButton,
  IgrCard,
  IgrCardContent,
  IgrChat,
  IgrChip,
  type IgrChatMessage,
  type IgrChatOptions,
} from 'igniteui-react';
import { getClient } from '../lib/revealClient';
import { dashboardMeta } from '../lib/dashboard';
import { useApp, estimateTokens } from '../lib/appContext';
import { md } from '../lib/md';
import { titleFrom, uid, type ChatMessage } from '../lib/conversations';
import { useAiSettings } from '../lib/aiSettings';
import { providerLabel } from '../lib/setup';
import { clearAll, load, save } from '../lib/storage';
import { InlineChart } from './InlineChart';
import { AppIcon } from './AppIcon';

interface StreamState {
  html: string;
  logs: string[];
}

/** Id of the chat message that shows the assistant reply while it streams in. */
const STREAM_ID = '__stream';
const NO_MESSAGES: ChatMessage[] = [];

// `adoptRootStyles` covers the message and input shadow roots but not the chat's own, which holds
// the suggestions list. This is the one page rule that root needs; being static, it never rebuilds.
let suggestionsSheet: CSSStyleSheet | undefined;
function getSuggestionsSheet(): CSSStyleSheet {
  if (!suggestionsSheet) {
    suggestionsSheet = new CSSStyleSheet();
    suggestionsSheet.replaceSync(
      "[part~='suggestions-container'] igc-list { width: 100%; max-width: none; padding: 0; }",
    );
  }
  return suggestionsSheet;
}

/**
 * State and actions the IgrChat renderers read. IgrChat captures renderer functions once and only
 * re-invokes one when its own context (the message) changes, so renderers just mount components
 * that read everything else from here — portals keep React context, so they re-render normally.
 */
interface ChatUi {
  byId: Map<string, ChatMessage>;
  lastId: string | undefined;
  stream: StreamState | null;
  busy: boolean;
  explain: (d: string, title: string | null) => void;
  openPanel: (d: string) => void;
}

const ChatUiContext = createContext<ChatUi | null>(null);

function useChatUi(): ChatUi {
  const ui = use(ChatUiContext);
  if (!ui) throw new Error('useChatUi must be used inside ConversationView');
  return ui;
}

// Module-level, so renderer identities never change (IgrChat keeps the first ones it sees).
// The bubbles, input, send button and suggestions list are IgrChat's own; each message's body is
// rendered here (text, markdown, assistant avatar, dashboard card).
const BASE_OPTIONS: IgrChatOptions = {
  currentUserId: 'user',
  // Mirror page styles (Tailwind, the .md rules, and the <style> tags Reveal adds later for
  // tooltips/legends) into the message and input shadow roots, kept in sync as <head> changes.
  adoptRootStyles: true,
  disableInputAttachments: true,
  // Suggestions go below the input in the DOM; CSS moves them above it (see index.css).
  suggestionsPosition: 'below-input',
  renderers: {
    messageContent: ({ message, instance }) => <MessageContent id={message.id} chat={instance} />,
    messageActions: () => null,
  },
};

function AssistantAvatar() {
  return (
    <IgrAvatar shape="rounded" className="assistant-avatar shrink-0" aria-hidden="true">
      <AppIcon name="sparkles" size={16} />
    </IgrAvatar>
  );
}

function DashboardCard({ msg }: { msg: ChatMessage }) {
  const { busy, explain, openPanel } = useChatUi();
  const charts = msg.chartCount ?? 0;
  return (
    <IgrCard className="dashboard-card mt-3">
      {/* A plain header row: IgrCardHeader stacks extra content under the title, and the
          actions belong on the right. */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <span className="text-xs font-medium text-slate-600">
          Dashboard{charts > 1 ? ` · ${charts} charts` : ''}
        </span>
        <div className="flex items-center gap-3">
          <IgrButton
            variant="flat"
            className="card-action"
            disabled={busy}
            onClick={() => explain(msg.dashboardJson!, msg.title ?? null)}
          >
            <AppIcon slot="prefix" name="lightbulb" size={14} />
            Explain
          </IgrButton>
          <IgrButton variant="flat" className="card-action" onClick={() => openPanel(msg.dashboardJson!)}>
            <AppIcon slot="prefix" name="layout-dashboard" size={14} />
            Open dashboard
          </IgrButton>
        </div>
      </div>
      <IgrCardContent>
        <InlineChart dashboardJson={msg.dashboardJson!} />
      </IgrCardContent>
    </IgrCard>
  );
}

/** IgrChat `messageContent` renderer. Rendered inside the chat's shadow DOM. */
function MessageContent({ id, chat }: { id: string; chat: IgrChat }) {
  const { byId, lastId, stream } = useChatUi();
  const isLast = id === lastId;

  // IgrChat auto-scrolls when `messages` changes, but renderer portals mount a beat later, after
  // that scroll has measured. Re-trigger the chat's own scroll once the newest message is in.
  useLayoutEffect(() => {
    if (isLast) chat.requestUpdate('messages');
  }, [isLast, chat]);

  const msg = byId.get(id);

  if (msg?.role === 'user') return <div className="chat-text">{msg.text}</div>;

  if (msg?.role === 'error')
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700">
        {msg.text}
      </div>
    );

  // Assistant turn, finished or still streaming.
  const streaming = id === STREAM_ID;
  const html = streaming ? stream?.html : msg?.html;
  const lastLog = streaming && !html ? stream?.logs.at(-1) : undefined;
  return (
    <div className="flex gap-3">
      <AssistantAvatar />
      <div className="min-w-0 flex-1">
        {lastLog && (
          <div role="status" className="flex h-7 items-center gap-2 text-[13px] text-slate-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
            {lastLog}
          </div>
        )}
        {html && <div className="md text-[15px] leading-relaxed text-slate-800" dangerouslySetInnerHTML={{ __html: html }} />}
        {msg?.dashboardJson && <DashboardCard msg={msg} />}
      </div>
    </div>
  );
}

export function ConversationView() {
  const { active, updateActive, dataset, usageTokens, addTokens, openPanel } = useApp();
  const { status, openSettings } = useAiSettings();
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState<StreamState | null>(null);
  const [tipsOpen, setTipsOpen] = useState(() => load('promptsOpen', true));
  const chatRef = useRef<IgrChat>(null);

  const messages = active?.messages ?? NO_MESSAGES;

  // IgrChat gets ids plus `sender` (user turns are "sent" bubbles; errors and assistant turns are
  // "received"); the renderers look up the full message by id. A new array per stream update
  // also keeps the chat scrolled to the bottom while text streams in.
  const chatMessages = useMemo<IgrChatMessage[]>(() => {
    const list: IgrChatMessage[] = messages.map((m) => ({ id: m.id, sender: m.role, text: m.text ?? '' }));
    if (stream) list.push({ id: STREAM_ID, sender: 'assistant', text: '' });
    return list;
  }, [messages, stream]);

  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const hasMessages = messages.length > 0;

  const options = useMemo<IgrChatOptions>(
    () => ({
      ...BASE_OPTIONS,
      inputPlaceholder: `Ask about your ${dataset.label} data…`,
      // In an empty chat the starter prompts are cards in the empty state instead.
      suggestions: hasMessages ? dataset.prompts : [],
    }),
    [dataset.label, dataset.prompts, hasMessages],
  );

  /** Sends from the input, a suggestion chip or a starter card; clears the draft if it started. */
  function submit(text: string) {
    if (send(text) && chatRef.current) chatRef.current.draftMessage = { text: '', attachments: [] };
  }

  // Adds the suggestions rule to the chat's own shadow root (see getSuggestionsSheet).
  const chatRefCallback = (el: IgrChat | null) => {
    chatRef.current = el;
    const root = el?.shadowRoot;
    if (!root) return;
    const sheet = getSuggestionsSheet();
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    return () => {
      root.adoptedStyleSheets = root.adoptedStyleSheets.filter((s) => s !== sheet);
      chatRef.current = null;
    };
  };

  /** Starts a chat turn. Returns false (and leaves the draft alone) when a turn can't start. */
  function send(text: string): boolean {
    const q = text.trim();
    if (!q || busy || !active) return false;
    void runChat(q, active.dashboardJson);
    return true;
  }

  async function runChat(q: string, baseDashboard: string | undefined) {
    setBusy(true);
    updateActive((c) => {
      c.messages.push({ id: uid(), role: 'user', text: q });
      if (c.title === 'New chat') c.title = titleFrom(q);
    });

    setStream({ html: '', logs: [] });
    let streamed = '';
    try {
      const s = await getClient().ai.chat.sendMessage({
        message: q,
        datasourceId: dataset.datasourceId,
        dashboard: baseDashboard,
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
      const meta = result.dashboard ? dashboardMeta(result.dashboard) : null;
      updateActive((c) => {
        c.messages.push({
          id: uid(),
          role: 'assistant',
          html: md(streamed || result.explanation || ''),
          dashboardJson: result.dashboard,
          title: meta?.title ?? null,
          chartCount: meta?.chartCount ?? 0,
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

  async function explain(dashboardJson: string, title: string | null) {
    if (busy || !active) return;
    setBusy(true);
    updateActive((c) => {
      c.messages.push({
        id: uid(),
        role: 'user',
        text: title ? `Explain this chart: "${title}"` : 'Explain this chart',
      });
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

  function toggleTips() {
    const next = !tipsOpen;
    setTipsOpen(next);
    save('promptsOpen', next);
  }

  const ui: ChatUi = {
    byId,
    lastId: chatMessages.at(-1)?.id,
    stream,
    busy,
    explain,
    openPanel,
  };
  return (
    // React 19: the context object renders directly as its own provider.
    <ChatUiContext value={ui}>
      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <IgrChat
          ref={chatRefCallback}
          className="min-h-0 flex-1"
          messages={chatMessages}
          options={options}
          onMessageCreated={(e) => {
            // Sent from the built-in input. We own the message list, so stop the chat from
            // appending it itself; the draft is cleared only when the turn actually starts.
            e.preventDefault();
            submit(e.detail.text);
          }}
        >
          {/* Header (slots) */}
          <span slot="title" className="min-w-0 truncate text-sm font-medium text-slate-800">
            {active?.title ?? 'New chat'}
          </span>
          <div slot="actions" className="flex items-center gap-3">
            <IgrButton variant="outlined" className="header-btn" title="AI provider & model — click to change" onClick={openSettings}>
              {/* One text run: the button spaces separate children with a gap. */}
              <span>
                {providerLabel(status?.provider ?? 'OpenAI')}
                <span className="text-slate-400">&nbsp;·&nbsp;</span>
                {status?.model ?? status?.deployment ?? '—'}
              </span>
            </IgrButton>
            <IgrBadge
              shape="rounded"
              className="tokens-badge hidden sm:inline-flex"
              title="Client-side estimate; production metering uses the SDK's usage events"
            >
              ~{usageTokens.toLocaleString()} tokens
            </IgrBadge>
            <IgrButton variant="outlined" className="header-btn" title="Reset workspace" onClick={resetWorkspace}>
              <AppIcon slot="prefix" name="rotate-ccw" size={14} />
              Reset
            </IgrButton>
          </div>

          {/* Empty state: heading plus starter-prompt cards */}
          <div slot="empty-state" className="pt-6">
            <div className="mt-8">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                What do you want to know about your {dataset.label} data?
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Ask in plain language — I'll build the dashboard and explain it.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {dataset.prompts.map((p, i) => (
                  <IgrButton key={i} variant="outlined" className="prompt-card" onClick={() => submit(p)}>
                    {p}
                  </IgrButton>
                ))}
              </div>
            </div>
          </div>

          {/* "Try asking": collapsible chips, in the chat's suggestions slots */}
          <IgrButton slot="suggestions-header" variant="flat" className="tips-toggle" aria-expanded={tipsOpen} onClick={toggleTips}>
            <AppIcon slot="prefix" name="lightbulb" size={12} />
            Try asking
            <AppIcon slot="suffix" name={tipsOpen ? 'chevron-down' : 'chevron-right'} size={12} />
          </IgrButton>
          <div slot="suggestions" className="flex flex-wrap gap-2 pt-1.5">
            {tipsOpen &&
              dataset.prompts.map((p, i) => (
                <IgrChip key={i} outlined className="prompt-chip" disabled={busy} onClick={() => submit(p)}>
                  {p}
                </IgrChip>
              ))}
          </div>
        </IgrChat>
        <p className="relative -mt-2 pb-5 text-center text-[11px] text-slate-400">
          Governed by the Reveal AI SDK — no SQL or raw rows leave to the model.
        </p>
      </div>
    </ChatUiContext>
  );
}
