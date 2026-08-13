"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Conversation,
  Message,
  SessionUser,
  Workspace,
  WorkspaceState,
} from "./types";

/* -------------------------------------------------------------------------- */
/* User                                                                        */
/* -------------------------------------------------------------------------- */

const UserContext = createContext<SessionUser | null>(null);

export function useUser(): SessionUser | null {
  return useContext(UserContext);
}

/* -------------------------------------------------------------------------- */
/* Workspaces                                                                  */
/* -------------------------------------------------------------------------- */

type WorkspacesContextValue = {
  state: WorkspaceState | null;
  workspaces: Workspace[];
  active: Workspace | null;
  /** Unknown state counts as connected, so the UI doesn't flash a setup prompt. */
  connected: boolean;

  /** True when a Dashu Cloud credential enables Pro features. */
  pro: boolean;

  /** Bumped whenever the active database changes, to force dependent re-reads. */
  version: number;
};

const WorkspacesContext = createContext<WorkspacesContextValue | null>(null);

export function useWorkspaces(): WorkspacesContextValue {
  const ctx = useContext(WorkspacesContext);
  if (!ctx) throw new Error("useWorkspaces must be used inside <Providers>");
  return ctx;
}

/* -------------------------------------------------------------------------- */
/* Conversations                                                               */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "askdb.conversations.v2";
const LEGACY_KEY = "askdb.conversations.v1";


/** Conversations per workspace — a question about one database is noise in another. */
type Store = Record<string, Conversation[]>;

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fall through to the legacy read
  }
  return {};
}

/** History from before workspaces existed, to be adopted by the first one. */
function loadLegacy(): Conversation[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}


function titleFrom(question: string): string {
  const clean = question.trim().replace(/\s+/g, " ");
  return clean.length > 52 ? `${clean.slice(0, 52).trimEnd()}…` : clean;
}

function newId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

type ConversationsContextValue = {
  conversations: Conversation[];
  activeId: string | null;
  active: Conversation | null;
  messages: Message[];
  hydrated: boolean;
  startNew: () => void;
  open: (id: string) => void;
  remove: (id: string) => void;
  clearAll: () => void;
  /** Append to the active conversation, creating one on the first message. */
  append: (message: Message) => void;
};

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

export function useConversations(): ConversationsContextValue {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error("useConversations must be used inside <Providers>");
  return ctx;
}

/* -------------------------------------------------------------------------- */
/* Provider                                                                    */
/* -------------------------------------------------------------------------- */

