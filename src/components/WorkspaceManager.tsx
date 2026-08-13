"use client";

import { useWorkspaces } from "./state";

export default function WorkspaceManager() {
  const { workspaces, active } = useWorkspaces();

  if (workspaces.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-3 text-[13px] leading-relaxed text-muted">
        <p className="font-medium text-fg">No analytics database configured</p>
        <p className="mt-1">
          Set <code className="font-mono">DASHU_DATABASE_URL</code> to a PostgreSQL
          connection string and restart Dashu. Use a database role with read-only access.
        </p>
      </div>
    );
  }

  const workspace = active ?? workspaces[0];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-lg border bg-surface px-4 py-3">
        <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
        <div className="min-w-0">
          <p className="text-[13px] font-medium">{workspace.name}</p>
          <p className="truncate font-mono text-[11px] text-faint">{workspace.label}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full border bg-panel px-2 py-1 text-[10px] font-medium text-faint">
          environment
        </span>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        The connection is server-managed and never sent to the browser. Update{" "}
        <code className="font-mono">DASHU_DATABASE_URL</code> and restart the app to
        connect a different database.
      </p>
    </div>
  );
}
