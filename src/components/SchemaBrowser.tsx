"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "./PageHeader";
import { useWorkspaces } from "./state";
import type { ForeignKey, Table } from "./types";

export default function SchemaBrowser() {
  const { active: workspace, connected, version } = useWorkspaces();
  const [tables, setTables] = useState<Table[] | null>(null);
  const [foreignKeys, setForeignKeys] = useState<ForeignKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (force = false) => {
      if (!connected) {
        setTables(null);
        return;
      }
      setRefreshing(true);
      setError(null);
      try {
        const res = await fetch(`/api/schema${force ? "?refresh=1" : ""}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not load the schema.");
          setTables(null);
        } else {
          setTables(data.tables as Table[]);
          setForeignKeys((data.foreignKeys ?? []) as ForeignKey[]);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setRefreshing(false);
      }
    },
    [connected],
  );

  useEffect(() => {
    void load();
  }, [load, version]);

  const visible = useMemo(() => {
    if (!tables) return null;
    const q = filter.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.columns.some((c) => c.name.toLowerCase().includes(q)),
    );
  }, [tables, filter]);

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const columnCount = tables?.reduce((n, t) => n + t.columns.length, 0) ?? 0;

  return (
    <>
      <PageHeader title="Schema">
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={!connected || refreshing}
          className="rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 hover:bg-surface disabled:opacity-40"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </PageHeader>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {!connected ? (
          <div className="rounded-xl border bg-surface p-6">
            <p className="text-[15px] font-medium">No database connected</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              Connect one to see its tables, columns and relationships.
            </p>
            <Link
              href="/settings"
              className="mt-4 inline-block rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
            >
              Go to settings
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter tables and columns…"
                aria-label="Filter tables and columns"
                className="min-w-0 flex-1 rounded-lg border bg-panel px-3.5 py-2 text-[14px] outline-none transition-all duration-150 placeholder:text-faint focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
              {tables && (
                <div className="flex shrink-0 items-center gap-2 text-xs text-muted">
                  <span className="rounded-full border bg-surface px-2.5 py-1 font-medium">
                    {tables.length} {tables.length === 1 ? "table" : "tables"}
                  </span>
                  <span className="rounded-full border bg-surface px-2.5 py-1 font-medium">
                    {columnCount} columns
                  </span>
                  <span className="rounded-full border bg-surface px-2.5 py-1 font-medium">
                    {foreignKeys.length} relations
                  </span>
                </div>
              )}
            </div>

            {workspace?.label && (
              <p className="mt-2.5 font-mono text-xs text-faint">{workspace.label}</p>
            )}

            {error && (
              <p className="mt-5 rounded-xl border bg-surface p-5 text-[14px] leading-relaxed">
                {error}
              </p>
            )}

            {!tables && !error && (
              <div className="mt-5 space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-surface" />
                ))}
              </div>
            )}

            {visible?.length === 0 && (
              <p className="mt-5 rounded-xl border border-dashed px-5 py-8 text-center text-sm text-muted">
                Nothing matches “{filter}”.
              </p>
            )}

            <div className="mt-5 space-y-2">
              {visible?.map((table) => {
                const key = `${table.schema}.${table.name}`;
                const isOpen = open.has(key);
                const related = foreignKeys.filter(
                  (fk) =>
                    (fk.fromSchema === table.schema && fk.fromTable === table.name) ||
                    (fk.toSchema === table.schema && fk.toTable === table.name),
                );

                return (
                  <div
                    key={key}
                    className="overflow-hidden rounded-xl border bg-panel transition-shadow duration-150 hover:shadow-card"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <ChevronRight
                        size={12}
                        strokeWidth={2}
                        aria-hidden="true"
                        className={`shrink-0 text-faint transition-transform duration-150 ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      />
                      <span className="truncate font-mono text-[14px] font-medium">
                        {table.name}
                      </span>
                      {table.kind === "view" && (
                        <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-faint">
                          view
                        </span>
                      )}
                      {table.comment && (
                        <span className="hidden truncate text-xs text-faint sm:block">
                          {table.comment}
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-xs text-faint">
                        {table.columns.length} columns
                      </span>
                    </button>

                    {isOpen && (
                      <div className="border-t">
                        <table className="w-full border-collapse text-sm">
                          <tbody>
                            {table.columns.map((col) => (
                              <tr key={col.name} className="border-b last:border-0">
                                <td className="py-2 pl-11 pr-3 text-[13px]">
                                  <span className="font-mono">{col.name}</span>
                                  {col.isPrimaryKey && (
                                    <span
                                      className="ml-1.5 rounded border px-1 py-px font-sans text-[10px] font-medium text-faint"
                                      title="Primary key"
                                    >
                                      PK
                                    </span>
                                  )}
                                  {col.comment && (
                                    <span className="mt-0.5 block font-sans text-[11px] leading-snug text-faint">
                                      {col.comment}
                                    </span>
                                  )}
                                  {col.enumValues?.length && (
                                    <span className="mt-1 flex flex-wrap gap-1">
                                      {col.enumValues.slice(0, 8).map((v) => (
                                        <span
                                          key={v}
                                          className="rounded border bg-surface px-1.5 py-px font-mono text-[10px] text-muted"
                                        >
                                          {v}
                                        </span>
                                      ))}
                                      {col.enumValues.length > 8 && (
                                        <span className="px-1 font-sans text-[10px] text-faint">
                                          +{col.enumValues.length - 8}
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 pr-4 text-right font-mono text-[12px] text-muted">
                                  {col.type}
                                  {!col.nullable && (
                                    <span className="ml-2 text-faint">not null</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {related.length > 0 && (
                          <div className="border-t bg-surface px-4 py-3 pl-11">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-faint">
                              Relationships
                            </p>
                            <ul className="mt-1.5 space-y-1">
                              {related.map((fk, i) => (
                                <li key={i} className="font-mono text-[12px] text-muted">
                                  {fk.fromTable}.{fk.fromColumn} → {fk.toTable}.
                                  {fk.toColumn}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </>
  );
}