export default function Providers({
  children,
  user = null,
}: {
  children: React.ReactNode;
  user?: SessionUser | null;
}) {
  /* --- workspaces --- */
  const [state, setState] = useState<WorkspaceState | null>(null);
  const version = 0;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (!res.ok) return;
      const next = (await res.json()) as WorkspaceState;
      setState(next);
    } catch {
      // Leave the previous state; real failures surface in the chat.
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);


  const workspaces = state?.workspaces ?? [];
  const activeWorkspace =
    workspaces.find((w) => w.id === state?.activeId) ?? workspaces[0] ?? null;
  const workspaceId = activeWorkspace?.id ?? null;

  /* --- conversations, scoped to the active workspace --- */
  const [store, setStore] = useState<Store>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /**
   * Mirror of activeId that updates synchronously. An in-flight ask() holds the
   * closure it was called with; on the first message that closure sees null and
   * would otherwise start a second conversation for the reply.
   */
  const activeIdRef = useRef<string | null>(null);
  const workspaceRef = useRef<string | null>(null);
  workspaceRef.current = workspaceId;

  const selectActive = useCallback((id: string | null) => {
    activeIdRef.current = id;
    setActiveId(id);
  }, []);

  // Load account history from shared storage and merge one-time browser history.
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/conversations")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load conversations.");
        const body = (await response.json()) as { conversations?: Store };
        if (cancelled) return;
        const local = loadStore();
        setStore({ ...local, ...(body.conversations ?? {}) });
        setHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        setStore(loadStore());
        setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounce writes so a streamed user/assistant pair becomes one storage update.
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/conversations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversations: store }),
      }).then((response) => {
        if (!response.ok) return;
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(LEGACY_KEY);
        } catch {
          // The server copy is authoritative; browser cleanup is best-effort.
        }
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [store, hydrated]);

  // Adopt pre-workspace history into the first workspace, once.
  useEffect(() => {
    if (!hydrated || !workspaceId) return;
    const legacy = loadLegacy();
    if (!legacy.length) return;
    setStore((prev) => {
      if (prev[workspaceId]?.length) return prev;
      return { ...prev, [workspaceId]: legacy };
    });
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // Non-fatal.
    }
  }, [hydrated, workspaceId]);

  const conversations = useMemo(
    () => (workspaceId ? (store[workspaceId] ?? []) : []),
    [store, workspaceId],
  );

  // Switching database means switching to that database's history.
  useEffect(() => {
    if (!hydrated) return;
    selectActive(workspaceId ? (store[workspaceId]?.[0]?.id ?? null) : null);
    // Only when the workspace itself changes, not on every conversation edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, hydrated]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const mutate = useCallback(
    (fn: (list: Conversation[]) => Conversation[]) => {
      const ws = workspaceRef.current;
      if (!ws) return;
      setStore((prev) => ({ ...prev, [ws]: fn(prev[ws] ?? []) }));
    },
    [],
  );

  const startNew = useCallback(() => selectActive(null), [selectActive]);
  const open = useCallback((id: string) => selectActive(id), [selectActive]);

  const remove = useCallback(
    (id: string) => {
      mutate((list) => {
        const next = list.filter((c) => c.id !== id);
        if (activeIdRef.current === id) selectActive(next[0]?.id ?? null);
        return next;
      });
    },
    [mutate, selectActive],
  );

  const clearAll = useCallback(() => {
    mutate(() => []);
    selectActive(null);
  }, [mutate, selectActive]);

  const append = useCallback(
    (message: Message) => {
      // Resolve the target conversation before touching state, so the updater
      // stays pure and the id is stable for the rest of this call.
      let id = activeIdRef.current;
      if (!id) {
        id = newId();
        selectActive(id);
      }
      const target = id;
      const now = Date.now();

      mutate((list) => {
        const existing = list.find((c) => c.id === target);

        if (!existing) {
          return [
            {
              id: target,
              title:
                message.role === "user" ? titleFrom(message.text) : "New conversation",
              createdAt: now,
              updatedAt: now,
              messages: [message],
            },
            ...list,
          ];
        }

        return [
          {
            ...existing,
            updatedAt: now,
            messages: [...existing.messages, message],
            title:
              existing.title === "New conversation" && message.role === "user"
                ? titleFrom(message.text)
                : existing.title,
          },
          ...list.filter((c) => c.id !== existing.id),
        ];
      });
    },
    [mutate, selectActive],
  );

  const workspacesValue = useMemo<WorkspacesContextValue>(
    () => ({
      state,
      workspaces,
      active: activeWorkspace,
      connected: state ? workspaces.length > 0 : true,
      pro: state?.license?.plan === "pro",
      version,
    }),
    [state, workspaces, activeWorkspace, version],
  );

  const conversationsValue = useMemo<ConversationsContextValue>(
    () => ({
      conversations,
      activeId,
      active,
      messages: active?.messages ?? [],
      hydrated,
      startNew,
      open,
      remove,
      clearAll,
      append,
    }),
    [conversations, activeId, active, hydrated, startNew, open, remove, clearAll, append],
  );

  return (
    <UserContext.Provider value={user}>
      <WorkspacesContext.Provider value={workspacesValue}>
        <ConversationsContext.Provider value={conversationsValue}>
          {children}
        </ConversationsContext.Provider>
      </WorkspacesContext.Provider>
    </UserContext.Provider>
  );
}
