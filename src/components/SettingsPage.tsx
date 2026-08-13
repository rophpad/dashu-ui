"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AiSettingsPanel from "./AiSettingsPanel";
import LicensePanel from "./LicensePanel";
import PageHeader from "./PageHeader";
import SemanticEditor from "./SemanticEditor";
import WorkspaceManager from "./WorkspaceManager";
import { useWorkspaces, useConversations } from "./state";

const TABS = [
  { id: "ai", label: "AI" },
  { id: "plan", label: "Plan" },
  { id: "databases", label: "Databases" },
  { id: "semantic", label: "Semantic layer" },
  { id: "schemas", label: "Schemas" },
  { id: "history", label: "Chat history" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTabId(value: string): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-panel p-5 shadow-card">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {description && (
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          {description}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { state } = useWorkspaces();
  const { conversations, activeId, clearAll, open, remove } =
    useConversations();

  const [activeTab, setActiveTab] = useState<TabId>("ai");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1);
      if (isTabId(hash)) setActiveTab(hash);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  function selectTab(tab: TabId) {
    setActiveTab(tab);
    window.history.replaceState(null, "", window.location.pathname + "#" + tab);
  }

  return (
    <>
      <PageHeader title="Settings" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <div
          role="tablist"
          aria-label="Settings sections"
          className="mb-4 flex gap-1 overflow-x-auto rounded-xl border bg-panel p-1 shadow-card"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={"settings-tab-" + tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={"settings-panel-" + tab.id}
              onClick={() => selectTab(tab.id)}
              className={
                "shrink-0 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors " +
                (activeTab === tab.id
                  ? "bg-accent text-white"
                  : "text-muted hover:bg-surface hover:text-fg")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          id="settings-panel-ai"
          role="tabpanel"
          aria-labelledby="settings-tab-ai"
          hidden={activeTab !== "ai"}
        >
          <Section
            title="AI"
            description="Choose Dashu Managed AI, OpenRouter, or an OpenAI-compatible local model. Provider credentials stay server-side."
          >
            <AiSettingsPanel />
          </Section>
        </div>

        <div
          id="settings-panel-plan"
          role="tabpanel"
          aria-labelledby="settings-tab-plan"
          hidden={activeTab !== "plan"}
        >
          <Section
            title="Plan"
            description="Cloud access and application storage are configured by the operator."
          >
            <LicensePanel />
          </Section>
        </div>

        <div
          id="settings-panel-databases"
          role="tabpanel"
          aria-labelledby="settings-tab-databases"
          hidden={activeTab !== "databases"}
        >
          <Section
            title="Analytics database"
            description="Dashu queries the single read-only database configured by the environment."
          >
            <WorkspaceManager />
          </Section>
        </div>

        <div
          id="settings-panel-semantic"
          role="tabpanel"
          aria-labelledby="settings-tab-semantic"
          hidden={activeTab !== "semantic"}
        >
          <Section
            title="Semantic layer"
            description="Teach Dashu what your business terms mean. Without it, words like “revenue” are guesswork."
          >
            <SemanticEditor />
          </Section>
        </div>

        <div
          id="settings-panel-schemas"
          role="tabpanel"
          aria-labelledby="settings-tab-schemas"
          hidden={activeTab !== "schemas"}
        >
          <Section
            title="Exposed schemas"
            description="Only the public schema is introspected and queryable by this ready-to-run UI."
          >
            <div className="flex flex-wrap gap-2">
              {(state?.schemas ?? ["public"]).map((schema) => (
                <span
                  key={schema}
                  className="rounded-full border bg-surface px-2.5 py-1 font-mono text-xs"
                >
                  {schema}
                </span>
              ))}
            </div>
          </Section>
        </div>

        <div
          id="settings-panel-history"
          role="tabpanel"
          aria-labelledby="settings-tab-history"
          hidden={activeTab !== "history"}
        >
          <Section
            title="Chat history"
            description="Conversations are stored with your account in the configured storage database or JSON fallback."
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] text-muted">
                {conversations.length}{" "}
                {conversations.length === 1 ? "conversation" : "conversations"}{" "}
                saved
              </p>
              <button
                type="button"
                disabled={conversations.length === 0}
                onClick={() => {
                  if (confirmClear) {
                    clearAll();
                    setConfirmClear(false);
                  } else {
                    setConfirmClear(true);
                    setTimeout(() => setConfirmClear(false), 3000);
                  }
                }}
                className="rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors duration-150 hover:bg-surface disabled:opacity-30"
              >
                {confirmClear ? "Click again to confirm" : "Clear history"}
              </button>
            </div>

            {/* The sidebar shows only the most recent few, so the complete list
              lives here — otherwise older conversations would be unreachable. */}
            {conversations.length > 0 && (
              <ul className="mt-4 divide-y overflow-hidden rounded-lg border">
                {conversations.map((conversation) => (
                  <li
                    key={conversation.id}
                    className="group flex items-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        open(conversation.id);
                        router.push("/");
                      }}
                      className="min-w-0 flex-1 px-3.5 py-2.5 text-left transition-colors hover:bg-surface"
                    >
                      <span className="block truncate text-[13px]">
                        {conversation.title}
                        {conversation.id === activeId && (
                          <span className="ml-2 text-[11px] text-faint">
                            current
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-faint">
                        {new Date(conversation.updatedAt).toLocaleString()} ·{" "}
                        {conversation.messages.length} messages
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${conversation.title}`}
                      onClick={() => remove(conversation.id)}
                      className="mr-2 rounded-md px-2 py-1 text-[12px] text-faint opacity-0 transition-all hover:bg-surface-hover hover:text-fg group-hover:opacity-100"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </main>
    </>
  );
}
