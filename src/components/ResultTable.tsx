"use client";

import { Fragment } from "react";
import type { Cell } from "./types";

type Props = {
  columns: string[];
  rows: Cell[][];
  truncated: boolean;
  limit: number;
};

function isNumeric(value: Cell): boolean {
  if (typeof value === "number") return true;
  if (typeof value === "string") return value !== "" && !Number.isNaN(Number(value));
  return false;
}

/**
 * Postgres composite types — json, jsonb, arrays, and notably `interval` —
 * arrive as objects and get stringified on the way out. Recover the structure
 * so it can be rendered as data rather than printed as a wall of braces.
 */
function parseJson(value: Cell): unknown {
  if (typeof value !== "string") return null;
  const text = value.trim();
  const looksJson =
    (text.startsWith("{") && text.endsWith("}")) ||
    (text.startsWith("[") && text.endsWith("]"));
  if (!looksJson) return null;
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

const INTERVAL_UNITS: [key: string, suffix: string][] = [
  ["years", "y"],
  ["months", "mo"],
  ["days", "d"],
  ["hours", "h"],
  ["minutes", "m"],
  ["seconds", "s"],
];

/**
 * Render a pg interval compactly: `{"days":3,"hours":25,…}` becomes `3d 25h 8m 50s`.
 *
 * Deliberately unit-suffixed rather than worded, so it stays correct whatever
 * language the question was asked in — and short enough for the headline slot,
 * which the raw JSON very much is not.
 */
function formatInterval(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const object = value as Record<string, unknown>;
  const keys = Object.keys(object);
  if (!keys.length) return null;

  const known = new Set([...INTERVAL_UNITS.map(([k]) => k), "milliseconds"]);
  if (!keys.every((k) => known.has(k))) return null;
  if (!keys.every((k) => typeof object[k] === "number")) return null;

  const parts: string[] = [];
  for (const [key, suffix] of INTERVAL_UNITS) {
    const amount = object[key] as number | undefined;
    if (amount) parts.push(`${Math.round(amount)}${suffix}`);
  }

  // Sub-second intervals still need to say something.
  if (!parts.length) {
    const ms = object.milliseconds as number | undefined;
    return ms ? `${Math.round(ms)}ms` : "0s";
  }
  return parts.join(" ");
}

function display(value: Cell): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return value.toLocaleString();
  const iso = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}/.exec(value);
  if (iso) return `${iso[1]} ${iso[2]}`;
  return value;
}

/** A flat object renders as key/value rows; anything nested as indented JSON. */
function JsonView({ value }: { value: unknown }) {
  const entries =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? Object.entries(value as Record<string, unknown>)
      : null;

  const flat =
    entries !== null &&
    entries.length > 0 &&
    entries.every(([, v]) => v === null || typeof v !== "object");

  if (flat) {
    return (
      <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-5 gap-y-1.5">
        {entries.map(([key, v]) => (
          <Fragment key={key}>
            <dt className="truncate font-mono text-[12px] text-muted">{key}</dt>
            <dd className="min-w-0 break-words font-mono text-[13px] tabular-nums">
              {v === null ? <span className="text-faint">null</span> : String(v)}
            </dd>
          </Fragment>
        ))}
      </dl>
    );
  }

  return (
    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

/** Beyond this a scalar is prose, not a headline number. */
const HEADLINE_MAX = 32;

function ScalarResult({ column, value }: { column: string; value: Cell }) {
  const label = (
    <p className="mt-2.5 text-xs font-medium uppercase tracking-wider text-faint">
      {column}
    </p>
  );

  const json = parseJson(value);

  if (json) {
    const interval = formatInterval(json);
    if (interval) {
      return (
        <div className="mt-4 rounded-lg border bg-surface px-5 py-6">
          <p className="font-mono text-[34px] font-medium leading-none tracking-tight tabular-nums text-accent">
            {interval}
          </p>
          {label}
        </div>
      );
    }
    return (
      <div className="mt-4 overflow-hidden rounded-lg border bg-surface px-5 py-4">
        <JsonView value={json} />
        {label}
      </div>
    );
  }

  const text = display(value);

  // A sentence in the headline slot overflows and reads badly at 34px.
  if (text.length > HEADLINE_MAX) {
    return (
      <div className="mt-4 rounded-lg border bg-surface px-5 py-4">
        <p className="text-[15px] leading-relaxed">{text}</p>
        {label}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border bg-surface px-5 py-6">
      <p className="break-words font-mono text-[34px] font-medium leading-none tracking-tight tabular-nums text-accent">
        {text}
      </p>
      {label}
    </div>
  );
}

export default function ResultTable({ columns, rows, truncated, limit }: Props) {
  if (!rows.length) {
    return (
      <div className="mt-4 rounded-lg border border-dashed bg-surface px-4 py-8 text-center">
        <p className="text-sm text-muted">No rows matched.</p>
      </div>
    );
  }

  // A single-cell result is a scalar answer — show it as one, not a 1×1 grid.
  if (rows.length === 1 && columns.length === 1) {
    return <ScalarResult column={columns[0]} value={rows[0][0]} />;
  }

  const numericColumns = columns.map((_, i) =>
    rows.slice(0, 20).every((row) => row[i] === null || isNumeric(row[i])),
  );

  return (
    <div className="mt-4">
      {/* overflow-hidden on the wrapper is what lets the rounded corners clip
          the sticky header and the scroll area inside it. */}
      <div className="overflow-hidden rounded-lg border">
        <div className="max-h-[26rem] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap border-b px-3 py-2.5 text-left text-xs font-medium text-muted"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr
                  key={r}
                  className="border-b transition-colors last:border-0 hover:bg-surface"
                >
                  {row.map((cell, c) => {
                    const json = parseJson(cell);
                    const interval = json ? formatInterval(json) : null;
                    const shown = interval ?? display(cell);
                    return (
                      <td
                        key={c}
                        className={`max-w-xs truncate px-3 py-2.5 ${
                          numericColumns[c] || interval
                            ? "text-right font-mono tabular-nums"
                            : json
                              ? "font-mono text-[12px] text-muted"
                              : ""
                        } ${cell === null ? "text-faint" : ""}`}
                        title={cell === null ? undefined : String(cell)}
                      >
                        {shown}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 px-0.5">
        <span className="text-xs text-faint">
          {rows.length.toLocaleString()} {rows.length === 1 ? "row" : "rows"}
        </span>
        {truncated && (
          <span className="rounded-full border border-accent-line bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
            capped at {limit.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
