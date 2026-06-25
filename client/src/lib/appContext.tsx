import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { VerticalConfig } from './types';
import { VERTICALS, RETAIL } from './verticals';
import { load, save } from './storage';
import { getClient } from './revealClient';
import {
  type Conversation,
  loadConversations,
  saveConversations,
  loadActiveId,
  saveActiveId,
  newConversation,
} from './conversations';

interface PanelState {
  dashboardJson: string;
  expanded: boolean;
}

interface AppValue {
  dataset: VerticalConfig;
  datasets: VerticalConfig[];
  setDataset: (v: VerticalConfig) => void;

  conversations: Conversation[];
  active: Conversation | null;
  newChat: (datasetId?: string) => void;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  updateActive: (fn: (c: Conversation) => void) => void;

  usageTokens: number;
  addTokens: (n: number) => void;

  panel: PanelState | null;
  openPanel: (dashboardJson: string) => void;
  closePanel: () => void;
  toggleExpand: () => void;
}

const Ctx = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [datasetId, setDatasetId] = useState<string>(() => load('dataset', RETAIL.id));
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeId, setActiveIdState] = useState<string | null>(() => loadActiveId());
  const [usageTokens, setUsageTokens] = useState(0);
  const [panel, setPanel] = useState<PanelState | null>(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );
  // The dataset is bound to the active conversation; `datasetId` is the default for new chats.
  const dataset = useMemo(
    () => VERTICALS.find((v) => v.id === (active?.datasetId ?? datasetId)) ?? RETAIL,
    [active?.datasetId, datasetId],
  );

  const setActive = useCallback((id: string | null) => {
    setActiveIdState(id);
    saveActiveId(id);
  }, []);

  const resetServerContext = () => {
    try {
      getClient().ai.chat.resetContext?.();
    } catch {
      /* no provider configured */
    }
  };

  const newChat = useCallback(
    (dsId?: string) => {
      const id = dsId ?? datasetId;
      setDatasetId(id);
      save('dataset', id);
      const c = newConversation(id);
      setConversations((prev) => {
        const list = [c, ...prev];
        saveConversations(list);
        return list;
      });
      setActive(c.id);
      setPanel(null);
      resetServerContext();
    },
    [datasetId, setActive],
  );

  const selectChat = useCallback(
    (id: string) => {
      setActive(id);
      // Reflect the selected conversation's dataset (and make it the default for the next new chat).
      const c = conversations.find((x) => x.id === id);
      if (c) {
        setDatasetId(c.datasetId);
        save('dataset', c.datasetId);
      }
      setPanel(null);
      resetServerContext();
    },
    [conversations, setActive],
  );

  const deleteChat = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const list = prev.filter((c) => c.id !== id);
        saveConversations(list);
        if (id === activeId) {
          setActive(list[0]?.id ?? null);
          setPanel(null);
        }
        return list;
      });
    },
    [activeId, setActive],
  );

  const updateActive = useCallback(
    (fn: (c: Conversation) => void) => {
      setConversations((prev) => {
        const list = prev.map((c) => {
          if (c.id !== activeId) return c;
          const copy: Conversation = { ...c, messages: [...c.messages] };
          fn(copy);
          copy.updatedAt = Date.now();
          return copy;
        });
        saveConversations(list);
        return list;
      });
    },
    [activeId],
  );

  const setDataset = useCallback(
    (v: VerticalConfig) => {
      // The dataset is the conversation's context. Switching it mid-chat starts a fresh chat in
      // the new dataset; an empty chat just retargets in place (no orphan thread).
      if (active && active.messages.length > 0) {
        newChat(v.id);
      } else {
        setDatasetId(v.id);
        save('dataset', v.id);
        if (active) updateActive((c) => { c.datasetId = v.id; });
      }
    },
    [active, newChat, updateActive],
  );
  const addTokens = useCallback((n: number) => setUsageTokens((t) => t + n), []);

  const openPanel = useCallback((dashboardJson: string) => setPanel({ dashboardJson, expanded: false }), []);
  const closePanel = useCallback(() => setPanel(null), []);
  const toggleExpand = useCallback(
    () => setPanel((p) => (p ? { ...p, expanded: !p.expanded } : p)),
    [],
  );

  const value: AppValue = {
    dataset,
    datasets: VERTICALS,
    setDataset,
    conversations,
    active,
    newChat,
    selectChat,
    deleteChat,
    updateActive,
    usageTokens,
    addTokens,
    panel,
    openPanel,
    closePanel,
    toggleExpand,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within <AppProvider>');
  return v;
}

export function estimateTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 4);
}
