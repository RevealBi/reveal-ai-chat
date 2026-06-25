import { load, save } from './storage';

export type MsgRole = 'user' | 'assistant' | 'log' | 'error';

export interface ChatMessage {
  id: string;
  role: MsgRole;
  text?: string; // raw text (user / log / error)
  html?: string; // rendered markdown (assistant)
  dashboardJson?: string; // dashboard this assistant turn produced, if any
  title?: string | null; // first chart's title, captured when the dashboard arrives
  chartCount?: number; // number of charts, captured when the dashboard arrives
}

export interface Conversation {
  id: string;
  title: string;
  datasetId: string;
  messages: ChatMessage[];
  dashboardJson?: string; // latest dashboard for this conversation's artifact panel
  createdAt: number;
  updatedAt: number;
}

const KEY = 'conversations';
const ACTIVE = 'activeConversation';

export function uid(): string {
  return crypto?.randomUUID?.() ?? 'id-' + Math.random().toString(36).slice(2);
}

export function loadConversations(): Conversation[] {
  return load<Conversation[]>(KEY, []);
}
export function saveConversations(list: Conversation[]): void {
  save(KEY, list);
}
export function loadActiveId(): string | null {
  return load<string | null>(ACTIVE, null);
}
export function saveActiveId(id: string | null): void {
  save(ACTIVE, id);
}

export function newConversation(datasetId: string): Conversation {
  const now = Date.now();
  return { id: uid(), title: 'New chat', datasetId, messages: [], createdAt: now, updatedAt: now };
}

/** First user message becomes the conversation title. */
export function titleFrom(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > 42 ? t.slice(0, 42) + '…' : t || 'New chat';
}

/** Group conversations into Today / Yesterday / Previous 7 days / Older for the sidebar. */
export function groupByRecency(list: Conversation[]): { label: string; items: Conversation[] }[] {
  const sorted = [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  const startToday = new Date().setHours(0, 0, 0, 0);
  const startYesterday = startToday - 86400000;
  const start7 = startToday - 6 * 86400000;
  const groups = [
    { label: 'Today', items: [] as Conversation[] },
    { label: 'Yesterday', items: [] as Conversation[] },
    { label: 'Previous 7 days', items: [] as Conversation[] },
    { label: 'Older', items: [] as Conversation[] },
  ];
  for (const c of sorted) {
    if (c.updatedAt >= startToday) groups[0].items.push(c);
    else if (c.updatedAt >= startYesterday) groups[1].items.push(c);
    else if (c.updatedAt >= start7) groups[2].items.push(c);
    else groups[3].items.push(c);
  }
  return groups.filter((g) => g.items.length);
}
