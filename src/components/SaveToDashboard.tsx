"use client";

import { useEffect, useState } from "react";
import type { ChartSpec } from "./types";

type DashboardSummary = { id: string; name: string; cardCount: number };

type Props = {
  question: string;
  sql: string;
  explanation: string;
  chart: ChartSpec;
};

/**
 * Pin an answer to a dashboard. Stores the question *and* the SQL — the SQL is
 * what gets replayed, the question is what allows it to be rebuilt later.
 */
export default function SaveToDashboard({ question, sql, explanation, chart }: Props) {
  const [open, setOpen] = useState(false);
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [title, setTitle] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(question.length > 70 ? `${question.slice(0, 70)}…` : question);
    fetch("/api/dashboards")
      .then((r) => r.json())
      .then((d) => setDashboards(d.dashboards ?? []))
      .catch(() => {});
  }, [open, question]);

  async function save(dashboardId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addCard: { title, question, sql, explanation, chart },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      setSaved(data.dashboard.name);
      setOpen(false);
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function createAndSave() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create the dashboard.");
        setBusy(false);
        return;
      }
      setNewName("");
      await save(data.dashboard.id);
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  if (saved) {
    return (
      <span className="text-xs font-medium text-accent">Saved to {saved}</span>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-fg"
      >
        Save to dashboard
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full z-30 mt-1 w-[300px] rounded-lg border bg-panel p-3 shadow-float">
            <label htmlFor="card-title" className="block text-[12px] font-medium">
              Card title
            </label>
            <input
              id="card-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-[13px] outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
            />

            {dashboards.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-faint">
                  Add to
                </p>
                <div className="mt-1 max-h-40 overflow-y-auto">
                  {dashboards.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      disabled={busy}
                      onClick={() => void save(d.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-surface disabled:opacity-40"
                    >
                      <span className="truncate">{d.name}</span>
                      <span className="shrink-0 text-[11px] text-faint">
                        {d.cardCount}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 border-t pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-faint">
                Or create one
              </p>
              <div className="mt-1 flex gap-1.5">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Weekly numbers"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newName.trim()) void createAndSave();
                  }}
                  className="min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-[13px] outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
                />
                <button
                  type="button"
                  disabled={!newName.trim() || busy}
                  onClick={() => void createAndSave()}
                  className="shrink-0 rounded-lg bg-accent px-2.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-30"
                >
                  Create
                </button>
              </div>
            </div>

            {error && (
              <p className="mt-2 rounded-lg border bg-surface px-2.5 py-2 text-[12px] leading-relaxed">
                {error}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
