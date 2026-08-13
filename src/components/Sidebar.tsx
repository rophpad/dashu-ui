"use client";

import Link from "next/link";
import Logo from "./Logo";
import {

  LayoutGrid,
  X,
  Plus,
  Settings,
  Table2,
  Trash2,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSidebar } from "./Shell";
import { useWorkspaces, useConversations, useUser } from "./state";
import ThemeToggle from "./ThemeToggle";

function timeGroup(ts: number): string {
  const days = (Date.now() - ts) / 86_400_000;
  if (days < 1) return "Today";
  if (days < 2) return "Yesterday";
  if (days < 7) return "Previous 7 days";
  if (days < 30) return "Previous 30 days";
  return "Older";
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { conversations, activeId, startNew, open, remove } = useConversations();
  const { active: workspace, connected } = useWorkspaces();
  const user = useUser();
  const { open: drawerOpen, setOpen: setDrawerOpen } = useSidebar();
  const [confirmClear, setConfirmClear] = useState<string | null>(null);


  async function signOut() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "signout" }),
    });
    router.push("/signin");
    router.refresh();
  }

  const onChat = pathname === "/chat";

  function selectChat(id: string) {
    open(id);
    if (!onChat) router.push("/chat");
  }

  function beginChat() {
    startNew();
    if (!onChat) router.push("/chat");
  }

  // The sidebar never scrolls, so it shows a bounded number of recent
  // conversations. The rest stay reachable from Settings → Chat history.
  const RECENT = 8;
  const recent = conversations.slice(0, RECENT);
  const older = conversations.length - recent.length;

  // Group in place — the list is already most-recent-first.
  const groups: { label: string; items: typeof conversations }[] = [];
  for (const conversation of recent) {
    const label = timeGroup(conversation.updatedAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(conversation);
    else groups.push({ label, items: [conversation] });
  }

  return (
    <aside
      aria-label="Sidebar"
      data-open={drawerOpen}
      className="drawer flex w-[264px] shrink-0 flex-col border-r bg-surface"
    >
      <div className="flex h-14 items-center gap-2.5 px-4">
        <Logo className="size-5" />
        <span className="flex-1 text-[15px] font-semibold tracking-tight">Dashu</span>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
          className="-mr-1 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-fg md:hidden"
        >
          <X size={17} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <Link
        href="/settings#databases"
        className="mx-3 mb-2 flex items-center gap-2 rounded-lg border bg-panel px-2.5 py-2 transition-colors hover:border-line-strong"
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${connected ? "bg-accent" : "bg-line-strong"}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{workspace?.name ?? "No database"}</span>
          <span className="block truncate font-mono text-[10px] text-faint">{workspace?.label ?? "configure DASHU_DATABASE_URL"}</span>
        </span>
      </Link>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={beginChat}
          className="flex w-full items-center gap-2 rounded-lg border bg-panel px-3 py-2 text-[13px] font-medium transition-all duration-150 hover:border-line-strong hover:shadow-card"
        >
          <Plus size={15} strokeWidth={1.75} aria-hidden="true" />
          New chat
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 md:overflow-hidden">
        {conversations.length === 0 ? (
          <p className="px-2 py-3 text-xs leading-relaxed text-faint">
            Your conversations appear here.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-faint">
                {group.label}
              </p>
              {group.items.map((conversation) => {
                const isActive = onChat && conversation.id === activeId;
                return (
                  <div
                    key={conversation.id}
                    className={`group flex items-center gap-1 rounded-lg pr-1 transition-colors ${
                      isActive ? "bg-panel shadow-card" : "hover:bg-surface-hover"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectChat(conversation.id)}
                      className="min-w-0 flex-1 px-2.5 py-2 text-left"
                    >
                      <span className="block truncate text-[13px] leading-snug">
                        {conversation.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${conversation.title}`}
                      onClick={() => {
                        if (confirmClear === conversation.id) {
                          remove(conversation.id);
                          setConfirmClear(null);
                        } else {
                          setConfirmClear(conversation.id);
                          setTimeout(() => setConfirmClear(null), 3000);
                        }
                      }}
                      className={`rounded-md p-1.5 text-faint transition-all hover:bg-surface-hover hover:text-fg ${
                        confirmClear === conversation.id
                          ? "text-fg opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                      title={
                        confirmClear === conversation.id
                          ? "Click again to delete"
                          : "Delete"
                      }
                    >
                      <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {older > 0 && (
          <Link
            href="/settings"
            className="block rounded-lg px-2.5 py-2 text-[12px] text-faint transition-colors hover:bg-surface-hover hover:text-fg"
          >
            {older} older {older === 1 ? "conversation" : "conversations"} →
          </Link>
        )}
      </nav>

      <div className="border-t p-3">
        <Link
          href="/dashboards"
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
            pathname.startsWith("/dashboards")
              ? "bg-panel font-medium shadow-card"
              : "text-muted hover:bg-surface-hover hover:text-fg"
          }`}
        >
          <LayoutGrid size={15} strokeWidth={1.75} aria-hidden="true" />
          Dashboards
        </Link>
        <Link
          href="/schema"
          className={`mt-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
            pathname === "/schema"
              ? "bg-panel font-medium shadow-card"
              : "text-muted hover:bg-surface-hover hover:text-fg"
          }`}
        >
          <Table2 size={15} strokeWidth={1.75} aria-hidden="true" />
          Schema
        </Link>
        <Link
          href="/settings"
          className={`mt-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
            pathname === "/settings"
              ? "bg-panel font-medium shadow-card"
              : "text-muted hover:bg-surface-hover hover:text-fg"
          }`}
        >
          <Settings size={15} strokeWidth={1.75} aria-hidden="true" />
          Settings
        </Link>

        {(!user || user.id === "local") && (
          <div className="mt-2 flex justify-end border-t pt-2.5">
            <ThemeToggle />
          </div>
        )}

        {user && user.id !== "local" && (
          <div className="mt-2 flex items-center gap-2 border-t pt-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold uppercase text-accent">
              {user.name.slice(0, 2)}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-muted" title={user.email}>
              {user.name}
            </span>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-md px-1.5 py-1 text-[11px] text-faint transition-colors hover:bg-surface-hover hover:text-fg"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
