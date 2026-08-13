"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "./PageHeader";
import { useWorkspaces } from "./state";

type Summary = { id: string; name: string; cardCount: number; updatedAt: string };

export default function DashboardList() {
  const { active: workspace, connected, pro, version } = useWorkspaces();
  const [dashboards, setDashboards] = useState<Summary[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboards");
      const data = await res.json();
      setDashboards(data.dashboards ?? []);
    } catch {
      setDashboards([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, version]);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setName("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Dashboards" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <p className="max-w-xl text-[14px] leading-relaxed text-muted">
          A dashboard is a set of saved questions. The SQL is stored alongside each one,
          so opening a dashboard replays the queries — no model call, no cost, and the
          same numbers every time.
        </p>
        {workspace && (
          <p className="mt-2 font-mono text-xs text-faint">
            {workspace.name} · {workspace.label}
          </p>
        )}

        {!connected ? (
          <div className="mt-6 rounded-xl border bg-surface p-6">
            <p className="text-[15px] font-medium">No database connected</p>
            <Link
              href="/settings"
              className="mt-4 inline-block rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Go to settings
            </Link>
          </div>
        ) : (
          <>
            {!pro && (
              <div className="mt-6 rounded-xl border border-accent-line bg-accent-soft p-5">
                <p className="text-[14px] font-medium text-accent">
                  Dashu Cloud credential required
                </p>
                <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-muted">
                  Set DASHU_CLOUD_CREDENTIAL on the server to enable Pro features such as saved dashboards. No license key is entered in the UI.
                </p>
                <Link
                  href="/settings#plan"
                  className="mt-3 inline-block rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  View configuration
                </Link>
              </div>
            )}

            <div className={`mt-6 flex gap-2 ${pro ? "" : "hidden"}`}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void create();
                }}
                placeholder="New dashboard name"
                className="min-w-0 flex-1 rounded-lg border bg-panel px-3.5 py-2 text-[14px] outline-none transition-all placeholder:text-faint focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
              <button
                type="button"
                onClick={() => void create()}
                disabled={!name.trim() || busy}
                className="shrink-0 rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-30"
              >
                Create
              </button>
            </div>

            {dashboards === null && (
              <div className="mt-5 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
                ))}
              </div>
            )}

            {dashboards?.length === 0 && (
              <div className="mt-5 rounded-xl border border-dashed p-8 text-center">
                <p className="text-[15px] font-medium">No dashboards yet</p>
                <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">
                  Create one above, then use <em>Save to dashboard</em> on any answer in
                  the chat.
                </p>
              </div>
            )}

            <div className="mt-5 space-y-2">
              {dashboards?.map((d) => (
                <Link
                  key={d.id}
                  href={`/dashboards/${d.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-panel p-4 transition-all duration-150 hover:border-accent-line hover:shadow-card"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">{d.name}</p>
                    <p className="mt-0.5 text-[12px] text-faint">
                      {d.cardCount} {d.cardCount === 1 ? "card" : "cards"} · updated{" "}
                      {new Date(d.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight size={15} strokeWidth={2} aria-hidden="true" className="shrink-0 text-faint" />
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
