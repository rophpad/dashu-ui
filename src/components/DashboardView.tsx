"use client";

import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Chart from "./Chart";
import PageHeader from "./PageHeader";
import ResultTable from "./ResultTable";
import { useWorkspaces } from "./state";
import type { Cell, ChartSpec } from "./types";

type Card = {
  id: string;
  title: string;
  question: string;
  sql: string;
  explanation: string;
  chart: ChartSpec;
};

type Dashboard = { id: string; name: string; cards: Card[] };

type CardResult =
  | { status: "loading" }
  | {
      status: "ok";
      columns: string[];
      rows: Cell[][];
      truncated: boolean;
      limit: number;
    }
  | { status: "error"; error: string };

export default function DashboardView({ id }: { id: string }) {
  const router = useRouter();
  const { version } = useWorkspaces();

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [results, setResults] = useState<Record<string, CardResult>>({});
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [regenerating, setRegenerating] = useState<string | null>(null);

  /** Replay one card's saved SQL. No model call. */
  const runCard = useCallback(async (card: Card) => {
    setResults((prev) => ({ ...prev, [card.id]: { status: "loading" } }));
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: card.sql }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResults((prev) => ({
          ...prev,
          [card.id]: { status: "error", error: data.error ?? "Failed." },
        }));
        return;
      }
      setResults((prev) => ({
        ...prev,
        [card.id]: {
          status: "ok",
          columns: data.columns,
          rows: data.rows,
          truncated: data.truncated,
          limit: data.limit,
        },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [card.id]: { status: "error", error: String(err) },
      }));
    }
  }, []);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/dashboards/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not load this dashboard.");
        return;
      }
      setDashboard(data.dashboard);
      setName(data.dashboard.name);
      // Cards run in parallel; each is an independent read-only query.
      await Promise.all(data.dashboard.cards.map((c: Card) => runCard(c)));
    } catch (err) {
      setError(String(err));
    } finally {
      setRefreshing(false);
    }
  }, [id, runCard]);

  useEffect(() => {
    void load();
  }, [load, version]);

  async function patch(body: unknown) {
    const res = await fetch(`/api/dashboards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) setDashboard(data.dashboard);
    return data;
  }

  /**
   * Ask the model to answer the saved question again and store the new SQL.
   * This is the repair path for a card whose query stopped working because the
   * schema changed.
   */
  async function regenerate(card: Card) {
    setRegenerating(card.id);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: card.question }),
      });
      const data = await res.json();
      if (!res.ok || data.answered === false) {
        setResults((prev) => ({
          ...prev,
          [card.id]: {
            status: "error",
            error: data.error ?? data.explanation ?? "Could not rebuild this card.",
          },
        }));
        return;
      }
      await patch({
        removeCard: card.id,
      });
      await patch({
        addCard: {
          title: card.title,
          question: card.question,
          sql: data.sql,
          explanation: data.explanation,
          chart: data.chart,
        },
      });
      await load();
    } finally {
      setRegenerating(null);
    }
  }

  async function remove() {
    await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
    router.push("/dashboards");
  }

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
          <p className="rounded-xl border bg-surface p-5 text-[14px]">{error}</p>
          <Link
            href="/dashboards"
            className="mt-4 inline-block text-[13px] font-medium text-accent hover:underline"
          >
            ← All dashboards
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader title={dashboard?.name ?? "Dashboard"}>
        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-surface disabled:opacity-40"
        >
          <RefreshCw
            size={13}
            strokeWidth={2}
            aria-hidden="true"
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
        <button
          type="button"
          onClick={() => setRenaming((v) => !v)}
          className="rounded-lg px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface hover:text-fg"
        >
          Rename
        </button>
      </PageHeader>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <Link
          href="/dashboards"
          className="text-[13px] text-muted transition-colors hover:text-fg"
        >
          ← All dashboards
        </Link>

        {renaming && (
          <div className="mt-4 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void patch({ name });
                  setRenaming(false);
                }
              }}
              autoFocus
              className="min-w-0 flex-1 rounded-lg border px-3.5 py-2 text-[14px] outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
            <button
              type="button"
              onClick={() => {
                void patch({ name });
                setRenaming(false);
              }}
              className="rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              className="rounded-lg px-3 py-2 text-[13px] text-muted transition-colors hover:bg-surface hover:text-fg"
            >
              Delete dashboard
            </button>
          </div>
        )}

        {dashboard && dashboard.cards.length === 0 && (
          <div className="mt-6 rounded-xl border border-dashed p-8 text-center">
            <p className="text-[15px] font-medium">No cards yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">
              Ask a question in the chat, then use <em>Save to dashboard</em> on the
              answer. The query is stored, so it replays here without asking the model
              again.
            </p>
            <Link
              href="/chat"
              className="mt-4 inline-block rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Go to chat
            </Link>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {dashboard?.cards.map((card, i) => {
            const result = results[card.id];
            return (
              <section key={card.id} className="rounded-xl border bg-panel p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-semibold">{card.title}</h2>
                    {card.explanation && (
                      <p className="mt-1 text-[13px] leading-relaxed text-muted">
                        {card.explanation}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={i === 0}
                      onClick={() =>
                        void patch({ moveCard: { id: card.id, direction: "up" } })
                      }
                      className="rounded-md p-1.5 text-faint transition-colors hover:bg-surface hover:text-fg disabled:opacity-20"
                    >
                      <ArrowUp size={13} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={i === (dashboard?.cards.length ?? 1) - 1}
                      onClick={() =>
                        void patch({ moveCard: { id: card.id, direction: "down" } })
                      }
                      className="rounded-md p-1.5 text-faint transition-colors hover:bg-surface hover:text-fg disabled:opacity-20"
                    >
                      <ArrowDown size={13} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void patch({ removeCard: card.id }).then(load)}
                      className="rounded-md px-2 py-1 text-[12px] text-faint transition-colors hover:bg-surface hover:text-fg"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {result?.status === "loading" && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="dot h-1.5 w-1.5 rounded-full bg-accent" />
                      <span
                        className="dot h-1.5 w-1.5 rounded-full bg-accent"
                        style={{ animationDelay: "0.15s" }}
                      />
                      <span
                        className="dot h-1.5 w-1.5 rounded-full bg-accent"
                        style={{ animationDelay: "0.3s" }}
                      />
                    </span>
                    <span className="text-sm text-muted">Running…</span>
                  </div>
                )}

                {result?.status === "error" && (
                  <div className="mt-4 rounded-lg border bg-surface p-4">
                    <p className="text-[13px] leading-relaxed">{result.error}</p>
                    <p className="mt-2 text-[12px] leading-relaxed text-muted">
                      The saved query no longer runs. Rebuilding asks the model the
                      original question again: “{card.question}”
                    </p>
                    <button
                      type="button"
                      disabled={regenerating === card.id}
                      onClick={() => void regenerate(card)}
                      className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
                    >
                      {regenerating === card.id ? "Rebuilding…" : "Rebuild from question"}
                    </button>
                  </div>
                )}

                {result?.status === "ok" && (
                  <>
                    <Chart spec={card.chart} columns={result.columns} rows={result.rows} />
                    <ResultTable
                      columns={result.columns}
                      rows={result.rows}
                      truncated={result.truncated}
                      limit={result.limit}
                    />
                  </>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
