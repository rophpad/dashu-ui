"use client";

import { useEffect, useState } from "react";

type State = { plan: "free" | "pro"; problem: string | null; storage: "postgres" | "json" };

export default function LicensePanel() {
  const [state, setState] = useState<State | null>(null);
  useEffect(() => {
    fetch("/api/license").then((response) => response.json()).then(setState).catch(() => null);
  }, []);
  if (!state) return <div className="h-20 animate-pulse rounded-lg bg-surface" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3">
        <div>
          <p className="text-[14px] font-medium">{state.plan === "pro" ? "Dashu Cloud connected" : "Cloud credential missing"}</p>
          <p className="mt-1 text-[12.5px] text-muted">
            {state.plan === "pro" ? "Managed AI and Pro features are enabled for this installation." : state.problem}
          </p>
        </div>
        <span className="rounded-full border bg-panel px-2.5 py-1 text-[11px] font-medium">
          {state.plan === "pro" ? "Pro" : "Offline"}
        </span>
      </div>
      <p className="text-[12.5px] leading-relaxed text-muted">
        User accounts, saved queries, dashboards and settings are stored in {state.storage === "postgres" ? "the configured storage database" : "JSON files in DASHU_DATA_DIR"}. No licence key is entered in this UI.
      </p>
    </div>
  );
}
